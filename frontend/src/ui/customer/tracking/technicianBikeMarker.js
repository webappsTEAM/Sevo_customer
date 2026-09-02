/**
 * technicianBikeMarker.js
 * Generates high-fidelity, directional Leaflet vehicle markers for CalTrack.
 * Supports:
 *  - Bike / Scooter (Electrician, Plumber, Handyman, Locksmith, Repair)
 *  - Cargo Truck / Mini Van (Packers & Movers, Furniture Transport, Heavy Appliance)
 *  - Service Van (AC Service, Refrigeration, Deep Cleaning, Pest Control, Painting)
 */

import L from "leaflet"

/**
 * Renders the vehicle body SVG depending on vehicle category.
 */
function renderVehicleSvg(category, bearing) {
  const roundedBearing = Math.round(bearing)

  if (category === "truck") {
    return `
      <svg class="ltp-bike-svg" viewBox="0 0 64 64" width="56" height="56" fill="none">
        <defs>
          <radialGradient id="truckBeam_${roundedBearing}" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.7"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="truckCab_${roundedBearing}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#c2410c"/>
          </linearGradient>
          <filter id="truckShadow_${roundedBearing}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#020617" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Headlight Beam -->
        <path d="M22 10 L10 0 L54 0 L42 10 Z" fill="url(#truckBeam_${roundedBearing})"/>

        <g filter="url(#truckShadow_${roundedBearing})">
          <!-- Wheels -->
          <rect x="14" y="14" width="6" height="12" rx="2" fill="#0f172a"/>
          <rect x="44" y="14" width="6" height="12" rx="2" fill="#0f172a"/>
          <rect x="14" y="44" width="6" height="12" rx="2" fill="#0f172a"/>
          <rect x="44" y="44" width="6" height="12" rx="2" fill="#0f172a"/>

          <!-- Cargo Box (Rear) -->
          <rect x="20" y="24" width="24" height="34" rx="3" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
          <path d="M20 34 L44 34 M20 44 L44 44" stroke="#e2e8f0" stroke-width="1.5"/>
          <rect x="26" y="27" width="12" height="4" rx="1" fill="#ea580c"/>

          <!-- Driver Cabin (Front) -->
          <rect x="21" y="6" width="22" height="20" rx="4" fill="url(#truckCab_${roundedBearing})"/>
          <!-- Windshield -->
          <path d="M24 10 L40 10 L38 17 L26 17 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1"/>
          <!-- Headlamps -->
          <circle cx="24" cy="7.5" r="2" fill="#fff" stroke="#fde047" stroke-width="0.8"/>
          <circle cx="40" cy="7.5" r="2" fill="#fff" stroke="#fde047" stroke-width="0.8"/>
        </g>
      </svg>
    `
  }

  if (category === "van") {
    return `
      <svg class="ltp-bike-svg" viewBox="0 0 64 64" width="56" height="56" fill="none">
        <defs>
          <radialGradient id="vanBeam_${roundedBearing}" cx="50%" cy="100%" r="100%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="vanBody_${roundedBearing}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
          <filter id="vanShadow_${roundedBearing}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#020617" flood-opacity="0.55"/>
          </filter>
        </defs>

        <!-- Headlight beam -->
        <path d="M24 10 L12 0 L52 0 L40 10 Z" fill="url(#vanBeam_${roundedBearing})"/>

        <g filter="url(#vanShadow_${roundedBearing})">
          <!-- Wheels -->
          <rect x="15" y="16" width="5" height="11" rx="2" fill="#0f172a"/>
          <rect x="44" y="16" width="5" height="11" rx="2" fill="#0f172a"/>
          <rect x="15" y="42" width="5" height="11" rx="2" fill="#0f172a"/>
          <rect x="44" y="42" width="5" height="11" rx="2" fill="#0f172a"/>

          <!-- Van Body -->
          <rect x="20" y="8" width="24" height="48" rx="6" fill="url(#vanBody_${roundedBearing})"/>
          <!-- Windshield -->
          <path d="M23 12 L41 12 L39 19 L25 19 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1"/>
          <!-- Roof Racks / AC Decal -->
          <rect x="24" y="24" width="16" height="16" rx="2" fill="#0369a1" stroke="#38bdf8" stroke-width="1"/>
          <circle cx="32" cy="32" r="4" fill="#38bdf8"/>
          <!-- Headlights -->
          <circle cx="24" cy="9" r="2" fill="#fff"/>
          <circle cx="40" cy="9" r="2" fill="#fff"/>
        </g>
      </svg>
    `
  }

  // Default: Motorcycle / Bike / Scooter
  return `
    <svg class="ltp-bike-svg" viewBox="0 0 64 64" width="56" height="56" fill="none">
      <defs>
        <radialGradient id="bikeHeadlight_${roundedBearing}" cx="50%" cy="100%" r="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
          <stop offset="70%" stop-color="#0284c7" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="bikeBodyGrad_${roundedBearing}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563eb"/>
          <stop offset="60%" stop-color="#1d4ed8"/>
          <stop offset="100%" stop-color="#1e40af"/>
        </linearGradient>
        <linearGradient id="bikeMetal_${roundedBearing}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#cbd5e1"/>
          <stop offset="50%" stop-color="#64748b"/>
          <stop offset="100%" stop-color="#334155"/>
        </linearGradient>
        <filter id="bikeDropShadow_${roundedBearing}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#020617" flood-opacity="0.5"/>
        </filter>
      </defs>

      <!-- Headlight projection beam (Forward) -->
      <path d="M26 12 L16 0 L48 0 L38 12 Z" fill="url(#bikeHeadlight_${roundedBearing})"/>

      <!-- Bike Chassis with Shadow -->
      <g filter="url(#bikeDropShadow_${roundedBearing})">
        <!-- Front Wheel -->
        <rect x="29" y="4" width="6" height="14" rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
        <rect x="30.5" y="6" width="3" height="10" rx="1.5" fill="#475569"/>

        <!-- Front Fork & Mudguard -->
        <path d="M28 12 C28 9, 36 9, 36 12 L35 18 L29 18 Z" fill="url(#bikeBodyGrad_${roundedBearing})"/>
        <path d="M24 16 L29 18 M40 16 L35 18" stroke="url(#bikeMetal_${roundedBearing})" stroke-width="2" stroke-linecap="round"/>

        <!-- Handlebars and Mirrors -->
        <path d="M19 18 L29 20 L35 20 L45 18" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
        <circle cx="17" cy="17" r="2.5" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <circle cx="47" cy="17" r="2.5" fill="#38bdf8" stroke="#0f172a" stroke-width="1"/>
        <rect x="18" y="16.5" width="4" height="3" rx="1" fill="#f97316"/>
        <rect x="42" y="16.5" width="4" height="3" rx="1" fill="#f97316"/>

        <!-- Headlamp -->
        <path d="M28 14 Q32 12 36 14 Q36 17 32 17 Q28 17 28 14 Z" fill="#f0f9ff" stroke="#38bdf8" stroke-width="1.2"/>

        <!-- Fuel Tank -->
        <path d="M26 21 C24 25, 24 30, 26 33 L38 33 C40 30, 40 25, 38 21 Z" fill="url(#bikeBodyGrad_${roundedBearing})" stroke="#1d4ed8" stroke-width="0.8"/>
        <path d="M30 21 L34 21 L34 32 L30 32 Z" fill="#f97316"/>

        <!-- Rider Silhouette -->
        <path d="M20 20 Q24 27 27 29" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M44 20 Q40 27 37 29" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="32" cy="30" rx="8.5" ry="6" fill="#1e293b" stroke="#0f172a" stroke-width="1"/>
        <path d="M26 27 L28 34 M38 27 L36 34" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
        
        <!-- Helmet with Cyan Visor -->
        <ellipse cx="32" cy="27" rx="5.5" ry="6" fill="#0f172a"/>
        <path d="M28 25 Q32 22 36 25 Q36 28 32 29 Q28 28 28 25 Z" fill="#0284c7"/>
        <path d="M28.5 24 Q32 22 35.5 24" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>

        <!-- CalTrack Rear Service Box -->
        <rect x="23" y="40" width="18" height="13" rx="2.5" fill="#f8fafc" stroke="#2563eb" stroke-width="1.5"/>
        <rect x="25" y="41" width="14" height="2" rx="0.5" fill="#2563eb"/>
        <rect x="27" y="45" width="10" height="5" rx="1" fill="#2563eb"/>
        <circle cx="32" cy="47.5" r="1.5" fill="#f97316"/>

        <!-- Exhaust Pipe -->
        <rect x="39" y="37" width="2.5" height="15" rx="1" fill="url(#bikeMetal_${roundedBearing})"/>

        <!-- Rear Wheel & Taillight -->
        <rect x="29" y="51" width="6" height="10" rx="3" fill="#0f172a" stroke="#1e293b" stroke-width="1"/>
        <rect x="29" y="53" width="6" height="2" rx="1" fill="#ef4444"/>
      </g>
    </svg>
  `
}

