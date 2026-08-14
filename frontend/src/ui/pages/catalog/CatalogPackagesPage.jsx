import React, { useEffect, useState, useMemo } from "react"
import {
  Plus, Edit2, Search, Truck, Wrench, Wind, Sparkles,
  Palette, Hammer, Carrot, Layers, Box, Tag, DollarSign,
  Clock, ShieldCheck, ChevronDown, ChevronUp, FolderOpen,
  Package as PackageIcon, Check, ArrowRight, Sparkle,
  Bike, Boxes, Zap, Droplets, ShoppingBag, CheckCircle2,
  SlidersHorizontal, ArrowUpRight, Trash2
} from "lucide-react"
import { apiRequest } from "../../../api/client.js"
import { Input, TextArea, Select, Modal } from "../../components/kit.jsx"
import { useToast, ToastBanner } from "./useToast.jsx"

const DEFAULT_SUITABLE_PRESETS = {
  "2-wheeler-electric-express": [
    "Small parcels & packages",
    "Documents & files",
    "Clothing & accessories",
    "Food & grocery orders",
    "Medicines & essentials",
    "Small electronic items",
    "Urgent deliveries",
  ],
  "2-wheeler": [
    "Small parcels & packages",
    "Documents & files",
    "Clothing & accessories",
    "Food & grocery orders",
    "Medicines & essentials",
    "Small electronic items",
    "Local shop deliveries",
  ],
  "3-wheeler": [
    "Groceries & provisions",
    "Small parcels & packages",
    "Clothing & cartons",
    "Small household items",
    "Small appliances",
    "Office supplies",
    "Local shop deliveries",
  ],
  "tata-ace": [
    "Household furniture",
    "Home appliances",
    "Grocery & retail stock",
    "Multiple cartons",
    "Small business goods",
    "Electronics",
    "Small construction materials",
    "Shop/warehouse deliveries",
  ],
  "pickup-8ft": [
    "Furniture & double beds",
    "Commercial inventory",
    "Warehouse transfers",
    "Event materials",
    "Medium machinery",
    "Bulk cartons",
    "Hardware & electrical goods",
    "Industrial deliveries",
  ],
  "1-7-ton": [
    "Heavy industrial machinery",
    "Factory raw materials",
    "Large appliances",
    "Bulk construction materials",
    "Industrial equipment",
    "Machinery",
    "Large commercial stock",
    "Multiple cartons & packages",
    "Warehouse/industrial goods",
  ],
  "1-rk-1-bhk-shifting": [
    "1 RK / 1 BHK Full Household",
    "Furniture disassembly & assembly",
    "Bubble wrap & carton packing",
    "Loading & unloading by verified crew",
    "Dedicated transport vehicle",
  ],
  "2-bhk-3-bhk-shifting": [
    "2 BHK / 3 BHK Large Household",
    "Heavy furniture & appliance packing",
    "Multi-layer bubble & foam protection",
    "Professional 4-6 member crew",
    "Large closed container truck",
  ],
  "villa-office-relocation": [
    "Villas, Bungalows & Corporate Offices",
    "IT hardware & server safe packing",
    "Customized crating & insurance support",
    "Dedicated relocation manager",
    "End-to-end unpacking & setup",
  ],
  "fridge-parent": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "fridge-single": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "fridge-double": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "fridge-triple": [
    "Interior & exterior cleaning",
    "Shelves, trays & compartments cleaning",
    "Door seal & stain cleaning"
  ],
  "stove-parent": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "stove-2b": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "stove-3b": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ],
  "stove-4b": [
    "Stove / hob surface cleaning",
    "Burner & knob cleaning",
    "Grease & food stain removal"
  ]
}

const EMPTY_PACKAGE = {
  service: "",
  name: "",
  slug: "",
  description: "",
  base_price: "",
  duration: "",
  image: "",
  popular: false,
  tag: "",
  includes: "",
  excludes: "",
  payment_policy: "BOTH",
}

const STATUS_TONE = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVE: "bg-blue-50 text-blue-700 border-blue-200/70",
  INACTIVE: "bg-amber-50 text-amber-700 border-amber-200/70",
  ARCHIVED: "bg-rose-50 text-rose-700 border-rose-200/70",
}

const NEXT_STATUSES = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["INACTIVE"],
  INACTIVE: ["ACTIVE"],
}

