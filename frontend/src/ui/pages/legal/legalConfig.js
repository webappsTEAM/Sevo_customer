import { useState, useEffect } from "react";
import { apiRequest } from "../../../api/client.js";

export const DEFAULT_LEGAL_CONFIG = {
  company_legal_name: "CALDIM ENGINEERING PRIVATE LIMITED",
  brand_name: "CalServices",
  cin: "U72900KA2026PTC123456",
  gstin: "33AAGCC4916J1ZP",
  registered_address: "Minmac center #118, First Floor, Arcot Road, Valasaravakkam, Chennai - 600087, Tamil Nadu, India",
  support_email: "support@caldimengg.com",
  support_phone: "+91 98765 43210",
  support_hours: "Monday – Sunday, 8:00 AM – 8:00 PM IST",
  effective_date: "August 20, 2026",
  last_updated: "August 20, 2026",
  versions: {
    terms: "v2026.1",
    privacy: "v2026.1",
    service_delivery: "v2026.1",
    cancellation_refund: "v2026.1",
  },
  jurisdiction: "Chennai, Tamil Nadu, India",
  governing_law: "Laws of the Republic of India",
};

export function useLegalConfig() {
  const [config, setConfig] = useState(DEFAULT_LEGAL_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiRequest("/settings/legal/")
      .then((res) => {
        if (res && res.success && res.data && isMounted) {
          setConfig({ ...DEFAULT_LEGAL_CONFIG, ...res.data });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote legal config, using verified defaults", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { config, loading };
}
