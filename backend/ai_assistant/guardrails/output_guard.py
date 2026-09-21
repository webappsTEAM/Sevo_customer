import re
from typing import Dict, Any, List, Union


class OutputGuard:
    """
    Output layer security:
    1. Secret/Token scrubbing (start_otp, payment_confirmation_otp, tracking_token).
    2. CalServices Rule #4: 599 fallback detection on empty/unparseable cart_data.
    3. CalServices Rule #5: Fabricated technician sentinel ('Service Partner', mockups/service_plumbing.png, 4.9 rating).
    4. Internal identifiers and mock snapshot protection.
    """

    OTP_REGEX = re.compile(r"(?i)\b(start[_\s-]?otp|otp\s*(?:is|code|:)?)\s*[:=]?\s*([0-9]{4,8})\b")
    TOKEN_REGEX = re.compile(r"(?i)\b(tracking[_\s-]?token|bearer\s+[A-Za-z0-9\-_.]+)\b")

    # Sentinel trio representing unassigned technician fabricated by list serializer
    SENTINEL_NAME = "service partner"
    SENTINEL_PHOTO = "/mockups/service_plumbing.png"
    SENTINEL_RATING = 4.9

    @classmethod
    def sanitize_booking_data(cls, booking: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitizes raw booking data dictionary before sending to LLM context or user.
        """
        clean = dict(booking)

        # Rule #8: Strip internal secret tokens
        clean.pop("start_otp", None)
        clean.pop("payment_confirmation_otp", None)
        clean.pop("tracking_token", None)

        # Rule #4: 599 price fallback guard
        cart_data = clean.get("cart_data")
        total_amount = clean.get("total_amount")
        is_cart_empty = not cart_data or cart_data == "[]" or cart_data == "{}" or cart_data == []

        if is_cart_empty:
            try:
                amt_float = float(total_amount) if total_amount is not None else 0.0
                if abs(amt_float - 599.0) < 0.01:
                    clean["total_amount"] = None
                    clean["total_amount_display"] = "Unavailable (to be estimated upon inspection)"
                    clean["pricing_note"] = "Final pricing will be determined during technician inspection."
            except (ValueError, TypeError):
                pass

        # Rule #5: Fabricated technician sentinel detection
        tech_name = str(clean.get("technician_name") or "").strip().lower()
        tech_photo = str(clean.get("technician_photo") or "").strip().lower()
        tech_rating = clean.get("technician_rating")
        tech_obj = clean.get("technician") or {}

        is_sentinel = (
            tech_name == cls.SENTINEL_NAME
            or tech_photo == cls.SENTINEL_PHOTO
            or (isinstance(tech_obj, dict) and (
                str(tech_obj.get("name") or "").strip().lower() == cls.SENTINEL_NAME
                or str(tech_obj.get("photo") or "").strip().lower() == cls.SENTINEL_PHOTO
            ))
        )

        if is_sentinel or not tech_name:
            clean["technician_name"] = None
            clean["technician_phone"] = None
            clean["technician_photo"] = None
            clean["technician_rating"] = None
            clean["technician"] = None
            clean["technician_status_display"] = "A technician will be assigned shortly."

        return clean

    @classmethod
    def sanitize_booking_list(cls, bookings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [cls.sanitize_booking_data(b) for b in bookings]

    @classmethod
    def sanitize_llm_response(cls, text: str) -> str:
        """
        Cleans generated text response of any accidentally leaked OTPs, tokens, or fallback anomalies.
        """
        if not text:
            return ""

        scrubbed = text

        # Strip explicit start_otp leaks
        scrubbed = cls.OTP_REGEX.sub("[OTP Hidden for Security]", scrubbed)

        # Strip explicit tracking tokens
        scrubbed = cls.TOKEN_REGEX.sub("[Token Hidden]", scrubbed)

        # Rule #5 enforcement on text: if text mentions "Service Partner" with rating 4.9 as assigned
        if re.search(r"(?i)service partner.*4\.9|rating of 4\.9.*service partner", scrubbed):
            scrubbed = re.sub(
                r"(?i)(your technician is )?service partner.*?(rating of 4\.9|4\.9 rating)",
                "A technician will be assigned shortly",
                scrubbed,
            )

        return scrubbed
