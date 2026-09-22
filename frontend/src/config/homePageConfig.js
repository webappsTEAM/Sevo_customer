// Centralized Default Configuration & Storage Service for Home / Landing Page

export const DEFAULT_HOME_PAGE_CONFIG = {
  hero: {
    badge: "Reliable. Affordable. Right at Your Doorstep.",
    mainHeadingFirst: "Professional",
    mainHeadingHighlight: "Services",
    mainHeadingLast: "Made Simple",
    subtitle: "Quick booking. Quality work. Guaranteed satisfaction.",
    searchPlaceholder: "What service do you need?",
    searchLocation: "Hosur",
    heroImage: "/assets/hero_illustration.jpg",
    heroIllustration: "/assets/hero_illustration.jpg",
    // Optional click-through for the banner image above, and an optional
    // small "Starting from ₹XXX" price sticker overlaid on it. Both blank
    // by default -- the banner itself is just the image.
    link: "",
    priceBadge: "",
    trustBadges: [
      { id: "tb-1", title: "Verified Experts", subtitle: "Background Checked", icon: "ShieldCheck", color: "teal" },
      { id: "tb-2", title: "4.8+ Rated", subtitle: "By 10K+ Customers", icon: "Star", color: "amber" },
      { id: "tb-3", title: "On-Time Service", subtitle: "Punctual & Reliable", icon: "Clock", color: "emerald" },
      { id: "tb-4", title: "Upfront Pricing", subtitle: "No Hidden Charges", icon: "IndianRupee", color: "blue" },
      { id: "tb-5", title: "Easy Booking", subtitle: "In Just 2 Minutes", icon: "CheckCircle2", color: "purple" },
      { id: "tb-6", title: "24/7 Support", subtitle: "We're Here Anytime", icon: "Headphones", color: "rose" }
    ],
    quickBadges: [
      { id: "b-1", text: "Verified Experts", title: "Verified Experts", subtitle: "Background Checked", icon: "ShieldCheck" },
      { id: "b-2", text: "4.8★ Rated", title: "4.8+ Rated", subtitle: "By 10K+ Customers", icon: "Star" },
      { id: "b-3", text: "On-Time Service", title: "On-Time Service", subtitle: "Punctual & Reliable", icon: "Clock" },
      { id: "b-4", text: "Upfront Pricing", title: "Upfront Pricing", subtitle: "No Hidden Charges", icon: "IndianRupee" },
      { id: "b-5", text: "Easy Booking", title: "Easy Booking", subtitle: "In Just 2 Minutes", icon: "CheckCircle2" },
      { id: "b-6", text: "24/7 Support", title: "24/7 Support", subtitle: "We're Here Anytime", icon: "Headphones" }
    ],
    collageImages: [
      "/mockups/hero_plumber_thumbsup.jpg",
      "/mockups/hero_cleaning_office.jpg",
      "/mockups/hero_ac_technician_female.jpg",
      "/mockups/hero_electrician_male.jpg"
    ],
    // Extra hero banner slides, beyond the base heroImage above (which
    // always counts as slide #1). Each slide is a plain { heroImage, link,
    // priceBadge } -- the banner is only ever an image the admin uploads,
    // never code-drawn text. Empty by default so a saved/published config
    // renders exactly what the admin configured; LandingPage.jsx falls back
    // to a few ready-made service photos only when this is still empty, so
    // a brand new site still shows a real rotating banner out of the box.
    // Super Admin adds/removes slides in place via Customer Web Edit Mode
    // (or the Homepage Builder preview), and the hero auto-rotates through
    // all of them every ~4.5s once there's more than one.
    slides: []
  },
  // "What do you need help with?" quick-category icon grid -- the actual
  // live section on the customer homepage. Each tile is just an icon
  // image + a name + a click-through link (a query string like
  // "?category=cleaning", a reserved "?openModal=..." shortcut for the
  // built-in sub-category popups, or a full in-app path). A fixed "More"
  // tile (opens the All Services drawer) is always appended after these
  // by the homepage itself -- it isn't part of this editable list.
  categories: [
    { id: "cat-1", name: "AC Service", image: "/assets/icon_3d_ac.jpg", link: "?category=ac_appliance&subtab=ac-service-cleaning", enabled: true },
    { id: "cat-2", name: "Cleaning", image: "/assets/icon_3d_cleaning.jpg", link: "?category=home_pest_control&subtab=full-house-cleaning", enabled: true },
    { id: "cat-3", name: "Kitchen Cleaning", image: "/mockups/kitchen_tiles_slabs_clean.png", link: "?category=home_pest_control&subtab=kitchen-cleaning", enabled: true },
    { id: "cat-4", name: "Bathroom Cleaning", image: "/mockups/bathroom_cleaning.png", link: "?category=home_pest_control&subtab=bathroom-cleaning", enabled: true },
    { id: "cat-5", name: "Appliance Repair", image: "/assets/icon_3d_appliance.jpg", link: "?category=ac_appliance&subtab=fridge", enabled: true },
    { id: "cat-6", name: "Pest Control", image: "/assets/icon_3d_pest.png", link: "?category=home_pest_control&subtab=termite-control", enabled: true },
    { id: "cat-7", name: "Sofa Cleaning", image: "/mockups/sofa_cleaning.png", link: "?category=home_pest_control&subtab=sofa-cleaning", enabled: true },
    { id: "cat-8", name: "Painting", image: "/mockups/category_home_repair_3d.jpg", link: "?category=paintings&subtab=interior-painting", enabled: true },
    { id: "cat-9", name: "Mason", image: "/mockups/service_building.png", link: "?category=mason", enabled: true },
    { id: "cat-10", name: "Groceries & Veggies", image: "/assets/cat_food_health.jpg", link: "/vegetables", enabled: true },
    { id: "cat-11", name: "Goods & Transport", image: "/assets/cat_goods_transport.jpg", link: "?category=goods_transports", enabled: true }
  ],
  pillarModal: {
    badge: "⚡Core Specialized Pillars",
    title: "Home & Repair Services",
    subtitle: "Select any service below to explore specific options, verified technicians, and transparent pricing.",
    pillars: [
      { id: "pillar-1", label: "Home Services & Pest Control", photo: "/mockups/service_cleaning.png", serviceCategoryId: "home_pest_control", enabled: true },
      { id: "pillar-2", label: "Paintings", photo: "/mockups/service_maintenance.png", serviceCategoryId: "paintings", enabled: true },
      { id: "pillar-3", label: "Mason", photo: "/mockups/service_building.png", serviceCategoryId: "mason", enabled: true },
      { id: "pillar-4", label: "AC & Appliance", photo: "/mockups/service_hvac.png", serviceCategoryId: "ac_appliance", enabled: true },
      { id: "pillar-5", label: "Goods & Transport", photo: "/assets/cat_goods_transport.jpg", serviceCategoryId: "goods_transports", enabled: true }
    ]
  },
  subServicesModal: {
    title: "Home Cleaning & Pest Control",
    cleaningSectionTitle: "Home Cleaning",
    pestSectionTitle: "Pest Control",
    cleaningItems: [
      { id: "clean-1", name: "Kitchen Cleaning", categoryId: "kitchen_cleaning", enabled: true },
      { id: "clean-2", name: "Sofa Cleaning", categoryId: "sofa_cleaning", enabled: true },
      { id: "clean-3", name: "Bathroom Cleaning", categoryId: "bathroom_cleaning", enabled: true },
      { id: "clean-4", name: "Full House Cleaning", categoryId: "cleaning", enabled: true }
    ],
    pestItems: [
      { id: "pest-1", name: "Cockroach & Termite Control", categoryId: "pest_control", enabled: true },
      { id: "pest-2", name: "Ants & Bed Bugs Control", categoryId: "pest_control", enabled: true }
    ]
  },
  vendorBanner: {
    enabled: true,
    badgeText: "We're Looking for Professionals",
    badgeIcon: "🤝",
    titlePrefix: "We Hire",
    titleHighlight: "Technicians, Employees",
    titleSuffix: "& Vendors",
    subtitle: "Join our team of skilled professionals and be part of a growing service community that works with trust and quality.",
    ctaText: "Join as a Professional",
    ctaUrl: "https://calservices-vendor.vercel.app",
    learnMoreText: "Learn more",
    learnMoreUrl: "https://calservices-vendor.vercel.app",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=320&h=420&q=90&fit=crop&crop=top",
    features: [
      { id: "vf-1", icon: "📅", label: "Flexible Timings" },
      { id: "vf-2", icon: "💼", label: "Stable Work" },
      { id: "vf-3", icon: "🤝", label: "Team Support" }
    ],
    benefits: [
      { id: "vb-1", icon: "✅", text: "Verified & trusted customers" },
      { id: "vb-2", icon: "🕐", text: "On-time service & support" },
      { id: "vb-3", icon: "📍", text: "Work close to your area" },
      { id: "vb-4", icon: "🌟", text: "Recognition for quality work" }
    ]
  },
  offers: {
    title: "Limited Time Offers!",
    subtitle: "Great deals on services you love.",
    mainCard: {
      title: "Limited Time Offers!",
      subtitle: "Great deals on services you love.",
      buttonText: "Explore Offers",
      bgColor: "bg-teal-700 text-white"
    },
    // Each card is a single admin-uploaded banner image + an optional
    // click-through link -- no code-drawn tag/discount/title text on top of
    // it (the design, discount %, everything is baked into the image the
    // admin uploads). "title" is kept only as alt text / accessibility
    // label for the image, it is never rendered as visible text.
    items: [
      {
        id: "off-1",
        image: "/assets/hero_pro_cleaning_rect.jpg",
        title: "Home Cleaning Offer",
        link: "?category=cleaning",
        enabled: true
      },
      {
        id: "off-2",
        image: "/assets/hero_pro_electrical_rect.jpg",
        title: "Electrical Offer",
        link: "?category=electrical",
        enabled: true
      },
      {
        id: "off-3",
        image: "/assets/hero_pro_ac_rect.jpg",
        title: "AC Service Offer",
        link: "?category=hvac",
        enabled: true
      }
    ]
  },
  trustBadges: [
    {
      id: "t-1",
      title: "Verified & Background Checked",
      description: "Skilled professionals you can trust.",
      icon: "ShieldCheck",
      enabled: true
    },
    {
      id: "t-2",
      title: "Transparent & Fair Pricing",
      description: "No hidden charges, what you see is what you pay.",
      icon: "BadgeCheck",
      enabled: true
    },
    {
      id: "t-3",
      title: "On-time Service",
      description: "We value your time as much as you do.",
      icon: "Clock",
      enabled: true
    },
    {
      id: "t-4",
      title: "Service Warranty",
      description: "We stand by the quality of our work.",
      icon: "Award",
      enabled: true
    },
    {
      id: "t-5",
      title: "24/7 Customer Support",
      description: "We're here whenever you need us.",
      icon: "Headphones",
      enabled: true
    }
  ],
  howItWorks: {
    heading: "How It Works",
    steps: [
      {
        num: 1,
        title: "Choose Service",
        description: "Select the service you need",
        color: "bg-teal-50 text-teal-600 border-teal-200"
      },
      {
        num: 2,
        title: "Pick Date & Time",
        description: "Choose a convenient slot",
        color: "bg-pink-50 text-pink-600 border-pink-200"
      },
      {
        num: 3,
        title: "We Assign Expert",
        description: "We'll assign the best professional",
        color: "bg-indigo-50 text-indigo-600 border-indigo-200"
      },
      {
        num: 4,
        title: "Service at Your Door",
        description: "Expert arrives & gets the job done",
        color: "bg-amber-50 text-amber-600 border-amber-200"
      },
      {
        num: 5,
        title: "Pay & Rate",
        description: "Make payment & share your feedback",
        color: "bg-sky-50 text-sky-600 border-sky-200"
      }
    ]
  },
  statsBar: [
    { id: "st-1", number: "45K+", label: "Happy Customers" },
    { id: "st-2", number: "1200+", label: "Verified Experts" },
    { id: "st-3", number: "85K+", label: "Services Completed" },
    { id: "st-4", number: "30 min", label: "Average Response" },
    { id: "st-5", number: "4.8/5", label: "Average Rating" }
  ],
  featuredPros: {
    title: "Featured Professionals",
    subtitle: "Top-rated experts ready to help",
    pros: [
      {
        id: "p-1",
        name: "Sarah J.",
        title: "Licensed Electrician",
        rating: 4.9,
        jobs: "620+",
        image: "/mockups/service_electrical.png"
      },
      {
        id: "p-2",
        name: "Elite Plumbing",
        title: "Plumbing Specialist",
        rating: 4.8,
        jobs: "540+",
        image: "/mockups/service_plumbing.png"
      },
      {
        id: "p-3",
        name: "Advanced Climate",
        title: "AC & Appliance Tech",
        rating: 4.9,
        jobs: "410+",
        image: "/mockups/service_hvac.png"
      },
      {
        id: "p-4",
        name: "Eco Shine",
        title: "Home Cleaning Pro",
        rating: 4.7,
        jobs: "780+",
        image: "/mockups/service_cleaning.png"
      }
    ]
  },
  testimonials: {
    title: "What Our Customers Say",
    viewAllText: "View all reviews →",
    reviews: [
      {
        id: "rev-1",
        initials: "KR",
        name: "Kavya R.",
        rating: 5,
        text: "Booked cleaning service and the professional was punctual and did a fantastic job!",
        cat: "cleaning",
        badgeColor: "bg-teal-500"
      },
      {
        id: "rev-2",
        initials: "AS",
        name: "Arvind S.",
        rating: 5,
        text: "Very professional electrician. Fixed the issue quickly and the pricing was fair.",
        cat: "electrical",
        badgeColor: "bg-emerald-600"
      },
      {
        id: "rev-3",
        initials: "PM",
        name: "Priya M.",
        rating: 5,
        text: "Great experience with the painting service. Highly recommend Sevo!",
        cat: "painting",
        badgeColor: "bg-teal-600"
      }
    ]
  },
  footer: {
    brandName: "Sevo",
    tagline: "Your trusted partner for all home services. Quality you can count on.",
    servicesColTitle: "Services",
    servicesLinks: [
      "Home Services & Pest Control",
      "Paintings",
      "Mason",
      "AC & Appliance"
    ],
    companyColTitle: "Company",
    companyLinks: ["About Us", "Careers", "Blog", "Become a Partner"],
    helpColTitle: "Need Help?",
    phone: "+91 98765 43210",
    email: "support@caldimengg.com",
    workingHours: "Mon – Sun (8 AM – 8 PM)",
    copyrightText: "© 2026 CALDIM ENGINEERING PRIVATE LIMITED. All rights reserved."
  },
  // Added 2026-09-17 per explicit request ("add a side section 'Mobile' ...
  // give the access to upload the banners, advertisement, top cards
  // [Groceries, Services] images"). Kept as its own top-level key, separate
  // from "hero"/"offers"/"categories" above, so an admin can upload
  // different creative for the mobile app without touching the website —
  // and so the app never accidentally shows a web-only asset. Consumed by
  // the customer app's homepage_repository.dart / home_screen.dart via
  // GET /api/settings/homepage/'s "mobile" key.
  mobile: {
    // Home-screen banner carousel -- same shape as offers.items (a single
    // admin-uploaded image + an optional click-through link, no
    // code-drawn text on top of it).
    banners: [],
    // In-app advertisement card(s) -- same shape as banners.
    ads: [],
    // The quick-access card row at the top of the app's Home screen.
    // Fixed 2026-09-18 per explicit request ("Top cards 'Groceries' and
    // 'Services' could be editable like add new, delete and make text also
    // editable from admin panel"): this used to be a fixed { groceries,
    // services } pair with only an image+link each and no editable label.
    // Now a plain list -- any number of cards, each with its own id, label,
    // image and link -- so the admin can add, delete and relabel cards, not
    // just swap their photo. Falls back to the matching catalog category's
    // own image on the app side when a card's image is left empty here.
    topCards: [
      { id: "groceries", label: "Groceries", image: "", link: "", enabled: true },
      { id: "services", label: "Services", image: "", link: "", enabled: true }
    ]
  }
}

