import os
from pathlib import Path
from typing import List, Dict, Any


class DisallowedKnowledgeSourceError(Exception):
    """Raised when an attempt is made to ingest an unauthorized source."""
    pass


class KnowledgeAllowlist:
    """
    Strict allowlist of verified knowledge sources.
    CalServices Rule #7:
    CLAUDE.md, API.md, ARCHITECTURE.md, DATABASE.md, README.md describe a defunct product
    (QuickTIMS) and must NEVER be ingested.
    """

    FORBIDDEN_FILENAMES = {
        "claude.md",
        "api.md",
        "architecture.md",
        "database.md",
        "readme.md",
        "quicktims_documentation.pdf",
    }

    APPROVED_LEGAL_PAGES = [
        "CancellationRefundPage.jsx",
        "ServiceDeliveryPage.jsx",
        "TermsPage.jsx",
        "PrivacyPage.jsx",
        "HelpSupportPage.jsx",
        "ContactUsPage.jsx",
    ]

    @classmethod
    def validate_file_path(cls, file_path: str):
        path_obj = Path(file_path)
        base_name = path_obj.name.lower()
        if base_name in cls.FORBIDDEN_FILENAMES:
            raise DisallowedKnowledgeSourceError(
                f"Ingestion forbidden: '{base_name}' contains legacy/incompatible documentation and is blocked by Rule #7."
            )

    @classmethod
    def get_canonical_policies(cls) -> List[Dict[str, Any]]:
        """
        Returns verified, curated policy and FAQ contents for CalServices / Sevo.
        All data is strictly derived from official legal pages (CancellationRefundPage,
        ServiceDeliveryPage, HelpSupportPage, legalConfig, and service_requests models).
        """
        return [
            {
                "source_id": "policy:cancellation_refund",
                "source_category": "policy",
                "title": "Cancellation, Refund & Rework Guarantee Policy",
                "content": (
                    "CalServices / Sevo Cancellation & Refund Policy:\n"
                    "1. Rules by Lifecycle Stage:\n"
                    "   • Stage A (CONFIRMED / ASSIGNED): 100% Free cancellation before technician acceptance.\n"
                    "   • Stage B (ACCEPTED / ON THE WAY): If cancelled while technician is travelling, a nominal "
                    "visitation fee (up to ₹149) may apply. If the professional is delayed >30 mins, cancellation remains 100% free.\n"
                    "   • Stage C (ARRIVED / Prior to OTP): An inspection/visitation fee applies if customer declines work at doorstep; "
                    "remaining prepaid balance is refunded.\n"
                    "2. Diagnostic & Inspection Fees: For diagnostic inspections or AC audits where work does not proceed after quotation, "
                    "the standard inspection visit charge (typically ₹199) is non-refundable.\n"
                    "3. Refund Processing Timeline: Approved online refunds are initiated within 24–48 hours and reflect in the original "
                    "payment method (Bank account, Card, or UPI) within 5–7 business days.\n"
                    "4. Service Quality Guarantee: If you are dissatisfied with a completed service, you can report an issue within 48 hours "
                    "under Customer Support to request a complimentary rework inspection."
                ),
                "metadata": {"version": "v2026.1", "slug": "cancellation-and-refund-policy", "category": "policy"},
            },
            {
                "source_id": "policy:service_delivery",
                "source_category": "policy",
                "title": "Doorstep Service Delivery & Live Tracking Policy",
                "content": (
                    "CalServices / Sevo Service Delivery & Tracking Policy:\n"
                    "1. On-Site Doorstep Model: Sevo provides professional on-site doorstep home and transport services. "
                    "We do not ship physical parcels; services are performed at your designated location by verified professionals.\n"
                    "2. The 6-Stage Delivery Lifecycle:\n"
                    "   • Stage 1 - CONFIRMED: Request scheduled and reserved in system.\n"
                    "   • Stage 2 - ASSIGNED: Service professional allocated; verified name, photo, and rating appear once accepted.\n"
                    "   • Stage 3 - ON THE WAY: Technician starts trip; live GPS coordinates, heading, and dynamic ETA activate.\n"
                    "   • Stage 4 - ARRIVED: Technician reaches doorstep. Start OTP verification required.\n"
                    "   • Stage 5 - IN PROGRESS: Start OTP verified; active repair/cleaning execution.\n"
                    "   • Stage 6 - COMPLETED: Job proof verified, digital invoice generated.\n"
                    "3. Start OTP Security Rule: Never share the 6-digit Start OTP over the phone. The OTP is a security check and must "
                    "only be shared in person after the technician has physically arrived at your doorstep.\n"
                    "4. Service Zone Geofencing: Addresses are validated against active geofenced operational zones before dispatch.\n"
                    "5. Operating Hours: Monday to Sunday, 8:00 AM to 8:00 PM IST."
                ),
                "metadata": {"version": "v2026.1", "slug": "service-delivery", "category": "policy"},
            },
            {
                "source_id": "policy:pricing_and_payment",
                "source_category": "policy",
                "title": "Pricing, GST & Payment Policy",
                "content": (
                    "CalServices / Sevo Pricing & Payment Structure:\n"
                    "1. Transparent Pricing: Order total = Item/Package Price + GST (18% on service labor) + Platform Fee (₹29) - Coupon Discount + Optional Tip.\n"
                    "2. Platform Fee: A flat ₹29 fee applies per non-consultation booking to support verified partner onboarding, live tracking infrastructure, and doorstep insurance.\n"
                    "3. Scope Extensions: If additional work or spare parts are needed on-site, the technician creates a digital Work Extension Request. "
                    "No extra charges can be added without the customer's prior approval in the Sevo app.\n"
                    "4. Accepted Payment Methods: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking via secure Razorpay gateway, "
                    "and Cash on Delivery (COD) for eligible services.\n"
                    "5. Tax Invoices: GST-compliant digital tax invoices are generated upon booking completion and downloadable from Booking History."
                ),
                "metadata": {"version": "v2026.1", "slug": "pricing-and-payments", "category": "policy"},
            },
            {
                "source_id": "policy:terms_and_privacy",
                "source_category": "policy",
                "title": "Terms of Service, Company Info & Privacy Policy",
                "content": (
                    "CalServices / Sevo Corporate Identity, Terms & Privacy:\n"
                    "1. Corporate Identity: Brand 'Sevo' is operated by CALDIM ENGINEERING PRIVATE LIMITED.\n"
                    "   • CIN: U72900KA2026PTC123456 | GSTIN: 33AAGCC4916J1ZP\n"
                    "   • Registered Office: Minmac Center #118, First Floor, Arcot Road, Valasaravakkam, Chennai - 600087, Tamil Nadu, India.\n"
                    "   • Customer Support Email: support@caldimengg.com | Phone: +91 98765 43210.\n"
                    "   • Support & Dispatch Hours: Monday to Sunday, 8:00 AM – 8:00 PM IST.\n"
                    "2. Customer Data Privacy: Customer phone numbers and addresses are shared with assigned technicians strictly for fulfilling "
                    "the confirmed service request. Payment details are processed via PCI-DSS compliant gateways; Sevo does not store card credentials."
                ),
                "metadata": {"version": "v2026.1", "slug": "terms-and-privacy", "category": "policy"},
            },
            {
                "source_id": "faq:platform_bookings_zones",
                "source_category": "faq",
                "title": "FAQ: Bookings, Service Areas & Geofencing",
                "content": (
                    "Frequently Asked Questions on Bookings and Service Areas:\n"
                    "Q: How do I book a doorstep service on Sevo?\n"
                    "A: Browse categories from the Home page (Cleaning, Pest Control, Painting, Masonry, HVAC), select your package, pick preferred date and slot, enter your address, and choose payment method.\n"
                    "Q: How does Sevo check if my area is serviceable?\n"
                    "A: Sevo uses geofenced operational zones. When you enter an address or GPS location, the engine instantly verifies whether your coordinates fall within an active zone.\n"
                    "Q: Why are some services unavailable in my selected area?\n"
                    "A: Certain trade categories (such as heavy equipment masonry) are enabled per zone based on local operational capacity and workforce availability."
                ),
                "metadata": {"category": "faq", "tags": ["booking", "service-area", "geofence"]},
            },
            {
                "source_id": "faq:platform_dispatch_tracking_otp",
                "source_category": "faq",
                "title": "FAQ: Technician Dispatch, Live Tracking & Start OTP",
                "content": (
                    "Frequently Asked Questions on Dispatch, Live Tracking & Start OTP:\n"
                    "Q: Why don't I see technician details immediately after booking?\n"
                    "A: After booking, your request is broadcast to qualified professionals in your area. Once a technician reviews and accepts the job, their verified name, photo, phone, and rating are unlocked on your tracking screen.\n"
                    "Q: How does live tracking work?\n"
                    "A: When the technician starts their trip (ON THE WAY state), their live GPS coordinates and estimated arrival time (ETA) update on your customer tracking map.\n"
                    "Q: What is the Start OTP and when should I share it?\n"
                    "A: The Start OTP is a secure 6-digit verification code. You must only share this OTP with the technician after they have physically arrived at your doorstep to authorize work.\n"
                    "Q: What if the technician's GPS signal is temporarily lost?\n"
                    "A: If the technician enters a low-connectivity area, the tracking screen shows their last verified checkpoint and ETA. You can call the technician directly via the in-app call button."
                ),
                "metadata": {"category": "faq", "tags": ["tracking", "dispatch", "otp", "gps"]},
            },
            {
                "source_id": "faq:platform_payments_invoices",
                "source_category": "faq",
                "title": "FAQ: Payments, Invoices & Scope Extensions",
                "content": (
                    "Frequently Asked Questions on Payments, Invoices & Work Extensions:\n"
                    "Q: What payment methods are supported?\n"
                    "A: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Cash on Delivery (COD) where eligible.\n"
                    "Q: What happens if additional work or materials are needed on-site?\n"
                    "A: If extra scope is needed, the technician raises a digital Work Extension Request in the app. No extra work or cost can proceed without your approval.\n"
                    "Q: How can I download my GST tax invoice?\n"
                    "A: Once your booking reaches the COMPLETED state, a GST-compliant digital invoice is automatically generated and available for instant download in your Booking History."
                ),
                "metadata": {"category": "faq", "tags": ["payment", "invoice", "gst", "extension"]},
            },
            {
                "source_id": "faq:platform_cancellations_refunds",
                "source_category": "faq",
                "title": "FAQ: Cancellations, Rescheduling & Support",
                "content": (
                    "Frequently Asked Questions on Cancellations and Refunds:\n"
                    "Q: Can I cancel or reschedule my appointment?\n"
                    "A: Yes. You can cancel or reschedule directly from your booking details screen. Cancellations made before technician departure are 100% free of charge.\n"
                    "Q: How long do refunds take to reflect in my bank account?\n"
                    "A: Approved online refunds are initiated within 24–48 hours and typically reflect in your bank account or wallet within 5–7 business days.\n"
                    "Q: How do I report a service issue or file a complaint?\n"
                    "A: You can submit a support ticket under Customer Support or contact support@caldimengg.com. We offer a 48-hour complimentary rework window."
                ),
                "metadata": {"category": "faq", "tags": ["cancel", "refund", "reschedule", "complaint"]},
            },
            {
                "source_id": "catalog:category_scope_matrix",
                "source_category": "faq",
                "title": "Service Catalog: Category Scope, Inclusions & Exclusions",
                "content": (
                    "Service Category Scope Matrix (Inclusions vs Exclusions):\n"
                    "1. AC & HVAC Services:\n"
                    "   • Inclusions: High-pressure jet foam cleaning of indoor cooling coils, outdoor condenser wash, drain pipe flushing, and electrical circuit inspection.\n"
                    "   • Exclusions: Gas leak repairs and complete refrigerant top-up are billed separately after pressure testing.\n"
                    "2. Plumbing Services:\n"
                    "   • Inclusions: Tap/spout replacement, drain block clearing, angle valve fixing, tank float valve repair.\n"
                    "   • Exclusions: Major underground pipe line civil alterations or motorized borewell rewinding.\n"
                    "3. Electrical Services:\n"
                    "   • Inclusions: MCB trip diagnostics, switch/socket replacement, fan installation, chandelier wiring.\n"
                    "   • Exclusions: Wall chasing and concealed complete house rewiring (available under custom quoted work).\n"
                    "4. Painting & Masonry Services:\n"
                    "   • Site Inspection: Free ₹0 doorstep consultation for wall moisture/crack assessment.\n"
                    "   • Inclusions: Surface sanding, primer application, 2-coat paint finish, tile joint waterproofing.\n"
                    "   • Exclusions: Structural brickwork demolition without prior structural engineer approval."
                ),
                "metadata": {"category": "catalog", "tags": ["ac", "plumbing", "electrical", "painting", "masonry", "scope"]},
            },
            {
                "source_id": "vendor_guide:onboarding",
                "source_category": "vendor_guide",
                "title": "Becoming a CalServices Partner / Professional",
                "content": (
                    "How to Join CalServices as a Technician or Vendor Partner:\n"
                    "1. Requirements: Must have valid government photo ID (Aadhaar / PAN), relevant trade skill experience "
                    "(e.g. Electrical, Plumbing, HVAC, Carpentry, Masonry, Driving), and own basic tools.\n"
                    "2. Benefits: Flexible working hours, stable local demand, weekly direct bank payouts, and transparent commission structure.\n"
                    "3. How to Apply: Visit the CalServices Partner Portal at https://calservices-vendor.vercel.app to register.\n"
                    "4. Verification Process: After submitting your application and trade credentials online, our team will schedule "
                    "a background verification and trade skill audit before activating your partner account."
                ),
                "metadata": {"cta_url": "https://calservices-vendor.vercel.app"},
            },
        ]
