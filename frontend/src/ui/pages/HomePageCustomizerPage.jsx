import React, { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router-dom"
import {
  Globe, Layout, Sparkles, ShieldCheck, Clock, Award, Headphones,
  BadgeCheck, Star, HeartPulse, Plus, Trash2, Check, RotateCcw,
  Eye, Save, ArrowUp, ArrowDown, Image as ImageIcon, MessageSquare,
  Gift, FileText, Phone, Mail, ChevronRight,
  Layers, CheckCircle, ExternalLink, Sliders, ToggleLeft, ToggleRight,
  ChefHat, Utensils, Monitor, Tablet, Smartphone, Maximize2, RefreshCw,
  IndianRupee, CheckCircle2, ChevronDown, ChevronUp, Pencil, Search, X
} from "lucide-react"
import { getHomePageConfig, saveHomePageConfig, resetHomePageConfig, DEFAULT_HOME_PAGE_CONFIG, fetchDirectImageUrl, fetchPublishedHomePageConfig, publishHomePageConfig, resolveDisplayImageUrl } from "../../config/homePageConfig.js"
import ImageUploadField from "../components/ImageUploadField.jsx"
import { AdminRecipesPage } from "./catalog/AdminRecipesPage.jsx"
import { AdminRecommendationsPage } from "./catalog/AdminRecommendationsPage.jsx"

const HERO_ILLUSTRATION_PRESETS = [
  {
    id: "concept3",
    title: "Concept 3 3D Hero Illustration (Default)",
    description: "3D isometric characters: plumber, electrician, cleaner, painter",
    url: "/assets/hero_illustration.jpg"
  },
  {
    id: "repair",
    title: "Professional Home & Repair Services",
    description: "Technician & repair tools showcase photo",
    url: "/assets/sevo_photo_home_repair.jpg"
  },
  {
    id: "grocery",
    title: "Food, Health & Farm Fresh Delivery",
    description: "Fresh groceries & vegetables delivery photo",
    url: "/assets/sevo_photo_food_health.jpg"
  },
  {
    id: "transport",
    title: "Goods & Doorstep Cargo Transport",
    description: "Mini truck & logistics service photo",
    url: "/assets/sevo_photo_goods_transport.jpg"
  }
]

export default function HomePageCustomizerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTabParam = searchParams.get("tab") || "hero"

  const [config, setConfig] = useState(getHomePageConfig())
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewViewport, setPreviewViewport] = useState("full") // "full", "desktop", "tablet", "mobile"
  const [previewEditMode, setPreviewEditMode] = useState(false)
  const [previewScreen, setPreviewScreen] = useState("home") // "home", "pillars", "subcategories", "kitchen"
  const [showPreviewQuickEdit, setShowPreviewQuickEdit] = useState(false)
  const [previewQuickEditTab, setPreviewQuickEditTab] = useState("hero")
  const [showLegacyCollage, setShowLegacyCollage] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [sidebarOffset, setSidebarOffset] = useState(360)
  const [keepSidebarVisible, setKeepSidebarVisible] = useState(true)
  const [activeTab, setActiveTab] = useState(activeTabParam)
  const [isPublishing, setIsPublishing] = useState(false)

  const [resolvingUrls, setResolvingUrls] = useState({})
  const iframeRef = useRef(null)

  // Measure active admin sidebar width dynamically so preview docks perfectly beside it
  useEffect(() => {
    if (!showPreviewModal) return

    const updateSidebarWidth = () => {
      const asides = document.querySelectorAll("aside")
      let totalW = 0
      asides.forEach((aside) => {
        const rect = aside.getBoundingClientRect()
        if (rect.width > 0 && rect.left < 50) {
          totalW += rect.width
        }
      })
      // If 2 sidebars found (primary + drilldown) total is ~360px, else fallback to 100px or 360px
      setSidebarOffset(totalW > 50 ? totalW : 360)
    }

    updateSidebarWidth()
    window.addEventListener("resize", updateSidebarWidth)
    const interval = setInterval(updateSidebarWidth, 400)

    return () => {
      window.removeEventListener("resize", updateSidebarWidth)
      clearInterval(interval)
    }
  }, [showPreviewModal])

  // Close preview modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowPreviewModal(false)
      }
    }
    if (showPreviewModal) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showPreviewModal])

  // Fetch initial config from PostgreSQL database
  useEffect(() => {
    let isMounted = true
    fetchPublishedHomePageConfig().then(serverCfg => {
      if (serverCfg && isMounted) {
        setConfig(serverCfg)
      }
    })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (activeTabParam !== activeTab) {
      setActiveTab(activeTabParam)
    }
  }, [activeTabParam])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  const handleSave = async () => {
    setIsPublishing(true)
    const result = await publishHomePageConfig(config)
    setIsPublishing(false)

    if (result.success) {
      setShowSavedToast(true)
      setTimeout(() => setShowSavedToast(false), 3000)
    } else {
      alert(`Publishing failed: ${result.error || "Unknown error"}`)
    }
  }

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all Home Page settings to default?")) {
      const reset = resetHomePageConfig()
      setConfig(reset)
      setShowSavedToast(true)
      setTimeout(() => setShowSavedToast(false), 3000)
    }
  }

  // Helper updates
  const updateHero = (field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        hero: { ...prev.hero, [field]: value }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const updateTrustBadge = (idx, field, value) => {
    setConfig(prev => {
      const badges = [...(prev.hero?.trustBadges || DEFAULT_HOME_PAGE_CONFIG.hero.trustBadges)]
      badges[idx] = { ...badges[idx], [field]: value }
      if (field === "title") {
        badges[idx].text = value
      }
      const next = {
        ...prev,
        hero: {
          ...prev.hero,
          trustBadges: badges,
          quickBadges: badges.map(b => ({ id: b.id, text: b.title, title: b.title, subtitle: b.subtitle, icon: b.icon }))
        }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const resetTrustBadges = () => {
    setConfig(prev => {
      const next = {
        ...prev,
        hero: {
          ...prev.hero,
          trustBadges: DEFAULT_HOME_PAGE_CONFIG.hero.trustBadges,
          quickBadges: DEFAULT_HOME_PAGE_CONFIG.hero.quickBadges
        }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const updatePillarModal = (field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        pillarModal: { ...(prev.pillarModal || DEFAULT_HOME_PAGE_CONFIG.pillarModal), [field]: value }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const updateSubServicesModal = (field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        subServicesModal: { ...(prev.subServicesModal || DEFAULT_HOME_PAGE_CONFIG.subServicesModal), [field]: value }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const updateCleaningSubItem = (idx, name) => {
    setConfig(prev => {
      const current = [...(prev.subServicesModal?.cleaningItems || DEFAULT_HOME_PAGE_CONFIG.subServicesModal.cleaningItems)]
      current[idx] = { ...current[idx], name }
      const next = {
        ...prev,
        subServicesModal: { ...(prev.subServicesModal || DEFAULT_HOME_PAGE_CONFIG.subServicesModal), cleaningItems: current }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const updatePestSubItem = (idx, name) => {
    setConfig(prev => {
      const current = [...(prev.subServicesModal?.pestItems || DEFAULT_HOME_PAGE_CONFIG.subServicesModal.pestItems)]
      current[idx] = { ...current[idx], name }
      const next = {
        ...prev,
        subServicesModal: { ...(prev.subServicesModal || DEFAULT_HOME_PAGE_CONFIG.subServicesModal), pestItems: current }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  // Synchronize edit mode with preview iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: "TOGGLE_EDIT_MODE",
        enabled: previewEditMode
      }, "*")
    }
  }, [previewEditMode, iframeKey])

  // Synchronize config updates with preview iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: "HOMEPAGE_CONFIG_UPDATE",
        config
      }, "*")
    }
  }, [config])

  // Listen for edits made inside preview iframe
  useEffect(() => {
    const handleChildMessage = (e) => {
      if (e.data?.type === "HOMEPAGE_CONFIG_CHANGED" && e.data?.config) {
        setConfig(e.data.config)
      }
    }
    window.addEventListener("message", handleChildMessage)
    return () => window.removeEventListener("message", handleChildMessage)
  }, [])

  const updateOffersMain = (field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        offers: {
          ...prev.offers,
          mainCard: { ...prev.offers.mainCard, [field]: value }
        }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const updateFooter = (field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        footer: { ...prev.footer, [field]: value }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const navWorkflowSteps = [
    { id: "hero", label: "Hero Banner", icon: Globe, color: "text-amber-600 bg-amber-50" },
    { id: "categories", label: "Browse Categories", icon: Layers, color: "text-blue-600 bg-blue-50" },
    { id: "recipes", label: "Vegetable Recipes", icon: ChefHat, color: "text-emerald-600 bg-emerald-50" },
    { id: "recommendations", label: "Produce Pairings", icon: Utensils, color: "text-green-700 bg-green-50" },
    { id: "offers", label: "Promotional Offers", icon: Gift, color: "text-pink-600 bg-pink-50" },
    { id: "trust", label: "Why Choose Us", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
    { id: "testimonials", label: "Customer Reviews", icon: Award, color: "text-orange-600 bg-orange-50" },
    { id: "footer", label: "Footer & Contacts", icon: FileText, color: "text-slate-600 bg-slate-100" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Home Page Customizer
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                Admin Module
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Customize text, banners, promotional cards, badges, and layout workflow in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition flex items-center gap-2 shadow-sm"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            Live Preview
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-medium text-sm transition flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition flex items-center gap-2 shadow-md shadow-teal-600/30"
          >
            <Save className="w-4 h-4" />
            Publish Changes
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {showSavedToast && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium text-sm">Home Page configuration published successfully! Live page has updated.</span>
          </div>
          <button onClick={() => setShowSavedToast(false)} className="text-emerald-100 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: Left Workflow Sidebar + Right Content Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workflow Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Homepage Sections
            </div>
            {navWorkflowSteps.map((step) => {
              const IconComponent = step.icon
              const isActive = activeTab === step.id
              return (
                <button
                  key={step.id}
                  onClick={() => handleTabChange(step.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition ${isActive
                      ? "bg-teal-50 text-teal-900 border border-teal-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span>{step.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition ${isActive ? "text-teal-600 translate-x-0.5" : "text-slate-300"}`} />
                </button>
              )
            })}
          </div>

          <div className="bg-teal-900 text-teal-100 p-4 rounded-2xl space-y-2 border border-teal-800">
            <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-400" /> Live Sync Active
            </div>
            <p className="text-xs text-teal-200 leading-relaxed">
              All changes published here reflect instantly across customer browsers without requiring any backend deployment.
            </p>
          </div>
        </div>

        {/* Content Customization Form Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: HERO BANNER */}
          {activeTab === "hero" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-amber-500" />
                    Hero Section & Search Header
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage top banner headline, subtext, search bar placeholder, and hero collage images.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Top Pill Badge
                  </label>
                  <input
                    type="text"
                    value={config.hero.badge}
                    onChange={(e) => updateHero("badge", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    placeholder="e.g. Reliable. Affordable. Right at Your Doorstep."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Heading Prefix
                  </label>
                  <input
                    type="text"
                    value={config.hero.mainHeadingFirst}
                    onChange={(e) => updateHero("mainHeadingFirst", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Heading Highlight Word (Teal)
                  </label>
                  <input
                    type="text"
                    value={config.hero.mainHeadingHighlight}
                    onChange={(e) => updateHero("mainHeadingHighlight", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none font-bold text-teal-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Heading Suffix
                  </label>
                  <input
                    type="text"
                    value={config.hero.mainHeadingLast}
                    onChange={(e) => updateHero("mainHeadingLast", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Subtitle Description
                  </label>
                  <input
                    type="text"
                    value={config.hero.subtitle}
                    onChange={(e) => updateHero("subtitle", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Search Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={config.hero.searchPlaceholder}
                    onChange={(e) => updateHero("searchPlaceholder", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Default Location Tag
                  </label>
                  <input
                    type="text"
                    value={config.hero.searchLocation}
                    onChange={(e) => updateHero("searchLocation", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* 6 Trust Badges in a 2x3 Grid (Matching Customer Homepage) */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      6 Trust Badges (2x3 Grid Below Search Bar)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live on the customer homepage under the search bar. Each badge displays an icon, bold title, and subtitle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetTrustBadges}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset 6 Badges to Default
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(config.hero.trustBadges || DEFAULT_HOME_PAGE_CONFIG.hero.trustBadges).map((badge, idx) => {
                    const badgeColors = [
                      { bg: "bg-teal-50 text-teal-700 border-teal-200", icon: ShieldCheck, label: "Badge 1 (Teal)" },
                      { bg: "bg-amber-50 text-amber-700 border-amber-200", icon: Star, label: "Badge 2 (Amber)" },
                      { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Clock, label: "Badge 3 (Emerald)" },
                      { bg: "bg-blue-50 text-blue-700 border-blue-200", icon: IndianRupee, label: "Badge 4 (Blue)" },
                      { bg: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle2, label: "Badge 5 (Purple)" },
                      { bg: "bg-rose-50 text-rose-700 border-rose-200", icon: Headphones, label: "Badge 6 (Rose)" }
                    ]
                    const col = badgeColors[idx % badgeColors.length]
                    const IconComponent = col.icon

                    return (
                      <div key={badge.id || idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${col.bg}`}>
                            <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                            {col.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Position #{idx + 1}</span>
                        </div>

                        <div className="space-y-1.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                              Title
                            </label>
                            <input
                              type="text"
                              value={badge.title || badge.text || ""}
                              onChange={(e) => updateTrustBadge(idx, "title", e.target.value)}
                              placeholder="e.g. Verified Experts"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                              Subtitle
                            </label>
                            <input
                              type="text"
                              value={badge.subtitle || ""}
                              onChange={(e) => updateTrustBadge(idx, "subtitle", e.target.value)}
                              placeholder="e.g. Background Checked"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Concept 3 Hero Illustration Customization */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-teal-600" />
                      Right Hero Side Illustration (Concept 3 Layout)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customize the 3D isometric hero illustration or upload a high-resolution hero photo for the right side of the customer landing page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateHero("heroImage", "/assets/hero_illustration.jpg")
                      updateHero("heroIllustration", "/assets/hero_illustration.jpg")
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Concept 3 Hero
                  </button>
                </div>

                {/* Live Hero Banner Preview -- matches the ACTUAL customer
                    homepage design: the entire banner is a single full-width
                    image (no code-drawn heading/badge/search-bar text is
                    ever rendered on top of it on the live page anymore).
                    For a pixel-exact preview use the "Preview" tab, which
                    embeds the real LandingPage.jsx in an iframe -- this
                    block is just a quick at-a-glance sanity check that the
                    uploaded image + price badge look right. */}
                <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Current Homepage Hero Banner Preview
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Full-width image banner</span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950/80">
                    <img
                      src={resolveDisplayImageUrl(config.hero.heroImage || config.hero.heroIllustration, "/assets/hero_illustration.jpg")}
                      onError={(e) => { e.currentTarget.src = "/assets/hero_illustration.jpg" }}
                      alt="Current Hero Banner"
                      className="w-full h-[180px] sm:h-[260px] object-cover"
                    />
                    {config.hero.priceBadge && (
                      <div className="absolute bottom-3 right-3 bg-white/95 rounded-xl px-3 py-1.5 shadow-lg">
                        <span className="text-xs font-black text-slate-900">{config.hero.priceBadge}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    This is the entire banner shown to customers -- it's a single admin-uploaded image with an optional price badge and click-through redirect link (set below). Nothing else is drawn on top of it.
                  </p>
                </div>

                {/* Hero Illustration Controls & Presets */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="lg:col-span-6 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Upload or Replace Hero Image
                    </label>
                    <ImageUploadField
                      value={config.hero.heroImage || config.hero.heroIllustration || "/assets/hero_illustration.jpg"}
                      onChange={(newPath) => {
                        updateHero("heroImage", newPath)
                        updateHero("heroIllustration", newPath)
                      }}
                      section="hero"
                      fallbackSrc="/assets/hero_illustration.jpg"
                      aspectRatio="aspect-[4/3]"
                    />
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Or Enter Direct Image URL / Path:
                      </label>
                      <input
                        type="text"
                        value={config.hero.heroImage || config.hero.heroIllustration || ""}
                        onChange={(e) => {
                          updateHero("heroImage", e.target.value)
                          updateHero("heroIllustration", e.target.value)
                        }}
                        placeholder="/assets/hero_illustration.jpg"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <div className="lg:col-span-6 space-y-3">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Curated Hero Showcase Presets
                    </label>
                    <div className="space-y-2">
                      {HERO_ILLUSTRATION_PRESETS.map((preset) => {
                        const isSelected = (config.hero.heroImage === preset.url) ||
                          (!config.hero.heroImage && preset.id === "concept3")

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              updateHero("heroImage", preset.url)
                              updateHero("heroIllustration", preset.url)
                            }}
                            className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                              isSelected
                                ? "bg-teal-50 border-teal-400 text-teal-950 shadow-xs"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80"
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="w-12 h-12 rounded-lg object-contain bg-slate-100 shrink-0 border border-slate-200"
                              onError={(e) => { e.currentTarget.src = "/assets/hero_illustration.jpg" }}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold block truncate">{preset.title}</span>
                              <span className="text-[10px] text-slate-500 block truncate">{preset.description}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-teal-600 shrink-0 mr-1" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advertisement Banner Carousel -- the actual rotating "ad" on
                  the customer homepage, separate from the hero illustration
                  above. Slide #1 always reuses the hero image configured
                  above; every additional slide here is a pure banner image
                  (+ optional link and price sticker) that rotates in every
                  ~4.5s, matching exactly what LandingPage.jsx renders --
                  no code-drawn headline/text is ever placed on top of it. */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    Advertisement Banner Carousel
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Extra rotating banner images shown after slide #1 (the hero image above). Each is just an image + optional click-through link -- design any text/price into the image itself.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(config.hero.slides || []).map((slide, idx) => {
                    const updateSlideField = (field, value) => {
                      setConfig(prev => {
                        const newSlides = [...(prev.hero.slides || [])]
                        newSlides[idx] = { ...newSlides[idx], [field]: value }
                        const next = { ...prev, hero: { ...prev.hero, slides: newSlides } }
                        saveHomePageConfig(next)
                        return next
                      })
                    }
                    return (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-700">Slide #{idx + 2}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setConfig(prev => {
                                const newSlides = (prev.hero.slides || []).filter((_, i) => i !== idx)
                                const next = { ...prev, hero: { ...prev.hero, slides: newSlides } }
                                saveHomePageConfig(next)
                                return next
                              })
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <ImageUploadField
                          value={slide.heroImage || ""}
                          onChange={(newPath) => updateSlideField("heroImage", newPath)}
                          section="hero"
                          fallbackSrc="/assets/hero_illustration.jpg"
                          aspectRatio="aspect-[4/3]"
                        />
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Price Badge (optional)</label>
                          <input
                            type="text"
                            value={slide.priceBadge || ""}
                            onChange={(e) => updateSlideField("priceBadge", e.target.value)}
                            placeholder="e.g. ₹499"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Click-Through Link</label>
                          <input
                            type="text"
                            value={slide.link || ""}
                            onChange={(e) => updateSlideField("link", e.target.value)}
                            placeholder="?category=cleaning or https://..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setConfig(prev => {
                      const newSlides = [...(prev.hero.slides || []), {
                        heroImage: prev.hero.heroImage || "/assets/hero_illustration.jpg",
                        priceBadge: "",
                        link: "",
                      }]
                      const next = { ...prev, hero: { ...prev.hero, slides: newSlides } }
                      saveHomePageConfig(next)
                      return next
                    })
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Banner Slide
                </button>
              </div>

              {/* Collapsible Legacy 4-Grid Collage (Optional Archive) */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLegacyCollage(v => !v)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {showLegacyCollage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Legacy 4-Grid Collage Settings (Archived / Optional)</span>
                </button>

                {showLegacyCollage && (
                  <div className="mt-4 p-4 bg-slate-100/70 rounded-2xl border border-slate-200 space-y-4">
                    <p className="text-xs text-slate-500">
                      These 4 collage cards were part of the early mockup. The active customer homepage now uses the Concept 3 Hero Illustration above. You may still customize them below if needed.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: 0, title: "Collage Card 1 (Top-Left)", defaultPreset: "/mockups/service_hvac.png" },
                        { id: 1, title: "Collage Card 2 (Bottom-Left)", defaultPreset: "/mockups/service_electrical.png" },
                        { id: 2, title: "Collage Card 3 (Top-Right)", defaultPreset: "/mockups/service_cleaning.png" },
                        { id: 3, title: "Collage Card 4 (Bottom-Right)", defaultPreset: "/mockups/service_plumbing.png" }
                      ].map((card) => {
                        const currentVal = config.hero.collageImages?.[card.id] || ""

                        return (
                          <div key={card.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                            <span className="text-xs font-bold text-slate-800 block">{card.title}</span>
                            <ImageUploadField
                              value={currentVal}
                              onChange={(newPath) => {
                                const newImgs = [...(config.hero.collageImages || [])]
                                newImgs[card.id] = newPath
                                updateHero("collageImages", newImgs)
                              }}
                              section="hero"
                              fallbackSrc={card.defaultPreset}
                              aspectRatio="aspect-[16/9]"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: BROWSE CATEGORIES -- the "What do you need help with?"
              icon grid on the live customer homepage. Each tile is just an
              icon image + a name + a click-through link, matching exactly
              what LandingPage.jsx renders (a fixed "More" tile is always
              appended live and isn't editable here). */}
          {activeTab === "categories" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    "What Do You Need Help With?" Category Icons
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage the quick-category icon tiles shown near the top of the customer homepage -- name, icon image, and click-through link. A fixed "More" tile is always shown after these.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newCat = { id: `cat-${Date.now()}`, name: "New Category", image: "", link: "", enabled: true }
                    setConfig(prev => {
                      const next = { ...prev, categories: [...prev.categories, newCat] }
                      saveHomePageConfig(next)
                      return next
                    })
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.categories.map((cat, idx) => {
                  const updateCatField = (field, value) => {
                    setConfig(prev => {
                      const newCats = [...prev.categories]
                      newCats[idx] = { ...newCats[idx], [field]: value }
                      const next = { ...prev, categories: newCats }
                      saveHomePageConfig(next)
                      return next
                    })
                  }
                  return (
                    <div key={cat.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-700 truncate">{cat.name || "Untitled"}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateCatField("enabled", cat.enabled === false)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cat.enabled !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                          >
                            {cat.enabled !== false ? "On" : "Off"}
                          </button>
                          <button
                            onClick={() => {
                              setConfig(prev => {
                                const newCats = prev.categories.filter((_, i) => i !== idx)
                                const next = { ...prev, categories: newCats }
                                saveHomePageConfig(next)
                                return next
                              })
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <ImageUploadField
                        value={cat.image || ""}
                        onChange={(newPath) => updateCatField("image", newPath)}
                        section="categories"
                        fallbackSrc="/assets/hero_illustration.jpg"
                        label="Icon Image"
                        aspectRatio="aspect-square"
                      />
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Name</label>
                        <input
                          type="text"
                          value={cat.name || ""}
                          onChange={(e) => updateCatField("name", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Click-Through Link</label>
                        <input
                          type="text"
                          value={cat.link || ""}
                          onChange={(e) => updateCatField("link", e.target.value)}
                          placeholder="?category=cleaning or https://..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PROMOTIONAL OFFERS */}
          {activeTab === "offers" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-500" />
                    Promotional Offers Section
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage discount cards, promo codes, and special deal banners.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newOff = {
                      id: `off-${Date.now()}`,
                      image: "",
                      title: "New Offer",
                      link: "",
                      enabled: true
                    }
                    setConfig(prev => {
                      const next = { ...prev, offers: { ...prev.offers, items: [...prev.offers.items, newOff] } }
                      saveHomePageConfig(next)
                      return next
                    })
                  }}
                  className="px-3.5 py-2 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Offer Card
                </button>
              </div>

              <p className="text-xs text-slate-500 -mt-2">
                Each card on the customer homepage is a single banner image you upload here (plus an optional link) — like a real ad, there's no separate discount/title text drawn on top of it in code. Design the offer straight into the image.
              </p>

              {/* Main Teal Offer Card */}
              <div className="p-4 bg-teal-900 text-white rounded-xl space-y-3">
                <div className="text-xs font-bold text-teal-300 uppercase tracking-wider">Main Left Banner Card</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-200 uppercase mb-1">Title</label>
                    <input
                      type="text"
                      value={config.offers.mainCard.title}
                      onChange={(e) => updateOffersMain("title", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-teal-800 text-white text-xs border border-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-200 uppercase mb-1">Subtitle</label>
                    <input
                      type="text"
                      value={config.offers.mainCard.subtitle}
                      onChange={(e) => updateOffersMain("subtitle", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-teal-800 text-white text-xs border border-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-200 uppercase mb-1">Button Text</label>
                    <input
                      type="text"
                      value={config.offers.mainCard.buttonText}
                      onChange={(e) => updateOffersMain("buttonText", e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-teal-800 text-white text-xs border border-teal-700 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Offer Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {config.offers.items.map((off, idx) => {
                  const updateOfferField = (field, value) => {
                    setConfig(prev => {
                      const newItems = [...prev.offers.items]
                      newItems[idx] = { ...newItems[idx], [field]: value }
                      const next = { ...prev, offers: { ...prev.offers, items: newItems } }
                      saveHomePageConfig(next)
                      return next
                    })
                  }
                  return (
                    <div key={off.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-700">Offer Card #{idx + 1}</span>
                        <button
                          onClick={() => {
                            setConfig(prev => {
                              const newItems = prev.offers.items.filter((_, i) => i !== idx)
                              const next = { ...prev, offers: { ...prev.offers, items: newItems } }
                              saveHomePageConfig(next)
                              return next
                            })
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <ImageUploadField
                        value={off.image || ""}
                        onChange={(newPath) => updateOfferField("image", newPath)}
                        section="offers"
                        fallbackSrc=""
                        aspectRatio="aspect-[4/3]"
                      />

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Alt Text / Label (not shown on the image)</label>
                        <input
                          type="text"
                          value={off.title || ""}
                          onChange={(e) => updateOfferField("title", e.target.value)}
                          placeholder="e.g. Home Cleaning Offer"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Click-Through Link</label>
                        <input
                          type="text"
                          value={off.link || ""}
                          onChange={(e) => updateOfferField("link", e.target.value)}
                          placeholder="?category=cleaning or https://..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: TRUST & WHY US */}
          {activeTab === "trust" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Why Choose Us / Trust Badges Section
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage guarantee points, verified badges, and trust highlights.
                </p>
              </div>

              <div className="space-y-3">
                {config.trustBadges.map((badge, idx) => (
                  <div key={badge.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      <input
                        type="text"
                        value={badge.title}
                        onChange={(e) => {
                          const newBadges = [...config.trustBadges]
                          newBadges[idx].title = e.target.value
                          setConfig(prev => ({ ...prev, trustBadges: newBadges }))
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                        placeholder="Title..."
                      />
                      <input
                        type="text"
                        value={badge.description}
                        onChange={(e) => {
                          const newBadges = [...config.trustBadges]
                          newBadges[idx].description = e.target.value
                          setConfig(prev => ({ ...prev, trustBadges: newBadges }))
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        placeholder="Description..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: TESTIMONIALS */}
          {activeTab === "testimonials" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-500" />
                  Customer Reviews & Testimonials
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage customer feedback cards displayed in the testimonial carousel.
                </p>
              </div>

              <div className="space-y-4">
                {config.testimonials.reviews.map((rev, idx) => (
                  <div key={rev.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={rev.name}
                          onChange={(e) => {
                            const newRevs = [...config.testimonials.reviews]
                            newRevs[idx].name = e.target.value
                            setConfig(prev => ({ ...prev, testimonials: { ...prev.testimonials, reviews: newRevs } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Initials Avatar</label>
                        <input
                          type="text"
                          value={rev.initials}
                          onChange={(e) => {
                            const newRevs = [...config.testimonials.reviews]
                            newRevs[idx].initials = e.target.value
                            setConfig(prev => ({ ...prev, testimonials: { ...prev.testimonials, reviews: newRevs } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Star Rating</label>
                        <input
                          type="number"
                          max="5"
                          min="1"
                          value={rev.rating}
                          onChange={(e) => {
                            const newRevs = [...config.testimonials.reviews]
                            newRevs[idx].rating = parseInt(e.target.value) || 5
                            setConfig(prev => ({ ...prev, testimonials: { ...prev.testimonials, reviews: newRevs } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-amber-500"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Review Quote Text</label>
                        <textarea
                          rows={2}
                          value={rev.text}
                          onChange={(e) => {
                            const newRevs = [...config.testimonials.reviews]
                            newRevs[idx].text = e.target.value
                            setConfig(prev => ({ ...prev, testimonials: { ...prev.testimonials, reviews: newRevs } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: FOOTER & CONTACT */}
          {activeTab === "footer" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-600" />
                  Footer & Contact Information
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage phone support numbers, email address, operating hours and footer taglines.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={config.footer.brandName}
                    onChange={(e) => updateFooter("brandName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={config.footer.phone}
                    onChange={(e) => updateFooter("phone", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Support Email</label>
                  <input
                    type="text"
                    value={config.footer.email}
                    onChange={(e) => updateFooter("email", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Working Hours</label>
                  <input
                    type="text"
                    value={config.footer.workingHours}
                    onChange={(e) => updateFooter("workingHours", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Brand Tagline</label>
                  <input
                    type="text"
                    value={config.footer.tagline}
                    onChange={(e) => updateFooter("tagline", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Copyright Footer Text</label>
                  <input
                    type="text"
                    value={config.footer.copyrightText}
                    onChange={(e) => updateFooter("copyrightText", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: VEGETABLE RECIPES (Smart Cooking / What Can I Make?) */}
          {activeTab === "recipes" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <AdminRecipesPage />
            </div>
          )}

          {/* TAB: PRODUCE PAIRINGS (Smart Vegetable Recommendations) */}
          {activeTab === "recommendations" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <AdminRecommendationsPage />
            </div>
          )}
        </div>
      </div>

      {/* LIVE PREVIEW MODAL - SIDEBAR ACCESSIBLE & PROPER FIT ALIGNMENT VIEW */}
      {showPreviewModal && createPortal(
        <div className="fixed inset-0 z-[99990] flex pointer-events-none select-none">
          {/* Frosted Glass Blur Overlay over Admin Sidebar (keeps sidebar accessible & blurred) */}
          {keepSidebarVisible && (
            <div
              style={{ width: `${sidebarOffset}px` }}
              className="h-full bg-slate-950/25 backdrop-blur-xs border-r border-slate-700/40 pointer-events-auto transition-all duration-300 relative flex flex-col justify-between p-3 shrink-0"
            >
              {/* Subtle top indicator badge */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-white text-[11px] font-bold shadow-xl">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Admin Sidebar Active
                </span>
                <span className="text-[10px] text-slate-300 font-mono">Easy Access</span>
              </div>

              {/* Quick helper note at bottom of sidebar dock */}
              <div className="px-3 py-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/40 text-slate-300 text-[10px] font-medium leading-relaxed">
                Click any section on the left to navigate admin tabs while previewing.
              </div>
            </div>
          )}

          {/* Live Preview Container (starts cleanly after sidebar - 100% visible, zero text cut-off!) */}
          <div
            style={{
              width: keepSidebarVisible ? `calc(100vw - ${sidebarOffset}px)` : "100vw",
            }}
            className="h-full bg-slate-950/90 backdrop-blur-md pointer-events-auto flex flex-col transition-all duration-300 overflow-hidden shadow-2xl"
          >
            {/* Top Toolbar */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0 select-none z-20 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
                    title="Close Preview (Esc)"
                  />
                  <button
                    type="button"
                    onClick={() => setKeepSidebarVisible(v => !v)}
                    className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer"
                    title={keepSidebarVisible ? "Maximize Preview (Hide Sidebar)" : "Dock Beside Sidebar"}
                  />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-mono text-slate-300 font-semibold hidden sm:inline">
                  Live Home Page Preview Frame
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400 font-bold border border-slate-700">
                  {previewViewport === "full" ? "Proper Fit View" : previewViewport === "desktop" ? "1200px" : previewViewport === "tablet" ? "768px" : "390px"}
                </span>
              </div>

              {/* Viewport Switcher Buttons */}
              <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setPreviewViewport("full")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    previewViewport === "full"
                      ? "bg-teal-600 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Proper Fit Alignment View (100% of workspace)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Proper Fit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport("desktop")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    previewViewport === "desktop"
                      ? "bg-teal-600 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Desktop View (1200px)"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport("tablet")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    previewViewport === "tablet"
                      ? "bg-teal-600 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Tablet View (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Tablet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport("mobile")}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    previewViewport === "mobile"
                      ? "bg-teal-600 text-white shadow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Mobile View (390px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Mobile</span>
                </button>
              </div>

              {/* Screen Quick Switcher (Home, 5 Pillars, Subcategories, Kitchen Packages) */}
              <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewScreen("home")
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage({ type: "NAVIGATE_PREVIEW_SCREEN", screen: "home" }, "*")
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    previewScreen === "home" ? "bg-teal-600 text-white shadow-xs font-bold" : "text-slate-400 hover:text-white"
                  }`}
                  title="Preview Live Homepage"
                >
                  <span>🏠 Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewScreen("pillars")
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage({ type: "NAVIGATE_PREVIEW_SCREEN", screen: "pillars" }, "*")
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    previewScreen === "pillars" ? "bg-teal-600 text-white shadow-xs font-bold" : "text-slate-400 hover:text-white"
                  }`}
                  title="Preview & Edit Core Specialized Pillars Modal"
                >
                  <span>⚡ 5 Pillars</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewScreen("subcategories")
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage({ type: "NAVIGATE_PREVIEW_SCREEN", screen: "subcategories" }, "*")
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    previewScreen === "subcategories" ? "bg-teal-600 text-white shadow-xs font-bold" : "text-slate-400 hover:text-white"
                  }`}
                  title="Preview & Edit Subcategories Modal"
                >
                  <span>🧹 Subcategories</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewScreen("kitchen")
                    if (iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage({ type: "NAVIGATE_PREVIEW_SCREEN", screen: "kitchen" }, "*")
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    previewScreen === "kitchen" ? "bg-teal-600 text-white shadow-xs font-bold" : "text-slate-400 hover:text-white"
                  }`}
                  title="Preview & Edit Kitchen Cleaning Packages Details Page"
                >
                  <span>🍽️ Kitchen Packages</span>
                </button>
              </div>

              {/* In-Page Edit Mode Toggle & Quick Edit Panel Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewEditMode(v => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    previewEditMode
                      ? "bg-amber-400 text-slate-950 hover:bg-amber-300 ring-2 ring-amber-400/50"
                      : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
                  }`}
                  title="Toggle Interactive In-Page Edit Mode inside preview iframe"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{previewEditMode ? "In-Page Edit: ON" : "In-Page Edit"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewQuickEdit(v => !v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    showPreviewQuickEdit
                      ? "bg-teal-600 text-white hover:bg-teal-500 ring-2 ring-teal-400/50"
                      : "bg-slate-800 text-teal-400 hover:text-white hover:bg-slate-700 border border-slate-700"
                  }`}
                  title="Toggle Quick Edit side panel to edit hero banner and all sections alongside preview"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showPreviewQuickEdit ? "Hide Editor" : "Quick Edit Panel"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setKeepSidebarVisible(v => !v)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                    keepSidebarVisible
                      ? "bg-slate-800 text-teal-400 hover:bg-slate-700"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                  title={keepSidebarVisible ? "Sidebar is Visible (Click to Maximize)" : "Sidebar is Hidden (Click to Dock Beside Sidebar)"}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">{keepSidebarVisible ? "Docked" : "Sidebar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIframeKey(k => k + 1)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Reload Preview Frame"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <a
                  href="/home?preview=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Open live homepage in a new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="text-slate-400 hover:text-white hover:bg-rose-600/80 font-bold text-xs px-2 py-1 rounded-lg transition ml-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Split View Container (Quick Edit Panel + Iframe Viewport) */}
            <div className="w-full flex-1 flex overflow-hidden relative">
              {/* Collapsible Quick Edit Panel on the Preview Side */}
              {showPreviewQuickEdit && (
                <div className="w-[360px] sm:w-[400px] shrink-0 h-full bg-slate-900 border-r border-slate-800 flex flex-col text-slate-200 z-10 shadow-2xl overflow-hidden">
                  {/* Panel Top Header */}
                  <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Preview Side Editor</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isPublishing}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isPublishing ? "Saving…" : "Publish"}</span>
                    </button>
                  </div>

                  {/* Panel Tab Bar */}
                  <div className="flex items-center gap-1 p-2 bg-slate-900/90 border-b border-slate-800/80 overflow-x-auto shrink-0 scrollbar-none">
                    {[
                      { id: "hero", label: "Hero Banner", icon: Globe },
                      { id: "pillars", label: "5 Pillars", icon: Sparkles },
                      { id: "subcategories", label: "Subcategories", icon: Layers },
                      { id: "categories", label: "Categories", icon: Layout },
                      { id: "offers", label: "Offers", icon: Gift },
                      { id: "trust", label: "Why Us", icon: ShieldCheck },
                      { id: "footer", label: "Footer", icon: FileText }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPreviewQuickEditTab(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                          previewQuickEditTab === tab.id
                            ? "bg-teal-600 text-white shadow-xs font-bold"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <tab.icon className="w-3 h-3" />
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Panel Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
                    {previewQuickEditTab === "hero" && (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Top Pill Badge
                          </label>
                          <input
                            type="text"
                            value={config.hero.badge}
                            onChange={(e) => updateHero("badge", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Hero Headline (3 Parts)
                          </label>
                          <input
                            type="text"
                            value={config.hero.mainHeadingFirst}
                            onChange={(e) => updateHero("mainHeadingFirst", e.target.value)}
                            placeholder="Prefix (e.g. Professional)"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                          <input
                            type="text"
                            value={config.hero.mainHeadingHighlight}
                            onChange={(e) => updateHero("mainHeadingHighlight", e.target.value)}
                            placeholder="Highlight Word (Teal)"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-teal-400 text-xs font-bold focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                          <input
                            type="text"
                            value={config.hero.mainHeadingLast}
                            onChange={(e) => updateHero("mainHeadingLast", e.target.value)}
                            placeholder="Suffix (e.g. Made Simple)"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Subtitle Description
                          </label>
                          <textarea
                            rows={2}
                            value={config.hero.subtitle}
                            onChange={(e) => updateHero("subtitle", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Search Placeholder
                            </label>
                            <input
                              type="text"
                              value={config.hero.searchPlaceholder}
                              onChange={(e) => updateHero("searchPlaceholder", e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Location Tag
                            </label>
                            <input
                              type="text"
                              value={config.hero.searchLocation}
                              onChange={(e) => updateHero("searchLocation", e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Hero Illustration in Quick Edit */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                              Hero Illustration Image
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                updateHero("heroImage", "/assets/hero_illustration.jpg")
                                updateHero("heroIllustration", "/assets/hero_illustration.jpg")
                              }}
                              className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                            >
                              Reset Concept 3
                            </button>
                          </div>
                          <input
                            type="text"
                            value={config.hero.heroImage || config.hero.heroIllustration || ""}
                            onChange={(e) => {
                              updateHero("heroImage", e.target.value)
                              updateHero("heroIllustration", e.target.value)
                            }}
                            placeholder="/assets/hero_illustration.jpg"
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            {HERO_ILLUSTRATION_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  updateHero("heroImage", p.url)
                                  updateHero("heroIllustration", p.url)
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-bold truncate text-left border transition cursor-pointer ${
                                  (config.hero.heroImage === p.url)
                                    ? "bg-teal-900/60 text-teal-300 border-teal-500"
                                    : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white"
                                }`}
                              >
                                {p.id === "concept3" ? "★ Concept 3" : p.id === "repair" ? "🔧 Home Repair" : p.id === "grocery" ? "🥗 Produce" : "🚚 Logistics"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 6 Trust Badges in Quick Edit */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                              6 Trust Badges
                            </label>
                            <button
                              type="button"
                              onClick={resetTrustBadges}
                              className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                            >
                              Reset Badges
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {(config.hero.trustBadges || DEFAULT_HOME_PAGE_CONFIG.hero.trustBadges).map((b, idx) => (
                              <div key={b.id || idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-teal-400">
                                  <span>Badge #{idx + 1}</span>
                                  <span className="text-[9px] text-slate-400">{b.icon}</span>
                                </div>
                                <input
                                  type="text"
                                  value={b.title || b.text || ""}
                                  onChange={(e) => updateTrustBadge(idx, "title", e.target.value)}
                                  placeholder="Title"
                                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-[11px] font-bold outline-none"
                                />
                                <input
                                  type="text"
                                  value={b.subtitle || ""}
                                  onChange={(e) => updateTrustBadge(idx, "subtitle", e.target.value)}
                                  placeholder="Subtitle"
                                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Advertisement Banner Carousel in Quick Edit -- same
                            model as the full Hero Banner tab, so an admin can
                            manage the rotating ad banners from right inside
                            the live preview too. */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            Advertisement Banner Slides
                          </label>
                          {(config.hero.slides || []).map((slide, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-teal-400">
                                <span>Slide #{idx + 2}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newSlides = (config.hero.slides || []).filter((_, i) => i !== idx)
                                    const next = { ...config, hero: { ...config.hero, slides: newSlides } }
                                    setConfig(next)
                                    saveHomePageConfig(next)
                                  }}
                                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <ImageUploadField
                                value={slide.heroImage || ""}
                                onChange={(newPath) => {
                                  const newSlides = [...(config.hero.slides || [])]
                                  newSlides[idx] = { ...newSlides[idx], heroImage: newPath }
                                  const next = { ...config, hero: { ...config.hero, slides: newSlides } }
                                  setConfig(next)
                                  saveHomePageConfig(next)
                                }}
                                section="hero"
                                fallbackSrc="/assets/hero_illustration.jpg"
                                aspectRatio="aspect-[4/3]"
                              />
                              <input
                                type="text"
                                value={slide.link || ""}
                                onChange={(e) => {
                                  const newSlides = [...(config.hero.slides || [])]
                                  newSlides[idx] = { ...newSlides[idx], link: e.target.value }
                                  const next = { ...config, hero: { ...config.hero, slides: newSlides } }
                                  setConfig(next)
                                  saveHomePageConfig(next)
                                }}
                                placeholder="Link (e.g. ?category=cleaning)"
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono outline-none"
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSlides = [...(config.hero.slides || []), {
                                heroImage: config.hero.heroImage || "/assets/hero_illustration.jpg",
                                priceBadge: "",
                                link: "",
                              }]
                              const next = { ...config, hero: { ...config.hero, slides: newSlides } }
                              setConfig(next)
                              saveHomePageConfig(next)
                            }}
                            className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                          >
                            + Add Banner Slide
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 5 PILLARS MODAL QUICK EDIT */}
                    {previewQuickEditTab === "pillars" && (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Modal Top Badge
                          </label>
                          <input
                            type="text"
                            value={config.pillarModal?.badge || "⚡ 5 Core Specialized Pillars"}
                            onChange={(e) => updatePillarModal("badge", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Modal Title
                          </label>
                          <input
                            type="text"
                            value={config.pillarModal?.title || "Home & Repair Services"}
                            onChange={(e) => updatePillarModal("title", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Modal Subtitle
                          </label>
                          <textarea
                            rows={2}
                            value={config.pillarModal?.subtitle || ""}
                            onChange={(e) => updatePillarModal("subtitle", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500 resize-none"
                          />
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            The 5 service cards shown in this popup are now pulled directly from{" "}
                            <span className="text-teal-400 font-bold">Service Catalog &rarr; Categories</span>
                            {" "}&mdash; add, rename, reorder or upload an image for a category there and it updates
                            here automatically. This panel only controls the badge, title and subtitle text above.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SUBCATEGORIES QUICK EDIT */}
                    {previewQuickEditTab === "subcategories" && (
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Drawer/Modal Title
                          </label>
                          <input
                            type="text"
                            value={config.subServicesModal?.title || "Home Cleaning & Pest Control"}
                            onChange={(e) => updateSubServicesModal("title", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Cleaning Section Title
                          </label>
                          <input
                            type="text"
                            value={config.subServicesModal?.cleaningSectionTitle || "Home Cleaning"}
                            onChange={(e) => updateSubServicesModal("cleaningSectionTitle", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Home Cleaning Items
                          </span>
                          {(config.subServicesModal?.cleaningItems || DEFAULT_HOME_PAGE_CONFIG.subServicesModal.cleaningItems).map((item, idx) => (
                            <input
                              key={item.id || idx}
                              type="text"
                              value={item.name}
                              onChange={(e) => updateCleaningSubItem(idx, e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none mb-1 font-medium"
                            />
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Pest Control Section Title
                          </label>
                          <input
                            type="text"
                            value={config.subServicesModal?.pestSectionTitle || "Pest Control"}
                            onChange={(e) => updateSubServicesModal("pestSectionTitle", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pest Control Items
                          </span>
                          {(config.subServicesModal?.pestItems || DEFAULT_HOME_PAGE_CONFIG.subServicesModal.pestItems).map((item, idx) => (
                            <input
                              key={item.id || idx}
                              type="text"
                              value={item.name}
                              onChange={(e) => updatePestSubItem(idx, e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none mb-1 font-medium"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {previewQuickEditTab === "categories" && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Category Icons ({config.categories?.length || 0})
                        </span>
                        {(config.categories || []).map((cat, idx) => (
                          <div key={cat.id || idx} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{cat.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextCats = [...config.categories]
                                  nextCats[idx].enabled = nextCats[idx].enabled === false
                                  setConfig(prev => ({ ...prev, categories: nextCats }))
                                  saveHomePageConfig({ ...config, categories: nextCats })
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  cat.enabled !== false ? "bg-emerald-900 text-emerald-300" : "bg-slate-700 text-slate-400"
                                }`}
                              >
                                {cat.enabled !== false ? "Active" : "Disabled"}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={cat.name || ""}
                              onChange={(e) => {
                                const nextCats = [...config.categories]
                                nextCats[idx].name = e.target.value
                                setConfig(prev => ({ ...prev, categories: nextCats }))
                                saveHomePageConfig({ ...config, categories: nextCats })
                              }}
                              placeholder="Name"
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs outline-none font-bold"
                            />
                            <input
                              type="text"
                              value={cat.link || ""}
                              onChange={(e) => {
                                const nextCats = [...config.categories]
                                nextCats[idx].link = e.target.value
                                setConfig(prev => ({ ...prev, categories: nextCats }))
                                saveHomePageConfig({ ...config, categories: nextCats })
                              }}
                              placeholder="?category=cleaning or https://..."
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] outline-none"
                            />
                            <div>
                              <label className="text-[9px] text-slate-400 uppercase block mb-1">Icon Image URL or Path</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={cat.image || ""}
                                  onChange={(e) => {
                                    const nextCats = [...config.categories]
                                    nextCats[idx].image = e.target.value
                                    setConfig(prev => ({ ...prev, categories: nextCats }))
                                    saveHomePageConfig({ ...config, categories: nextCats })
                                  }}
                                  placeholder="/assets/..."
                                  className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono outline-none"
                                />
                                {cat.image && (
                                  <div className="w-7 h-7 rounded overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                                    <img src={cat.image} alt="" className="w-full h-full object-cover" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {previewQuickEditTab === "offers" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Offers Title</label>
                          <input
                            type="text"
                            value={config.offers?.title || ""}
                            onChange={(e) => {
                              const next = { ...config, offers: { ...config.offers, title: e.target.value } }
                              setConfig(next)
                              saveHomePageConfig(next)
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Offers Subtitle</label>
                          <input
                            type="text"
                            value={config.offers?.subtitle || ""}
                            onChange={(e) => {
                              const next = { ...config, offers: { ...config.offers, subtitle: e.target.value } }
                              setConfig(next)
                              saveHomePageConfig(next)
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                          />
                        </div>

                        {/* Each offer card is a single banner image + link --
                            no separate text fields, matching what actually
                            renders on the customer page. */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            Offer Banner Images
                          </label>
                          {(config.offers?.items || []).map((off, idx) => (
                            <div key={off.id || idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-teal-400">
                                <span>Card #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = (config.offers?.items || []).filter((_, i) => i !== idx)
                                    const next = { ...config, offers: { ...config.offers, items: newItems } }
                                    setConfig(next)
                                    saveHomePageConfig(next)
                                  }}
                                  className="text-slate-500 hover:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <ImageUploadField
                                value={off.image || ""}
                                onChange={(newPath) => {
                                  const newItems = [...(config.offers?.items || [])]
                                  newItems[idx] = { ...newItems[idx], image: newPath }
                                  const next = { ...config, offers: { ...config.offers, items: newItems } }
                                  setConfig(next)
                                  saveHomePageConfig(next)
                                }}
                                section="offers"
                                fallbackSrc=""
                                aspectRatio="aspect-[4/3]"
                              />
                              <input
                                type="text"
                                value={off.link || ""}
                                onChange={(e) => {
                                  const newItems = [...(config.offers?.items || [])]
                                  newItems[idx] = { ...newItems[idx], link: e.target.value }
                                  const next = { ...config, offers: { ...config.offers, items: newItems } }
                                  setConfig(next)
                                  saveHomePageConfig(next)
                                }}
                                placeholder="Link (e.g. ?category=cleaning)"
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono outline-none"
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newOff = { id: `off-${Date.now()}`, image: "", title: "New Offer", link: "", enabled: true }
                              const newItems = [...(config.offers?.items || []), newOff]
                              const next = { ...config, offers: { ...config.offers, items: newItems } }
                              setConfig(next)
                              saveHomePageConfig(next)
                            }}
                            className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                          >
                            + Add Offer Card
                          </button>
                        </div>
                      </div>
                    )}

                    {previewQuickEditTab === "trust" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Section Title</label>
                          <input
                            type="text"
                            value={config.whyChooseUs?.title || ""}
                            onChange={(e) => {
                              const next = { ...config, whyChooseUs: { ...config.whyChooseUs, title: e.target.value } }
                              setConfig(next)
                              saveHomePageConfig(next)
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {previewQuickEditTab === "footer" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Support Phone</label>
                          <input
                            type="text"
                            value={config.footer?.phone || ""}
                            onChange={(e) => updateFooter("phone", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Support Email</label>
                          <input
                            type="text"
                            value={config.footer?.email || ""}
                            onChange={(e) => updateFooter("email", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Iframe Viewport Container (Proper Fit & Alignment, 0 pixels cut off!) */}
              <div className="flex-1 h-full bg-slate-900/50 overflow-hidden flex items-center justify-center relative p-0 sm:p-2">
                <div
                  className={`h-full transition-all duration-300 overflow-hidden bg-white shadow-xl ${
                    previewViewport === "full"
                      ? "w-full rounded-none"
                      : previewViewport === "desktop"
                      ? "w-full max-w-[1200px] rounded-xl border border-slate-700/60"
                      : previewViewport === "tablet"
                      ? "w-[768px] max-w-full rounded-2xl border-2 border-slate-700"
                      : "w-[390px] max-w-full rounded-3xl border-4 border-slate-700 shadow-2xl"
                  }`}
                >
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={`/home?preview=true${previewScreen === 'pillars' ? '&openModal=pillars' : previewScreen === 'subcategories' ? '&openModal=homepest' : previewScreen === 'kitchen' ? '&category=kitchen_cleaning' : ''}${previewEditMode ? '&edit=true' : ''}`}
                    className="w-full h-full border-none bg-white"
                    title="Home Page Preview"
                    onLoad={() => {
                      if (iframeRef.current?.contentWindow) {
                        iframeRef.current.contentWindow.postMessage({
                          type: "TOGGLE_EDIT_MODE",
                          enabled: previewEditMode
                        }, "*")
                        if (previewScreen !== "home") {
                          iframeRef.current.contentWindow.postMessage({
                            type: "NAVIGATE_PREVIEW_SCREEN",
                            screen: previewScreen
                          }, "*")
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
