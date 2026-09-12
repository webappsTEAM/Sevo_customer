/**
 * dynamicETA.js
 * antigravity Operational ETA & Fulfilment Promise Engine
 *
 * Requirements:
 * - Never hard-code a delivery promise (e.g. static "10-15 mins").
 * - Dynamic calculation based on:
 *   1. Distance to nearest fulfilment hub/dark store
 *   2. Active packing/picking queue volume
 *   3. Rider fleet availability & traffic coefficient
 *   4. Cart complexity (item count, heavy machinery vs small parts)
 * - Authoritative recalculation when location, store node, or cart changes.
 */

// Known dark store / fulfilment nodes (lat, lng, capacity buffer)
const FULFILMENT_NODES = [
  { id: 'hub-anna-nagar', name: 'Anna Nagar Dark Store', lat: 13.0850, lng: 80.2101, basePrepMins: 4 },
  { id: 'hub-t-nagar', name: 'T. Nagar Express Node', lat: 13.0418, lng: 80.2341, basePrepMins: 3 },
  { id: 'hub-guindy', name: 'Guindy Industrial Hub', lat: 13.0067, lng: 80.2024, basePrepMins: 5 },
  { id: 'hub-hosur', name: 'Hosur SIPCOT Hub', lat: 12.7409, lng: 77.8253, basePrepMins: 5 },
];

/**
 * Calculates distance in kilometers between two geo coordinates (Haversine formula).
 */
export function calculateGeoDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5; // default urban radius
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves the nearest active fulfilment node.
 */
export function getNearestNode(userLat, userLng) {
  if (!userLat || !userLng) return FULFILMENT_NODES[0];
  let minDistance = Infinity;
  let nearestNode = FULFILMENT_NODES[0];

  for (const node of FULFILMENT_NODES) {
    const dist = calculateGeoDistance(userLat, userLng, node.lat, node.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestNode = node;
    }
  }
  return nearestNode;
}

/**
 * Computes dynamic delivery promise in minutes.
 * @param {Object} options
 * @param {number} options.userLat - Latitude of delivery address
 * @param {number} options.userLng - Longitude of delivery address
 * @param {number} options.itemCount - Total items in cart
 * @param {number} options.trafficFactor - Peak vs normal traffic (1.0 to 1.5)
 * @returns {Object} { minutes, minRange, maxRange, promiseText, isInstantEligible, node }
 */
export function computeDynamicETA({
  userLat = 13.0827,
  userLng = 80.2707,
  itemCount = 1,
  trafficFactor = 1.1,
} = {}) {
  const node = getNearestNode(userLat, userLng);
  const distanceKm = calculateGeoDistance(userLat, userLng, node.lat, node.lng);

  // Transit time: average 20 km/h in urban city traffic -> 3 mins per km
  const transitMinutes = Math.max(4, Math.round(distanceKm * 3 * trafficFactor));

  // Prep time: base prep + 0.5 mins per item
  const prepMinutes = Math.max(3, Math.round(node.basePrepMins + itemCount * 0.4));

  const totalCalculated = Math.max(10, prepMinutes + transitMinutes);

  // Dynamic range (+/- 2 mins)
  const minRange = Math.max(10, totalCalculated - 2);
  const maxRange = totalCalculated + 3;

  const isInstantEligible = distanceKm <= 8.0 && totalCalculated <= 25;

  return {
    minutes: totalCalculated,
    minRange,
    maxRange,
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    promiseText: `${minRange}–${maxRange} mins`,
    badgeText: `⚡ ${totalCalculated} MINS`,
    detailedPromise: isInstantEligible
      ? `Get it in ${totalCalculated} mins`
      : `Delivery in ~${totalCalculated} mins`,
    nodeName: node.name,
    isInstantEligible,
  };
}
