"""Paytm payment-provider adapter.

The Customer application is the only owner of customer payments.  This module
keeps Paytm-specific transport and checksum details out of views while giving
local development a deliberately labelled mock flow.  A mock payment is never
enabled by default and is not a fallback for a failed live payment.
"""
import hashlib
import hmac
import json
import logging
import uuid
from decimal import Decimal

import requests
from django.conf import settings


logger = logging.getLogger(__name__)


def configured_provider() -> str:
    """Return the configured online provider, rejecting unknown values."""
    provider = str(getattr(settings, "PAYMENT_PROVIDER", "razorpay") or "razorpay").strip().lower()
    return provider if provider in {"razorpay", "paytm", "paytm_mock"} else ""


def paytm_mock_enabled() -> bool:
    """Mocks are an explicit non-production choice, never a fallback.

    A production Paytm environment must use the live adapter even if someone
    accidentally leaves the mock feature flag set during a deployment.
    """
    return (
        configured_provider() == "paytm_mock"
        and bool(getattr(settings, "PAYTM_MOCK_ENABLED", False))
        and str(getattr(settings, "PAYTM_ENV", "staging") or "staging").strip().lower() != "production"
    )


def _mock_secret() -> bytes:
    # A separate secret makes accidental reuse of a Django session key less
    # likely, while still allowing an isolated local checkout to work before
    # a merchant account exists.  It is server-only and never returned.
    return str(
        getattr(settings, "PAYTM_MOCK_SECRET", "") or settings.SECRET_KEY
    ).encode("utf-8")


def _mock_signature(order_id: str, transaction_id: str, amount: Decimal) -> str:
    message = f"paytm_mock|{order_id}|{transaction_id}|{Decimal(str(amount)):.2f}".encode("utf-8")
    return hmac.new(_mock_secret(), message, hashlib.sha256).hexdigest()


def create_mock_transaction(order_id: str, amount: Decimal) -> dict:
    """Return a signed, server-issued mock Paytm completion payload.

    The browser may submit this payload back only for the order it was issued
    for.  The server validates the signature again before recording payment.
    """
    transaction_id = f"PAYTM_MOCK_TXN_{uuid.uuid4().hex[:20].upper()}"
    return {
        "provider": "paytm_mock",
        "order_id": order_id,
        "transaction_id": transaction_id,
        "signature": _mock_signature(order_id, transaction_id, amount),
        "mock": True,
    }


def verify_mock_transaction(order_id: str, transaction_id: str, signature: str, amount: Decimal) -> bool:
    if not (paytm_mock_enabled() and order_id and transaction_id and signature):
        return False
    expected = _mock_signature(order_id, transaction_id, amount)
    try:
        return hmac.compare_digest(expected.encode("ascii"), str(signature).encode("ascii"))
    except UnicodeEncodeError:
        return False


def _paytm_base_url() -> str:
    environment = str(getattr(settings, "PAYTM_ENV", "staging") or "staging").strip().lower()
    # Paytm's current JS Checkout and Transaction API documentation uses
    # these hosts. Keep the host choice on the server rather than accepting a
    # frontend URL, so a staging token can never be sent to an arbitrary host.
    return "https://secure.paytmpayments.com" if environment == "production" else "https://securestage.paytmpayments.com"


def _paytm_checksum(body: dict) -> str:
    try:
        from paytmchecksum import PaytmChecksum
    except ImportError as exc:  # pragma: no cover - configuration failure path
        raise RuntimeError("Paytm SDK is not installed.") from exc
    merchant_key = str(getattr(settings, "PAYTM_MERCHANT_KEY", "") or "").strip()
    if not merchant_key:
        raise RuntimeError("Paytm merchant key is not configured.")
    return PaytmChecksum.generateSignature(json.dumps(body, separators=(",", ":")), merchant_key)


def _paytm_credentials() -> tuple[str, str]:
    mid = str(getattr(settings, "PAYTM_MID", "") or "").strip()
    merchant_key = str(getattr(settings, "PAYTM_MERCHANT_KEY", "") or "").strip()
    if not mid or not merchant_key:
        raise RuntimeError("Paytm merchant credentials are not configured.")
    return mid, merchant_key


def create_live_transaction(order_id: str, amount: Decimal, customer: dict, callback_url: str) -> dict:
    """Create a real Paytm transaction and return its server-issued token."""
    mid, _ = _paytm_credentials()
    body = {
        "requestType": "Payment",
        "mid": mid,
        "websiteName": str(getattr(settings, "PAYTM_WEBSITE", "WEBSTAGING") or "WEBSTAGING"),
        "orderId": order_id,
        "callbackUrl": callback_url,
        "txnAmount": {"value": f"{Decimal(str(amount)):.2f}", "currency": "INR"},
        "userInfo": {
            "custId": str(customer.get("id") or "guest"),
            "mobile": str(customer.get("phone") or ""),
            "email": str(customer.get("email") or ""),
        },
    }
    response = requests.post(
        f"{_paytm_base_url()}/theia/api/v1/initiateTransaction?mid={mid}&orderId={order_id}",
        json={"body": body, "head": {"signature": _paytm_checksum(body)}},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json().get("body", {})
    result = payload.get("resultInfo", {})
    if result.get("resultStatus") != "S" or not payload.get("txnToken"):
        raise RuntimeError(result.get("resultMsg") or "Paytm could not create a transaction.")
    return {
        "provider": "paytm",
        "order_id": order_id,
        "txn_token": payload["txnToken"],
        "mid": mid,
        "amount": f"{Decimal(str(amount)):.2f}",
        "checkout_script_url": f"{_paytm_base_url()}/merchantpgpui/checkoutjs/merchants/{mid}.js",
    }


def verify_live_transaction(order_id: str, expected_amount: Decimal) -> dict:
    """Query Paytm server-to-server; do not trust a browser callback alone."""
    mid, _ = _paytm_credentials()
    body = {"mid": mid, "orderId": order_id}
    response = requests.post(
        f"{_paytm_base_url()}/v3/order/status",
        json={"body": body, "head": {"signature": _paytm_checksum(body)}},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json().get("body", {})
    result = payload.get("resultInfo", {})
    if result.get("resultStatus") != "TXN_SUCCESS":
        raise ValueError(result.get("resultMsg") or "Paytm has not confirmed this payment.")
    received_amount = Decimal(str(payload.get("txnAmount") or "0"))
    if received_amount != Decimal(str(expected_amount)):
        raise ValueError("Paytm payment amount does not match the booking.")
    transaction_id = str(payload.get("txnId") or "").strip()
    if not transaction_id:
        raise ValueError("Paytm response did not contain a transaction ID.")
    return {"transaction_id": transaction_id, "signature": str(payload.get("checksumHash") or "")}