export const STORAGE_KEY = "calservices_homepage_config_v1"

export function getHomePageConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return mergeWithDefaultConfig(JSON.parse(saved))
    }
  } catch (err) {
    console.warn("Failed to parse local homepage config", err)
  }
  return DEFAULT_HOME_PAGE_CONFIG
}

import { resolveImageUrl } from "../utils/imageUrl.js"

export function resolveDisplayImageUrl(path, fallback = "") {
  return resolveImageUrl(path, fallback)
}

const CATEGORY_IMAGE_MAP = {
  ac: "/assets/icon_3d_ac.jpg",
  hvac: "/assets/icon_3d_ac.jpg",
  cool: "/assets/icon_3d_ac.jpg",
  clean: "/assets/icon_3d_cleaning.jpg",
  plumb: "/assets/icon_3d_plumbing.jpg",
  elect: "/assets/icon_3d_electrical.jpg",
  appliance: "/assets/icon_3d_appliance.jpg",
  pest: "/assets/icon_3d_pest.png",
  paint: "/mockups/category_home_repair_3d.jpg",
  grocer: "/assets/cat_food_health.jpg",
  food: "/assets/cat_food_health.jpg",
  veg: "/assets/cat_food_health.jpg",
  transport: "/assets/cat_goods_transport.jpg",
  goods: "/assets/cat_goods_transport.jpg",
  logistics: "/assets/cat_goods_transport.jpg",
  repair: "/assets/cat_home_repair.jpg",
  carpenter: "/mockups/service_maintenance.png",
  carpentry: "/mockups/service_maintenance.png",
  salon: "/assets/cat_food_health.jpg",
}