/**
 * Creates a Leaflet DivIcon for customer live tracking with service-category vehicle visuals.
 *
 * @param {Object} options
 * @param {string} options.category - Vehicle category ('bike' | 'truck' | 'van')
 * @param {number} options.bearing - Heading in degrees [0, 360)
 * @param {string} options.status - Current job status ('on_the_way', 'arrived', etc.)
 * @param {string|null} options.techName - Technician's verified name (e.g. "Mani S")
 * @param {string|null} options.techPhoto - Optional URL to technician's photo
 * @param {number|null} options.speed - Speed in km/h or m/s
 * @param {string|null} options.etaText - Formatted ETA string e.g. "8 min"
 * @param {string|null} options.distText - Formatted distance string e.g. "2.4 km"
 * @param {string} options.freshness - Telemetry freshness state ('LIVE', 'UPDATING', etc.)
 * @param {boolean} options.showTag - Whether to render the floating badge
 */
export function createServiceVehicleMarker({
  category = "bike",
  bearing = 0,
  status = "on_the_way",
  techName = null,
  techPhoto = null,
  speed = null,
  etaText = null,
  distText = null,
  freshness = "LIVE",
  showTag = true,
} = {}) {
  const isArrived = status === "arrived"
  const isInProgress = status === "in_progress"
  const isLive = freshness === "LIVE"

  let cleanEta = etaText
  if (status === "on_the_way" && (cleanEta === "Arrived" || cleanEta === "0s" || cleanEta === "0 min")) {
    cleanEta = "< 1 min"
  }

  // Compact bottom pill — only distance + ETA, no name cluttering the map
  let pillContent = ""
  if (isArrived) {
    pillContent = `<div class="ltp-bike-pill ltp-pill-arrived"><span class="ltp-pill-dot pulse-emerald"></span>Arrived</div>`
  } else if (isInProgress) {
    pillContent = `<div class="ltp-bike-pill ltp-pill-inprogress"><span class="ltp-pill-dot pulse-blue"></span>In Progress</div>`
  } else if (distText || cleanEta) {
    const etaPart = cleanEta ? `<strong>${cleanEta}</strong>` : ""
    const distPart = distText ? `${distText}` : ""
    const sep = distText && cleanEta ? " · " : ""
    pillContent = `<div class="ltp-bike-pill">${isLive ? '<span class="ltp-pill-dot pulse-cyan"></span>' : '<span class="ltp-pill-dot dot-amber"></span>'} ${distPart}${sep}${etaPart}</div>`
  }

  const vehicleSvg = renderVehicleSvg(category, bearing)

  const html = `
    <div class="ltp-bike-container ${isArrived ? "is-arrived" : ""} ${isInProgress ? "is-inprogress" : ""}">
      <!-- Ground Radar Pulse & Location Halo -->
      <div class="ltp-bike-halo-glow"></div>
      <div class="ltp-bike-pulse-ring"></div>

      <!-- Directional Rotating Vehicle Container -->
      <div class="ltp-bike-rotator" style="transform: rotate(${Math.round(bearing)}deg); transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);">
        ${vehicleSvg}
      </div>

      <!-- Compact ETA pill below the bike only -->
      ${pillContent}
    </div>
  `

  return L.divIcon({
    className: "ltp-technician-bike-icon",
    html: html,
    iconSize: [64, 80],
    iconAnchor: [32, 40],
    popupAnchor: [0, -48],
  })
}

// Backward compatibility alias
export function createTechnicianBikeIcon(options = {}) {
  if (typeof options === "string") {
    return createServiceVehicleMarker({ techName: options })
  }
  return createServiceVehicleMarker(options)
}

/**
 * Creates a Leaflet DivIcon for the customer's service delivery address.
 */
export function createCustomerDestinationIcon() {
  const html = `
    <div class="ltp-destination-marker">
      <div class="ltp-dest-pulse"></div>
      <div class="ltp-dest-pin">
        <div class="ltp-dest-pin-inner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </div>
      <div class="ltp-dest-label">
        <span class="ltp-dest-label-txt">🏠 Your Service Location</span>
      </div>
    </div>
  `

  return L.divIcon({
    className: "ltp-customer-destination-icon",
    html: html,
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  })
}
