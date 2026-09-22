import assert from "node:assert"
import {
  haversineDistance,
  calculateBearing,
  interpolatePosition,
  projectPointOnPolyline,
  formatDistance,
  formatEta,
  getFreshnessBadge,
} from "./trackingUtils.js"

function getShortestArcAngle(currentVisualAngle, targetBearing) {
  const normalizedTarget = ((targetBearing % 360) + 360) % 360
  const currentMod = ((currentVisualAngle % 360) + 360) % 360
  let diff = normalizedTarget - currentMod
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return currentVisualAngle + diff
}

console.log("========================================================")
console.log("RUNNING CALTRACK CUSTOMER TRACKING UNIT & MATH VALIDATION")
console.log("========================================================")

// 1. Haversine Distance Test
console.log("\n[Test 1] Haversine Distance Calculation...")
const d = haversineDistance(12.7409, 77.8253, 12.7500, 77.8300)
assert(d > 1000 && d < 1500, `Expected ~1150m, got ${d}`)
console.log(`✓ Distance: ${d.toFixed(1)} meters`)

// 2. Heading / Bearing Shortest-Arc Rotation
console.log("\n[Test 2] Shortest-Arc Heading Calculations...")
// 350 deg -> 10 deg should rotate +20 deg (clockwise)
const a1 = getShortestArcAngle(350, 10)
assert.strictEqual(a1, 370, `Expected 370 (+20 deg), got ${a1}`)
console.log(`✓ 350° -> 10° rotates smoothly to ${a1}° (+20° clockwise)`)

// 10 deg -> 350 deg should rotate -20 deg (counter-clockwise)
const a2 = getShortestArcAngle(10, 350)
assert.strictEqual(a2, -10, `Expected -10 (-20 deg), got ${a2}`)
console.log(`✓ 10° -> 350° rotates smoothly to ${a2}° (-20° counter-clockwise)`)

// 3. Position Linear Interpolation
console.log("\n[Test 3] Position Interpolation (Between Real GPS Fixes)...")
const p0 = interpolatePosition([12.0, 77.0], [12.2, 77.4], 0)
const p5 = interpolatePosition([12.0, 77.0], [12.2, 77.4], 0.5)
const p1 = interpolatePosition([12.0, 77.0], [12.2, 77.4], 1.0)
assert.deepStrictEqual(p0, [12.0, 77.0])
assert.deepStrictEqual(p5, [12.1, 77.2])
assert.deepStrictEqual(p1, [12.2, 77.4])
console.log("✓ Interpolation at t=0, t=0.5, t=1.0 is exact")

// 4. Strict 25m Road Snapping / Divergence Safety
console.log("\n[Test 4] Road Snapping & Divergence Safeguard...")
const road = [[12.0, 77.0], [12.0, 77.1]]
// Point 10m off road -> snaps to segment
const nearbyGps = [12.00008, 77.05]
const snapped = projectPointOnPolyline(nearbyGps, road, 25)
assert.notDeepStrictEqual(snapped, nearbyGps)
console.log("✓ Point within 25m snaps to road polyline")

// Point 200m off road -> remains exact raw GPS
const farGps = [12.002, 77.05]
const preserved = projectPointOnPolyline(farGps, road, 25)
assert.deepStrictEqual(preserved, farGps)
console.log("✓ Off-road point (>25m) preserves raw authoritative GPS")

// 5. ETA and Distance Formatting
console.log("\n[Test 5] ETA & Distance Formatters...")
assert.strictEqual(formatDistance(30), "At location")
assert.strictEqual(formatDistance(450), "450 m away")
assert.strictEqual(formatDistance(2400), "2.4 km away")
assert.strictEqual(formatEta(0), "Arrived")
assert.strictEqual(formatEta(1), "1 min")
assert.strictEqual(formatEta(8), "8 mins")
console.log("✓ Distance & ETA formatters passed")

// 6. Freshness Badges
console.log("\n[Test 6] Telemetry Freshness Badges...")
const bLive = getFreshnessBadge("LIVE", "on_the_way")
const bStale = getFreshnessBadge("STALE", "on_the_way")
const bArrived = getFreshnessBadge("LIVE", "arrived")
const bDone = getFreshnessBadge("LIVE", "completed")

assert.strictEqual(bLive.live, true)
assert(bLive.text.includes("Live"))
assert.strictEqual(bStale.live, false)
assert(bStale.text.includes("recently"))
assert(bArrived.text.includes("arrived"))
assert(bDone.text.includes("completed"))
console.log("✓ Freshness badges map accurately to lifecycle states")

console.log("\n========================================================")
console.log("ALL CALTRACK CUSTOMER TRACKING CHECKS PASSED SUCCESSFULLY!")
console.log("========================================================")