const DEFAULT_CATEGORY_FALLBACKS = [
  "/assets/icon_3d_ac.jpg",
  "/assets/icon_3d_cleaning.jpg",
  "/assets/icon_3d_plumbing.jpg",
  "/assets/icon_3d_electrical.jpg",
  "/assets/icon_3d_appliance.jpg",
  "/assets/icon_3d_pest.png",
  "/mockups/category_home_repair_3d.jpg",
  "/assets/cat_food_health.jpg",
  "/assets/cat_goods_transport.jpg"
]

export function getCategorySafeImage(cat, idx = 0) {
  const img = cat?.image || cat?.image_url
  if (img && img !== "undefined" && img !== "null" && typeof img === "string" && img.trim()) {
    return resolveImageUrl(img)
  }
  const key = `${cat?.id || ""} ${cat?.name || ""} ${cat?.title || ""} ${cat?.link || ""}`.toLowerCase()
  for (const [k, fallback] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (key.includes(k)) return fallback
  }
  return DEFAULT_CATEGORY_FALLBACKS[idx % DEFAULT_CATEGORY_FALLBACKS.length]
}

const DEFAULT_OFFER_IMAGES = [
  "/assets/cat_food_health.jpg",
  "/assets/hero_pro_electrical_rect.jpg",
  "/assets/hero_pro_ac_rect.jpg",
  "/assets/hero_pro_cleaning_rect.jpg",
  "/assets/hero_pro_appliance_rect.jpg"
]

