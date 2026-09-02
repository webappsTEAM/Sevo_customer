/**
 * Centralized SEVO Service & Category Image Resolver
 * 
 * Provides photorealistic, authentic commercial image assets and descriptive
 * accessibility alt text for every service category and workflow in the application.
 */

export const SEVO_PRIMARY_CATEGORIES = {
  for_you: {
    id: "for_you",
    slug: "for-you",
    title: "For You",
    subtitle: "Curated services & recommendations",
    image: "/assets/sevo_photo_for_you.jpg",
    alt: "Elegantly designed modern Indian living room with warm daylight and clean contemporary furnishings"
  },
  food_health: {
    id: "food_health",
    slug: "food-health",
    title: "Food and Health",
    subtitle: "Groceries & farm-fresh vegetables",
    image: "/assets/sevo_photo_food_health.jpg",
    alt: "Fresh market organic vegetables and produce neatly arranged in clean grocery display"
  },
  home_repair: {
    id: "home_repair",
    slug: "home-repair",
    title: "Home & Repair Services",
    subtitle: "Cleaning, repairs, painting & masonry",
    image: "/assets/sevo_photo_home_repair.jpg",
    alt: "Skilled service technician in professional uniform with toolkit ready for home repair"
  },
  goods_transport: {
    id: "goods_transport",
    slug: "goods-transport",
    title: "Goods & Transport",
    subtitle: "Mini trucks, 2-wheelers & logistics",
    image: "/assets/sevo_photo_goods_transport.jpg",
    alt: "Clean commercial mini transport truck parked on city road for doorstep logistics"
  }
};

export const SEVO_CORE_SERVICES = {
  hvac: {
    id: "hvac",
    name: "AC Service & Heating",
    image: "/mockups/hero_pro_ac_rect.jpg",
    alt: "Professional HVAC technician inspecting and servicing a wall-mounted split air conditioner",
    desc: "AC service, repair, gas charging & installation"
  },
  plumbing: {
    id: "plumbing",
    name: "Plumbing",
    image: "/mockups/hero_pro_plumbing_rect.jpg",
    alt: "Professional plumber in uniform fixing kitchen sink pipes and faucet with precision wrench",
    desc: "Leaks, pipes, blockages & sanitary fixtures"
  },
  electrical: {
    id: "electrical",
    name: "Electrical",
    image: "/mockups/hero_pro_electrical_rect.jpg",
    alt: "Qualified electrician inspecting electrical circuit breakers and residential wiring panel",
    desc: "Wiring, switchboards, MCBs & lighting"
  },
  cleaning: {
    id: "cleaning",
    name: "Home Cleaning",
    image: "/mockups/hero_pro_cleaning_rect.jpg",
    alt: "Professional cleaning specialist operating deep cleaning machine in modern apartment",
    desc: "Deep house cleaning, dusting & sanitization"
  },
  sofa_cleaning: {
    id: "sofa_cleaning",
    name: "Sofa & Carpet Cleaning",
    image: "/mockups/sofa_cleaning.png",
    alt: "Upholstery technician foam shampooing and vacuuming a modern fabric sofa",
    desc: "Sofa, mattress, cushion & carpet deep wash"
  },
  kitchen_cleaning: {
    id: "kitchen_cleaning",
    name: "Kitchen Deep Cleaning",
    image: "/mockups/kitchen_cleaning_hero.png",
    alt: "Deep cleaning expert degreasing kitchen chimney, gas stove, and countertop tiles",
    desc: "Complete kitchen, chimney, sink & cabinet clean"
  },
  bathroom_cleaning: {
    id: "bathroom_cleaning",
    name: "Bathroom Cleaning",
    image: "/mockups/bathroom_cleaning.png",
    alt: "Technician sanitizing bathroom ceramic wall tiles and glass shower enclosure",
    desc: "Intense bathroom scrubbing, scale removal & disinfection"
  },
  appliance_repair: {
    id: "appliance_repair",
    name: "Appliance Repair",
    image: "/mockups/hero_pro_appliance_rect.jpg",
    alt: "Skilled appliance technician diagnosing washing machine motor and electronics",
    desc: "Fridge, washing machine, microwave & oven repairs"
  },
  pest_control: {
    id: "pest_control",
    name: "Pest Control",
    image: "/mockups/pest_control_header.jpg",
    alt: "Certified pest control professional performing targeted eco-friendly treatment",
    desc: "Cockroaches, bedbugs, termites & ants eradication"
  },
  carpentry: {
    id: "carpentry",
    name: "Carpentry",
    image: "/mockups/hero_cleaning_office.jpg",
    alt: "Skilled carpenter working with precision woodworking tools on wooden furniture",
    desc: "Furniture repair, door locks, modular fittings & assembly"
  },
  painting: {
    id: "painting",
    name: "Painting & Waterproofing",
    image: "/assets/Painting/Interior.webp",
    alt: "Professional painter applying smooth fresh emulsion coat with paint roller on wall",
    desc: "Interior, exterior wall painting, waterproofing & textures"
  },
  mason: {
    id: "mason",
    name: "Masonry & Civil Works",
    image: "/mockups/brick_wall_construction_red.jpg",
    alt: "Skilled mason constructing a clean brick wall with cement mortar",
    desc: "Brickwork, wall plastering, tile laying & structural repairs"
  },
  trucks: {
    id: "trucks",
    name: "Mini Truck Transport",
    image: "/hero_minitruck_bg.png",
    alt: "Commercial mini cargo truck available for local doorstep goods movement",
    desc: "Tata Ace, 3-Wheeler & pickup trucks in Hosur"
  },
  two_wheelers: {
    id: "two_wheelers",
    name: "Two-Wheeler Delivery",
    image: "/hero_twowheeler_bg.png",
    alt: "Courier rider on two-wheeler with secured carrier box for rapid parcel delivery",
    desc: "Fast express delivery for parcels and documents"
  },
  packers_movers: {
    id: "packers_movers",
    name: "Packers & Movers",
    image: "/hero_packers_bg.png",
    alt: "Professional relocation crew carefully moving packed household goods and cartons",
    desc: "1 BHK, 2 BHK, 3 BHK & villa home shifting"
  }
};

