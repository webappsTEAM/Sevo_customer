import React, { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Globe, Layout, Sparkles, ShieldCheck, Clock, Award, Headphones,
  BadgeCheck, Star, HeartPulse, Plus, Trash2, Check, RotateCcw,
  Eye, Save, ArrowUp, ArrowDown, Image as ImageIcon, MessageSquare,
  Users, Gift, Repeat2, BarChart3, FileText, Phone, Mail, ChevronRight,
  Layers, CheckCircle, ExternalLink, Sliders, ToggleLeft, ToggleRight
} from "lucide-react"
import { getHomePageConfig, saveHomePageConfig, resetHomePageConfig, DEFAULT_HOME_PAGE_CONFIG, fetchDirectImageUrl, fetchPublishedHomePageConfig, publishHomePageConfig, resolveDisplayImageUrl } from "../../config/homePageConfig.js"
import ImageUploadField from "../components/ImageUploadField.jsx"

export default function HomePageCustomizerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTabParam = searchParams.get("tab") || "hero"

  const [config, setConfig] = useState(getHomePageConfig())
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [activeTab, setActiveTab] = useState(activeTabParam)
  const [isPublishing, setIsPublishing] = useState(false)

  const [resolvingUrls, setResolvingUrls] = useState({})

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

  const updateVendorBanner = (field, value) => {
    setConfig(prev => {
      const next = {
        ...prev,
        vendorBanner: { ...prev.vendorBanner, [field]: value }
      }
      saveHomePageConfig(next)
      return next
    })
  }

  const navWorkflowSteps = [
    { id: "hero", label: "Hero Banner", icon: Globe, color: "text-amber-600 bg-amber-50" },
    { id: "categories", label: "Browse Categories", icon: Layers, color: "text-blue-600 bg-blue-50" },
    { id: "vendorBanner", label: "Vendor Hire Banner", icon: Users, color: "text-teal-600 bg-teal-50" },
    { id: "offers", label: "Promotional Offers", icon: Gift, color: "text-pink-600 bg-pink-50" },
    { id: "trust", label: "Why Choose Us", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
    { id: "workflow", label: "How It Works", icon: Repeat2, color: "text-purple-600 bg-purple-50" },
    { id: "stats", label: "Live Stats Bar", icon: BarChart3, color: "text-sky-600 bg-sky-50" },
    { id: "experts", label: "Featured Pros", icon: Users, color: "text-indigo-600 bg-indigo-50" },
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

              {/* Hero Badges */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Quick Trust Badges Below Search
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.hero.quickBadges.map((badge, idx) => (
                    <div key={badge.id || idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={badge.text}
                        onChange={(e) => {
                          const newBadges = [...config.hero.quickBadges]
                          newBadges[idx].text = e.target.value
                          updateHero("quickBadges", newBadges)
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Images Collage Customization */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Right Hero Side Image Customization (4 Grid Collage Cards)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload custom images, pick high-resolution service presets, or edit direct image links for the landing page hero side cards.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateHero("collageImages", [
                        "/mockups/service_hvac.png",
                        "/mockups/service_electrical.png",
                        "/mockups/service_cleaning.png",
                        "/mockups/service_plumbing.png"
                      ])
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shrink-0"
                  >
                    Reset All 4 Cards to Default Presets
                  </button>
                </div>

                {/* Live Collage Visualizer Box */}
                <div className="bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-inner space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Landing Page Collage Live Visual Preview
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Real-time Layout</span>
                  </div>

                  <div className="relative h-[270px] sm:h-[330px] w-full max-w-xl mx-auto overflow-hidden rounded-3xl bg-slate-900 p-2.5 border border-slate-800/80">
                    {/* Card 1: Top-Left */}
                    <div className="absolute top-2.5 left-2.5 w-[59%] h-[59%] rounded-2xl overflow-hidden border-2 border-white/90 shadow-lg group z-10 bg-white">
                      <img
                        src={resolveDisplayImageUrl(config.hero.collageImages[0], "/mockups/service_hvac.png")}
                        onError={(e) => { e.currentTarget.src = "/mockups/service_hvac.png" }}
                        alt="Hero Card 1"
                        className="w-full h-full object-cover object-left-top"
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                      />
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                        Card 1 (Top-Left)
                      </div>
                    </div>

                    {/* Card 3: Top-Right */}
                    <div className="absolute top-3.5 right-2.5 w-[46%] h-[48%] rounded-2xl overflow-hidden border-2 border-white/90 shadow-lg group z-10 bg-white">
                      <img
                        src={resolveDisplayImageUrl(config.hero.collageImages[2], "/mockups/service_cleaning.png")}
                        onError={(e) => { e.currentTarget.src = "/mockups/service_cleaning.png" }}
                        alt="Hero Card 3"
                        className="w-full h-full object-cover object-center"
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                      />
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                        Card 3 (Top-Right)
                      </div>
                    </div>

                    {/* Card 2: Bottom-Left */}
                    <div className="absolute bottom-2.5 left-[8%] w-[50%] h-[45%] rounded-2xl overflow-hidden border-2 border-white/90 shadow-lg group z-20 bg-white">
                      <img
                        src={resolveDisplayImageUrl(config.hero.collageImages[1], "/mockups/service_electrical.png")}
                        onError={(e) => { e.currentTarget.src = "/mockups/service_electrical.png" }}
                        alt="Hero Card 2"
                        className="w-full h-full object-cover object-center"
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                      />
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                        Card 2 (Bottom-Left)
                      </div>
                    </div>

                    {/* Card 4: Bottom-Right */}
                    <div className="absolute bottom-2.5 right-3 w-[44%] h-[44%] rounded-2xl overflow-hidden border-2 border-white/90 shadow-lg group z-20 bg-white">
                      <img
                        src={resolveDisplayImageUrl(config.hero.collageImages[3], "/mockups/service_plumbing.png")}
                        onError={(e) => { e.currentTarget.src = "/mockups/service_plumbing.png" }}
                        alt="Hero Card 4"
                        className="w-full h-full object-cover object-center"
                        style={{ imageRendering: "-webkit-optimize-contrast" }}
                      />
                      <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/20">
                        Card 4 (Bottom-Right)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Collage Cards Editor Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 0, title: "Collage Card 1 (Top-Left)", defaultPreset: "/mockups/service_hvac.png" },
                    { id: 1, title: "Collage Card 2 (Bottom-Left)", defaultPreset: "/mockups/service_electrical.png" },
                    { id: 2, title: "Collage Card 3 (Top-Right)", defaultPreset: "/mockups/service_cleaning.png" },
                    { id: 3, title: "Collage Card 4 (Bottom-Right)", defaultPreset: "/mockups/service_plumbing.png" }
                  ].map((card) => {
                    const currentVal = config.hero.collageImages[card.id] || ""

                    return (
                      <div key={card.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-teal-600" /> {card.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newImgs = [...config.hero.collageImages]
                              newImgs[card.id] = card.defaultPreset
                              updateHero("collageImages", newImgs)
                            }}
                            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                          >
                            Reset Card {card.id + 1}
                          </button>
                        </div>

                        {/* Image Upload Component */}
                        <ImageUploadField
                          value={currentVal}
                          onChange={(newPath) => {
                            const newImgs = [...config.hero.collageImages]
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
            </div>
          )}

          {/* TAB 2: BROWSE CATEGORIES */}
          {activeTab === "categories" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    Browse by Category Cards
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage category title, subtitles, badges, cover images and navigation links.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newCat = {
                      id: `cat-${Date.now()}`,
                      title: "New Category",
                      subtitle: "Category description",
                      badge: "New",
                      badgeColor: "emerald",
                      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop",
                      link: "/booking",
                      enabled: true
                    }
                    setConfig(prev => ({ ...prev, categories: [...prev.categories, newCat] }))
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Category Card
                </button>
              </div>

              <div className="space-y-4">
                {config.categories.map((cat, idx) => (
                  <div key={cat.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-sm text-slate-800">{cat.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newCats = [...config.categories]
                            newCats[idx].enabled = !newCats[idx].enabled
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${cat.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                        >
                          {cat.enabled ? "Enabled" : "Disabled"}
                        </button>
                        <button
                          onClick={() => {
                            const newCats = config.categories.filter((_, i) => i !== idx)
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Title</label>
                        <input
                          type="text"
                          value={cat.title}
                          onChange={(e) => {
                            const newCats = [...config.categories]
                            newCats[idx].title = e.target.value
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Subtitle</label>
                        <input
                          type="text"
                          value={cat.subtitle}
                          onChange={(e) => {
                            const newCats = [...config.categories]
                            newCats[idx].subtitle = e.target.value
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Badge Tag</label>
                        <input
                          type="text"
                          value={cat.badge}
                          onChange={(e) => {
                            const newCats = [...config.categories]
                            newCats[idx].badge = e.target.value
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <ImageUploadField
                          value={cat.image}
                          onChange={(newPath) => {
                            const newCats = [...config.categories]
                            newCats[idx].image = newPath
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          section="categories"
                          fallbackSrc={idx === 0 ? "/mockups/category_for_you.png" : idx === 1 ? "/mockups/category_food_health.png" : "/mockups/category_home_transport.png"}
                          label="Category Cover Image"
                          aspectRatio="aspect-[16/9]"
                        />

                        {/* Presets Quick Picker */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Quick Category Presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "For You", path: "/mockups/category_for_you.png" },
                              { label: "Food & Health", path: "/mockups/category_food_health.png" },
                              { label: "Home & Transport", path: "/mockups/category_home_transport.png" },
                              { label: "Groceries", path: "/mockups/groceries_realistic.png" },
                              { label: "Fresh Veggies", path: "/mockups/vegetables_realistic.png" },
                              { label: "Home Cleaning", path: "/mockups/service_cleaning.png" },
                              { label: "Electrical", path: "/mockups/service_electrical.png" },
                              { label: "Plumbing", path: "/mockups/service_plumbing.png" }
                            ].map((preset) => (
                              <button
                                key={preset.path}
                                type="button"
                                onClick={() => {
                                  const newCats = [...config.categories]
                                  newCats[idx].image = preset.path
                                  setConfig(prev => ({ ...prev, categories: newCats }))
                                }}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition ${cat.image === preset.path
                                    ? "bg-blue-600 text-white border-blue-600 font-bold"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                                  }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Target Link</label>
                        <input
                          type="text"
                          value={cat.link}
                          onChange={(e) => {
                            const newCats = [...config.categories]
                            newCats[idx].link = e.target.value
                            setConfig(prev => ({ ...prev, categories: newCats }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: VENDOR HIRE BANNER */}
          {activeTab === "vendorBanner" && (() => {
            const vendorBanner = config.vendorBanner || {}
            return (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-teal-600" />
                      Vendor Hire Banner
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Manage top banner headline, subtext, badges, features, benefit list items and links for the booking page.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Banner Visibility</span>
                    <button
                      onClick={() => {
                        updateVendorBanner("enabled", !(vendorBanner.enabled !== false))
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5`}
                      style={{
                        backgroundColor: (vendorBanner.enabled !== false) ? "#f0fdf4" : "#f1f5f9",
                        color: (vendorBanner.enabled !== false) ? "#16a34a" : "#475569",
                        borderColor: (vendorBanner.enabled !== false) ? "#bbf7d0" : "#cbd5e1"
                      }}
                    >
                      {(vendorBanner.enabled !== false) ? "Visible on Landing Page" : "Hidden"}
                    </button>
                  </div>
                </div>

                {/* Main Text Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Badge text */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Badge Icon (Emoji)</label>
                    <input
                      type="text"
                      value={vendorBanner.badgeIcon ?? ""}
                      placeholder="🤝"
                      onChange={(e) => updateVendorBanner("badgeIcon", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={vendorBanner.badgeText ?? ""}
                      placeholder="We're Looking for Professionals"
                      onChange={(e) => updateVendorBanner("badgeText", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>

                  {/* Title parts */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Title Prefix</label>
                    <input
                      type="text"
                      value={vendorBanner.titlePrefix ?? ""}
                      placeholder="We Hire"
                      onChange={(e) => updateVendorBanner("titlePrefix", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Title Highlight (Emerald Color)</label>
                    <input
                      type="text"
                      value={vendorBanner.titleHighlight ?? ""}
                      placeholder="Technicians, Employees"
                      onChange={(e) => updateVendorBanner("titleHighlight", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Title Suffix</label>
                    <input
                      type="text"
                      value={vendorBanner.titleSuffix ?? ""}
                      placeholder="& Vendors"
                      onChange={(e) => updateVendorBanner("titleSuffix", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>

                  {/* Banner Image */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Technician Image URL</label>
                    <input
                      type="text"
                      value={vendorBanner.image ?? ""}
                      placeholder="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=320&h=420&q=90&fit=crop&crop=top"
                      onChange={(e) => updateVendorBanner("image", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>

                  {/* Description Subtitle */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Subtitle Description</label>
                    <textarea
                      rows={2}
                      value={vendorBanner.subtitle ?? ""}
                      placeholder="Join our team of skilled professionals and be part of a growing service community that works with trust and quality."
                      onChange={(e) => updateVendorBanner("subtitle", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>

                  {/* CTA text and url */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={vendorBanner.ctaText ?? ""}
                      placeholder="Join as a Professional"
                      onChange={(e) => updateVendorBanner("ctaText", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">CTA Redirect URL</label>
                    <input
                      type="text"
                      value={vendorBanner.ctaUrl ?? ""}
                      placeholder="https://calservices-vendor.vercel.app"
                      onChange={(e) => updateVendorBanner("ctaUrl", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>

                  {/* Learn more text and url */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Learn More Link Text</label>
                    <input
                      type="text"
                      value={vendorBanner.learnMoreText ?? ""}
                      placeholder="Learn more"
                      onChange={(e) => updateVendorBanner("learnMoreText", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Learn More Redirect URL</label>
                    <input
                      type="text"
                      value={vendorBanner.learnMoreUrl ?? ""}
                      placeholder="https://calservices-vendor.vercel.app"
                      onChange={(e) => updateVendorBanner("learnMoreUrl", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                  </div>
                </div>


                {/* Dynamic Feature Highlights List (Left Side) */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Left-Side Feature Highlights</h3>
                      <p className="text-[11px] text-slate-500">Add up to 3 quick feature items displayed on the left column.</p>
                    </div>
                    <button
                      onClick={() => {
                        const list = vendorBanner.features || []
                        if (list.length >= 3) {
                          alert("You can add up to 3 highlights only.")
                          return
                        }
                        const newItem = { id: `vf-${Date.now()}`, icon: "⚡", label: "New Feature" }
                        updateVendorBanner("features", [...list, newItem])
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Highlight
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(vendorBanner.features || [
                      { id: "vf-1", icon: "📅", label: "Flexible Timings" },
                      { id: "vf-2", icon: "💼", label: "Stable Work" },
                      { id: "vf-3", icon: "🤝", label: "Team Support" }
                    ]).map((f, fIdx) => (
                      <div key={f.id || fIdx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                        <input
                          type="text"
                          value={f.icon}
                          onChange={(e) => {
                            const list = [...(vendorBanner.features || [])]
                            list[fIdx] = { ...list[fIdx], icon: e.target.value }
                            updateVendorBanner("features", list)
                          }}
                          placeholder="Icon"
                          className="w-10 px-1 py-1.5 rounded-lg border border-slate-200 text-center text-sm"
                        />
                        <input
                          type="text"
                          value={f.label}
                          onChange={(e) => {
                            const list = [...(vendorBanner.features || [])]
                            list[fIdx] = { ...list[fIdx], label: e.target.value }
                            updateVendorBanner("features", list)
                          }}
                          placeholder="Label"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                        />
                        <button
                          onClick={() => {
                            const list = (vendorBanner.features || []).filter((_, i) => i !== fIdx)
                            updateVendorBanner("features", list)
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Benefits List (Right Side) */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Right-Side Benefit Points</h3>
                      <p className="text-[11px] text-slate-500">Add up to 4 trust points displayed on the right column.</p>
                    </div>
                    <button
                      onClick={() => {
                        const list = vendorBanner.benefits || []
                        if (list.length >= 4) {
                          alert("You can add up to 4 benefits only.")
                          return
                        }
                        const newItem = { id: `vb-${Date.now()}`, icon: "✅", text: "New Benefit Point" }
                        updateVendorBanner("benefits", [...list, newItem])
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Benefit Point
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(vendorBanner.benefits || [
                      { id: "vb-1", icon: "✅", text: "Verified & trusted customers" },
                      { id: "vb-2", icon: "🕐", text: "On-time service & support" },
                      { id: "vb-3", icon: "📍", text: "Work close to your area" },
                      { id: "vb-4", icon: "🌟", text: "Recognition for quality work" }
                    ]).map((p, pIdx) => (
                      <div key={p.id || pIdx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center gap-3">
                        <input
                          type="text"
                          value={p.icon}
                          onChange={(e) => {
                            const list = [...(vendorBanner.benefits || [])]
                            list[pIdx] = { ...list[pIdx], icon: e.target.value }
                            updateVendorBanner("benefits", list)
                          }}
                          placeholder="Icon"
                          className="w-10 px-1 py-1.5 rounded-lg border border-slate-200 text-center text-sm"
                        />
                        <input
                          type="text"
                          value={p.text}
                          onChange={(e) => {
                            const list = [...(vendorBanner.benefits || [])]
                            list[pIdx] = { ...list[pIdx], text: e.target.value }
                            updateVendorBanner("benefits", list)
                          }}
                          placeholder="Benefit Text"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                        />
                        <button
                          onClick={() => {
                            const list = (vendorBanner.benefits || []).filter((_, i) => i !== pIdx)
                            updateVendorBanner("benefits", list)
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

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
                      tag: "SPECIAL",
                      discount: "10% OFF",
                      title: "on Plumbing",
                      cta: "Book Now →",
                      bgColor: "bg-emerald-50 text-emerald-900 border-emerald-100",
                      enabled: true
                    }
                    setConfig(prev => ({
                      ...prev,
                      offers: { ...prev.offers, items: [...prev.offers.items, newOff] }
                    }))
                  }}
                  className="px-3.5 py-2 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Offer Card
                </button>
              </div>

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
              <div className="space-y-4">
                {config.offers.items.map((off, idx) => (
                  <div key={off.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-semibold text-xs text-slate-700">Offer Card #{idx + 1}</span>
                      <button
                        onClick={() => {
                          const newItems = config.offers.items.filter((_, i) => i !== idx)
                          setConfig(prev => ({ ...prev, offers: { ...prev.offers, items: newItems } }))
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Tag</label>
                        <input
                          type="text"
                          value={off.tag}
                          onChange={(e) => {
                            const newItems = [...config.offers.items]
                            newItems[idx].tag = e.target.value
                            setConfig(prev => ({ ...prev, offers: { ...prev.offers, items: newItems } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Discount Amount</label>
                        <input
                          type="text"
                          value={off.discount}
                          onChange={(e) => {
                            const newItems = [...config.offers.items]
                            newItems[idx].discount = e.target.value
                            setConfig(prev => ({ ...prev, offers: { ...prev.offers, items: newItems } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-pink-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Service Title</label>
                        <input
                          type="text"
                          value={off.title}
                          onChange={(e) => {
                            const newItems = [...config.offers.items]
                            newItems[idx].title = e.target.value
                            setConfig(prev => ({ ...prev, offers: { ...prev.offers, items: newItems } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Button CTA</label>
                        <input
                          type="text"
                          value={off.cta}
                          onChange={(e) => {
                            const newItems = [...config.offers.items]
                            newItems[idx].cta = e.target.value
                            setConfig(prev => ({ ...prev, offers: { ...prev.offers, items: newItems } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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

          {/* TAB 5: HOW IT WORKS WORKFLOW */}
          {activeTab === "workflow" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Repeat2 className="w-5 h-5 text-purple-500" />
                  How It Works Workflow Steps
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage the 5-step customer booking lifecycle process on the homepage.
                </p>
              </div>

              <div className="space-y-3">
                {config.howItWorks.steps.map((step, idx) => (
                  <div key={step.num || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      {step.num}
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Step Title</label>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const newSteps = [...config.howItWorks.steps]
                            newSteps[idx].title = e.target.value
                            setConfig(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, steps: newSteps } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Step Description</label>
                        <input
                          type="text"
                          value={step.description}
                          onChange={(e) => {
                            const newSteps = [...config.howItWorks.steps]
                            newSteps[idx].description = e.target.value
                            setConfig(prev => ({ ...prev, howItWorks: { ...prev.howItWorks, steps: newSteps } }))
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: LIVE STATS BAR */}
          {activeTab === "stats" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-500" />
                  Live Platform Stats Bar
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage dark counter bar stats (Happy Customers, Verified Experts, Response Time, Rating).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {config.statsBar.map((st, idx) => (
                  <div key={st.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Count Value</label>
                      <input
                        type="text"
                        value={st.number}
                        onChange={(e) => {
                          const newStats = [...config.statsBar]
                          newStats[idx].number = e.target.value
                          setConfig(prev => ({ ...prev, statsBar: newStats }))
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400 font-bold text-sm border border-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Label Text</label>
                      <input
                        type="text"
                        value={st.label}
                        onChange={(e) => {
                          const newStats = [...config.statsBar]
                          newStats[idx].label = e.target.value
                          setConfig(prev => ({ ...prev, statsBar: newStats }))
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs border border-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: FEATURED EXPERTS */}
          {activeTab === "experts" && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Featured Professionals Section
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage spotlight expert profiles displayed on the homepage.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.featuredPros.pros.map((pro, idx) => (
                  <div key={pro.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex items-center gap-3">
                      <img src={pro.image} alt={pro.name} className="w-12 h-12 rounded-xl object-cover border border-slate-300" />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={pro.name}
                          onChange={(e) => {
                            const newPros = [...config.featuredPros.pros]
                            newPros[idx].name = e.target.value
                            setConfig(prev => ({ ...prev, featuredPros: { ...prev.featuredPros, pros: newPros } }))
                          }}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={pro.title}
                          onChange={(e) => {
                            const newPros = [...config.featuredPros.pros]
                            newPros[idx].title = e.target.value
                            setConfig(prev => ({ ...prev, featuredPros: { ...prev.featuredPros, pros: newPros } }))
                          }}
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-500 mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Rating ★</label>
                        <input
                          type="number"
                          step="0.1"
                          value={pro.rating}
                          onChange={(e) => {
                            const newPros = [...config.featuredPros.pros]
                            newPros[idx].rating = parseFloat(e.target.value) || 5.0
                            setConfig(prev => ({ ...prev, featuredPros: { ...prev.featuredPros, pros: newPros } }))
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-amber-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Jobs Done</label>
                        <input
                          type="text"
                          value={pro.jobs}
                          onChange={(e) => {
                            const newPros = [...config.featuredPros.pros]
                            newPros[idx].jobs = e.target.value
                            setConfig(prev => ({ ...prev, featuredPros: { ...prev.featuredPros, pros: newPros } }))
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <ImageUploadField
                        value={pro.image}
                        onChange={(newPath) => {
                          const newPros = [...config.featuredPros.pros]
                          newPros[idx].image = newPath
                          setConfig(prev => ({ ...prev, featuredPros: { ...prev.featuredPros, pros: newPros } }))
                        }}
                        section="featured-pros"
                        fallbackSrc="/mockups/expert_electrical.png"
                        label="Professional Photo"
                        aspectRatio="aspect-square"
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
        </div>
      </div>

      {/* LIVE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">Live Home Page Preview Frame</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-3 py-1 rounded-lg hover:bg-slate-800"
              >
                Close Preview ✕
              </button>
            </div>

            <iframe
              src="/home?preview=true"
              className="w-full flex-1 border-none"
              title="Home Page Preview"
            />
          </div>
        </div>
      )}
    </div>
  )
}
