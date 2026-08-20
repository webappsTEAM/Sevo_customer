import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, X, Star } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx";
import { SOFA_DETAIL_DATA } from "./catalog/sofaDetailData.js";

const BOOKING_CURRENCY_SYMBOL = "₹";

const SOFA_SUB_TABS = [
  {
    id: "sofa",
    name: "Sofa Cleaning",
    image: "/mockups/sofa_header_new.png",
  },
  {
    id: "mattress",
    name: "Mattress Cleaning",
    image: "/mockups/mattress_header_new.png",
  },
  {
    id: "carpet",
    name: "Carpet Cleaning",
    image: "/mockups/carpet_header_new.png",
  },
  {
    id: "addons",
    name: "Quick Extra Services",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=150&q=80&fit=crop",
  }
];

const SOFA_CLEANING_SERVICES = [
  {
    id: "fabric-sofa-clean",
    name: "Fabric Sofa Cleaning",
    price: 329,
    duration: "1 hr",
    description: "Deep foam cleaning and vacuuming to revitalize fabric sofas.",
    image: "/mockups/sofa_cleaning.png",
    includes: [
      "Foam cleaning of sofa seats and backrests",
      "Deep vacuuming to remove dust and dirt",
      "Cleaning of light stains and marks",
      "Loose/removable cushions not included"
    ]
  },
  {
    id: "fabric-sofa-cushion-clean",
    name: "Fabric Sofa & Cushion Cleaning",
    price: 599,
    duration: "1.5 hrs",
    description: "Complete foam cleaning of fabric sofas including all loose cushions.",
    image: "/mockups/sofa_cleaning.png",
    includes: [
      "Foam cleaning of sofa seats and backrests",
      "Deep wet & dry vacuuming",
      "Cleaning of light stains and marks",
      "Loose/removable sofa cushions included"
    ]
  },
  {
    id: "leather-sofa-clean",
    name: "Leather Sofa Cleaning",
    price: 349,
    duration: "1 hr",
    description: "Gentle cleaning and conditioning to restore leather shine.",
    image: "/mockups/leather_sofa_cleaning.png",
    includes: [
      "Gentle cleaning of leather sofa surfaces",
      "Removal of dust and everyday dirt",
      "Cleaning of seats and backrests",
      "Leather-safe conditioning"
    ]
  },
  {
    id: "leather-sofa-cushion-clean",
    name: "Leather Sofa & Cushion Cleaning",
    price: 619,
    duration: "1.5 hrs",
    description: "Comprehensive leather cleaning and conditioning including cushions.",
    image: "/mockups/leather_sofa_cleaning.png",
    includes: [
      "Gentle cleaning of leather sofa seats and backrests",
      "Cleaning of loose/removable leather cushions",
      "Leather-safe conditioning",
      "Soft finishing for a clean appearance"
    ]
  }
];

const MATTRESS_SERVICES = [
  {
    id: "mattress-deep",
    name: "Mattress Deep Cleaning",
    price: 389,
    duration: "1 hr",
    description: "Deep vacuuming and shampoo wash to remove dust mites and stains.",
    image: "/mockups/mattress_deep_cleaning.png",
    includes: [
      "Deep vacuuming to remove dust and dirt",
      "Shampoo cleaning of the mattress surface",
      "Treatment for common stains and marks",
      "Wet vacuuming to remove dirt and moisture"
    ]
  },
  {
    id: "mattress-pillow-refresh",
    name: "Mattress & Pillow Refresh",
    price: 499,
    duration: "1.5 hrs",
    description: "Complete mattress shampooing and pillow deep cleaning.",
    image: "/mockups/mattress_pillow_refresh.png",
    includes: [
      "Deep vacuuming of mattress and pillows",
      "Shampoo cleaning for visible stains",
      "Odour and dirt removal",
      "Wet vacuuming for a fresher finish"
    ]
  }
];

const CARPET_SERVICES = [
  {
    id: "carpet-deep",
    name: "Carpet Cleaning",
    price: 369,
    duration: "1 hr",
    description: "Deep foam shampoo wash to extract deep-seated dirt from carpets.",
    image: "/mockups/carpet_cleaning.png",
    includes: [
      "Removal of accumulated dust particles, dirt",
      "Foam based shampooing on the carpet using a sponge",
      "Vacuuming & wiping shampoo"
    ]
  }
];