/**
 * Resolves the appropriate photorealistic image URL for any service ID, category slug, or name.
 */
export function getSevoServiceImage(keyOrName, fallback = "/assets/sevo_photo_home_repair.jpg") {
  if (!keyOrName) return fallback;
  const normalized = String(keyOrName).toLowerCase().replace(/[\s\-_]+/g, "");

  if (normalized.includes("foryou")) return SEVO_PRIMARY_CATEGORIES.for_you.image;
  if (normalized.includes("food") || normalized.includes("health") || normalized.includes("grocer") || normalized.includes("veg")) return SEVO_PRIMARY_CATEGORIES.food_health.image;
  if (normalized.includes("transport") || normalized.includes("logistics")) return SEVO_PRIMARY_CATEGORIES.goods_transport.image;
  if (normalized.includes("homerepair") || normalized.includes("maintenance")) return SEVO_PRIMARY_CATEGORIES.home_repair.image;

  if (normalized.includes("ac") || normalized.includes("hvac") || normalized.includes("aircond")) return SEVO_CORE_SERVICES.hvac.image;
  if (normalized.includes("plumb")) return SEVO_CORE_SERVICES.plumbing.image;
  if (normalized.includes("electr")) return SEVO_CORE_SERVICES.electrical.image;
  if (normalized.includes("sofa") || normalized.includes("mattress") || normalized.includes("carpet")) return SEVO_CORE_SERVICES.sofa_cleaning.image;
  if (normalized.includes("kitchen")) return SEVO_CORE_SERVICES.kitchen_cleaning.image;
  if (normalized.includes("bath")) return SEVO_CORE_SERVICES.bathroom_cleaning.image;
  if (normalized.includes("clean") || normalized.includes("houseclean")) return SEVO_CORE_SERVICES.cleaning.image;
  if (normalized.includes("appliance") || normalized.includes("fridge") || normalized.includes("washing")) return SEVO_CORE_SERVICES.appliance_repair.image;
  if (normalized.includes("pest") || normalized.includes("cockroach") || normalized.includes("termite") || normalized.includes("bedbug")) return SEVO_CORE_SERVICES.pest_control.image;
  if (normalized.includes("carpent") || normalized.includes("wood")) return SEVO_CORE_SERVICES.carpentry.image;
  if (normalized.includes("paint")) return SEVO_CORE_SERVICES.painting.image;
  if (normalized.includes("mason") || normalized.includes("brick") || normalized.includes("plaster")) return SEVO_CORE_SERVICES.mason.image;
  if (normalized.includes("minitruck") || normalized.includes("truck")) return SEVO_CORE_SERVICES.trucks.image;
  if (normalized.includes("twowheeler") || normalized.includes("bike")) return SEVO_CORE_SERVICES.two_wheelers.image;
  if (normalized.includes("packers") || normalized.includes("mover") || normalized.includes("shifting")) return SEVO_CORE_SERVICES.packers_movers.image;

  return fallback;
}

/**
 * Returns meaningful alt text for a service or category.
 */
export function getSevoServiceAltText(keyOrName, defaultAlt = "Professional SEVO home and logistics service") {
  if (!keyOrName) return defaultAlt;
  const normalized = String(keyOrName).toLowerCase().replace(/[\s\-_]+/g, "");

  for (const cat of Object.values(SEVO_PRIMARY_CATEGORIES)) {
    if (normalized.includes(cat.id.replace(/_/g, "")) || normalized.includes(cat.slug.replace(/-/g, ""))) {
      return cat.alt;
    }
  }

  for (const srv of Object.values(SEVO_CORE_SERVICES)) {
    if (normalized.includes(srv.id.replace(/_/g, "")) || normalized.includes(srv.name.toLowerCase().replace(/[\s\-_]+/g, ""))) {
      return srv.alt;
    }
  }

  return defaultAlt;
}
