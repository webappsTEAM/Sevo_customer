import { apiRequest } from "../api/client.js";
export * from "../api/geocoding.js";
export * from "../api/addressService.js";

export async function fetchLiveLocations() {
  return apiRequest("/live-locations/");
}

export async function updateLocation(coords) {
  return apiRequest("/live-locations/", {
    method: "POST",
    json: coords,
  });
}

const GOOGLE_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env
    ? import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    : "") || "AIzaSyC-7JjgSXDrqNF1BMMnlvKtgRPS6_98uP8";

// In-memory cache for ultra-fast instant repeated searches
const placesSearchCache = new Map();

/**
 * Dynamic location search using multi-tier geocoding providers.
 * Tier 1: Google Maps Geocoding API (pinpoint Indian landmarks, bus stands, layouts, areas)
 * Tier 2: OpenStreetMap Nominatim (countrycodes=in)
 * Tier 3: Photon Komoot Geocoder (fuzzy typo tolerance)
 */
export async function searchPlaces(query, opts = {}) {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const cacheKey = q.toLowerCase();
  if (placesSearchCache.has(cacheKey)) {
    return placesSearchCache.get(cacheKey);
  }

  const encoded = encodeURIComponent(q);
  let results = [];

  // 1. Primary: Google Maps Geocoding API
  if (GOOGLE_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_API_KEY}&components=country:IN&language=en`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
          results = data.results.slice(0, 8).map((item) => {
            const fa = item.formatted_address || "";
            const parts = fa.split(",").map((s) => s.trim());
            const firstPart = parts[0] || q;
            const subtitle = parts.slice(1, 4).join(", ") || "India";
            const category = (item.types && item.types[0])
              ? item.types[0].replace(/_/g, " ").toUpperCase()
              : "LOCATION";

            return {
              name: firstPart,
              subtitle: subtitle,
              category: category,
              lat: item.geometry?.location?.lat,
              lng: item.geometry?.location?.lng,
              fullAddress: fa,
            };
          }).filter((r) => r.lat && r.lng);
        }
      }
    } catch (err) {
      console.debug("[LocationService] Google Maps search error:", err);
    }
  }

  // 2. Secondary fallback: Nominatim with India country filter
  if (results.length === 0) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&countrycodes=in&format=json&addressdetails=1&limit=6`,
        { headers: { "Accept-Language": "en", "User-Agent": "CalTrack-Delivery/1.0" } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          results = data.map((item) => ({
            name: item.display_name.split(",")[0].trim(),
            subtitle: item.display_name.split(",").slice(1, 4).join(", ").trim(),
            category: item.type ? item.type.toUpperCase() : "LOCATION",
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            fullAddress: item.display_name,
          }));
        }
      }
    } catch (err) {
      console.debug("[LocationService] Nominatim fallback error:", err);
    }
  }

  // 3. Tertiary fallback: Photon fuzzy geocoding
  if (results.length === 0) {
    try {
      const pRes = await fetch(
        `https://photon.komoot.io/api/?q=${encoded}&limit=6&lat=12.7409&lon=77.8253`
      );
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData?.features?.length > 0) {
          results = pData.features.map((f) => {
            const props = f.properties || {};
            const parts = [props.name, props.district || props.city, props.state, props.country].filter(Boolean);
            return {
              name: props.name || parts[0] || "Location",
              subtitle: parts.slice(1).join(", ") || props.country || "",
              category: props.type ? String(props.type).toUpperCase() : "LOCATION",
              lat: parseFloat(f.geometry.coordinates[1]),
              lng: parseFloat(f.geometry.coordinates[0]),
              fullAddress: parts.join(", "),
            };
          });
        }
      }
    } catch (err) {
      console.debug("[LocationService] Photon fallback error:", err);
    }
  }

  if (results.length > 0) {
    placesSearchCache.set(cacheKey, results);
  }

  return results;
}
