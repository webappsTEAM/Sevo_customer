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
    quickBadges: [
      { id: "b-1", text: "Verified Pros", icon: "ShieldCheck" },
      { id: "b-2", text: "4.8★ Rated", icon: "Star" },
      { id: "b-3", text: "1M+ Happy Homes", icon: "HeartPulse" },
      { id: "b-4", text: "30 Day Guarantee", icon: "Clock" }
    ],
    collageImages: [
      "/mockups/service_hvac.png",
      "/mockups/service_electrical.png",
      "/mockups/service_cleaning.png",
      "/mockups/service_plumbing.png"
    ]
  },
  categories: [
    {
      id: "cat-1",
      title: "For You",
      subtitle: "Curated services & recommendations",
      badge: "For You",
      badgeColor: "emerald",
      image: "/mockups/category_for_you.png",
      link: "/booking?category=for_you",
      enabled: true
    },
    {
      id: "cat-2",
      title: "Food and Health",
      subtitle: "Groceries & farm-fresh vegetables",
      badge: "Groceries & Veggies",
      badgeColor: "amber",
      image: "/mockups/category_food_health.png",
      link: "/booking?category=groceries",
      enabled: true
    },
    {
      id: "cat-3",
      title: "Home, Repair & Transport Services",
      subtitle: "Cleaning, repairs, painting & logistics",
      badge: "8 Services",
      badgeColor: "blue",
      image: "/mockups/category_home_transport.png",
      link: "/booking?category=home_repairs",
      enabled: true
    }
  ],
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
        text: "Great experience with the painting service. Highly recommend CalServices!",
        cat: "painting",
        badgeColor: "bg-teal-600"
      }
    ]
  },
  footer: {
    brandName: "CalServices",
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
    email: "support@calservices.com",
    workingHours: "Mon – Sun (8 AM – 8 PM)",
    copyrightText: "© 2026 CalServices Inc. All rights reserved."
  }
}

const STORAGE_KEY = "calservices_homepage_config_v1"

export function getHomePageConfig() {
  return DEFAULT_HOME_PAGE_CONFIG
}

function mergeWithDefaultConfig(parsed) {
  if (!parsed) return DEFAULT_HOME_PAGE_CONFIG
  return {
    ...DEFAULT_HOME_PAGE_CONFIG,
    ...parsed,
    hero: { ...DEFAULT_HOME_PAGE_CONFIG.hero, ...(parsed.hero || {}) },
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
        return mergeWithDefaultConfig(data.config)
      }
    }
  } catch (err) {
    console.warn("API fetch error for homepage config:", err)
  }
  return DEFAULT_HOME_PAGE_CONFIG
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
  window.dispatchEvent(new CustomEvent("calservices:homepage_updated", { detail: newConfig }))
  publishHomePageConfig(newConfig)
  return true
}

export function resetHomePageConfig() {
  window.dispatchEvent(new CustomEvent("calservices:homepage_updated", { detail: DEFAULT_HOME_PAGE_CONFIG }))
  publishHomePageConfig(DEFAULT_HOME_PAGE_CONFIG)
  return DEFAULT_HOME_PAGE_CONFIG
}

export async function fetchDirectImageUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") return inputUrl
  return inputUrl.trim()
}