const SOFA_ADDONS_SERVICES = [
  {
    id: "quick-dining-table",
    name: "Dining Table & Chairs Cleaning",
    price: 449,
    duration: "30 mins",
    description: "Detailed dining table and chairs surface cleaning and grease removal.",
    image: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&q=80&fit=crop",
    includes: [
      "Surface cleaning, sanitation, and wood/glass polishing"
    ]
  },
  {
    id: "quick-fan-clean",
    name: "Ceiling Fan Cleaning",
    price: 89,
    duration: "15 mins",
    description: "Detailed ceiling fan dusting and blade wipe down.",
    image: "/mockups/ceiling_fan.png",
    includes: [
      "Fan blades, motor housing, and cover deep dusting"
    ]
  },
  {
    id: "quick-door-clean",
    name: "Door Cleaning",
    price: 89,
    duration: "10 mins",
    description: "Thorough wiping and dusting of doors to remove fingerprints and dirt.",
    image: "/mockups/door_cleaning.png",
    includes: [
      "Door frames, panels, hinges dusting, and handle polishing"
    ]
  },
  {
    id: "fridge-clean",
    name: "Fridge cleaning",
    rating: "4.83",
    reviews: "167K reviews",
    price: 399,
    options: "3 options",
    duration: "1.5 hrs",
    description: "Thorough interior defrosting and rack-by-rack deep cleaning.",
    image: "/mockups/appliance_cleaning_thumb.png",
    includes: [
      "Interior & exterior cleaning",
      "Shelves, trays & compartments cleaning",
      "Door seal & stain cleaning"
    ],
    subOptions: [
      {
        id: "fridge-single",
        name: "Single door",
        price: 399,
        rating: "4.85",
        reviews: "65K reviews",
        image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=200&q=80&fit=crop",
        duration: "1 hr"
      },
      {
        id: "fridge-double",
        name: "Double door",
        price: 549,
        rating: "4.83",
        reviews: "93K reviews",
        image: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=200&q=80&fit=crop",
        duration: "1.5 hrs"
      },
      {
        id: "fridge-triple",
        name: "Side by side/ Triple door",
        price: 799,
        rating: "4.80",
        reviews: "9K reviews",
        image: "/mockups/appliance_cleaning_thumb.png",
        duration: "2 hrs"
      }
    ]
  },
  {
    id: "quick-balcony-upto-4ft",
    name: "Balcony Cleaning: Upto 4 ft Width",
    price: 399,
    duration: "30 mins",
    description: "Washing and scrubbing of balcony floor and railings.",
    image: "/mockups/balcony_cleaning.png",
    includes: [
      "Balcony floor washing, scrubbing, and railing dusting"
    ]
  },
  {
    id: "quick-balcony-above-4ft",
    name: "Balcony Cleaning: Above 4 ft Width",
    price: 549,
    duration: "50 mins",
    description: "Deep floor scrubbing and mesh cleaning for large balconies.",
    image: "/mockups/balcony_cleaning.png",
    includes: [
      "Balcony floor washing, scrubbing, and railing dusting"
    ]
  }
];


