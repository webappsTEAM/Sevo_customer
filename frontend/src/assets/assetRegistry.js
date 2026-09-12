/**
 * assetRegistry.js
 * SEVO Central Asset Registry
 *
 * Strict Policy Enforcement:
 * - All UI images, icons, product photos, and category visuals must resolve
 *   exclusively from the established local repository library.
 * - Zero external URLs, zero stock placeholders.
 */

export const ASSET_REGISTRY = {
  // Brand & Shell
  'brand-emblem': {
    id: 'brand-emblem',
    url: '/mockups/sevo_emblem_transparent.png',
    alt: 'SEVO emblem',
    type: 'brand',
    aspectRatio: '1/1',
  },
  'brand-logo': {
    id: 'brand-logo',
    url: '/mockups/sevo_logo_transparent.png',
    alt: 'SEVO logo',
    type: 'brand',
    aspectRatio: '3/1',
  },
  'brand-app-icon': {
    id: 'brand-app-icon',
    url: '/mockups/sevo_app_icon.png',
    alt: 'SEVO app icon',
    type: 'brand',
    aspectRatio: '1/1',
  },
  'bike-partner': {
    id: 'bike-partner',
    url: '/mockups/hero_technician_circular.png',
    alt: 'SEVO delivery partner',
    type: 'icon',
    aspectRatio: '1/1',
  },

  // Category Visuals
  'cat-compressors': {
    id: 'cat-compressors',
    url: '/mockups/service_hvac.png',
    alt: 'Compressors & Systems',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-filters': {
    id: 'cat-filters',
    url: '/mockups/service_maintenance.png',
    alt: 'Filters & Separation',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-dryers': {
    id: 'cat-dryers',
    url: '/mockups/icon_3d_vacuum.jpg',
    alt: 'Dryers & Moisture Removal',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-lubricants': {
    id: 'cat-lubricants',
    url: '/mockups/gas_stove_clean.png',
    alt: 'Lubricants & Oils',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-valves': {
    id: 'cat-valves',
    url: '/mockups/icon_3d_tap.jpg',
    alt: 'Valves & Regulators',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-hoses': {
    id: 'cat-hoses',
    url: '/mockups/drain_clean.png',
    alt: 'Hoses & Fittings',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-spareparts': {
    id: 'cat-spareparts',
    url: '/mockups/icon_3d_lightning.jpg',
    alt: 'Spare Parts & Electricals',
    type: 'category',
    aspectRatio: '1/1',
  },
  'cat-all': {
    id: 'cat-all',
    url: '/mockups/icon_3d_more_grid.jpg',
    alt: 'All Categories',
    type: 'category',
    aspectRatio: '1/1',
  },

  // Products (Industrial & Commercial Parts)
  'prod-screw-compressor': {
    id: 'prod-screw-compressor',
    url: '/mockups/service_building.png',
    alt: 'Atlas Copco Screw Compressor GA55',
    type: 'product',
    category: 'Compressors',
    aspectRatio: '1/1',
    sku: 'CP-GA55-01',
  },
  'prod-piston-compressor': {
    id: 'prod-piston-compressor',
    url: '/mockups/service_inspection.png',
    alt: 'Ingersoll Rand Air Compressor 5HP',
    type: 'product',
    category: 'Compressors',
    aspectRatio: '1/1',
    sku: 'CP-IR5-02',
  },
  'prod-air-filter-element': {
    id: 'prod-air-filter-element',
    url: '/mockups/appliance_cleaning_hero.png',
    alt: 'Atlas Copco Air Filter Element',
    type: 'product',
    category: 'Filters',
    aspectRatio: '1/1',
    sku: 'AC-10254',
  },
  'prod-ir-air-filter': {
    id: 'prod-ir-air-filter',
    url: '/mockups/appliance_cleaning_thumb.png',
    alt: 'Ingersoll Rand Air Filter Cartridge',
    type: 'product',
    category: 'Filters',
    aspectRatio: '1/1',
    sku: 'FL-IR99-03',
  },
  'prod-sullair-air-filter': {
    id: 'prod-sullair-air-filter',
    url: '/mockups/service_cleaning.png',
    alt: 'Sullair Precision Air Filter Element',
    type: 'product',
    category: 'Filters',
    aspectRatio: '1/1',
    sku: 'FL-SL44-04',
  },
  'prod-pressure-gauge': {
    id: 'prod-pressure-gauge',
    url: '/mockups/service_electrical.png',
    alt: 'Industrial Pressure Gauge 0-16 bar',
    type: 'product',
    category: 'Valves',
    aspectRatio: '1/1',
    sku: 'GA-16B-05',
  },
  'prod-lubricant-oil': {
    id: 'prod-lubricant-oil',
    url: '/mockups/sandwich_griller.png',
    alt: 'Compressor Synthetic Lubricant Oil (5L)',
    type: 'product',
    category: 'Lubricants',
    aspectRatio: '1/1',
    sku: 'LB-SYN5L-06',
  },
  'prod-kaeser-filter': {
    id: 'prod-kaeser-filter',
    url: '/mockups/kitchen_basic_cleaning_card.png',
    alt: 'Kaeser Micron Air Filter',
    type: 'product',
    category: 'Filters',
    aspectRatio: '1/1',
    sku: 'FL-KS12-07',
  },
  'prod-donaldson-filter': {
    id: 'prod-donaldson-filter',
    url: '/mockups/hero_sevo_circle.png',
    alt: 'Donaldson Heavy-Duty Air Filter',
    type: 'product',
    category: 'Filters',
    aspectRatio: '1/1',
    sku: 'FL-DN88-08',
  },

  // Fresh Daily Produce (Quick Commerce Groceries)
  'prod-veg-tomato': {
    id: 'prod-veg-tomato',
    url: '/mockups/veg_tomato.png',
    alt: 'Farm Fresh Hybrid Tomatoes (500g)',
    type: 'product',
    category: 'Fresh Produce',
    aspectRatio: '1/1',
    sku: 'VG-TOM-01',
  },
  'prod-veg-potato': {
    id: 'prod-veg-potato',
    url: '/mockups/veg/potato.jpg',
    alt: 'Fresh Mountain Potatoes (1kg)',
    type: 'product',
    category: 'Fresh Produce',
    aspectRatio: '1/1',
    sku: 'VG-POT-02',
  },
  'prod-veg-onion': {
    id: 'prod-veg-onion',
    url: '/mockups/veg/onion.jpg',
    alt: 'Nasik Red Onions (1kg)',
    type: 'product',
    category: 'Fresh Produce',
    aspectRatio: '1/1',
    sku: 'VG-ONI-03',
  },
  'prod-veg-spinach': {
    id: 'prod-veg-spinach',
    url: '/mockups/veg/spinach.jpg',
    alt: 'Fresh Cleaned Palak / Spinach (250g)',
    type: 'product',
    category: 'Fresh Produce',
    aspectRatio: '1/1',
    sku: 'VG-SPI-04',
  },

  // Hero & Banners
  'hero-banner-main': {
    id: 'hero-banner-main',
    url: '/mockups/groceries_realistic.png',
    alt: 'Genuine Parts Faster Operations - Up to 50% Off',
    type: 'banner',
    aspectRatio: '16/9',
  },
  'empty-state-box': {
    id: 'empty-state-box',
    url: '/mockups/service_transport.jpg',
    alt: 'No products found',
    type: 'illustration',
    aspectRatio: '4/3',
  },
  'partner-avatar': {
    id: 'partner-avatar',
    url: '/mockups/hero_technician_circular.png',
    alt: 'Ramesh - Delivery Partner',
    type: 'avatar',
    aspectRatio: '1/1',
  },
  'user-avatar': {
    id: 'user-avatar',
    url: '/mockups/hero_pro_ac_circle.jpg',
    alt: 'Customer Profile',
    type: 'avatar',
    aspectRatio: '1/1',
  },
};

/**
 * Returns approved asset metadata or safe fallback.
 */
export function getApprovedAsset(assetId) {
  if (ASSET_REGISTRY[assetId]) {
    return ASSET_REGISTRY[assetId];
  }
  return {
    id: 'fallback',
    url: '/mockups/sevo_emblem_transparent.png',
    alt: 'SEVO asset',
    type: 'fallback',
    aspectRatio: '1/1',
  };
}

/**
 * Resolves a URL or asset key safely. Prevents external URLs.
 */
export function resolveAssetUrl(keyOrUrl) {
  if (!keyOrUrl) return '/mockups/sevo_emblem_transparent.png';
  if (ASSET_REGISTRY[keyOrUrl]) {
    return ASSET_REGISTRY[keyOrUrl].url;
  }
  // Block any forbidden external protocol
  if (typeof window !== 'undefined' && (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://'))) {
    if (!keyOrUrl.includes(window.location.hostname) && !keyOrUrl.includes('187.52.121.98')) {
      console.warn(`[AssetRegistry] Blocked unapproved external URL: ${keyOrUrl}`);
      return '/mockups/sevo_emblem_transparent.png';
    }
  }
  return keyOrUrl;
}
