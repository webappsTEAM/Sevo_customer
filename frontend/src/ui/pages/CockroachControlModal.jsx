import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, Star, Check, X, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx";

const BOOKING_CURRENCY_SYMBOL = "₹";

const PEST_SUB_TABS = [
  { id: "cockroach", name: "Cockroach Control", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&q=80&fit=crop" },
  { id: "termite", name: "Termite Control", image: "/mockups/termite_control.jpg" }
];

const PEST_SERVICES = {
  kitchen_bathroom: [
    {
      id: "pest-kb-main",
      name: "Cockroach Control (Kitchen & Bathroom)",
      rating: "4.79",
      reviews: "164K reviews",
      price: 999,
      duration: "45 mins",
      description: "Dual-session gel and spray treatment targeting kitchen & bathroom cockroaches.",
      image: "/mockups/cockroach_control.png",
      includes: [
        "Before inspection we will handle utensils",
        "After removal customer has to keep the utensils",
        "Dual-session deep eradication with 14-day cycle window"
      ]
    }
  ],
  apartment_bungalow: [
    {
      id: "pest-apt-main",
      name: "Apartment Cockroach Extermination",
      rating: "4.81",
      reviews: "75K reviews",
      price: 1549,
      duration: "1 hr",
      description: "Complete cockroach control for apartments with odorless bio-spray.",
      image: "/mockups/cockroach_control.png",
      includes: [
        "Before inspection we will handle utensils",
        "After removal customer has to keep the utensils",
        "Odorless bio-spray with targeted gel dot application"
      ]
    },
    {
      id: "pest-bung-main",
      name: "Bungalow & Villa Cockroach Extermination",
      rating: "4.74",
      reviews: "2K reviews",
      price: 2099,
      duration: "1.5 hrs",
      description: "Full independent house & villa cockroach eradication service.",
      image: "/mockups/cockroach_control.png",
      includes: [
        "Before inspection we will handle utensils",
        "After removal customer has to keep the utensils",
        "Odorless bio-spray with targeted gel dot application"
      ]
    }
  ],
  termite_kitchen_bathroom: [
    {
      id: "pest-termite-kb",
      name: "Termite Control (Kitchen & Bathroom)",
      rating: "4.82",
      reviews: "9K reviews",
      price: 1499,
      duration: "1 hr",
      description: "Targeted drill-and-inject barrier protection for termite control in kitchens & bathrooms.",
      image: "/mockups/termite_control.jpg",
      includes: [
        "Before inspection we will handle utensils",
        "After removal customer has to keep the utensils",
        "Drill & chemical pressure injection to block termites"
      ]
    }
  ],
  termite_apartment_bungalow: [
    {
      id: "pest-termite-apt",
      name: "Apartment Termite Extermination",
      rating: "4.84",
      reviews: "15K reviews",
      price: 2499,
      duration: "2 hrs",
      description: "Drilling and chemical shield treatment to safeguard apartments from termites.",
      image: "/mockups/termite_control.jpg",
      includes: [
        "Before inspection we will handle utensils",
        "After removal customer has to keep the utensils",
        "Comprehensive wall base drilling & chemical shield protection"
      ]
    },
    {
      id: "pest-termite-bung",
      name: "Bungalow & Villa Termite Extermination",
      rating: "4.79",
      reviews: "3K reviews",
      price: 3499,
      duration: "3 hrs",
      description: "Comprehensive whole-bungalow drilling shield for ultimate termite protection.",
      image: "/mockups/termite_control.jpg",
      includes: [
        "Before inspection we will handle utensils",
        "After removal customer has to keep the utensils",
        "Comprehensive wall base drilling & chemical shield protection"
      ]
    }
  ]
};

const SERVICE_DETAILS_CONTENT = {
  "pest-kb-main": {
    rates: [
      { label: "1 bathroom & kitchen", price: 999 },
      { label: "2 bathrooms & kitchen", price: 1149 },
      { label: "3 bathrooms & kitchen", price: 1249 },
      { label: "4 bathrooms & kitchen", price: 1299 }
    ],
    note: "Our professionals will handle the complete removal of utensils and kitchenware before inspection. After the removal/clearing is completed, the customer has to store/keep the utensils safely.",
    includes: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    tools: ["Professional pest control equipment", "Approved pest treatment solutions", "Targeted gel bait application"],
    reviews_list: [
      { author: "Rajesh K.", rating: 5, date: "2 days ago", comment: "Excellent service. The technician cleared the utensils carefully and put gel in all hinges." },
      { author: "Anjali S.", rating: 4, date: "1 week ago", comment: "Very professional. The treatment is odorless and highly effective." }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, a kitchen cockroach treatment takes about 45min." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  },
  "pest-apt-main": {
    rates: [
      { label: "1 BHK", price: 1549 },
      { label: "2 BHK", price: 1699 },
      { label: "3 BHK", price: 1749 },
      { label: "4 BHK", price: 1899 },
      { label: "5 BHK", price: 1999 }
    ],
    note: "Our professionals will handle the complete removal of utensils and kitchenware before inspection. After the removal/clearing is completed, the customer has to store/keep the utensils safely.",
    includes: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    tools: ["Professional pest control equipment", "Approved pest treatment solutions", "Targeted gel bait application"],
    reviews_list: [
      { author: "Vikram M.", rating: 5, date: "3 days ago", comment: "Roach problem resolved completely. Best service ever." },
      { author: "Neha G.", rating: 5, date: "2 weeks ago", comment: "Awesome odorless spray. They handled the kitchen prep too." }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, an apartment cockroach treatment takes about 1hr." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  },
  "pest-bung-main": {
    rates: [
      { label: "1 BHK", price: 2099 },
      { label: "2 BHK", price: 2299 },
      { label: "3 BHK", price: 2499 },
      { label: "4 BHK", price: 2699 },
      { label: "5 BHK", price: 2899 }
    ],
    note: "Our professionals will handle the complete removal of utensils and kitchenware before inspection. After the removal/clearing is completed, the customer has to store/keep the utensils safely.",
    includes: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    tools: ["Professional pest control equipment", "Approved pest treatment solutions", "Targeted gel bait application"],
    reviews_list: [
      { author: "Suresh P.", rating: 4, date: "5 days ago", comment: "Detailed inspection and gel application. Highly recommended." }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, a bungalow cockroach treatment takes about 1.5hrs." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  },
  "pest-termite-kb": {
    rates: [
      { label: "1 bathroom & kitchen", price: 1499 },
      { label: "2 bathrooms & kitchen", price: 1799 },
      { label: "3 bathrooms & kitchen", price: 1999 },
      { label: "4 bathrooms & kitchen", price: 2199 }
    ],
    note: "Our professionals will handle the complete removal of utensils and kitchenware before inspection. After the removal/clearing is completed, the customer has to store/keep the utensils safely.",
    includes: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    tools: ["Professional pest control equipment", "Approved pest treatment solutions", "Targeted gel bait application"],
    reviews_list: [
      { author: "Mahesh S.", rating: 5, date: "1 week ago", comment: "Excellent termite control. Wood cabinets are completely safe now." }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, a kitchen termite treatment takes about 1hr." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  },
  "pest-termite-apt": {
    rates: [
      { label: "1 BHK", price: 2499 },
      { label: "2 BHK", price: 3499 },
      { label: "3 BHK", price: 4499 },
      { label: "4 BHK", price: 5499 },
      { label: "5 BHK", price: 6499 }
    ],
    note: "Our professionals will handle the complete removal of utensils and kitchenware before inspection. After the removal/clearing is completed, the customer has to store/keep the utensils safely.",
    includes: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    tools: ["Professional pest control equipment", "Approved pest treatment solutions", "Targeted gel bait application"],
    reviews_list: [
      { author: "Karan T.", rating: 5, date: "1 month ago", comment: "Professional termite drilling. They gave a 5-year warranty certificate." }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, an apartment termite treatment takes about 2hrs." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  },
  "pest-termite-bung": {
    rates: [
      { label: "1 BHK", price: 3499 },
      { label: "2 BHK", price: 4499 },
      { label: "3 BHK", price: 5499 },
      { label: "4 BHK", price: 6499 },
      { label: "5 BHK", price: 7499 }
    ],
    note: "Our professionals will handle the complete removal of utensils and kitchenware before inspection. After the removal/clearing is completed, the customer has to store/keep the utensils safely.",
    includes: [
      "Keep food items covered",
      "Store utensils safely after clearing"
    ],
    tools: ["Professional pest control equipment", "Approved pest treatment solutions", "Targeted gel bait application"],
    reviews_list: [
      { author: "Pooja V.", rating: 5, date: "2 weeks ago", comment: "Very thorough treatment. They spent hours securing our duplex. Great service!" }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, a bungalow termite treatment takes about 3hrs." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 1 day." },
      { q: "Do I need to leave the house?", a: "It is not required to leave the house." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." }
    ]
  }
};

export function CockroachControlModal({ category, cart, setCart, onClose, onCheckout, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || "cockroach");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [dbPackages, setDbPackages] = useState([]);

  // States for options in details view
  const [selectedRateIdx, setSelectedRateIdx] = useState(0);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        // Fetch cockroach and termite packages using public endpoint
        const [cockroachRes, termiteRes] = await Promise.all([
          apiRequest("/settings/catalog/public/packages/?service_slug=cockroach-control"),
          apiRequest("/settings/catalog/public/packages/?service_slug=termite-control"),
        ]);
        const allPkgs = [
          ...(cockroachRes?.success && Array.isArray(cockroachRes.data) ? cockroachRes.data : []),
          ...(termiteRes?.success && Array.isArray(termiteRes.data) ? termiteRes.data : []),
        ];
        setDbPackages(allPkgs);
      } catch (err) {
        console.error("Failed to fetch pest packages:", err);
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

  const addItemToCart = (id, name, price, duration, gst_rate, platform_fee) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, price, duration, gst_rate: Number(gst_rate || 18), platform_fee: Number(platform_fee || 29), quantity: 1 }];
    });
  };

  const addCustomizedItemToCart = (baseId, name, price, duration, detailsString, gst_rate, platform_fee) => {
    const uniqueId = `${baseId}-${Date.now()}`;
    const cartName = detailsString ? `${name} (${detailsString})` : name;
    setCart(prev => [...prev, { id: uniqueId, name: cartName, price, duration, gst_rate: Number(gst_rate || 18), platform_fee: Number(platform_fee || 29), quantity: 1 }]);
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

  const getDynamicPestServices = () => {
    let services = JSON.parse(JSON.stringify(PEST_SERVICES));
    if (dbPackages.length > 0) {
      Object.keys(services).forEach(key => {
        services[key] = services[key].map(item => {
          const dbMatch = dbPackages.find(p => p.slug === item.id || p.id === item.id);
          if (dbMatch) {
            item.name = dbMatch.name;
            item.price = Math.round(Number(dbMatch.base_price) || item.price);
            item.gst_rate = dbMatch.gst_rate !== undefined && dbMatch.gst_rate !== null ? parseFloat(dbMatch.gst_rate) : 18;
            item.platform_fee = dbMatch.platform_fee !== undefined && dbMatch.platform_fee !== null ? parseFloat(dbMatch.platform_fee) : 29;
            item.duration = dbMatch.duration || item.duration;
            item.description = dbMatch.description || item.description;
            if (Array.isArray(dbMatch.includes) && dbMatch.includes.length > 0) {
              item.includes = dbMatch.includes
                .filter(inc => typeof inc === "string" ? true : (inc.checked !== false && inc.enabled !== false))
                .map(inc => typeof inc === "string" ? inc : (inc.text || ""));
            }
            item.image = dbMatch.image || item.image;
            item.badge = dbMatch.tag || item.badge;
          } else {
            item.gst_rate = item.gst_rate || 18;
            item.platform_fee = item.platform_fee || 29;
          }
          return item;
        });
      });
    }
    return services;
  };

  const dynamicPestServices = getDynamicPestServices();

  const getModalPrice = () => {
    if (!selectedServiceDetails) return 0;
    const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
    return details.rates ? details.rates[selectedRateIdx]?.price || selectedServiceDetails.price : selectedServiceDetails.price;
  };

  const handleOpenDetails = (service) => {
    setSelectedServiceDetails(service);
    setSelectedRateIdx(0);
    setActiveFaq(null);
  };

  const handleProceedFromModal = () => {
    if (!selectedServiceDetails) return;
    const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
    const finalPrice = getModalPrice();
    const sizeLabel = details.rates ? details.rates[selectedRateIdx]?.label || "" : "";
    addCustomizedItemToCart(
      selectedServiceDetails.id,
      selectedServiceDetails.name,
      finalPrice,
      selectedServiceDetails.duration,
      sizeLabel,
      selectedServiceDetails.gst_rate,
      selectedServiceDetails.platform_fee
    );
    setSelectedServiceDetails(null);
  };

  // Filter lists based on search
  const filterList = (list) => {
    if (!searchQuery) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(item.includes) && item.includes.some(inc => typeof inc === "string" && inc.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  };

  const filteredKB = filterList(dynamicPestServices.kitchen_bathroom);
  const filteredAB = filterList(dynamicPestServices.apartment_bungalow);
  
  const filteredTermiteKB = filterList(dynamicPestServices.termite_kitchen_bathroom);
  const filteredTermiteAB = filterList(dynamicPestServices.termite_apartment_bungalow);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="w-full text-slate-700 bg-white min-h-screen">
      {/* Sticky Header + Search */}
      <div className="sticky top-16 z-20 bg-white pb-2 border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft size={14} /> Back to Services
            </button>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Cockroach & Termite Control</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pest Control Services</p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cockroach & termite control..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="border-b border-slate-100 bg-slate-50/50 py-1">
        <div className="max-w-7xl mx-auto px-6 flex gap-6 overflow-x-auto no-scrollbar py-1">
          {PEST_SUB_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className="flex flex-col items-center justify-start p-1.5 transition-all cursor-pointer text-center bg-transparent w-[100px] shrink-0 border-none outline-none"
              >
                <img
                  src={tab.image}
                  alt={tab.name}
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${
                    isSelected ? "scale-[1.05] shadow-md border-2 border-emerald-600" : "opacity-80 hover:opacity-100"
                  }`}
                />
                <span className={`text-[10px] block leading-tight tracking-tight mt-0.5 transition-colors ${
                  isSelected ? "text-slate-800 font-extrabold" : "text-slate-600 font-bold"
                }`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row flex-1 pt-6 px-6 max-w-7xl mx-auto gap-8 pb-20">
        {/* Left Column: Services list */}
        <div className="flex-1 space-y-8">
          
          {activeTab === "cockroach" && (
            <>
              <div className="w-full h-56 sm:h-60 bg-slate-100 rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-100">
                <img
                  src="/mockups/pest_control_header.jpg"
                  alt="Cockroach Control Services"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              {/* 1. Kitchen/Bathroom Section */}
              {filteredKB.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Targeted Kitchen & Bathroom Zones</h3>
                  </div>
                  <div className="space-y-4">
                    {filteredKB.map((service) => (
                      <div key={service.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row gap-5">
                          <div className="flex-1 order-2 sm:order-1">
                            <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>



                            {service.description && (
                              <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                            )}

                            <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                              <span className="text-base font-black text-slate-900">
                                ₹{service.price}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-semibold">{service.duration}</span>
                            </div>

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
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
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
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Apartment/Bungalow Section */}
              {filteredAB.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Whole-Home Treatment Plans</h3>
                  </div>
                  <div className="space-y-4">
                    {filteredAB.map((service) => (
                      <div key={service.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row gap-5">
                          <div className="flex-1 order-2 sm:order-1">
                            <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>



                            {service.description && (
                              <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                            )}

                            <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                              <span className="text-base font-black text-slate-900">
                                ₹{service.price}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-semibold">{service.duration}</span>
                            </div>

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
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
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
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "termite" && (
            <>
              <div className="w-full h-56 sm:h-60 bg-slate-100 rounded-2xl overflow-hidden mb-6 shadow-sm border border-slate-100">
                <img
                  src="/mockups/pest_control_header.jpg"
                  alt="Termite Control Services"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              {/* 1. Termite Kitchen/Bathroom Section */}
              {filteredTermiteKB.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Targeted Kitchen & Bathroom Zones</h3>
                  </div>
                  <div className="space-y-4">
                    {filteredTermiteKB.map((service) => (
                      <div key={service.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row gap-5">
                          <div className="flex-1 order-2 sm:order-1">
                            <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>



                            {service.description && (
                              <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                            )}

                            <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                              <span className="text-base font-black text-slate-900">
                                ₹{service.price}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-semibold">{service.duration}</span>
                            </div>

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
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
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
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Termite Apartment/Bungalow Section */}
              {filteredTermiteAB.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Whole-Home Treatment Plans</h3>
                  </div>
                  <div className="space-y-4">
                    {filteredTermiteAB.map((service) => (
                      <div key={service.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row gap-5">
                          <div className="flex-1 order-2 sm:order-1">
                            <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>



                            {service.description && (
                              <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                            )}

                            <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                              <span className="text-base font-black text-slate-900">
                                ₹{service.price}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 font-semibold">{service.duration}</span>
                            </div>

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
                              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer border-none bg-transparent"
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
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {((activeTab === "cockroach" && filteredKB.length === 0 && filteredAB.length === 0) ||
            (activeTab === "termite" && filteredTermiteKB.length === 0 && filteredTermiteAB.length === 0)) && (
            <div className="py-10 text-center text-slate-400 text-sm">
              No services found in this category.
            </div>
          )}
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm space-y-4 lg:sticky lg:top-[100px] h-fit">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
              <span className="text-[10px] font-bold text-slate-400">{cart.length} items</span>
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
                      <button onClick={() => removeItemFromCart(item.id)} className="text-red-500 hover:text-red-700 font-bold ml-1 border-none bg-transparent cursor-pointer">×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-[11px] px-4 leading-relaxed">
                No services added. Select from the packages on the left.
              </div>
            )}

            {cart.length > 0 ? (() => {
              const itemTotal = cart.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);
              const totalGst = cart.reduce((s, i) => s + Math.round((i.price * (i.quantity || 1)) * ((Number(i.gst_rate) || 18) / 100)), 0);
              const platformFee = cart.reduce((maxFee, i) => Math.max(maxFee, Number(i.platform_fee) || 29), 0);
              const grandTotal = itemTotal + totalGst + platformFee;
              return (
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Item Total</span>
                    <span className="text-slate-800 font-bold">₹{itemTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Taxes & GST (18%)</span>
                    <span className="text-indigo-600 font-bold">+₹{totalGst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-semibold">
                    <span>Platform Fee</span>
                    <span className="text-emerald-600 font-bold">+₹{platformFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-2 border-t border-slate-100">
                    <span>Total Amount</span>
                    <span className="text-emerald-700">₹{grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })() : (
              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1">
                  <span>Total Amount</span>
                  <span>₹0</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                disabled={cart.length === 0}
                onClick={onCheckout}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-white/60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-center text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer border-none"
              >
                Proceed to Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      <AppBannerAndFooter />

      {/* Details View Modal */}
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

            {/* Header image */}
            <div className="h-36 border-b border-slate-100 shrink-0">
              <img
                src={selectedServiceDetails.image}
                alt={selectedServiceDetails.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">{selectedServiceDetails.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
                  <Star className="text-yellow-500 fill-yellow-500" size={12} />
                  <span className="text-slate-800">{selectedServiceDetails.rating}</span>
                  <span className="text-slate-400 font-normal underline">({selectedServiceDetails.reviews})</span>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Starts at ₹{selectedServiceDetails.price} • {selectedServiceDetails.duration}</p>
              </div>



              {/* Requirements / Sizes list */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                if (!details.rates) return null;
                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Select Options</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.rates.map((rate, idx) => {
                        const isChosen = selectedRateIdx === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedRateIdx(idx)}
                            className={`px-3 py-2 text-xs font-bold border rounded-xl transition-all cursor-pointer border-solid ${
                              isChosen
                                ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                : "border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div>{rate.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">₹{rate.price}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Please Note Block */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                if (!details.note) return null;
                return (
                  <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h5 className="text-xs font-black text-amber-900 uppercase tracking-wide mb-1">Please note</h5>
                      <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                        {details.note}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const dbMatch = dbPackages.find(p => p.slug === id || p.id === id);
                const details = SERVICE_DETAILS_CONTENT[id] || {};
                const hasSavedTools = dbMatch && Array.isArray(dbMatch.tools) && dbMatch.tools.length > 0;
                const toolsList = hasSavedTools 
                  ? dbMatch.tools.filter(t => typeof t === "string" ? true : (t.checked !== false && t.enabled !== false)).map(t => typeof t === "string" ? t : (t.text || "")) 
                  : (details.tools || []);
                
                if (toolsList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Products We Use</h4>
                    <div className="space-y-2">
                      {toolsList.map((item, i) => (
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
                const id = selectedServiceDetails.id;
                const dbMatch = dbPackages.find(p => p.slug === id || p.id === id);
                const details = SERVICE_DETAILS_CONTENT[id] || {};
                const hasSavedReady = dbMatch && Array.isArray(dbMatch.ready) && dbMatch.ready.length > 0;
                const readyList = hasSavedReady 
                  ? dbMatch.ready.filter(r => typeof r === "string" ? true : (r.checked !== false && r.enabled !== false)).map(r => typeof r === "string" ? r : (r.text || "")) 
                  : (details.includes || []);

                if (readyList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {readyList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-slate-400 font-bold shrink-0 mt-0.5">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Customer Reviews Section */}
              {(() => {
                const id = selectedServiceDetails.id;
                const dbMatch = dbPackages.find(p => p.slug === id || p.id === id);
                const details = SERVICE_DETAILS_CONTENT[id] || {};
                const hasSavedReviews = dbMatch && Array.isArray(dbMatch.reviews) && dbMatch.reviews.length > 0;
                const reviewsList = hasSavedReviews 
                  ? dbMatch.reviews.filter(rev => rev.checked !== false && rev.enabled !== false) 
                  : (details.reviews_list || []);

                if (reviewsList.length === 0) return null;
                return (
                  <div className="space-y-4 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Customer Reviews</h4>
                    <div className="space-y-3">
                      {reviewsList.map((rev, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 mb-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800">{rev.author || rev.name}</span>
                            <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#7C3AED]">
                              <Star className="fill-[#7C3AED] text-[#7C3AED]" size={12} />
                              <span>{parseFloat(rev.rating).toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{rev.comment || rev.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* FAQs Section */}
              {(() => {
                const id = selectedServiceDetails.id;
                const dbMatch = dbPackages.find(p => p.slug === id || p.id === id);
                const details = SERVICE_DETAILS_CONTENT[id] || {};
                const hasSavedFaqs = dbMatch && Array.isArray(dbMatch.faqs) && dbMatch.faqs.length > 0;
                const faqsList = hasSavedFaqs 
                  ? dbMatch.faqs.filter(faq => faq.checked !== false && faq.enabled !== false) 
                  : (details.faqs || []);

                if (faqsList.length === 0) return null;
                return (
                  <div className="space-y-3 border-t border-slate-100 pt-5 text-left pb-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                    <div className="space-y-2">
                      {faqsList.map((faq, idx) => {
                        const isFaqOpen = activeFaq === idx;
                        return (
                          <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setActiveFaq(isFaqOpen ? null : idx)}
                              className="w-full p-3.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer border-none outline-none"
                            >
                              <span className={`text-[11px] font-black tracking-tight ${isFaqOpen ? "text-emerald-700" : "text-slate-700"}`}>{faq.q}</span>
                              {isFaqOpen ? <ChevronUp size={14} className="text-emerald-700" /> : <ChevronDown size={14} className="text-slate-500" />}
                            </button>
                            {isFaqOpen && (
                              <div className="p-3.5 bg-white border-t border-slate-50 text-[11px] text-slate-500 leading-relaxed font-medium">
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

            {/* Sticky Footer with live breakdown */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                {(() => {
                  const baseFare = getModalPrice();
                  const gstPct = selectedServiceDetails.gst_rate !== undefined ? Number(selectedServiceDetails.gst_rate) : 18;
                  const gstAmt = Math.round(baseFare * (gstPct / 100));
                  const platFee = selectedServiceDetails.platform_fee !== undefined ? Number(selectedServiceDetails.platform_fee) : 29;
                  const total = baseFare + gstAmt + platFee;
                  return (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold flex-wrap">
                        <span>Fare: ₹{baseFare}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-bold">GST ({gstPct}%): ₹{gstAmt}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">Fee: ₹{platFee}</span>
                      </div>
                      <div className="text-base font-black text-slate-900 mt-0.5">Total Amount: ₹{total}</div>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={handleProceedFromModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md transition-all uppercase tracking-wider cursor-pointer border-none active:scale-95"
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
