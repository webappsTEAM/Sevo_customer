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

/**
 * Dynamic location search using geocoding provider / Places API.
 * Supports arbitrary queries across all cities/countries without source code hardcoding.
 */
export async function searchPlaces(query) {
  if (!query || !query.trim()) return [];
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=8`, {
      headers: { "Accept-Language": "en" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(item => ({
      name: item.display_name.split(",")[0],
      subtitle: item.display_name.split(",").slice(1, 4).join(", ").trim(),
      category: item.type ? item.type.toUpperCase() : "LOCATION",
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      fullAddress: item.display_name,
    }));
  } catch (err) {
    console.warn("Places search error:", err);
    return [];
  }
}
