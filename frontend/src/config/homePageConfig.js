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
    ]
  },
  categories: [
    {
      id: "cat-1",
      title: "For You",
      subtitle: "Curated services & recommendations",
      badge: "For You",
      badgeColor: "emerald",
      image: "/assets/sevo_photo_for_you.jpg",
      link: "/booking?category=for_you",
      enabled: true
    },
    {
      id: "cat-2",
      title: "Food and Health",
      subtitle: "Groceries & farm-fresh vegetables",
      badge: "Groceries & Veggies",
      badgeColor: "amber",
      image: "/assets/sevo_photo_food_health.jpg",
      link: "/booking?category=groceries",
      enabled: true
    },
    {
      id: "cat-3",
      title: "Home & Repair Services",
      subtitle: "Cleaning, repairs, painting & masonry",
      badge: "5 Services",
      badgeColor: "blue",
      image: "/assets/sevo_photo_home_repair.jpg",
      link: "/booking?category=home_repairs",
      enabled: true
    },
    {
      id: "cat-4",
      title: "Goods & Transport",
      subtitle: "Mini trucks, 2-wheelers & logistics",
      badge: "Transport",
      badgeColor: "teal",
      image: "/assets/sevo_photo_goods_transport.jpg",
      link: "/logistics",
      enabled: true
    }
  ],
  pillarModal: {
    badge: "⚡ 5 Core Specialized Pillars",
    title: "Home & Repair Services",
    subtitle: "Select any service below to explore specific options, verified technicians, and transparent pricing.",
    pillars: [
      { id: "pillar-1", label: "Home Services & Pest Control", photo: "/mockups/service_cleaning.png", serviceCategoryId: "pest_control", enabled: true },
      { id: "pillar-2", label: "Paintings", photo: "/mockups/service_maintenance.png", serviceCategoryId: "painting", enabled: true },
      { id: "pillar-3", label: "Mason", photo: "/mockups/service_building.png", serviceCategoryId: "mason", enabled: true },
      { id: "pillar-4", label: "AC & Appliance", photo: "/mockups/service_hvac.png", serviceCategoryId: "hvac", enabled: true },
      { id: "pillar-5", label: "Electrician, Plumbing & Carpentry", photo: "/mockups/service_electrical.png", serviceCategoryId: "electrical", enabled: true }
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
    items: [
      {
        id: "off-1",
        tag: "UPTO",
        discount: "20% OFF",
        title: "on Home Cleaning",
        cta: "Book Now →",
        bgColor: "bg-amber-50 text-amber-900 border-amber-100",
        enabled: true
      },
      {
        id: "off-2",
        tag: "FLAT",
        discount: "15% OFF",
        title: "on Painting",
        cta: "Book Now →",
        bgColor: "bg-rose-50 text-rose-900 border-rose-100",
        enabled: true
      },
      {
        id: "off-3",
        tag: "UPTO",
        discount: "₹500 OFF",
        title: "on AC Service",
        cta: "Book Now →",
        bgColor: "bg-indigo-50 text-indigo-900 border-indigo-100",
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
  }
}

const STORAGE_KEY = "calservices_homepage_config_v1"

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

function mergeWithDefaultConfig(parsed) {
  if (!parsed) return DEFAULT_HOME_PAGE_CONFIG

  const parsedHero = parsed.hero || {}
  const rawCollage = Array.isArray(parsedHero.collageImages) ? parsedHero.collageImages : []
  const defaultCollage = DEFAULT_HOME_PAGE_CONFIG.hero.collageImages
  const mergedCollage = [0, 1, 2, 3].map((i) => {
    const rawVal = rawCollage[i] || defaultCollage[i]
    return resolveDisplayImageUrl(rawVal, defaultCollage[i])
  })

  let mergedHeroImage = resolveDisplayImageUrl(
    parsedHero.heroImage || parsedHero.heroIllustration,
    DEFAULT_HOME_PAGE_CONFIG.hero.heroImage
  )
  if (!mergedHeroImage || mergedHeroImage === "undefined" || mergedHeroImage === "null") {
    mergedHeroImage = "/assets/hero_illustration.jpg"
  }

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

  const defaultCategoryImages = [
    "/mockups/category_for_you.png",
    "/mockups/category_food_health.png",
    "/mockups/category_home_transport.png"
  ]
  const rawCategories = Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_HOME_PAGE_CONFIG.categories
  const mergedCategories = rawCategories.map((cat, idx) => {
    const fallbackImg = defaultCategoryImages[idx % defaultCategoryImages.length]
    const resolved = resolveDisplayImageUrl(cat.image || cat.image_url, fallbackImg)
    return {
      ...cat,
      image: resolved,
      image_url: resolved
    }
  })

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

  return {
    ...DEFAULT_HOME_PAGE_CONFIG,
    ...parsed,
    hero: {
      ...DEFAULT_HOME_PAGE_CONFIG.hero,
      ...parsedHero,
      heroImage: mergedHeroImage,
      heroIllustration: mergedHeroImage,
      trustBadges: mergedTrustBadges,
      quickBadges: mergedTrustBadges.map(b => ({ id: b.id, text: b.title, title: b.title, subtitle: b.subtitle, icon: b.icon })),
      collageImages: mergedCollage
    },
    categories: mergedCategories,
    pillarModal: mergedPillarModal,
    subServicesModal: mergedSubServicesModal,
    vendorBanner: { ...DEFAULT_HOME_PAGE_CONFIG.vendorBanner, ...(parsed.vendorBanner || {}) },
    offers: { ...DEFAULT_HOME_PAGE_CONFIG.offers, ...(parsed.offers || {}) },
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