export function getOfferSafeImage(offer, idx = 0) {
  const img = offer?.image || offer?.image_url
  if (img && img !== "undefined" && img !== "null" && typeof img === "string" && img.trim()) {
    return resolveImageUrl(img)
  }
  const lower = `${offer?.title || ""} ${offer?.tag || ""} ${offer?.link || ""}`.toLowerCase()
  if (lower.includes("grocer") || lower.includes("food") || lower.includes("veg")) {
    return "/assets/cat_food_health.jpg"
  }
  if (lower.includes("elect") || lower.includes("repair") || lower.includes("coupon")) {
    return "/assets/hero_pro_electrical_rect.jpg"
  }
  if (lower.includes("ac") || lower.includes("cool") || lower.includes("flat")) {
    return "/assets/hero_pro_ac_rect.jpg"
  }
  return DEFAULT_OFFER_IMAGES[idx % DEFAULT_OFFER_IMAGES.length]
}

export function mergeWithDefaultConfig(parsed) {
  if (!parsed) return DEFAULT_HOME_PAGE_CONFIG

  const parsedHero = parsed.hero || {}
  const rawCollage = Array.isArray(parsedHero.collageImages) ? parsedHero.collageImages : []
  const defaultCollage = DEFAULT_HOME_PAGE_CONFIG.hero.collageImages
  const mergedCollage = [0, 1, 2, 3].map((i) => {
    const rawVal = rawCollage[i]
    if (!rawVal || rawVal === "undefined" || rawVal === "null") {
      return defaultCollage[i]
    }
    return resolveDisplayImageUrl(rawVal, defaultCollage[i])
  })

  let mergedHeroImage = resolveDisplayImageUrl(
    parsedHero.heroImage || parsedHero.heroIllustration,
    DEFAULT_HOME_PAGE_CONFIG.hero.heroImage
  )
  if (!mergedHeroImage || mergedHeroImage === "undefined" || mergedHeroImage === "null") {
    mergedHeroImage = "/assets/hero_illustration.jpg"
  }

  const defaultSlideImages = [
    "/assets/hero_pro_ac_rect.jpg",
    "/assets/hero_pro_cleaning_rect.jpg",
    "/assets/hero_pro_electrical_rect.jpg"
  ]
  const rawSlides = Array.isArray(parsedHero.slides) ? parsedHero.slides : []
  const mergedSlides = rawSlides.map((s, idx) => {
    let img = s.heroImage || s.heroImage_url || ""
    if (!img || img === "undefined" || img === "null") {
      img = defaultSlideImages[idx % defaultSlideImages.length]
    } else {
      img = resolveDisplayImageUrl(img, defaultSlideImages[idx % defaultSlideImages.length])
    }
    return {
      ...s,
      heroImage: img,
      heroImage_url: img
    }
  })

  const defaultTrustBadges = DEFAULT_HOME_PAGE_CONFIG.hero.trustBadges
  const rawTrustBadges = Array.isArray(parsedHero.trustBadges) && parsedHero.trustBadges.length > 0
    ? parsedHero.trustBadges
    : (Array.isArray(parsedHero.quickBadges) && parsedHero.quickBadges[0]?.title
        ? parsedHero.quickBadges
        : defaultTrustBadges)

  const mergedTrustBadges = defaultTrustBadges.map((defBadge, idx) => {
    const userBadge = rawTrustBadges[idx] || {}
    return {
      ...defBadge,
      ...userBadge,
      title: userBadge.title || userBadge.text || defBadge.title,
      subtitle: userBadge.subtitle || defBadge.subtitle,
      icon: userBadge.icon || defBadge.icon
    }
  })

  const sanitizeCategoryLink = (link = "") => {
    if (!link) return ""
    if (link.includes("openModal=ac")) return "?category=hvac"
    if (link.includes("openModal=homepest") || link.includes("openModal=subcategories")) return "?category=pest_control"
    if (link.includes("openModal=pillars")) return "?category=cleaning"
    return link
  }

  const defaultCategories = DEFAULT_HOME_PAGE_CONFIG.categories
  const rawCategories = Array.isArray(parsed.categories) && parsed.categories.length > 0
    ? parsed.categories
    : defaultCategories

  const mergedCategories = rawCategories.map((cat, idx) => {
    const name = cat.name || cat.title || defaultCategories[idx]?.name || `Service ${idx + 1}`
    const image = getCategorySafeImage(cat, idx)
    return {
      ...cat,
      name,
      title: cat.title || name,
      image,
      link: sanitizeCategoryLink(cat.link)
    }
  })

  const defaultOffers = DEFAULT_HOME_PAGE_CONFIG.offers
  const rawOffers = parsed.offers || {}
  const rawOfferItems = Array.isArray(rawOffers.items) && rawOffers.items.length > 0
    ? rawOffers.items
    : defaultOffers.items

  const mergedOfferItems = rawOfferItems.map((item, idx) => ({
    ...item,
    image: getOfferSafeImage(item, idx)
  }))

  const mergedOffers = {
    ...defaultOffers,
    ...rawOffers,
    items: mergedOfferItems
  }

  // Pillar Modal merge
  const defaultPillars = DEFAULT_HOME_PAGE_CONFIG.pillarModal.pillars
  const parsedPillars = parsed.pillarModal?.pillars || []
  const mergedPillars = defaultPillars.map((defPillar, idx) => {
    const userPillar = parsedPillars[idx] || parsedPillars.find(p => p.id === defPillar.id) || {}
    const resolvedPhoto = resolveDisplayImageUrl(userPillar.photo || userPillar.image, defPillar.photo)
    return {
      ...defPillar,
      ...userPillar,
      label: userPillar.label || defPillar.label,
      photo: resolvedPhoto,
      image: resolvedPhoto,
      enabled: userPillar.enabled !== undefined ? userPillar.enabled : defPillar.enabled
    }
  })

  const mergedPillarModal = {
    ...DEFAULT_HOME_PAGE_CONFIG.pillarModal,
    ...(parsed.pillarModal || {}),
    pillars: mergedPillars
  }

  // SubServices Modal merge
  const defaultCleaning = DEFAULT_HOME_PAGE_CONFIG.subServicesModal.cleaningItems
  const defaultPest = DEFAULT_HOME_PAGE_CONFIG.subServicesModal.pestItems
  const parsedCleaning = parsed.subServicesModal?.cleaningItems || []
  const parsedPest = parsed.subServicesModal?.pestItems || []

  const mergedCleaningItems = defaultCleaning.map((defItem, idx) => {
    const userItem = parsedCleaning[idx] || parsedCleaning.find(i => i.id === defItem.id) || {}
    return {
      ...defItem,
      ...userItem,
      name: userItem.name || defItem.name,
      badge: userItem.badge || defItem.badge
    }
  })

  const mergedPestItems = defaultPest.map((defItem, idx) => {
    const userItem = parsedPest[idx] || parsedPest.find(i => i.id === defItem.id) || {}
    return {
      ...defItem,
      ...userItem,
      name: userItem.name || defItem.name,
      badge: userItem.badge || defItem.badge
    }
  })

  const mergedSubServicesModal = {
    ...DEFAULT_HOME_PAGE_CONFIG.subServicesModal,
    ...(parsed.subServicesModal || {}),
    cleaningItems: mergedCleaningItems,
    pestItems: mergedPestItems
  }

  // Mobile section merge -- banners/ads/topCards are all plain lists (no
  // per-index default fallback needed, unlike offers/categories, since an
  // empty list is a perfectly valid "nothing configured yet" state).
  //
  // Fixed 2026-09-18: topCards used to be a fixed { groceries, services }
  // object -- now an admin-managed list, any length, each item carrying its
  // own editable label. A config saved before this change (or the very
  // first default) may still have that old object shape; upgrade it to the
  // equivalent 2-item list in memory here so nothing already published is
  // lost -- the next Publish click saves it back as a real list.
  const parsedMobile = parsed.mobile || {}
  const rawTopCards = parsedMobile.topCards
  const topCardsList = Array.isArray(rawTopCards)
    ? rawTopCards
    : (rawTopCards && typeof rawTopCards === "object"
        ? [
            { id: "groceries", label: "Groceries", ...(rawTopCards.groceries || {}) },
            { id: "services", label: "Services", ...(rawTopCards.services || {}) }
          ]
        : DEFAULT_HOME_PAGE_CONFIG.mobile.topCards)

  const mergedMobile = {
    ...DEFAULT_HOME_PAGE_CONFIG.mobile,
    ...parsedMobile,
    banners: (Array.isArray(parsedMobile.banners) ? parsedMobile.banners : []).map((b) => ({
      ...b,
      image: resolveDisplayImageUrl(b.image, "")
    })),
    ads: (Array.isArray(parsedMobile.ads) ? parsedMobile.ads : []).map((a) => ({
      ...a,
      image: resolveDisplayImageUrl(a.image, "")
    })),
    topCards: topCardsList.map((card, idx) => ({
      id: card.id || `tc-${idx}`,
      label: card.label || "",
      link: card.link || "",
      enabled: card.enabled !== undefined ? card.enabled : true,
      ...card,
      image: resolveDisplayImageUrl(card.image, "")
    }))
  }

  return {
    ...DEFAULT_HOME_PAGE_CONFIG,
    ...parsed,
    mobile: mergedMobile,
    hero: {
      ...DEFAULT_HOME_PAGE_CONFIG.hero,
      ...parsedHero,
      heroImage: mergedHeroImage,
      heroIllustration: mergedHeroImage,
      slides: mergedSlides,
      trustBadges: mergedTrustBadges,
      quickBadges: mergedTrustBadges.map(b => ({ id: b.id, text: b.title, title: b.title, subtitle: b.subtitle, icon: b.icon })),
      collageImages: mergedCollage
    },
    categories: mergedCategories,
    pillarModal: mergedPillarModal,
    subServicesModal: mergedSubServicesModal,
    vendorBanner: { ...DEFAULT_HOME_PAGE_CONFIG.vendorBanner, ...(parsed.vendorBanner || {}) },
    offers: mergedOffers,
    howItWorks: { ...DEFAULT_HOME_PAGE_CONFIG.howItWorks, ...(parsed.howItWorks || {}) },
    featuredPros: { ...DEFAULT_HOME_PAGE_CONFIG.featuredPros, ...(parsed.featuredPros || {}) },
    testimonials: { ...DEFAULT_HOME_PAGE_CONFIG.testimonials, ...(parsed.testimonials || {}) },
    footer: { ...DEFAULT_HOME_PAGE_CONFIG.footer, ...(parsed.footer || {}) }
  }
}

