import React, { useState } from "react";
import { ChevronLeft, Search, ShoppingCart, Star, Check } from "lucide-react";

const BOOKING_CURRENCY_SYMBOL = "₹";

const BATHROOM_SUB_TABS = [
  { id: "weekly", name: "Weekly Plans", image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=150&q=80&fit=crop" },
  { id: "deals", name: "Bundle Deals", image: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=150&q=80&fit=crop" },
  { id: "onetime", name: "One Time Service", image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=150&q=80&fit=crop" },
  { id: "addons", name: "Add-on Services", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&q=80&fit=crop" }
];

const BATHROOM_SERVICES = {
  weekly: [
    {
      id: "bath-weekly-sub",
      name: "Weekly Bathroom Refresh Subscription",
      description: "Best for regular upkeep between deep cleans",
      rating: "4.75",
      reviews: "797K reviews",
      price: 215,
      options: "Starts at",
      duration: "30 mins",
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
      includes: [
        "Perfect for routine maintenance",
        "Dedicated professional cleans the same bathroom every time"
      ]
    }
  ],
  deals: [
    {
      id: "bath-intense-2",
      name: "Deep Scrub Cleaning (Twin Bathrooms)",
      description: "Heavy duty cleaning for 2 bathrooms",
      rating: "4.80",
      reviews: "6.5M reviews",
      price: 918,
      duration: "2 hrs",
      tag: "₹459 per bathroom",
      image: "/mockups/bath_2.png",
      includes: [
        "Floor & tile descaling with motorized scrubber"
      ]
    },
    {
      id: "bath-intense-3",
      name: "Deep Scrub Cleaning (Triple Bathrooms)",
      description: "Heavy duty cleaning for 3 bathrooms",
      rating: "4.80",
      reviews: "6.5M reviews",
      price: 1347,
      duration: "3 hrs",
      tag: "₹449 per bathroom",
      image: "/mockups/bath_3.png",
      includes: [
        "Floor & tile descaling with motorized scrubber"
      ]
    },
    {
      id: "bath-intense-fans",
      name: "Twin Bathroom & Fan Deep Clean",
      description: "Pack of 2 bathrooms and 2 fans",
      rating: "4.80",
      reviews: "6.6M reviews",
      price: 1116,
      duration: "2 hrs 20 mins",
      image: "/mockups/bath_fan.png",
      includes: [
        "Complete deep cleaning for 2 bathrooms and 2 ceiling exhaust fans"
      ]
    }
  ],
  onetime: [
    {
      id: "bath-standard",
      name: "Standard Bathroom Deep Clean",
      description: "Recommended for deep-cleaning and tough stains",
      rating: "4.80",
      reviews: "6.9M reviews",
      price: 499,
      options: "Starts at",
      duration: "60 mins",
      image: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=300&q=80&fit=crop",
      includes: [
        "Comprehensive floor and wall tile machine scrubbing",
        "Ideal for removing hard water stains and deep grime"
      ]
    }
  ],
  addons: [
    {
      id: "bath-exhaust",
      name: "Exhaust Fan Refresh",
      rating: "4.79",
      reviews: "112K reviews",
      price: 89,
      duration: "15 mins",
      image: "/mockups/exhaust_fan.png",
      includes: ["Extra fan cleaning (one already included in standard service)"]
    },
    {
      id: "bath-washbasin",
      name: "Washbasin Polishing",
      rating: "4.83",
      reviews: "328K reviews",
      price: 89,
      duration: "10 mins",
      image: "/mockups/washbasin.png",
      includes: ["Standalone basin cleaning (included in full service)"]
    },
    {
      id: "bath-ceiling-fan",
      name: "Ceiling Fan Dusting",
      rating: "4.83",
      reviews: "615K reviews",
      price: 99,
      duration: "10 mins",
      image: "/mockups/ceiling_fan.png",
      includes: ["Not covered in standard bathroom clean"]
    },
    {
      id: "bath-door",
      name: "Bathroom Door Wash",
      rating: "4.78",
      reviews: "40K reviews",
      price: 89,
      duration: "10 mins",
      image: "/mockups/bath_door.png",
      includes: ["Extra door (one included per standard clean)"]
    },
    {
      id: "bath-mirror",
      name: "Mirror Stain Removal",
      rating: "4.83",
      reviews: "47K reviews",
      price: 59,
      duration: "10 mins",
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=300&q=80&fit=crop",
      includes: ["Extra mirror (one included per standard clean)"]
    },
    {
      id: "bath-drain",
      name: "Drain cleaning",
      rating: "5.00",
      reviews: "12 reviews",
      price: 59,
      options: "Starts at",
      duration: "10 mins",
      image: "/mockups/drain_clean.png",
      includes: [
        "Unclogs floor drains to eliminate standing water and odors",
        "Available as a separate add-on"
      ]
    }
  ]
};

export function BathroomCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("weekly");
  const [searchQuery, setSearchQuery] = useState("");

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

  const getActiveServices = () => {
    const list = BATHROOM_SERVICES[activeTab] || [];
    if (!searchQuery) return list;
    return list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase())));
  };

  const activeServices = getActiveServices();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getSectionTitle = () => {
    if (activeTab === "weekly") return "WEEKLY PACKAGES";
    if (activeTab === "deals") return "VALUE DEALS";
    if (activeTab === "onetime") return "ONE TIME SERVICE";
    return "MINI SERVICES";
  };

  return (
    <div className="w-full text-slate-700 bg-white min-h-screen">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white shadow-sm border-b border-slate-100">
        <div className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4 px-6">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold mb-2 text-xs transition-colors"
            >
              <ChevronLeft size={16} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Bathroom Cleaning</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search packages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all bg-slate-50/50"
            />
          </div>
        </div>

        {/* Sub-tabs exactly styled like Sofa Cleaning */}
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
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${
                    isSelected ? "scale-[1.05] shadow-md border-2 border-white" : "opacity-80 hover:opacity-100"
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

          <div className="space-y-4">
            {activeServices.map((service) => {
              const count = getCount(service.id);
              return (
                <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative transition-all hover:shadow-md">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="flex-1 order-2 sm:order-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Star className="text-yellow-500 fill-yellow-500" size={16} />
                        <h4 className="text-base font-black text-slate-900">{service.name}</h4>
                      </div>
                      
                      {service.description && (
                         <p className="text-xs text-slate-500 mb-3">{service.description}</p>
                      )}

                      <div className="flex items-center gap-2 mb-4">
                         <div className="text-sm font-extrabold text-slate-900">
                           {service.options && <span className="text-slate-500 font-medium text-xs mr-1">{service.options}</span>}
                           ₹{service.price}
                         </div>
                         <span className="text-slate-300">•</span>
                         <span className="text-xs font-semibold text-slate-600">{service.duration}</span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {service.includes.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <Check className="text-emerald-500 mt-0.5 shrink-0" size={14} />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      {service.tag && (
                         <div className="mt-2 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                            {service.tag}
                         </div>
                      )}
                    </div>

                    <div className="relative shrink-0 w-full sm:w-[140px] order-1 sm:order-2 flex flex-col items-center">
                      <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 shadow-sm border border-slate-100 mb-[-15px] z-0">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="w-24 z-10">
                        {count > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1.5 text-sm font-bold text-emerald-700 shadow-md">
                            <button onClick={() => removeItemFromCart(service.id)} className="hover:text-emerald-900">-</button>
                            <span>{count}</span>
                            <button onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)} className="hover:text-emerald-900">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)}
                            className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-xs py-2 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase"
                          >
                            <ShoppingCart size={14} /> Add
                          </button>
                        )}
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
              <span className="text-[10px] font-bold text-slate-400">{cart.reduce((a,b)=>a+b.quantity,0)} items</span>
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
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-white/60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-center text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Proceed to Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
