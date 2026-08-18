import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, Star, Check, X } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx";

const BOOKING_CURRENCY_SYMBOL = "₹";

const BATHROOM_SUB_TABS = [
  { id: "packages", name: "Full Clean", image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=150&q=80&fit=crop" },
  { id: "minis", name: "Quick Extra Services", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&q=80&fit=crop" },
  { id: "subscription", name: "Weekly Bathroom Cleaning Subscription", image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=150&q=80&fit=crop" }
];

const BATHROOM_SERVICES = {
  packages: [
    {
      id: "bath-deep-clean",
      name: "Deep Bathroom Cleaning (machine)",
      description: "Deep cleaning of toilet, basin, floor and tiles. Removes soap marks, dirt and common stains.",
      highlight: "Recommended for deep cleaning & tough stains",
      rating: "4.82",
      reviews: "1.5M reviews",
      price: 499,
      duration: "60 mins",
      image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=300&q=80&fit=crop",
      includes: [
        "Deep cleaning of toilet, basin, floor and tiles",
        "Removes soap marks, dirt and common stains",
        "Detailed cleaning of shower, taps and bathroom corners"
      ]
    },
    {
      id: "bath-intense-clean",
      name: "Deep Bathroom Cleaning (Hands-on)",
      description: "Extra scrubbing for floors, tiles and bathroom fixtures. Removes stubborn dirt, soap buildup.",
      rating: "4.82",
      reviews: "1.5M reviews",
      price: 300,
      duration: "60 mins",
      image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=300&q=80&fit=crop",
      includes: [
        "Extra scrubbing for floors, tiles and bathroom fixtures",
        "Removes stubborn dirt, soap buildup and common stains",
        "Detailed cleaning of hard-to-reach bathroom areas"
      ]
    }
  ],
  minis: [
    {
      id: "bath-exhaust-fan",
      name: "Bathroom Exhaust Fan Cleaning",
      description: "Removes dust from the exhaust fan and outer cover. Suitable as an add-on.",
      rating: "4.79",
      reviews: "113K reviews",
      price: 89,
      duration: "15 mins",
      image: "/mockups/exhaust_fan.png",
      includes: [
        "Removes dust from the exhaust fan and outer cover",
        "Helps keep the fan clean and free from surface buildup",
        "Suitable as an add-on to bathroom cleaning"
      ]
    },
    {
      id: "bath-washbasin-add",
      name: "Washbasin cleaning (additional)",
      description: "Additional washbasin cleaning for extra bathroom convenience.",
      rating: "4.83",
      reviews: "331K reviews",
      price: 89,
      duration: "10 mins",
      image: "/mockups/washbasin.png",
      includes: [
        "Washbasin surface cleaning & sanitization",
        "Tap cleaning and polishing"
      ]
    },
    {
      id: "bath-ceiling-fan",
      name: "Ceiling fan cleaning",
      description: "Not covered in standard bathroom services.",
      rating: "4.83",
      reviews: "616K reviews",
      price: 89,
      duration: "15 mins",
      image: "/mockups/ceiling_fan.png",
      includes: [
        "Ceiling fan dusting and blade wipe"
      ]
    },
    {
      id: "bath-door-add",
      name: "Door cleaning (additional)",
      description: "Additional bathroom door cleaning.",
      rating: "4.78",
      reviews: "41K reviews",
      price: 89,
      duration: "10 mins",
      image: "/mockups/bath_door.png",
      includes: [
        "Door panel wipe and handle sanitization"
      ]
    },
    {
      id: "bath-mirror-add",
      name: "Mirror cleaning (additional)",
      description: "Additional mirror cleaning for a crystal-clear reflection.",
      rating: "4.83",
      reviews: "48K reviews",
      price: 59,
      duration: "10 mins",
      image: "/mockups/bath_2.png",
      includes: [
        "Mirror glass cleaning and smudge removal"
      ]
    },
    {
      id: "bath-drain-clean",
      name: "Drain Cleaning",
      description: "Detailed bathroom drain block clearing and sanitization.",
      rating: "5.00",
      reviews: "17 reviews",
      price: 59,
      duration: "15 mins",
      image: "/mockups/drain_clean.png",
      includes: [
        "Drain block clearance and sanitization"
      ]
    }
  ],
  subscription: [
    {
      id: "sub-bath-machine",
      name: "Bathroom Cleaning (machine)",
      description: "Convenient weekly machine scrubbing and deep cleaning subscription.",
      rating: "4.92",
      reviews: "250K reviews",
      price: 350,
      duration: "1 hr",
      image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=300&q=80&fit=crop",
      includes: [
        "Machine scrubbing of floors and wall tiles",
        "Deep sanitation of toilet and washbasin",
        "Polishing of chrome fixtures and mirror dusting"
      ]
    },
    {
      id: "sub-bath-hands-on",
      name: "Bathroom Cleaning (hands on)",
      description: "Thorough hands-on scrubbing and sanitation weekly subscription.",
      rating: "4.88",
      reviews: "180K reviews",
      price: 215,
      duration: "1 hr",
      image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=300&q=80&fit=crop",
      includes: [
        "Thorough hands-on scrubbing of tiles and corners",
        "Sanitization of toilet bowl, sink, and taps",
        "Wiping of glass panels, door handles, and mirror shine"
      ]
    }
  ]
};

const SERVICE_DETAILS_CONTENT = {
  "sub-bath-machine": {
    tools: [
      "Floor scrubbing machine",
      "Specialized degreasing cleaner",
      "Toilet sanitizers",
      "Microfiber cloths"
    ],
    ready: [
      "Clear all shampoo bottles and toiletries",
      "Ensure access to power supply and water"
    ],
    faqs: [
      { q: "Can I pause my subscription?", a: "Yes, you can pause or reschedule visits directly from your dashboard." }
    ],
    bathroomRates: [
      { label: "1 Bathroom", price: 350 },
      { label: "2 Bathrooms", price: 700 },
      { label: "3 Bathrooms", price: 1050 },
      { label: "4 Bathrooms", price: 1400 },
      { label: "5 Bathrooms", price: 1750 },
      { label: "6 Bathrooms", price: 2100 }
    ],
    isSubscription: true
  },
  "sub-bath-hands-on": {
    tools: [
      "Detailing scrubs and pads",
      "Eco-friendly bathroom cleaner",
      "Sanitizing spray",
      "Glass cleaners"
    ],
    ready: [
      "Clear all toiletries from shelf surfaces"
    ],
    faqs: [
      { q: "Is machine scrubbing included?", a: "No, this is a detailed hands-on manual scrubbing service." }
    ],
    bathroomRates: [
      { label: "1 Bathroom", price: 215 },
      { label: "2 Bathrooms", price: 430 },
      { label: "3 Bathrooms", price: 645 },
      { label: "4 Bathrooms", price: 860 },
      { label: "5 Bathrooms", price: 1075 },
      { label: "6 Bathrooms", price: 1290 }
    ],
    isSubscription: true
  },
  "bath-washbasin-add": {
    tools: ["Washbasin cleaner", "Microfiber cloth"],
    ready: ["Ensure basin is clear of toiletries"]
  },
  "bath-ceiling-fan": {
    tools: ["Fan duster", "Microfiber cloth"],
    ready: ["Keep fan space clear"]
  },
  "bath-door-add": {
    tools: ["Wood/panel safe cleaner", "Soft cloth"],
    ready: []
  },
  "bath-mirror-add": {
    tools: ["Glass cleaner", "Microfiber cloth"],
    ready: []
  },
  "bath-drain-clean": {
    tools: ["Drain cleaners", "Sewer brushes"],
    ready: []
  },
  "bath-deep-clean": {
    covered: [
      "Toilet deep cleaning",
      "Wash basin cleaning",
      "Floor scrubbing",
      "Wall tile cleaning",
      "Shower and tap cleaning",
      "Mirror cleaning",
      "Soap and dirt buildup removal",
      "Corner and edge cleaning"
    ],
    tools: [
      "Bathroom-safe cleaners",
      "Tile cleaning solution",
      "Toilet cleaning products",
      "Scrubbing brushes",
      "Microfiber cloths"
    ],
    ready: [
      "Keep the bathroom accessible",
      "Remove toiletries and personal items",
      "Keep water supply available",
      "Keep fragile items safely away"
    ],
    faqs: [
      { q: "Does this include toilet cleaning?", a: "Yes. Toilet cleaning is included in the deep-cleaning service." },
      { q: "Will you clean bathroom tiles?", a: "Yes. Accessible floor and wall tiles are cleaned." },
      { q: "Can I book more than one bathroom?", a: "Yes. Select the required number of bathrooms." },
      { q: "Can I add exhaust fan cleaning?", a: "Yes. Exhaust fan cleaning can be added separately." }
    ],
    bathroomRates: [
      { label: "1 Bathroom", price: 499 },
      { label: "2 Bathrooms", price: 998 },
      { label: "3 Bathrooms", price: 1497 },
      { label: "4 Bathrooms", price: 1996 },
      { label: "5 Bathrooms", price: 2495 },
      { label: "6 Bathrooms", price: 2994 }
    ]
  },
  "bath-intense-clean": {
    covered: [
      "Deep toilet cleaning",
      "Wash basin and tap cleaning",
      "Floor and wall tile scrubbing",
      "Shower area cleaning",
      "Soap buildup removal",
      "Common hard-water stain treatment",
      "Corner and edge cleaning",
      "Mirror cleaning"
    ],
    tools: [
      "Deep bathroom cleaning solutions",
      "Tile-safe cleaners",
      "Stain treatment products",
      "Scrubbing brushes",
      "Microfiber cloths"
    ],
    ready: [
      "Continuous water supply",
      "Bathroom accessible for cleaning",
      "Personal items kept away",
      "Fragile items safely stored"
    ],
    faqs: [
      { q: "What is the difference between Deep and Intense Cleaning?", a: "Intense cleaning includes more detailed scrubbing for stubborn dirt, buildup and hard-to-reach areas." },
      { q: "Can I select multiple bathrooms?", a: "Yes. You can select up to 5 bathrooms." },
      { q: "Can I choose weekly cleaning?", a: "Yes. You can select once, twice or three times a week." },
      { q: "Are cleaning products provided?", a: "Yes. Our team brings the required cleaning products and tools." }
    ],
    bathroomRates: [
      { label: "1 Bathroom", price: 300 },
      { label: "2 Bathrooms", price: 600 },
      { label: "3 Bathrooms", price: 900 },
      { label: "4 Bathrooms", price: 1200 },
      { label: "5 Bathrooms", price: 1500 },
      { label: "6 Bathrooms", price: 1800 }
    ]
  },
  "bath-move-in": {
    covered: [
      "Complete bathroom floor cleaning",
      "Machine scrubbing of tiles",
      "Toilet and basin cleaning",
      "Shower and tap cleaning",
      "Mirror cleaning",
      "Corner and edge cleaning",
      "Soap and dirt buildup removal",
      "Basic drain-area cleaning"
    ],
    tools: [
      "Floor scrubbing machine",
      "Bathroom-safe cleaning products",
      "Tile cleaning solution",
      "Scrubbing brushes",
      "Microfiber cloths"
    ],
    ready: [
      "Bathroom should be empty",
      "Keep water supply available",
      "Keep power connection available",
      "Provide easy access to the bathroom"
    ],
    faqs: [
      { q: "Is this suitable for a new bathroom?", a: "Yes. It is suitable for new, unused or recently renovated bathrooms." },
      { q: "Does it include machine scrubbing?", a: "Yes. Machine scrubbing of accessible floors and tiles is included." },
      { q: "Can I book multiple bathrooms?", a: "Yes. Select the required number of bathrooms." },
      { q: "Is this a recurring service?", a: "No. Move-In Cleaning is normally booked as a one-time service." }
    ],
    bathroomRates: [
      { label: "1 Bathroom", price: 579 },
      { label: "2 Bathrooms", price: 1158 },
      { label: "3 Bathrooms", price: 1737 },
      { label: "4 Bathrooms", price: 2316 },
      { label: "5 Bathrooms", price: 2895 }
    ],
    addons: [
      { id: "addon-exhaust", name: "Bathroom Exhaust Fan Cleaning", price: 89 },
      { id: "addon-window", name: "Bathroom Window Cleaning", price: 99 },
      { id: "addon-toilet", name: "Extra Toilet Cleaning", price: 99 },
      { id: "addon-drain", name: "Drain Cleaning", price: 99 }
    ]
  },
  "bath-exhaust-fan": {
    covered: [
      "Dust removal from exhaust fan",
      "Cleaning of outer fan cover",
      "Surface cleaning of fan blades",
      "Removal of visible dirt and buildup"
    ],
    tools: [
      "Microfiber cloths",
      "Soft cleaning brushes",
      "Dusting tools",
      "Mild surface cleaner"
    ],
    ready: [
      "Fan should be accessible",
      "Switch off the fan before cleaning",
      "Keep nearby area clear",
      "Provide safe access to the fan"
    ],
    faqs: [
      { q: "Will you remove the exhaust fan from the wall?", a: "No. Standard cleaning is done without removing the fan." },
      { q: "Will you clean the fan blades?", a: "Yes. Accessible fan blades are cleaned." },
      { q: "Can I book more than one exhaust fan?", a: "Yes. Select the required number of fans." },
      { q: "Is electrical repair included?", a: "No. Electrical repair or motor replacement is not included." }
    ],
    bathroomRates: [
      { label: "1 Fan", price: 89 },
      { label: "2 Fans", price: 178 },
      { label: "3 Fans", price: 267 },
      { label: "4 Fans", price: 356 }
    ]
  }
};

export function BathroomCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("packages");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [dbPackages, setDbPackages] = useState([]);

  // States for selected options in the detail modal view
  const [selectedRateIdx, setSelectedRateIdx] = useState(0);
  const [selectedFreq, setSelectedFreq] = useState("One-Time");
  const [selectedSubFreqWeeks, setSelectedSubFreqWeeks] = useState(null);
  const [selectedSubMonths, setSelectedSubMonths] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]); // Array of addon objects

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await apiRequest("/settings/catalog/public/packages/?service_slug=bathroom-cleaning");
        if (res.success && Array.isArray(res.data)) {
          setDbPackages(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch bathroom packages:", err);
      }
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (selectedServiceDetails) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedServiceDetails]);

  const addItemToCart = (id, name, price, duration) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, price, duration, quantity: 1 }];
    });
  };

  const addCustomizedItemToCart = (baseId, name, price, duration, detailsString) => {
    const uniqueId = `${baseId}-${Date.now()}`;
    const cartName = `${name} (${detailsString})`;
    setCart(prev => [...prev, { id: uniqueId, name: cartName, price, duration, quantity: 1 }]);
  };

  const removeItemFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getCount = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const getActiveServices = () => {
    let list = BATHROOM_SERVICES[activeTab] || [];
    list = JSON.parse(JSON.stringify(list));

    if (dbPackages.length > 0) {
      list = list.map(item => {
        if (Array.isArray(item.subOptions)) {
          item.subOptions = item.subOptions.map(subOpt => {
            const dbMatch = dbPackages.find(p => p.slug === subOpt.id || p.id === subOpt.id);
            if (dbMatch) {
              return {
                ...subOpt,
                ...dbMatch,
                name: dbMatch.name,
                price: Math.round(Number(dbMatch.base_price) || subOpt.price),
                duration: dbMatch.duration || subOpt.duration,
                includes: Array.isArray(dbMatch.includes) && dbMatch.includes.length > 0 ? dbMatch.includes : subOpt.includes,
                tools: dbMatch.tools,
                ready: dbMatch.ready,
                reviews: dbMatch.reviews,
                faqs: dbMatch.faqs,
                image: dbMatch.image || subOpt.image,
              };
            }
            return subOpt;
          });
          if (item.subOptions.length > 0) {
            item.price = item.subOptions[0].price;
          }
        } else {
          const dbMatch = dbPackages.find(p => p.slug === item.id || p.id === item.id);
          if (dbMatch) {
            item.name = dbMatch.name;
            item.price = Math.round(Number(dbMatch.base_price) || item.price);
            item.duration = dbMatch.duration || item.duration;
            item.description = dbMatch.description || item.description;
            item.includes = Array.isArray(dbMatch.includes) && dbMatch.includes.length > 0 ? dbMatch.includes : item.includes;
            item.tools = dbMatch.tools;
            item.ready = dbMatch.ready;
            if (Array.isArray(dbMatch.reviews) && dbMatch.reviews.length > 0) item.reviews_list = dbMatch.reviews;
            item.faqs = dbMatch.faqs;
            item.image = dbMatch.image || item.image;
            item.badge = dbMatch.tag || item.badge;
          }
        }
        return item;
      });
    }

    if (!searchQuery) return list;
    return list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase())));
  };

  const activeServices = getActiveServices();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getSectionTitle = () => {
    if (activeTab === "packages") return "FULL BATHROOM CLEANING";
    if (activeTab === "subscription") return "WEEKLY SUBSCRIPTION PLANS";
    return "QUICK EXTRA SERVICES";
  };

  const handleOpenDetails = (service) => {
    setSelectedServiceDetails(service);
    setSelectedRateIdx(0);
    const details = SERVICE_DETAILS_CONTENT[service.id] || {};
    setSelectedFreq("One-Time");
    setSelectedRateIdx(details.isSubscription ? null : 0);
    setSelectedSubFreqWeeks(null);
    setSelectedSubMonths(null);
    setSelectedAddons([]);
    setActiveFaq(null);
  };

  // Calculate current price in modal dynamically
  const getModalPrice = () => {
    if (!selectedServiceDetails) return 0;
    const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
    if (details.bathroomRates && selectedRateIdx === null) return 0;
    const basePrice = details.bathroomRates ? details.bathroomRates[selectedRateIdx]?.price || selectedServiceDetails.price : selectedServiceDetails.price;

    let multiplier = 1;
    if (details.isSubscription && selectedSubFreqWeeks && selectedSubMonths) {
      const months = parseInt(selectedSubMonths) || 1;
      const visitsPerMonth = selectedSubFreqWeeks === "Once every week" ? 4 : 2;
      multiplier = visitsPerMonth * months;
    }

    const addonsPrice = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    return (basePrice * multiplier) + addonsPrice;
  };

  const handleProceedFromModal = () => {
    if (!selectedServiceDetails) return;
    const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
    const rateObj = details.bathroomRates ? details.bathroomRates[selectedRateIdx] : null;
    const totalPrice = getModalPrice();

    let detailsParts = [];
    if (rateObj) detailsParts.push(rateObj.label);
    if (details.frequencies && selectedFreq !== "One-Time") detailsParts.push(selectedFreq);
    if (details.isSubscription) {
      detailsParts.push(selectedSubFreqWeeks);
      detailsParts.push(selectedSubMonths);
    }
    if (selectedAddons.length > 0) {
      detailsParts.push(`${selectedAddons.length} Add-ons`);
    }

    const detailsString = detailsParts.join(", ") || "Standard";
    addCustomizedItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, totalPrice, selectedServiceDetails.duration, detailsString);
    setSelectedServiceDetails(null);
  };

  return (
    <div className="w-full text-slate-700 bg-white min-h-screen">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white shadow-sm border-b border-slate-100">
        <div className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4 px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft size={14} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Bathroom Cleaning</h2>
          </div>
        </div>

        {/* Sub-tabs exactly styled like Sofa/Kitchen Cleaning */}
        <div className="flex gap-5 pb-3 pt-4 px-6 border-b border-slate-100 justify-start bg-white">
          {BATHROOM_SUB_TABS.map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className="flex flex-col items-center justify-start p-1.5 transition-all cursor-pointer text-center bg-transparent w-[90px] shrink-0"
              >
                <img
                  src={tab.image}
                  alt={tab.name}
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${isSelected ? "scale-[1.05] shadow-md border-2 border-white" : "opacity-80 hover:opacity-100"
                    }`}
                />
                <span className={`text-[10px] block leading-tight tracking-tight mt-0.5 transition-colors ${isSelected ? "text-slate-800 font-extrabold" : "text-slate-600 font-bold"
                  }`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 pt-6 px-6 max-w-7xl mx-auto gap-8 pb-20">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          {/* Section title */}
          <div className="pt-1 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {getSectionTitle()}
            </h3>
          </div>

          {/* Tab Banner Image */}
          {(() => {
            const banners = {
              packages: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80&fit=crop",
              minis: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80&fit=crop",
              subscription: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=1200&q=80&fit=crop"
            };
            const bannerUrl = banners[activeTab];
            if (!bannerUrl) return null;
            return (
              <div className="w-full aspect-[10/3] bg-slate-100 rounded-2xl overflow-hidden mb-5 border border-slate-100/60">
                <img
                  src={bannerUrl}
                  alt={getSectionTitle()}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            );
          })()}

          <div className="space-y-4">
            {activeServices.map((service) => {
              const count = getCount(service.id);
              return (
                <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative transition-all hover:shadow-md">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 order-2 sm:order-1">
                      <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>

                      {service.description && (
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                        <span className="text-base font-black text-slate-900">
                          {service.options && <span className="text-slate-500 font-medium text-xs mr-1">{service.options}</span>}
                          ₹{service.price}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-semibold">{service.duration}</span>
                      </div>

                      {service.highlight && (
                        <p className="text-xs font-bold text-slate-800 mb-3">{service.highlight}</p>
                      )}

                      {service.includes && service.includes.length > 0 && (
                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 mb-4">
                          {service.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        onClick={() => handleOpenDetails(service)}
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline cursor-pointer"
                      >
                        View details
                      </button>
                    </div>

                    <div className="relative shrink-0 w-full sm:w-[140px] order-1 sm:order-2 flex flex-col items-center">
                      <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 shadow-sm border border-slate-100 mb-[-15px] z-0">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-24 z-10">
                        <button
                          onClick={() => handleOpenDetails(service)}
                          className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-xs py-2 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase cursor-pointer"
                        >
                          <ShoppingCart size={14} /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {activeServices.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">
                No services found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[320px]">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4 lg:sticky lg:top-48">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
              <span className="text-[10px] font-bold text-slate-400">{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
            </div>

            {cart.length > 0 ? (
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-xs gap-3">
                    <div className="flex-1">
                      <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{item.duration}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                      <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 hover:text-red-700 font-bold ml-1">×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-[11px] px-4 leading-relaxed">
                No cleaning services added. Select from the packages on the left.
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1">
                <span>Total Amount</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={cart.length === 0}
                onClick={onCheckout}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-white/60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-center text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                Proceed to Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppBannerAndFooter />

      {/* View Details Drawer/Modal */}
      {selectedServiceDetails && createPortal(
        <div
          onClick={() => setSelectedServiceDetails(null)}
          className="fixed inset-0 z-[250] bg-black/45 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative font-sans"
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedServiceDetails(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white p-1.5 rounded-full z-30 shadow-md transition-colors cursor-pointer border-none"
            >
              <X size={16} />
            </button>

            {/* Header: image hero */}
            <div className="h-36 border-b border-slate-100 shrink-0">
              <img
                src={selectedServiceDetails.image}
                alt={selectedServiceDetails.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Title and Rating */}
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">{selectedServiceDetails.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
                  <Star className="text-yellow-500 fill-yellow-500" size={12} />
                  <span className="text-slate-800">{selectedServiceDetails.rating || "4.82"}</span>
                  <span className="text-slate-400 font-normal underline">({typeof selectedServiceDetails.reviews === 'string' ? selectedServiceDetails.reviews : (Array.isArray(selectedServiceDetails.reviews) ? `${selectedServiceDetails.reviews.length} reviews` : "1.5M reviews")})</span>
                </div>
                <p className="text-xs text-slate-500 font-bold">Starts at ₹{selectedServiceDetails.price} • {selectedServiceDetails.duration}</p>
              </div>

              {/* Inclusions Box */}
              {selectedServiceDetails.includes && selectedServiceDetails.includes.length > 0 && (
                <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-2xl p-4 text-left">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    What&apos;s included
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600 font-medium">
                    {selectedServiceDetails.includes.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements selection section */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                return (
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Select Requirements</h4>

                    {/* 1. Select Number of Bathrooms/Fans */}
                    {details.bathroomRates && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">
                          {selectedServiceDetails.id === "bath-exhaust-fan" ? "Select Number of Exhaust Fans" : "Select Number of Bathrooms"}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {details.bathroomRates.map((rate, idx) => {
                            const isChosen = selectedRateIdx === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedRateIdx(idx)}
                                className={`px-3 py-2 text-xs font-bold border rounded-xl transition-all cursor-pointer ${isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                <div>{rate.label}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">₹{rate.price}{details.isSubscription ? "/service" : ""}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2a. Select Frequency in Weeks (Subscription) */}
                    {details.isSubscription && selectedRateIdx !== null && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select Frequency in Weeks</label>
                        <div className="flex flex-wrap gap-2">
                          {["Once every week", "Once in 2 weeks"].map((freq, idx) => {
                            const isChosen = selectedSubFreqWeeks === freq;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedSubFreqWeeks(freq)}
                                className={`px-4 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer ${isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                {freq}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2b. Select Frequency in Months (Subscription) */}
                    {details.isSubscription && selectedRateIdx !== null && selectedSubFreqWeeks !== null && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select Frequency in Months</label>
                        <div className="flex flex-wrap gap-2">
                          {["1 month", "2 months", "3 months"].map((monthOpt, idx) => {
                            const isChosen = selectedSubMonths === monthOpt;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedSubMonths(monthOpt)}
                                className={`px-4 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer ${isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                {monthOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2. Select Frequency of Cleaning */}
                    {details.frequencies && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select Frequency of Cleaning</label>
                        <div className="flex flex-wrap gap-2">
                          {details.frequencies.map((freq, idx) => {
                            const isChosen = selectedFreq === freq;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedFreq(freq)}
                                className={`px-4 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer ${isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                  }`}
                              >
                                {freq}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3. Select Add-ons */}
                    {details.addons && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select Add-ons</label>
                        <div className="space-y-2">
                          {details.addons.map((addon) => {
                            const isSelected = selectedAddons.some(a => a.id === addon.id);
                            return (
                              <div
                                key={addon.id}
                                className={`flex justify-between items-center p-3 border rounded-xl transition-all ${isSelected ? "border-emerald-600 bg-emerald-50/30" : "border-slate-100"
                                  }`}
                              >
                                <span className="text-xs font-medium text-slate-700">{addon.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-900">₹{addon.price}/visit</span>
                                  <button
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedAddons(prev => prev.filter(a => a.id !== addon.id));
                                      } else {
                                        setSelectedAddons(prev => [...prev, addon]);
                                      }
                                    }}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer border ${isSelected
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "bg-white border-slate-200 text-emerald-600 hover:bg-slate-50"
                                      }`}
                                  >
                                    {isSelected ? "✓" : "+"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* What is Covered */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const covered = details.covered || [];
                if (covered.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What Is Covered</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {covered.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-slate-400 font-bold shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Tools & Products We Use */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const tools = details.tools || [];
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Products We Use</h4>
                    <div className="space-y-2">
                      {tools.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* What You Need to Keep Ready */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const ready = details.ready || [];
                if (ready.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {ready.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Frequently Asked Questions */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const faqs = details.faqs || [];
                if (faqs.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                    <div className="space-y-2">
                      {faqs.map((faq, idx) => {
                        const isFaqOpen = activeFaq === idx;
                        return (
                          <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
                            <button
                              onClick={() => setActiveFaq(isFaqOpen ? null : idx)}
                              className="w-full p-3 flex justify-between items-center text-xs bg-white font-semibold text-left cursor-pointer hover:bg-slate-50/50 border-none outline-none"
                            >
                              <span className={isFaqOpen ? "text-emerald-600 font-bold" : "text-slate-700"}>{faq.q}</span>
                              <span className={isFaqOpen ? "text-emerald-600 text-sm font-bold ml-2 shrink-0" : "text-slate-400 text-sm font-bold ml-2 shrink-0"}>{isFaqOpen ? "−" : "+"}</span>
                            </button>
                            {isFaqOpen && (
                              <div className="px-3 pb-3 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-50 bg-slate-50/20">
                                {faq.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                {(() => {
                  const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                  if (details.isSubscription && (selectedRateIdx === null || !selectedSubFreqWeeks || !selectedSubMonths)) {
                    return null;
                  }
                  return (
                    <>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Price</div>
                      <div className="text-base font-black text-slate-900">₹{getModalPrice()}</div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={handleProceedFromModal}
                disabled={(() => {
                  const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                  if (details.isSubscription && (selectedRateIdx === null || !selectedSubFreqWeeks || !selectedSubMonths)) {
                    return true;
                  }
                  return false;
                })()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer border-none"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