export async function fetchPublishedHomePageConfig() {
  try {
    const res = await fetch("/api/settings/homepage/", { cache: "no-store" })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.config) {
        const merged = mergeWithDefaultConfig(data.config)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        return merged
      }
    }
  } catch (err) {
    console.warn("API fetch error for homepage config:", err)
  }
  return getHomePageConfig()
}

export async function publishHomePageConfig(newConfig) {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken")
    const res = await fetch("/api/settings/homepage/", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ config: newConfig })
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success && data.config) {
        const merged = mergeWithDefaultConfig(data.config)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        window.dispatchEvent(new CustomEvent("calservices:homepage_updated", { detail: merged }))
        return { success: true, config: merged }
      }
    } else {
      const errorData = await res.json().catch(() => ({}))
      return { success: false, error: errorData.error || `Server error (${res.status})` }
    }
  } catch (err) {
    console.error("Failed to publish homepage config:", err)
    return { success: false, error: "Network error publishing homepage config" }
  }
  return { success: false, error: "Failed to publish homepage config" }
}

export function saveHomePageConfig(newConfig) {
  const merged = mergeWithDefaultConfig(newConfig)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  window.dispatchEvent(new CustomEvent("calservices:homepage_updated", { detail: merged }))
  publishHomePageConfig(newConfig)
  return true
}

export function resetHomePageConfig() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent("calservices:homepage_updated", { detail: DEFAULT_HOME_PAGE_CONFIG }))
  publishHomePageConfig(DEFAULT_HOME_PAGE_CONFIG)
  return DEFAULT_HOME_PAGE_CONFIG
}

export async function fetchDirectImageUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") return inputUrl
  return inputUrl.trim()
}