// 7 Core Specialized Service Pillars Configuration in Bluish / Indigo Theme
const CORE_PILLARS = [
  {
    key: "home_pest_control",
    shortName: "Home & Pest Control",
    fullName: "Home Cleaning & Pest Control",
    icon: Sparkles,
    accentColor: "indigo",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
  {
    key: "goods_transports",
    shortName: "Goods & Logistics",
    fullName: "Goods & Transport Logistics",
    icon: Truck,
    accentColor: "blue",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "electrician_plumbing_carpentry",
    shortName: "Electrical, Plumbing & Carpentry",
    fullName: "Electrical, Plumbing & Carpentry Services",
    icon: Wrench,
    accentColor: "blue",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "ac_appliance",
    shortName: "AC & Appliances",
    fullName: "AC & Appliance Repair Solutions",
    icon: Wind,
    accentColor: "sky",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    headerBg: "bg-gradient-to-r from-sky-50/80 to-blue-50/50",
    iconBg: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    key: "paintings",
    shortName: "Painting & Waterproofing",
    fullName: "Painting, Wall Care & Waterproofing",
    icon: Palette,
    accentColor: "purple",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
    headerBg: "bg-gradient-to-r from-purple-50/80 to-blue-50/50",
    iconBg: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    key: "mason",
    shortName: "Masonry & Construction",
    fullName: "Civil Works & Masonry Construction",
    icon: Hammer,
    accentColor: "amber",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
    headerBg: "bg-gradient-to-r from-amber-50/80 to-blue-50/50",
    iconBg: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    key: "vegetables_groceries",
    shortName: "Groceries & Fresh Produce",
    fullName: "Farm-Fresh Groceries & Daily Produce",
    icon: Carrot,
    accentColor: "blue",
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border-indigo-600",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    headerBg: "bg-gradient-to-r from-blue-50/80 to-indigo-50/50",
    iconBg: "bg-blue-50 border-blue-200 text-blue-700",
  },
]

// Dynamic Icon resolver for sub-services
const getServiceIcon = (slug = "", name = "") => {
  const s = (slug + " " + name).toLowerCase()
  if (s.includes("two-wheeler") || s.includes("2-wheeler") || s.includes("2 wheeler") || s.includes("bike")) return Bike
  if (s.includes("truck") || s.includes("pickup") || s.includes("ace")) return Truck
  if (s.includes("packer") || s.includes("mover") || s.includes("relocation") || s.includes("shifting")) return Boxes
  if (s.includes("electr") || s.includes("socket") || s.includes("switch") || s.includes("wire") || s.includes("fan")) return Zap
  if (s.includes("plumb") || s.includes("tap") || s.includes("faucet") || s.includes("sink") || s.includes("drain")) return Droplets
  if (s.includes("carpenter") || s.includes("carpentry") || s.includes("lock") || s.includes("door") || s.includes("furnit") || s.includes("drill")) return Hammer
  if (s.includes("clean") || s.includes("sofa") || s.includes("bathroom") || s.includes("kitchen") || s.includes("house")) return Sparkles
  if (s.includes("pest") || s.includes("cockroach") || s.includes("termite") || s.includes("ant") || s.includes("bug")) return ShieldCheck
  if (s.includes("ac") || s.includes("air") || s.includes("hvac") || s.includes("wind") || s.includes("cool")) return Wind
  if (s.includes("appliance") || s.includes("refriger") || s.includes("geyser") || s.includes("oven") || s.includes("tv") || s.includes("washing")) return Box
  if (s.includes("paint") || s.includes("waterproof") || s.includes("decor") || s.includes("putty")) return Palette
  if (s.includes("mason") || s.includes("brick") || s.includes("plaster") || s.includes("wall") || s.includes("construct")) return Hammer
  if (s.includes("vegetable") || s.includes("veggie")) return Carrot
  if (s.includes("grocer") || s.includes("staple") || s.includes("dal")) return ShoppingBag
  return Layers
}

export function CatalogPackagesPage() {
  const [categories, setCategories] = useState([])
  const [services, setServices] = useState([])
  const [packages, setPackages] = useState([])
  const [activeCategoryKey, setActiveCategoryKey] = useState("goods_transports")
  const [activeSubServiceKey, setActiveSubServiceKey] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [quickPriceEditing, setQuickPriceEditing] = useState(null)
  const [newItemText, setNewItemText] = useState("")
  const [serviceEditing, setServiceEditing] = useState(null)
  const [expandedPackages, setExpandedPackages] = useState(new Set())
  const [toast, showToast] = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [catRes, svcRes, pkgRes] = await Promise.all([
        apiRequest("/settings/catalog/v2/categories/"),
        apiRequest("/settings/catalog/v2/services/"),
        apiRequest("/settings/catalog/v2/packages/"),
      ])
      if (catRes && catRes.success) setCategories(catRes.data)
      if (svcRes && svcRes.success) setServices(svcRes.data)
      if (pkgRes && pkgRes.success) setPackages(pkgRes.data)
      // Warn if any response indicates failure
      if (!catRes?.success || !svcRes?.success || !pkgRes?.success) {
        console.warn("Catalog load partial failure:", { catRes, svcRes, pkgRes })
      }
    } catch (err) {
      console.error("Catalog load error:", err)
      showToast("Failed to load catalog data", "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Map category slug / id to matched DB category
  const categoryMap = useMemo(() => {
    const map = {}
    categories.forEach((cat) => {
      map[cat.slug] = cat
      map[String(cat.id)] = cat
    })
    return map
  }, [categories])

  // Active Category details
  const activePillar = useMemo(() => {
    const found = CORE_PILLARS.find((p) => p.key === activeCategoryKey) || CORE_PILLARS[1]
    const dbCat = categoryMap[activeCategoryKey]
    return {
      ...found,
      dbCategory: dbCat,
      name: dbCat?.name || found.fullName,
      description: dbCat?.description || "Directly customize service prices and vehicle fares across this pillar.",
    }
  }, [activeCategoryKey, categoryMap])

  // Sub-services and their packages under the active category
  const activeCategoryServicesWithPackages = useMemo(() => {
    const currentDbCat = categoryMap[activeCategoryKey]
    const catId = currentDbCat?.id

    // Find services belonging to this category
    let catServices = services.filter(
      (s) => (catId && String(s.category) === String(catId)) || (s.category_slug && s.category_slug === activeCategoryKey)
    )

    if (activeCategoryKey === "home_pest_control") {
      catServices = catServices.filter(
        (s) => s.slug !== "general" && s.slug !== "security"
      )
    }

    if (catServices.length === 0 && currentDbCat) {
      catServices = services.filter((s) => s.category_id === catId || s.category === catId)
      if (activeCategoryKey === "home_pest_control") {
        catServices = catServices.filter(
          (s) => s.slug !== "general" && s.slug !== "security"
        )
      }
    }

    // Goods & Transports specific ordering: 2 Wheeler, Truck, Packers & Movers
    if (activeCategoryKey === "goods_transports") {
      const order = { "two-wheeler": 1, "truck": 2, "packers-movers": 3 }
      catServices = [...catServices].sort((a, b) => {
        const orderA = order[a.slug] || 99
        const orderB = order[b.slug] || 99
        return orderA - orderB
      })
    }

    const q = searchQuery.trim().toLowerCase()

    // Map each service to its packages list
    const result = catServices.flatMap((svc) => {
      let allSvcPkgs = packages.filter((p) => {
        const pkgSvcId = p.service?.id || p.service || p.service_id
        return String(pkgSvcId) === String(svc.id)
      })

      if (svc.slug === "sofa-cleaning") {
        const addonPkgs = packages.filter((p) =>
          p.slug.startsWith("quick-") ||
          p.slug.startsWith("fridge-") ||
          p.slug.startsWith("sink-") ||
          p.slug.startsWith("dining-") ||
          p.slug.startsWith("fan-") ||
          p.slug.startsWith("balcony-")
        )
        const seenIds = new Set(allSvcPkgs.map(p => p.id))
        const uniqueAddons = addonPkgs.filter(p => !seenIds.has(p.id))
        allSvcPkgs = [...allSvcPkgs, ...uniqueAddons]
      }

      // Custom sorting for Goods & Transports modules
      let sortedPkgs = allSvcPkgs
      if (svc.slug === "truck") {
        const truckOrder = { "1-7-ton": 1, "3-wheeler": 2, "pickup-8ft": 3, "tata-ace": 4 }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (truckOrder[a.slug] || 99) - (truckOrder[b.slug] || 99))
      } else if (svc.slug === "two-wheeler") {
        const bikeOrder = { "2-wheeler-electric-express": 1, "2-wheeler": 2 }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (bikeOrder[a.slug] || 99) - (bikeOrder[b.slug] || 99))
      } else if (svc.slug === "packers-movers") {
        const moverOrder = { "1-rk-1-bhk-shifting": 1, "2-bhk-3-bhk-shifting": 2, "villa-office-relocation": 3 }
        sortedPkgs = [...allSvcPkgs].sort((a, b) => (moverOrder[a.slug] || 99) - (moverOrder[b.slug] || 99))
      }

      // Filter by search query if present
      const getFilteredPkgs = (pkgs) => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return pkgs
        return pkgs.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.tag && p.tag.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            svc.name.toLowerCase().includes(q)
        )
      }

      if (svc.slug === "kitchen-cleaning") {
        const groups = [
          {
            subSlug: "packages",
            displayName: "Full Kitchen Packages",
            filterFn: (p) => p.slug.startsWith("occ-") || p.slug.startsWith("empty-"),
          },
          {
            subSlug: "appliance",
            displayName: "single appliance cleaning",
            filterFn: (p) =>
              p.slug.includes("fridge") ||
              p.slug.includes("microwave") ||
              p.slug.includes("chimney") ||
              p.slug.includes("stove") ||
              p.slug.includes("dishwasher") ||
              p.slug.includes("air-fryer") ||
              p.slug.includes("otg") ||
              p.slug.includes("sandwich"),
            transformFn: (pkgs, getFilteredPkgs) => {
              // Group fridge and stove items
              const finalPkgs = [];
              const fridgeSub = pkgs.filter(p => p.slug.startsWith("fridge-"));
              const stoveSub = pkgs.filter(p => p.slug.startsWith("stove-"));
              const remaining = pkgs.filter(p => !p.slug.startsWith("fridge-") && !p.slug.startsWith("stove-"));

              if (fridgeSub.length > 0) {
                finalPkgs.push({
                  id: "fridge-parent",
                  name: "Fridge cleaning",
                  slug: "fridge-parent",
                  description: "Thorough interior defrosting and rack-by-rack deep cleaning.",
                  base_price: Math.min(...fridgeSub.map(p => Number(p.base_price) || 0)),
                  duration: fridgeSub[0]?.duration || "1.5 hrs",
                  status: fridgeSub.some(p => p.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
                  subOptions: fridgeSub,
                });
              }

              if (stoveSub.length > 0) {
                finalPkgs.push({
                  id: "stove-parent",
                  name: "Gas stove cleaning",
                  slug: "stove-parent",
                  description: "Surface cleaning of gas stove burners and knobs to remove grease.",
                  base_price: Math.min(...stoveSub.map(p => Number(p.base_price) || 0)),
                  duration: stoveSub[0]?.duration || "45 mins",
                  status: stoveSub.some(p => p.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
                  subOptions: stoveSub,
                });
              }

              finalPkgs.push(...remaining);

              // Sort finalPkgs to match KITCHEN_SLUG_ORDER
              finalPkgs.sort((a, b) => {
                const idxA = KITCHEN_SLUG_ORDER.indexOf(a.slug);
                const idxB = KITCHEN_SLUG_ORDER.indexOf(b.slug);
                const orderA = idxA !== -1 ? idxA : 999;
                const orderB = idxB !== -1 ? idxB : 999;
                return orderA - orderB;
              });

              return getFilteredPkgs(finalPkgs);
            }
          },
          {
            subSlug: "cabinet_tile",
            displayName: "Cabinet & Tile Care",
            filterFn: (p) => p.slug.startsWith("kitchen-") || p.slug.startsWith("cabinet-"),
          },
          {
            subSlug: "addons",
            displayName: "Quick Extra Services",
            filterFn: (p) =>
              p.slug.startsWith("quick-") ||
              p.slug.startsWith("sink-") ||
              p.slug.startsWith("dining-") ||
              p.slug.startsWith("fan-") ||
              p.slug.startsWith("balcony-"),
          },
        ]

        const KITCHEN_SLUG_ORDER = [
          "occ-basic",
          "occ-deep",
          "empty-kitchen",
          "fridge-parent",
          "fridge-single",
          "fridge-double",
          "fridge-triple",
          "microwave-clean",
          "chimney-clean",
          "chimney-stove-clean",
          "stove-parent",
          "stove-2b",
          "stove-3b",
          "stove-4b",
          "dishwasher-clean",
          "air-fryer-clean",
          "otg-clean",
          "sandwich-clean",
          "kitchen-tiles-slabs",
          "cabinet-trolley-clean",
          "quick-sink-under-sink",
          "quick-kitchen-window",
          "quick-dining-table",
          "quick-fan-clean",
          "quick-exhaust-fan-clean",
          "quick-balcony-upto-4ft",
          "quick-balcony-above-4ft",
          "quick-door-clean"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = KITCHEN_SLUG_ORDER.indexOf(a.slug)
            const idxB = KITCHEN_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = g.transformFn ? g.transformFn(groupPkgs, getFilteredPkgs) : getFilteredPkgs(groupPkgs);
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      if (svc.slug === "sofa-cleaning") {
        const groups = [
          {
            subSlug: "sofa",
            displayName: "Sofa Cleaning",
            filterFn: (p) => p.slug.includes("sofa-"),
          },
          {
            subSlug: "mattress",
            displayName: "Mattress Cleaning",
            filterFn: (p) => p.slug.startsWith("mattress-"),
          },
          {
            subSlug: "carpet",
            displayName: "Carpet Cleaning",
            filterFn: (p) => p.slug.startsWith("carpet-"),
          },
          {
            subSlug: "addons",
            displayName: "Quick Extra Services",
            filterFn: (p) =>
              p.slug === "quick-dining-table" ||
              p.slug === "quick-fan-clean" ||
              p.slug === "quick-door-clean" ||
              p.slug === "quick-balcony-upto-4ft" ||
              p.slug === "quick-balcony-above-4ft" ||
              p.slug.startsWith("fridge-"),
            transformFn: (pkgs, getFilteredPkgs) => {
              // Group fridge parent if subOptions exist
              const finalPkgs = [];
              const fridgeSub = pkgs.filter(p => p.slug.startsWith("fridge-"));
              const remaining = pkgs.filter(p => !p.slug.startsWith("fridge-"));

              if (fridgeSub.length > 0) {
                finalPkgs.push({
                  id: "fridge-parent",
                  name: "Fridge cleaning",
                  slug: "fridge-parent",
                  description: "Thorough interior defrosting and rack-by-rack deep cleaning.",
                  base_price: Math.min(...fridgeSub.map(p => Number(p.base_price) || 0)),
                  duration: fridgeSub[0]?.duration || "1.5 hrs",
                  status: fridgeSub.some(p => p.status === "ACTIVE") ? "ACTIVE" : "INACTIVE",
                  subOptions: fridgeSub,
                });
              }
              finalPkgs.push(...remaining);

              // Sort finalPkgs to match SOFA_SLUG_ORDER
              finalPkgs.sort((a, b) => {
                const idxA = SOFA_SLUG_ORDER.indexOf(a.slug);
                const idxB = SOFA_SLUG_ORDER.indexOf(b.slug);
                const orderA = idxA !== -1 ? idxA : 999;
                const orderB = idxB !== -1 ? idxB : 999;
                return orderA - orderB;
              });

              return getFilteredPkgs(finalPkgs);
            }
          },
        ]

        const SOFA_SLUG_ORDER = [
          "fabric-sofa-clean",
          "fabric-sofa-cushion-clean",
          "leather-sofa-clean",
          "leather-sofa-cushion-clean",
          "mattress-deep",
          "mattress-pillow-refresh",
          "carpet-deep",
          "quick-dining-table",
          "quick-fan-clean",
          "quick-door-clean",
          "fridge-parent",
          "fridge-single",
          "fridge-double",
          "fridge-triple",
          "quick-balcony-upto-4ft",
          "quick-balcony-above-4ft"
        ]

        return groups.map((g) => {
          let groupPkgs = allSvcPkgs.filter(g.filterFn)
          groupPkgs = [...groupPkgs].sort((a, b) => {
            const idxA = SOFA_SLUG_ORDER.indexOf(a.slug)
            const idxB = SOFA_SLUG_ORDER.indexOf(b.slug)
            const orderA = idxA !== -1 ? idxA : 999
            const orderB = idxB !== -1 ? idxB : 999
            return orderA - orderB
          })
          const finalPkgs = g.transformFn ? g.transformFn(groupPkgs, getFilteredPkgs) : getFilteredPkgs(groupPkgs);
          return {
            service: {
              ...svc,
              id: `${svc.id}-${g.subSlug}`,
              virtualSlug: g.subSlug,
              realServiceId: svc.id,
            },
            displayName: g.displayName,
            icon: getServiceIcon(g.subSlug, g.displayName),
            totalPackages: finalPkgs.length,
            packages: finalPkgs,
          }
        })
      }

      // Friendly display name formatting (e.g. "Two Wheeler" -> "2 Wheeler")
      let displayName = svc.name
      if (svc.slug === "two-wheeler" || svc.name === "Two Wheeler") displayName = "2 Wheeler"
      if (svc.slug === "truck") displayName = "Truck"
      if (svc.slug === "packers-movers") displayName = "Packers & Movers"

      return [{
        service: svc,
        displayName,
        icon: getServiceIcon(svc.slug, svc.name),
        totalPackages: allSvcPkgs.length,
        packages: getFilteredPkgs(sortedPkgs),
      }]
    })

    return result
  }, [activeCategoryKey, categoryMap, services, packages, searchQuery])

  // Compute package count for each of the 7 tabs
  const pillarCounts = useMemo(() => {
    const counts = {}
    CORE_PILLARS.forEach((pillar) => {
      const dbCat = categoryMap[pillar.key]
      if (!dbCat) {
        counts[pillar.key] = 0
        return
      }
      let catServices = services.filter(
        (s) => String(s.category) === String(dbCat.id) || s.category_id === dbCat.id || s.category_slug === pillar.key
      )
      if (pillar.key === "home_pest_control") {
        catServices = catServices.filter(
          (s) => s.slug !== "general" && s.slug !== "security"
        )
      }
      const serviceIds = new Set(catServices.map((s) => String(s.id)))
      const total = packages.filter((p) => {
        const svcId = String(p.service?.id || p.service || p.service_id)
        return serviceIds.has(svcId)
      }).length
      counts[pillar.key] = total
    })
    return counts
  }, [CORE_PILLARS, categoryMap, services, packages])

  // Total packages under active category
  const activeCategoryTotalCount = useMemo(() => {
    return activeCategoryServicesWithPackages.reduce((acc, curr) => acc + curr.packages.length, 0)
  }, [activeCategoryServicesWithPackages])

  // Filtered visible sub-services based on active sub-service tab
  const visibleServices = useMemo(() => {
    if (activeSubServiceKey === "all") {
      return activeCategoryServicesWithPackages
    }
    return activeCategoryServicesWithPackages.filter(
      (item) =>
        item.service.slug === activeSubServiceKey ||
        item.service.virtualSlug === activeSubServiceKey ||
        String(item.service.id) === String(activeSubServiceKey) ||
        String(item.service.realServiceId) === String(activeSubServiceKey) ||
        item.displayName.toLowerCase().replace(/[^a-z0-9]/g, "") === activeSubServiceKey.toLowerCase().replace(/[^a-z0-9]/g, "")
    )
  }, [activeSubServiceKey, activeCategoryServicesWithPackages])

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...editing,
        includes:
          typeof editing.includes === "string"
            ? editing.includes.split(",").map((s) => s.trim()).filter(Boolean)
            : editing.includes,
        excludes:
          typeof editing.excludes === "string"
            ? editing.excludes.split(",").map((s) => s.trim()).filter(Boolean)
            : editing.excludes,
        offer_price: null,
      }
      const res = editing.id
        ? await apiRequest(`/settings/catalog/v2/packages/${editing.id}/`, {
            method: "PUT",
            json: payload,
          })
        : await apiRequest("/settings/catalog/v2/packages/", {
            method: "POST",
            json: payload,
          })
      if (res.success) {
        showToast(editing.id ? "Package updated successfully" : "Package created successfully")
        setEditing(null)
        loadData()
      } else {
        showToast(res.message || "Save failed", "error")
      }
    } catch {
      showToast("Save failed", "error")
    }
  }

  const openQuickPriceEdit = (pkg) => {
    const slug = pkg.slug || pkg.id || ""
    const presets = DEFAULT_SUITABLE_PRESETS[slug] || DEFAULT_SUITABLE_PRESETS[pkg.id] || []

    // For virtual parent rows (fridge-parent, stove-parent), pull includes from first subOption
    let existingIncludes = Array.isArray(pkg.includes) ? pkg.includes : []
    if (existingIncludes.length === 0 && Array.isArray(pkg.subOptions) && pkg.subOptions.length > 0) {
      const firstSub = pkg.subOptions[0]
      existingIncludes = Array.isArray(firstSub.includes) ? firstSub.includes : []
    }

    const items = []
    const seen = new Set()

    // 1. First add existing included items (checked = true)
    existingIncludes.forEach((inc, idx) => {
      const text = typeof inc === "string" ? inc.trim() : (inc?.text || "")
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase())
        items.push({
          id: `inc-${idx}-${Date.now()}`,
          text,
          checked: true,
        })
      }
    })

    // 2. Add preset items if not already present
    presets.forEach((preset, idx) => {
      const text = preset.trim()
      if (!seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase())
        items.push({
          id: `preset-${idx}-${Date.now()}`,
          text,
          checked: existingIncludes.length === 0, // default ticked if package had no prior includes
        })
      }
    })

    setQuickPriceEditing({
      ...pkg,
      base_price: Math.round(Number(pkg.base_price) || 0),
      tag: pkg.tag || (pkg.popular ? "Popular" : ""),
      checklist: items,
      image: pkg.image || "",
      editingItemId: null,
      _vdOpen: true,
      viewDetails: {
        tools: Array.isArray(pkg.tools) ? pkg.tools : [],
        ready: Array.isArray(pkg.ready) ? pkg.ready : [],
        reviews: Array.isArray(pkg.reviews) ? pkg.reviews : [],
        faqs: Array.isArray(pkg.faqs) ? pkg.faqs : [],
      },
    })
    setNewItemText("")
  }

  const handleQuickPriceSave = async (e) => {
    e.preventDefault()
    if (!quickPriceEditing) return
    try {
      let finalIncludes = []
      if (Array.isArray(quickPriceEditing.checklist)) {
        finalIncludes = quickPriceEditing.checklist
          .filter((i) => i.checked && i.text && i.text.trim())
          .map((i) => i.text.trim())
      } else if (typeof quickPriceEditing.includes === "string") {
        finalIncludes = quickPriceEditing.includes.split(",").map((s) => s.trim()).filter(Boolean)
      } else if (Array.isArray(quickPriceEditing.includes)) {
        finalIncludes = quickPriceEditing.includes
      }

      const isPop = Boolean(
        quickPriceEditing.tag &&
        quickPriceEditing.tag.toLowerCase().includes("popular")
      )

      const vd = quickPriceEditing.viewDetails || {}
      const payload = {
        name: quickPriceEditing.name,
        description: quickPriceEditing.description || "",
        base_price: Math.round(Number(quickPriceEditing.base_price) || 0),
        tag: quickPriceEditing.tag || "",
        popular: isPop,
        duration: quickPriceEditing.duration || "",
        includes: finalIncludes,
        image: quickPriceEditing.image || "",
        offer_price: null,
        tools: Array.isArray(vd.tools) ? vd.tools.filter(Boolean) : [],
        ready: Array.isArray(vd.ready) ? vd.ready.filter(Boolean) : [],
        reviews: Array.isArray(vd.reviews) ? vd.reviews.filter(r => r.name || r.text) : [],
        faqs: Array.isArray(vd.faqs) ? vd.faqs.filter(f => f.q || f.a) : [],
      }

      // Handle virtual parent rows (fridge-parent, stove-parent) — save includes to each sub-option
      const isVirtualParent = (quickPriceEditing.id === "fridge-parent" || quickPriceEditing.id === "stove-parent") && Array.isArray(quickPriceEditing.subOptions)
      if (isVirtualParent) {
        const subIds = quickPriceEditing.subOptions.map(s => s.id).filter(Boolean)
        const results = await Promise.all(
          subIds.map(subId =>
            apiRequest(`/settings/catalog/v2/packages/${subId}/`, {
              method: "PUT",
              json: { includes: finalIncludes, description: payload.description },
            })
          )
        )
        const allOk = results.every(r => r.success)
        if (allOk) {
          showToast(`Includes updated for all ${quickPriceEditing.name} variants`)
          setQuickPriceEditing(null)
          loadData()
        } else {
          showToast("Some updates failed", "error")
        }
        return
      }

      const targetId = quickPriceEditing.realPackageId || quickPriceEditing.id || quickPriceEditing.slug
      const res = await apiRequest(`/settings/catalog/v2/packages/${targetId}/`, {
        method: "PUT",
        json: payload,
      })
      if (res && res.success) {
        showToast(`Changes published for "${quickPriceEditing.name}"`)
        setQuickPriceEditing(null)
        loadData()
      } else {
        showToast(res?.message || "Update failed", "error")
      }
    } catch (err) {
      console.error("Save failed:", err)
      showToast("Update failed", "error")
    }
  }

  const handleServiceSave = async (e) => {
    e.preventDefault()
    if (!serviceEditing) return
    try {
      const payload = {
        name: serviceEditing.name,
        description: serviceEditing.description || "",
      }
      const res = await apiRequest(`/settings/catalog/v2/services/${serviceEditing.id}/`, {
        method: "PUT",
        json: payload,
      })
      if (res.success) {
        showToast(`Service "${serviceEditing.name}" updated successfully`)
        setServiceEditing(null)
        loadData()
      } else {
        showToast(res.message || "Service update failed", "error")
      }
    } catch {
      showToast("Service update failed", "error")
    }
  }

  const openEdit = (pkg) => {
    setEditing({
      ...pkg,
      base_price: Math.round(Number(pkg.base_price) || 0),
      includes: Array.isArray(pkg.includes) ? pkg.includes.join(", ") : "",
      excludes: Array.isArray(pkg.excludes) ? pkg.excludes.join(", ") : "",
      image: pkg.image || "",
    })
  }

  const handleToggleStatus = async (pkg) => {
    const newStatus = pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${pkg.id}/transition/`, {
        method: "POST",
        json: { status: newStatus, reason: `Status changed to ${newStatus}` },
      })
      if (res.success) {
        showToast(`"${pkg.name}" is now ${newStatus}`)
        loadData()
      } else {
        showToast(res.message || "Status update failed", "error")
      }
    } catch {
      showToast("Status update failed", "error")
    }
  }

  const handleTransition = async (pkg, newStatus) => {
    const reason = window.prompt(`Reason for moving "${pkg.name}" to ${newStatus}? (optional)`) || ""
    try {
      const res = await apiRequest(`/settings/catalog/v2/packages/${pkg.id}/transition/`, {
        method: "POST",
        json: { status: newStatus, reason },
      })
      if (res.success) {
        showToast(`Package status updated to ${newStatus}`)
        loadData()
      } else {
        showToast(res.message || "Transition failed", "error")
      }
    } catch {
      showToast("Transition failed", "error")
    }
  }

  const ActiveIcon = activePillar.icon

  const selectedServiceId = String(editing?.service?.id || editing?.service || "")
  const selectedService = services.find((s) => String(s.id) === selectedServiceId)
  const isVegetableService = Boolean(
    selectedService?.slug === "vegetables" || 
    selectedService?.name?.toLowerCase().includes("vegetable")
  )

  const namePlaceholder = isVegetableService
    ? "e.g. Tomato (Thakkali), Onion (Vengayam), Potato (Urulaikilangu)"
    : "e.g. Pickup 8ft, Instant Courier, 1 BHK Shifting"

  const slugPlaceholder = isVegetableService
    ? "e.g. tomato-thakkali, onion-vengayam"
    : "e.g. pickup-8ft, instant-courier"

  const descPlaceholder = isVegetableService
    ? "e.g. Fresh farm-picked organic vegetables with quality assurance..."
    : "Detailed description of this vehicle or package offering..."

  const includesPlaceholder = isVegetableService
    ? "e.g. Freshly picked, Organic certified, Quality assured"
    : "e.g. Closed container, Verified driver, GPS tracking"

  const excludesPlaceholder = isVegetableService
    ? "e.g. Damage during transit, Rotten parts refund"
    : "e.g. Heavy toll extra, Helper unassisted"

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }} className="p-4 sm:p-6 lg:p-8 w-full max-w-[1720px] mx-auto font-sans text-slate-800 space-y-5">
      <ToastBanner toast={toast} />

      {/* ── 1. The 7 Top-Level Service Tabs (Horizontal Bluish/Indigo Navigation Bar) ── */}
      <div className="mb-5 overflow-x-auto pb-1.5 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {CORE_PILLARS.map((pillar) => {
            const isActive = activeCategoryKey === pillar.key
            const count = pillarCounts[pillar.key] || 0

            return (
              <button
                key={pillar.key}
                type="button"
                onClick={() => {
                  setActiveCategoryKey(pillar.key)
                  setActiveSubServiceKey("all")
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all duration-150 cursor-pointer border ${
                  isActive
                    ? pillar.activeClass
                    : "bg-transparent text-slate-600 hover:text-indigo-950 hover:bg-white/80 border-transparent"
                }`}
              >
                <span className="whitespace-nowrap font-bold">{pillar.shortName}</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Top Header Banner Card for Selected Category (Matching Blue Theme) ── */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-7 shadow-sm border border-slate-200/90 mb-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-indigo-800 text-xs font-semibold mb-2 border border-blue-200/80 shadow-xs">
                Enterprise Service Pillars &amp; Catalog
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Service Packages &amp; Pricing
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-1">
                Configure rates, tiered packages, and vehicle dispatch pricing for {activePillar.fullName}.
              </p>
            </div>
          </div>

          {/* Add Package Button (Bluish / Indigo Theme matching Log Ticket) */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                const firstSvc = activeCategoryServicesWithPackages[0]?.service || services[0]
                setEditing({
                  ...EMPTY_PACKAGE,
                  service: firstSvc?.id ? String(firstSvc.id) : "",
                })
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Add Package</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search packages, vehicles, or fares in ${activePillar.shortName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white text-xs font-normal text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>

          {/* Expand / Filter Info */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800">{activeCategoryTotalCount}</strong> options in <span className="font-semibold text-slate-700">{activePillar.shortName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Sub-Services / Sub-Modules Interactive Bar ── */}
      {activeCategoryServicesWithPackages.length > 0 && (
        <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200/90 mb-5">
          <div className="flex items-center justify-between gap-3 mb-2 px-1">
            <div className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span>Sub-Modules / Services</span>
            </div>
            <span className="text-[11px] text-slate-400 font-normal">Click a module to view its specific packages</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* "All" Tab Option */}
            <button
              type="button"
              onClick={() => setActiveSubServiceKey("all")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeSubServiceKey === "all"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-indigo-50/60 hover:text-indigo-900"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                  activeSubServiceKey === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {activeCategoryServicesWithPackages.reduce((acc, curr) => acc + curr.totalPackages, 0)}
              </span>
            </button>

            {/* Individual Sub-Service Tabs (e.g. 2 Wheeler, Truck, Packers & Movers) */}
            {(() => {
              const seen = new Set()
              const uniqueItems = activeCategoryServicesWithPackages.filter((item) => {
                const key = item.service.realServiceId || item.service.slug || item.service.id
                if (seen.has(key)) return false
                seen.add(key)
                return true
              })

              return uniqueItems.map((item) => {
                const serviceKey = item.service.realServiceId || item.service.slug || item.service.id
                const totalCount = activeCategoryServicesWithPackages
                  .filter(x => (x.service.realServiceId || x.service.slug || x.service.id) === serviceKey)
                  .reduce((acc, x) => acc + x.totalPackages, 0)
                
                const SubIcon = item.icon
                const isSubActive =
                  activeSubServiceKey === item.service.slug ||
                  activeSubServiceKey === item.service.virtualSlug ||
                  String(activeSubServiceKey) === String(item.service.id) ||
                  String(activeSubServiceKey) === String(item.service.realServiceId) ||
                  item.displayName.toLowerCase().replace(/[^a-z0-9]/g, "") === activeSubServiceKey.toLowerCase().replace(/[^a-z0-9]/g, "")

                return (
                  <button
                    key={item.service.id}
                    type="button"
                    onClick={() => setActiveSubServiceKey(item.service.slug || String(item.service.id))}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSubActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-indigo-50/60 hover:text-indigo-900"
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{item.displayName}</span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isSubActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {totalCount}
                    </span>
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}

      {/* ── 4. Main Sub-Services Packages Content Area ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading catalog packages &amp; fares…</p>
        </div>
      ) : activeCategoryServicesWithPackages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No services configured for {activePillar.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Add services and packages to configure pricing for this pillar.</p>
        </div>
      ) : visibleServices.length === 0 || visibleServices.every((s) => s.packages.length === 0 && s.totalPackages === 0) ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No packages found</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {searchQuery ? "Try refining your search query." : "Click 'Add Package' to add options to this service."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleServices.map((svcItem) => {
            const SubIcon = svcItem.icon
            const pkgList = svcItem.packages

            return (
              <div
                key={svcItem.service.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Service Sub-Header with Icon, Count & Add Option */}
                <div className="bg-slate-50/90 px-4 sm:px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {svcItem.displayName}
                        </span>
                        <span className="text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full">
                          {pkgList.length} {pkgList.length === 1 ? "option" : "options"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setServiceEditing({ ...svcItem.service })}
                          title="Edit Sub-Service Heading & Description"
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {svcItem.service.description && (
                        <p className="text-[11px] text-slate-400 truncate max-w-lg sm:max-w-2xl lg:max-w-4xl">
                          {svcItem.service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditing({
                        ...EMPTY_PACKAGE,
                        service: String(svcItem.service.realServiceId || svcItem.service.id),
                      })
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-indigo-200/60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                </div>

                {/* Packages Table Under this Sub-Service */}
                {pkgList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
                    No packages or options under {svcItem.displayName} matching search.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Package / Option Name</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Starting Fare</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Highlight Badge</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">{activeCategoryKey === "goods_transports" ? "Badge Duration" : "Duration / ETA"}</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold">Status</th>
                          <th className="py-3 px-4 sm:px-5 font-extrabold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {pkgList.flatMap((pkg) => {
                          const isParent = !!pkg.subOptions;
                          const isExpanded = expandedPackages.has(pkg.id);
                          const rows = [];

                          rows.push(
                            <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors group">
                              {/* Package Name & Description */}
                              <td className="py-3.5 px-4 sm:px-5 max-w-xs sm:max-w-md">
                                <div className="flex items-center gap-2">
                                  {isParent && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const newSet = new Set(expandedPackages);
                                        if (newSet.has(pkg.id)) {
                                          newSet.delete(pkg.id);
                                        } else {
                                          newSet.add(pkg.id);
                                        }
                                        setExpandedPackages(newSet);
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  )}
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{pkg.name}</div>
                                </div>
                                {pkg.description ? (
                                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 ml-6">
                                    {pkg.description}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic mt-0.5 ml-6">No description set</p>
                                )}
                              </td>

                              {/* Starting Fare / Price */}
                              <td className="py-3.5 px-4 sm:px-5">
                                <div className="inline-flex items-center gap-1 text-sm font-extrabold text-indigo-700 bg-blue-50/80 border border-indigo-200/90 px-2.5 py-1 rounded-lg">
                                  <span>₹{Math.round(Number(pkg.base_price) || 0).toLocaleString("en-IN")}</span>
                                </div>
                              </td>

                              {/* Highlight / Popularity Badge */}
                              <td className="py-3.5 px-4 sm:px-5">
                                {pkg.tag || pkg.popular ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                      (pkg.tag || "").toLowerCase().includes("popular") || pkg.popular
                                        ? "bg-amber-50 text-amber-700 border-amber-200/90"
                                        : (pkg.tag || "").toLowerCase().includes("rare")
                                        ? "bg-slate-100 text-slate-700 border-slate-200"
                                        : (pkg.tag || "").toLowerCase().includes("best")
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }`}
                                  >
                                    ★ {pkg.tag || "Popular"}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs font-medium">—</span>
                                )}
                              </td>

                              {/* Duration / ETA */}
                              <td className="py-3.5 px-4 sm:px-5">
                                {pkg.duration ? (
                                  <span className="text-slate-600 font-medium">{pkg.duration}</span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>

                              {/* Status (Clickable Toggle) */}
                              <td className="py-3.5 px-4 sm:px-5">
                                <button
                                  type="button"
                                  onClick={() => !isParent && handleToggleStatus(pkg)}
                                  title={isParent ? "" : `Click to set ${pkg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}`}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border transition-all cursor-pointer ${
                                    pkg.status === "ACTIVE"
                                      ? "bg-blue-50 text-blue-700 border-blue-200/90"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      pkg.status === "ACTIVE"
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                  <span>{pkg.status}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 sm:px-5 text-right">
                                {isParent ? (
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openQuickPriceEdit(pkg)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold border border-indigo-200/80 shadow-xs transition-all cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Customise</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openQuickPriceEdit(pkg)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold border border-indigo-200/80 shadow-xs transition-all cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Customise</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEdit(pkg)}
                                      title="Edit Package Details"
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                    >
                                      <SlidersHorizontal className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );

                          if (isParent && isExpanded) {
                            pkg.subOptions.forEach((sub) => {
                              rows.push(
                                <tr key={sub.id} className="bg-slate-50/50 hover:bg-slate-100/60 transition-colors border-l-4 border-indigo-500">
                                  <td className="py-3.5 pl-12 pr-4 sm:pr-5">
                                    <div className="font-bold text-slate-700 text-xs">{sub.name}</div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{sub.description || "Sub-variant option"}</p>
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5">
                                    <span className="text-xs font-bold text-slate-600">₹{Math.round(Number(sub.base_price) || 0)}</span>
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5">
                                    {sub.tag ? <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-bold">★ {sub.tag}</span> : "—"}
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5 text-slate-500 text-xs">
                                    {sub.duration}
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(sub)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                        sub.status === "ACTIVE" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}
                                    >
                                      {sub.status}
                                    </button>
                                  </td>
                                  <td className="py-3.5 px-4 sm:px-5 text-right">
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openQuickPriceEdit(sub)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200/50 cursor-pointer"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Customise</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEdit(sub)}
                                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                      >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          }

                          return rows;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Sub-Service Customise Modal (Heading & Description) ── */}
      {serviceEditing && (
        <Modal
          maxWidth="max-w-2xl"
          title={`Customise Sub-Service: ${serviceEditing.name}`}
          onClose={() => setServiceEditing(null)}
        >
          <form onSubmit={handleServiceSave} className="flex flex-col gap-5 font-sans text-left">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category Pillar</span>
                <div className="text-sm sm:text-base font-extrabold text-indigo-950 mt-0.5">{activePillar.name}</div>
              </div>
              <span className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/80 shadow-2xs">
                Live Module Header
              </span>
            </div>

            <div>
              <Input
                label="Sub-Service Name / Title"
                required
                placeholder="e.g. 2 Wheeler, Truck, Packers & Movers"
                value={serviceEditing.name || ""}
                onChange={(e) => setServiceEditing({ ...serviceEditing, name: e.target.value })}
              />
            </div>

            <div>
              <TextArea
                label="Sub-Service Description"
                placeholder="Describe this service category or delivery fleet capability..."
                value={serviceEditing.description || ""}
                onChange={(e) => setServiceEditing({ ...serviceEditing, description: e.target.value })}
              />
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setServiceEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Save Sub-Service</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Customise Package Modal (Heading, Description, Price, Tag, Duration) ── */}
      {quickPriceEditing && (
        <Modal
          maxWidth="max-w-2xl sm:max-w-3xl"
          title={`Customise: ${quickPriceEditing.name}`}
          onClose={() => setQuickPriceEditing(null)}
        >
          <form onSubmit={handleQuickPriceSave} className="flex flex-col gap-5 font-sans text-left">
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50/70 rounded-2xl border border-indigo-100/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Service Category</span>
                <div className="text-sm sm:text-base font-extrabold text-indigo-950 mt-0.5">{quickPriceEditing.service_name || activePillar.name}</div>
              </div>
              <span className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-full border border-indigo-200/80 shadow-2xs">
                Live Sync Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Package Heading / Vehicle Name"
                required
                placeholder="e.g. 1.7 ton (1700 kg), 2 Wheeler Electric / Express"
                value={quickPriceEditing.name || ""}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, name: e.target.value })
                }
              />
              <Input
                label="Starting Fare / Base Price (₹)"
                type="number"
                required
                placeholder="e.g. 380"
                value={quickPriceEditing.base_price}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, base_price: e.target.value })
                }
              />
            </div>

            <div>
              <TextArea
                label="Description (shown on customer booking cards & info modals)"
                placeholder="Describe this vehicle payload, bed dimensions, or service details..."
                value={quickPriceEditing.description || ""}
                onChange={(e) =>
                  setQuickPriceEditing({ ...quickPriceEditing, description: e.target.value })
                }
              />
            </div>

            {/* ── Suitable for / Know More Checklist Section (Blue Shade Theme) ── */}
            <div className="bg-gradient-to-b from-blue-50/50 to-slate-50/70 rounded-2xl p-4 sm:p-5 border border-blue-100/90 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Suitable for / &ldquo;Know More&rdquo; Checklist
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100 text-blue-800 rounded-full border border-blue-200/90 shadow-2xs">
                      {quickPriceEditing.checklist?.filter((i) => i.checked).length || 0} Ticked
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tick items to display in the customer &ldquo;Know More&rdquo; modal. Untick to hide. Add custom items below.
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {quickPriceEditing.checklist && quickPriceEditing.checklist.length > 0 ? (
                  quickPriceEditing.checklist.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                        item.checked
                          ? "bg-white border-blue-200 hover:border-blue-300 shadow-2xs"
                          : "bg-slate-100/60 border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => {
                            const updated = quickPriceEditing.checklist.map((ci) =>
                              ci.id === item.id ? { ...ci, checked: !ci.checked } : ci
                            )
                            setQuickPriceEditing({ ...quickPriceEditing, checklist: updated })
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                        {quickPriceEditing.editingItemId === item.id ? (
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updated = quickPriceEditing.checklist.map((ci) =>
                                ci.id === item.id ? { ...ci, text: e.target.value } : ci
                              )
                              setQuickPriceEditing({ ...quickPriceEditing, checklist: updated })
                            }}
                            onBlur={() => setQuickPriceEditing({ ...quickPriceEditing, editingItemId: null })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setQuickPriceEditing({ ...quickPriceEditing, editingItemId: null })
                              }
                            }}
                            autoFocus
                            className="bg-white border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-1.5 py-0.5 text-xs font-semibold flex-1 text-slate-800"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              // By request, clicking the row text directly does not trigger edit, must click the edit icon.
                              // Clicking the checkbox still toggles, but span does nothing.
                            }}
                            className={`text-xs font-semibold px-1.5 py-0.5 flex-1 select-none ${
                              item.checked ? "text-slate-800" : "text-slate-500 line-through"
                            }`}
                          >
                            {item.text}
                          </span>
                        )}
                      </label>

                      <div className="flex items-center gap-1">
                        {/* Edit indicator/button */}
                        <button
                          type="button"
                          onClick={() => {
                            setQuickPriceEditing({
                              ...quickPriceEditing,
                              editingItemId: item.id
                            })
                          }}
                          title="Rename item"
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            quickPriceEditing.editingItemId === item.id
                              ? "text-blue-600 bg-blue-50"
                              : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = quickPriceEditing.checklist.filter((ci) => ci.id !== item.id)
                          setQuickPriceEditing({ ...quickPriceEditing, checklist: updated })
                        }}
                        title="Remove item"
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">No checklist items added yet.</p>
                )}
              </div>

              {/* Add New Item Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-blue-100">
                <input
                  type="text"
                  placeholder="Type new item (e.g. Fragile glassware, Heavy pallet items)..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (newItemText.trim()) {
                        const newItem = {
                          id: `custom-${Date.now()}`,
                          text: newItemText.trim(),
                          checked: true,
                        }
                        setQuickPriceEditing({
                          ...quickPriceEditing,
                          checklist: [...(quickPriceEditing.checklist || []), newItem],
                        })
                        setNewItemText("")
                      }
                    }
                  }}
                  className="flex-1 h-9 px-3 rounded-xl border border-blue-200/80 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newItemText.trim()) {
                      const newItem = {
                        id: `custom-${Date.now()}`,
                        text: newItemText.trim(),
                        checked: true,
                      }
                      setQuickPriceEditing({
                        ...quickPriceEditing,
                        checklist: [...(quickPriceEditing.checklist || []), newItem],
                      })
                      setNewItemText("")
                    }
                  }}
                  className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {/* ── Highlight / Popularity Badge Customization Section ── */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Highlight / Popularity Badge
                    </span>
                    {quickPriceEditing.tag ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-50 text-amber-800 rounded-full border border-amber-200 shadow-2xs">
                        Active: {quickPriceEditing.tag}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded-full border border-slate-200">
                        No Badge (Hidden on Service Page)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click a badge preset or type custom text. If set, it will be displayed on the customer service card. If cleared, no badge is shown.
                  </p>
                </div>
              </div>

              {/* Quick Select Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "★ Popular", val: "Popular", tone: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100" },
                  { label: "📦 Rarely Used", val: "Rarely Used", tone: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200" },
                  { label: "⚡ Best Seller", val: "Best Seller", tone: "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100" },
                  { label: "🔥 Trending", val: "Trending", tone: "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100" },
                  { label: "✕ None (Clear)", val: "", tone: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() =>
                      setQuickPriceEditing({
                        ...quickPriceEditing,
                        tag: opt.val,
                        popular: opt.val === "Popular",
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (quickPriceEditing.tag || "") === opt.val
                        ? "ring-2 ring-indigo-500 shadow-xs " + opt.tone
                        : opt.tone
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Input
                  label="Custom Badge Text"
                  placeholder="e.g. Popular, Rarely Used, Most Booked..."
                  value={quickPriceEditing.tag || ""}
                  onChange={(e) =>
                    setQuickPriceEditing({
                      ...quickPriceEditing,
                      tag: e.target.value,
                      popular: e.target.value.toLowerCase().includes("popular"),
                    })
                  }
                />
                <Input
                  label={activeCategoryKey === "goods_transports" ? "Duration of Badge Display (e.g. 30 days, 6 months, 1 yr)" : "Duration / ETA (e.g. 15 mins, 30 mins)"}
                  placeholder={activeCategoryKey === "goods_transports" ? "e.g. 30 days, 6 months, 1 yr" : "e.g. 15 mins"}
                  value={quickPriceEditing.duration || ""}
                  onChange={(e) =>
                    setQuickPriceEditing({ ...quickPriceEditing, duration: e.target.value })
                  }
                />
              </div>
            </div>

            {/* ── Image Customization Section ── */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Package Image
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload a custom package image or paste an image URL. Fits automatically to size and ratio.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {quickPriceEditing.image ? (
                  <div className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
                    <img src={quickPriceEditing.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setQuickPriceEditing((prev) => ({ ...prev, image: "" }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 flex-shrink-0 text-slate-400 text-[10px] font-bold">
                    No Image
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const formData = new FormData()
                        formData.append("image", file)
                        try {
                          const res = await apiRequest("/settings/catalog/upload-image/", {
                            method: "POST",
                            body: formData,
                          })
                          if (res.success && res.url) {
                            setQuickPriceEditing((prev) => ({ ...prev, image: res.url }))
                            showToast("Image uploaded successfully!")
                          } else {
                            showToast(res.message || "Upload failed", "error")
                          }
                        } catch (err) {
                          showToast("Upload failed", "error")
                        }
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <Input
                    label="Or Image URL"
                    placeholder="https://images.unsplash.com/..."
                    value={quickPriceEditing.image || ""}
                    onChange={(e) => setQuickPriceEditing({ ...quickPriceEditing, image: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ── View Details Content Section (Tools, Ready, Reviews, FAQs) ── */}
            {Boolean(quickPriceEditing) && (() => {
              const vd = quickPriceEditing.viewDetails || { tools: [], ready: [], reviews: [], faqs: [] }
              const setVd = (updates) => setQuickPriceEditing({ ...quickPriceEditing, viewDetails: { ...vd, ...updates } })
              return (
                <div className="rounded-2xl border border-emerald-100/90 overflow-hidden bg-gradient-to-b from-emerald-50/30 to-slate-50/40">
                  <button
                    type="button"
                    onClick={() => setQuickPriceEditing({ ...quickPriceEditing, _vdOpen: !quickPriceEditing._vdOpen })}
                    className="w-full flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-emerald-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">View Details Content</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/90">Shown in app popup</span>
                    </div>
                    <span className="text-slate-400 text-sm font-bold">{quickPriceEditing._vdOpen ? "−" : "+"}</span>
                  </button>

                  {quickPriceEditing._vdOpen && (
                    <div className="px-5 pb-5 space-y-5 border-t border-emerald-100">

                      {/* Tools & Products We Use */}
                      <div className="pt-4">
                        <div className="text-xs font-bold text-slate-700 mb-2">🔧 Tools &amp; Products We Use</div>
                        <div className="space-y-1.5 mb-2">
                          {(vd.tools || []).map((t, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="text" value={t} onChange={(e) => { const a = [...(vd.tools || [])]; a[i] = e.target.value; setVd({ tools: a }) }} className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 outline-none" />
                              <button type="button" onClick={() => { const a = [...(vd.tools || [])]; a.splice(i, 1); setVd({ tools: a }) }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setVd({ tools: [...(vd.tools || []), ""] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add tool / product</button>
                      </div>

                      {/* What You Need to Keep Ready */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">✅ What You Need to Keep Ready</div>
                        <div className="space-y-1.5 mb-2">
                          {(vd.ready || []).map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="text" value={r} onChange={(e) => { const a = [...(vd.ready || [])]; a[i] = e.target.value; setVd({ ready: a }) }} className="flex-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 outline-none" />
                              <button type="button" onClick={() => { const a = [...(vd.ready || [])]; a.splice(i, 1); setVd({ ready: a }) }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setVd({ ready: [...(vd.ready || []), ""] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add item</button>
                      </div>

                      {/* Customer Reviews */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">⭐ Customer Reviews</div>
                        <div className="space-y-2.5 mb-2">
                          {(vd.reviews || []).map((rev, i) => (
                            <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2">
                              <div className="flex gap-2">
                                <input type="text" placeholder="Name" value={rev.name || ""} onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], name: e.target.value }; setVd({ reviews: a }) }} className="flex-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:border-emerald-400 outline-none" />
                                <input type="text" placeholder="Rating (e.g. 4.9)" value={rev.rating || ""} onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], rating: e.target.value }; setVd({ reviews: a }) }} className="w-24 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:border-emerald-400 outline-none" />
                                <button type="button" onClick={() => { const a = [...(vd.reviews || [])]; a.splice(i, 1); setVd({ reviews: a }) }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              <textarea placeholder="Review text..." value={rev.text || ""} onChange={(e) => { const a = [...(vd.reviews || [])]; a[i] = { ...a[i], text: e.target.value }; setVd({ reviews: a }) }} rows={2} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:border-emerald-400 outline-none resize-none" />
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setVd({ reviews: [...(vd.reviews || []), { name: "", rating: "5.0", text: "" }] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add review</button>
                      </div>

                      {/* FAQs */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">❓ Frequently Asked Questions</div>
                        <div className="space-y-2.5 mb-2">
                          {(vd.faqs || []).map((faq, i) => (
                            <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2">
                              <div className="flex gap-2">
                                <input type="text" placeholder="Question" value={faq.q || ""} onChange={(e) => { const a = [...(vd.faqs || [])]; a[i] = { ...a[i], q: e.target.value }; setVd({ faqs: a }) }} className="flex-1 h-8 px-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:border-emerald-400 outline-none" />
                                <button type="button" onClick={() => { const a = [...(vd.faqs || [])]; a.splice(i, 1); setVd({ faqs: a }) }} className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              <textarea placeholder="Answer..." value={faq.a || ""} onChange={(e) => { const a = [...(vd.faqs || [])]; a[i] = { ...a[i], a: e.target.value }; setVd({ faqs: a }) }} rows={2} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:border-emerald-400 outline-none resize-none" />
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setVd({ faqs: [...(vd.faqs || []), { q: "", a: "" }] })} className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer">+ Add FAQ</button>
                      </div>

                    </div>
                  )}
                </div>
              )
            })()}

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickPriceEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-extrabold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Save &amp; Publish Live</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Full Edit / New Package Modal ── */}
      {editing && (
        <Modal
          maxWidth="max-w-2xl sm:max-w-3xl"
          title={editing.id ? `Edit Package: ${editing.name}` : "Create New Package"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-5 font-sans text-left">
            <Select
              label="Parent Service"
              required
              options={services.map((s) => ({
                value: String(s.id),
                label: `${s.category_name ? s.category_name + " / " : ""}${s.name}`,
              }))}
              value={String(editing.service?.id || editing.service || "")}
              onChange={(e) => setEditing({ ...editing, service: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Package Name"
                required
                placeholder={namePlaceholder}
                value={editing.name}
                onChange={(e) => {
                  const val = e.target.value
                  const autoSlug = !editing.id
                    ? val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                    : editing.slug
                  setEditing({ ...editing, name: val, slug: autoSlug })
                }}
              />
              <Input
                label="Slug Identifier"
                required
                placeholder={slugPlaceholder}
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              />
            </div>

            <TextArea
              label="Short Description"
              placeholder={descPlaceholder}
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Price / Starting Fare (₹)"
                type="number"
                required
                placeholder="e.g. 300"
                value={editing.base_price}
                onChange={(e) => setEditing({ ...editing, base_price: e.target.value })}
              />
              <Input
                label={activeCategoryKey === "goods_transports" ? "Duration of Badge Display (e.g. 30 days, 6 months, 1 yr)" : "Duration / ETA (e.g. 20 mins, 1 hr)"}
                placeholder={activeCategoryKey === "goods_transports" ? "e.g. 30 days, 6 months, 1 yr" : "e.g. 20 mins, 1 hr"}
                value={editing.duration || ""}
                onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
              />
            </div>

            <Input
              label="Tag Badge (e.g. Heavy (above 750kg), Best Seller)"
              value={editing.tag || ""}
              onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
            />

            <Input
              label="Includes (comma-separated features)"
              placeholder={includesPlaceholder}
              value={editing.includes}
              onChange={(e) => setEditing({ ...editing, includes: e.target.value })}
            />

            <Input
              label="Excludes (comma-separated)"
              placeholder={excludesPlaceholder}
              value={editing.excludes}
              onChange={(e) => setEditing({ ...editing, excludes: e.target.value })}
            />

            {/* ── Image Customization Section ── */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Package Image
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload a custom package image or paste an image URL. Fits automatically to size and ratio.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {editing.image ? (
                  <div className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0 group">
                    <img src={editing.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing((prev) => ({ ...prev, image: "" }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 flex-shrink-0 text-slate-400 text-[10px] font-bold">
                    No Image
                  </div>
                )}
                <div className="flex-1 w-full space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const formData = new FormData()
                        formData.append("image", file)
                        try {
                          const res = await apiRequest("/settings/catalog/upload-image/", {
                            method: "POST",
                            body: formData,
                          })
                          if (res.success && res.url) {
                            setEditing((prev) => ({ ...prev, image: res.url }))
                            showToast("Image uploaded successfully!")
                          } else {
                            showToast(res.message || "Upload failed", "error")
                          }
                        } catch (err) {
                          showToast("Upload failed", "error")
                        }
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <Input
                    label="Or Image URL"
                    placeholder="https://images.unsplash.com/..."
                    value={editing.image || ""}
                    onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editing.popular}
                  onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span>Featured / Popular in Customer Booking</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold shadow-md shadow-indigo-700/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>{editing.id ? "Save Changes" : "Create Package"}</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