export function SofaCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("sofa");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);
  const [dbPackages, setDbPackages] = useState([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await apiRequest("/settings/catalog/public/packages/");
        if (res.success && Array.isArray(res.data)) {
          setDbPackages(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch packages:", err);
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

  const removeItemFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getCount = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const getDynamicServices = () => {
    let list = activeTab === "sofa" ? SOFA_CLEANING_SERVICES : activeTab === "mattress" ? MATTRESS_SERVICES : activeTab === "carpet" ? CARPET_SERVICES : SOFA_ADDONS_SERVICES;
    list = JSON.parse(JSON.stringify(list));

    if (dbPackages.length > 0) {
      list = list.map(item => {
        if (Array.isArray(item.subOptions)) {
          const parentDbMatch = dbPackages.find(p => p.slug === (item.id === "fridge-clean" ? "fridge-parent" : item.id === "stove-clean" ? "stove-parent" : item.id));
          if (parentDbMatch) {
            item.name = parentDbMatch.name;
            item.price = Math.round(Number(parentDbMatch.base_price) || item.price);
            item.duration = parentDbMatch.duration || item.duration;
            item.description = parentDbMatch.description || item.description;
            item.includes = Array.isArray(parentDbMatch.includes) ? parentDbMatch.includes : item.includes;
            if (Array.isArray(parentDbMatch.tools) && parentDbMatch.tools.length > 0) item.tools = parentDbMatch.tools;
            if (Array.isArray(parentDbMatch.ready) && parentDbMatch.ready.length > 0) item.ready = parentDbMatch.ready;
            if (Array.isArray(parentDbMatch.reviews) && parentDbMatch.reviews.length > 0) item.reviews_list = parentDbMatch.reviews;
            if (Array.isArray(parentDbMatch.faqs) && parentDbMatch.faqs.length > 0) item.faqs = parentDbMatch.faqs;
          }

          item.subOptions = item.subOptions.map(subOpt => {
            const dbMatch = dbPackages.find(p => p.slug === subOpt.id);
            if (dbMatch) {
              const updatedSub = {
                ...subOpt,
                name: dbMatch.name,
                price: Math.round(Number(dbMatch.base_price) || subOpt.price),
                duration: dbMatch.duration || subOpt.duration,
                includes: Array.isArray(dbMatch.includes) ? dbMatch.includes : subOpt.includes,
              };
              if (Array.isArray(dbMatch.tools) && dbMatch.tools.length > 0) updatedSub.tools = dbMatch.tools;
              if (Array.isArray(dbMatch.ready) && dbMatch.ready.length > 0) updatedSub.ready = dbMatch.ready;
              if (Array.isArray(dbMatch.reviews) && dbMatch.reviews.length > 0) updatedSub.reviews_list = dbMatch.reviews;
              if (Array.isArray(dbMatch.faqs) && dbMatch.faqs.length > 0) updatedSub.faqs = dbMatch.faqs;
              return updatedSub;
            }
            return subOpt;
          });
          if (item.subOptions.length > 0) {
            item.price = item.subOptions[0].price;
          }
        } else {
          const dbMatch = dbPackages.find(p => p.slug === item.id);
          if (dbMatch) {
            item.name = dbMatch.name;
            item.price = Math.round(Number(dbMatch.base_price) || item.price);
            item.duration = dbMatch.duration || item.duration;
            item.description = dbMatch.description || item.description;
            item.includes = Array.isArray(dbMatch.includes) ? dbMatch.includes : item.includes;
            if (Array.isArray(dbMatch.tools) && dbMatch.tools.length > 0) item.tools = dbMatch.tools;
            if (Array.isArray(dbMatch.ready) && dbMatch.ready.length > 0) item.ready = dbMatch.ready;
            if (Array.isArray(dbMatch.reviews) && dbMatch.reviews.length > 0) item.reviews_list = dbMatch.reviews;
            if (Array.isArray(dbMatch.faqs) && dbMatch.faqs.length > 0) item.faqs = dbMatch.faqs;
          }
        }
        return item;
      });
    }
    return list;
  };

  const currentServicesList = getDynamicServices();

  const activeServices = currentServicesList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (Array.isArray(s.includes) && s.includes.some(inc => {
      const text = typeof inc === "string" ? inc : (inc?.text || "");
      return text.toLowerCase().includes(searchQuery.toLowerCase());
    }))
  );

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="w-full text-slate-700 bg-white">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white pb-2 shadow-sm">
        <div className="p-0 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft size={14} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Sofa Cleaning</h2>
          </div>
        </div>
        <div className="flex gap-5 pb-3 pt-2 border-b border-slate-100 justify-start">
          {SOFA_SUB_TABS.map(tab => {
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
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${isSelected ? "scale-[1.05] shadow-md" : "opacity-80 hover:opacity-100"
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
      <div className="flex flex-col lg:flex-row flex-1 pt-4">

        {/* Left Column */}
        <div className="flex-1 space-y-5 lg:pr-6">

          {/* Section title */}
          <div className="pt-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <div className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
              {activeTab === "sofa" ? "Sofa Cleaning" : activeTab === "mattress" ? "Mattress Cleaning" : "Carpet Cleaning"}
            </h3>
          </div>

          <div className="space-y-4">
            {activeServices.map((service, idx) => {
              const count = getCount(service.id);
              const isFirst = idx === 0 && !searchQuery;
              return (
                <div key={service.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
                  {/* First item image hero */}
                  {isFirst && (
                    <div className="w-full h-56 sm:h-60 bg-slate-100 rounded-2xl overflow-hidden mb-4">
                      <img
                        src={(() => {
                          const customB = dbPackages[0]?.service_customization?.subtab_banners || {};
                          if (activeTab === "sofa") return customB.sofa || "/mockups/sofa_top_new.png";
                          if (activeTab === "mattress") return customB.mattress || "/mockups/mattress_header_new.png";
                          return customB.carpet || "/mockups/carpet_top_new.png";
                        })()}
                        alt={service.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-extrabold text-slate-900 text-sm md:text-base mb-1.5">{service.name}</h4>

                      {service.description && (
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl mb-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs pt-1 mb-3">
                        <span className="text-base font-black text-slate-900">
                          {service.options ? `Starts at ₹${service.price}` : `₹${service.price}`}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-semibold">{service.duration}</span>
                      </div>

                      {service.includes && service.includes.length > 0 && (
                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 mb-4">
                          {service.includes
                            .filter(inc => typeof inc === "string" ? true : (inc?.checked !== false))
                            .map(inc => typeof inc === "string" ? inc : inc.text)
                            .map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                <span>{item}</span>
                              </li>
                            ))}
                        </ul>
                      )}
                      <button 
                        onClick={() => setSelectedServiceDetails(service)}
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        View details
                      </button>
                    </div>

                    {/* Image + add button */}
                    <div className="relative shrink-0 w-28 pb-9 flex flex-col items-center">
                      <div className="w-28 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-20 z-10">
                        {count > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 shadow-md">
                            <button onClick={() => removeItemFromCart(service.id)} className="hover:text-emerald-900">-</button>
                            <span>{count}</span>
                            <button onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)} className="hover:text-emerald-900">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (service.subOptions) {
                                setSelectedServiceDetails(service);
                              } else {
                                addItemToCart(service.id, service.name, service.price, service.duration);
                              }
                            }}
                            className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[11px] py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase cursor-pointer"
                          >
                            <ShoppingCart size={12} /> Add
                          </button>
                        )}
                      </div>
                      {service.options && (
                        <p className="absolute bottom-0 text-[10px] text-slate-400 text-center font-bold tracking-tight w-full">{service.options}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[350px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-5 flex flex-col justify-between lg:sticky lg:top-32 h-fit space-y-4 mt-6 lg:mt-0 rounded-2xl">
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
                <span className="text-[10px] font-bold text-slate-400">{cart.length} items</span>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-xs gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.duration}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          <button onClick={() => removeItemFromCart(item.id)} className="hover:text-emerald-600">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => addItemToCart(item.id, item.name, item.price, item.duration)} className="hover:text-emerald-600">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No services added. Select from the left.
                </div>
              )}

              <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs">
                {cart.length > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-slate-900 text-sm border-t border-dashed border-slate-200 pt-2">
                  <span>Total Amount</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60">
            <button
              disabled={cart.length === 0}
              onClick={onCheckout}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-center text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              Proceed to Schedule
            </button>
          </div>
        </div>
      </div>

      <AppBannerAndFooter />

      {/* Details modal overlay */}
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
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white p-1.5 rounded-full z-30 shadow-md transition-colors border-none"
            >
              <X size={16} />
            </button>

            {/* Header: full width hero image */}
            <div className="w-full h-36 border-b border-slate-100 shrink-0 bg-slate-100">
              <img 
                src={selectedServiceDetails.image} 
                alt={selectedServiceDetails.name} 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Title, rating and add wrap */}
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">{selectedServiceDetails.name}</h3>
                
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-4">
                  <Star className="text-[#7C3AED] fill-[#7C3AED]" size={12} />
                  <span className="text-slate-800">4.82</span>
                  <span className="text-slate-400 font-normal underline">(4.5M reviews)</span>
                </div>

                {!selectedServiceDetails.subOptions ? (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-100/80 rounded-2xl p-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</div>
                      <div className="text-base font-black text-slate-900 mt-0.5">
                        ₹{selectedServiceDetails.price}
                        <span className="text-slate-400 text-xs font-normal ml-2">• {selectedServiceDetails.duration}</span>
                      </div>
                    </div>

                    <div className="w-24">
                      {getCount(selectedServiceDetails.id) > 0 ? (
                        <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-700 shadow-md">
                          <button onClick={() => removeItemFromCart(selectedServiceDetails.id)} className="hover:text-emerald-900">-</button>
                          <span>{getCount(selectedServiceDetails.id)}</span>
                          <button onClick={() => addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration)} className="hover:text-emerald-900">+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration)}
                          className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-xs py-2 rounded-lg hover:bg-slate-50 transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer border-none"
                        >
                          <ShoppingCart size={13} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-4 text-center">
                    <span className="text-xs font-bold text-slate-500">Please select an option below</span>
                  </div>
                )}
              </div>


                            {/* Sub-options selector */}
              {selectedServiceDetails.subOptions && (
                <div className="space-y-4 border-t border-slate-100 pt-5 text-left">
                  <h4 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-3">Choose Variant</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedServiceDetails.subOptions.map(sub => {
                      const subCount = getCount(sub.id);
                      return (
                        <div key={sub.id} className="border border-slate-200/80 rounded-2xl p-2.5 flex flex-col justify-between items-center text-center bg-slate-50/20 hover:border-slate-300 transition-all">
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-2 flex items-center justify-center">
                            <img src={sub.image} alt={sub.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 flex flex-col justify-between w-full">
                            <div>
                              <h5 className="text-[11px] font-extrabold text-slate-900 leading-tight mb-1.5">{sub.name}</h5>
                            </div>
                            <div className="w-full mt-auto">
                              <div className="text-xs font-black text-slate-900 mb-2">₹{sub.price}</div>
                              {subCount > 0 ? (
                                <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm w-full">
                                  <button onClick={() => removeItemFromCart(sub.id)} className="hover:text-emerald-900">-</button>
                                  <span>{subCount}</span>
                                  <button onClick={() => addItemToCart(sub.id, sub.name, sub.price, sub.duration)} className="hover:text-emerald-900">+</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addItemToCart(sub.id, sub.name, sub.price, sub.duration)}
                                  className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[10px] py-1 rounded-lg hover:bg-slate-50 transition-all shadow-sm uppercase flex items-center justify-center gap-0.5"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const rawTools = Array.isArray(selectedServiceDetails.tools)
                  ? selectedServiceDetails.tools
                  : (SOFA_DETAIL_DATA[id]?.tools || []);
                const tools = rawTools
                  .filter(t => typeof t === 'string' ? true : t.enabled !== false)
                  .map(t => typeof t === 'string' ? t : t.text);
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
                const id = selectedServiceDetails.id;
                const rawReady = Array.isArray(selectedServiceDetails.ready)
                  ? selectedServiceDetails.ready
                  : (SOFA_DETAIL_DATA[id]?.ready || []);
                const readyList = rawReady
                  .filter(r => typeof r === 'string' ? true : r.enabled !== false)
                  .map(r => typeof r === 'string' ? r : r.text);
                if (readyList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {readyList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Customer Reviews */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Customer Reviews</h4>
                {(() => {
                  const id = selectedServiceDetails.id;
                  const rawReviews = (Array.isArray(selectedServiceDetails.reviews_list) && selectedServiceDetails.reviews_list.length > 0)
                    ? selectedServiceDetails.reviews_list
                    : (Array.isArray(selectedServiceDetails.reviews) && selectedServiceDetails.reviews.length > 0 && (!SOFA_DETAIL_DATA[id]?.reviews || selectedServiceDetails.reviews.length >= SOFA_DETAIL_DATA[id].reviews.length))
                      ? selectedServiceDetails.reviews
                      : (SOFA_DETAIL_DATA[id]?.reviews || []);
                  const reviews = rawReviews.filter(r => r.enabled !== false);
                  return reviews.map((rev, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{rev.name}</span>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#7C3AED]">
                          <Star className="fill-[#7C3AED] text-[#7C3AED]" size={12} />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        {rev.text}
                      </p>
                    </div>
                  ));
                })()}
              </div>

              {/* Frequently Asked Questions */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                <div className="space-y-2">
                  {(() => {
                    const id = selectedServiceDetails.id;
                    const rawFaqs = (Array.isArray(selectedServiceDetails.faqs) && selectedServiceDetails.faqs.length > 0 && (!SOFA_DETAIL_DATA[id]?.faqs || selectedServiceDetails.faqs.length >= SOFA_DETAIL_DATA[id].faqs.length))
                      ? selectedServiceDetails.faqs
                      : (SOFA_DETAIL_DATA[id]?.faqs || []);
                    const faqs = rawFaqs.filter(f => f.enabled !== false);
                    return faqs.map((faq, idx) => {
                      const isFaqOpen = activeFaq === idx;
                      return (
                        <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
                          <button
                            onClick={() => setActiveFaq(isFaqOpen ? null : idx)}
                            className="w-full p-3 flex justify-between items-center text-xs bg-white font-semibold text-left cursor-pointer hover:bg-slate-50/50 border-none"
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
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Sticky Footer with teal proceed button */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              {(() => {
                if (selectedServiceDetails.subOptions) {
                  const subTotalVal = selectedServiceDetails.subOptions.reduce((acc, sub) => {
                    return acc + (sub.price * getCount(sub.id));
                  }, 0);
                  return subTotalVal > 0 ? (
                    <div className="text-sm font-extrabold text-slate-900">₹{subTotalVal}</div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedServiceDetails.name}</div>
                  );
                }
                return (
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedServiceDetails.name}</div>
                );
              })()}
              <button
                onClick={() => {
                  if (!selectedServiceDetails.subOptions) {
                    if (getCount(selectedServiceDetails.id) === 0) {
                      addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration);
                    }
                  }
                  setSelectedServiceDetails(null);
                }}
                className="bg-[#54B6A6] hover:bg-[#43a192] text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer border-none"
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
