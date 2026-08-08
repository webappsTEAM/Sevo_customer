import React, { useState } from "react";
import { ChevronLeft, Search, ShoppingCart } from "lucide-react";

const BOOKING_CURRENCY_SYMBOL = "₹";

const SOFA_SUB_TABS = [
  {
    id: "sofa",
    name: "Sofa Cleaning",
    image: "/mockups/sofa_header_new.png",
  },
  {
    id: "mattress",
    name: "Mattress & Cushion Care",
    image: "/mockups/mattress_header_new.png",
  },
  {
    id: "carpet",
    name: "Carpet Cleaning",
    image: "/mockups/carpet_header_new.png",
  }
];

const SOFA_CLEANING_SERVICES = [
  {
    id: "sofa-fabric",
    name: "Fabric Sofa Care",
    price: 329,
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
    includes: [
      "Gentle foam washing to brighten seat fabric.",
      "Deep dry and wet vacuuming to pull out dust, dirt, and stains.",
      "Does not include sofa cushions."
    ]
  },
  {
    id: "sofa-fabric-combo",
    name: "Fabric Sofa & Cushion Combo",
    price: 599,
    duration: "1.5 hrs",
    image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop",
    includes: [
      "Gentle foam washing for sofa seats and backrests.",
      "Deep dry and wet vacuum extraction for deep dirt and spills.",
      "Includes full cleaning for all matching sofa cushions."
    ]
  },
  {
    id: "sofa-leather",
    name: "Leather Sofa Polish & Shine",
    price: 349,
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&q=80&fit=crop",
    includes: [
      "Surface wiping to clear away dust and grime.",
      "Application of leather-safe conditioner to protect against cracks.",
      "Soft buffing for a rich, shiny finish."
    ]
  }
];

const MATTRESS_SERVICES = [
  {
    id: "mattress-deep",
    name: "Mattress Deep Clean",
    price: 389,
    options: "Starts at",
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&q=80&fit=crop",
    includes: [
      "Power dry and wet vacuuming to extract hidden dust and allergens.",
      "Targeted shampooing to remove tough stains, marks, and odors."
    ]
  },
  {
    id: "cushion-refresh",
    name: "Fluffy Cushion Refresh",
    price: 169,
    duration: "30 mins",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop",
    includes: [
      "Deep wet and dry vacuuming using fabric shampoo.",
      "Cleans up to 5 cushions per booking.",
      "Removes trapped dust, spots, and smells."
    ]
  }
];

const CARPET_SERVICES = [
  {
    id: "carpet-deep",
    name: "Carpet & Rug Deep Clean",
    price: 369,
    options: "Starts at",
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "High-suction vacuuming to lift trapped dust, dirt, and debris.",
      "Foam-based shampoo treatment applied evenly across the carpet.",
      "Moisture extraction and microfiber wipe-down for quick drying."
    ]
  }
];

export function SofaCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("sofa");
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

  const currentServicesList = activeTab === "sofa" ? SOFA_CLEANING_SERVICES : activeTab === "mattress" ? MATTRESS_SERVICES : CARPET_SERVICES;

  const activeServices = currentServicesList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="w-full text-slate-700 bg-white">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white pb-2 shadow-sm">
        <div className="p-0 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold mb-2 text-xs transition-colors"
            >
              <ChevronLeft size={16} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Sofa Cleaning</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all bg-slate-50/50"
            />
          </div>
        </div>

        {/* Sub-tabs */}
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
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${
                    isSelected ? "scale-[1.05] shadow-md" : "opacity-80 hover:opacity-100"
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
      <div className="flex flex-col lg:flex-row flex-1 pt-4">

        {/* Left Column */}
        <div className="flex-1 space-y-5 lg:pr-6">

          {/* Section title */}
          <div className="pt-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <div className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
              {activeTab === "sofa" ? "Sofa Cleaning" : activeTab === "mattress" ? "Mattress & Cushion Care" : "Carpet Cleaning"}
            </h3>
          </div>

          <div className="space-y-0 divide-y divide-slate-100">
            {activeServices.map((service, idx) => {
              const count = getCount(service.id);
              const isFirst = idx === 0 && !searchQuery;
              return (
                <div key={service.id} className="py-5 px-4 sm:px-5">
                  {/* First item image hero */}
                  {isFirst && (
                    <div className="w-full h-56 sm:h-60 bg-slate-100 rounded-2xl overflow-hidden mb-4">
                      <img
                        src={activeTab === "sofa" ? "/mockups/sofa_top_new.png" : activeTab === "mattress" ? "/mockups/mattress_header_new.png" : "/mockups/carpet_top_new.png"}
                        alt={service.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-slate-900 mb-1">{service.name}</h4>

                      <p className="text-xs font-bold text-slate-800">
                        {service.options ? `Starts at ₹${service.price}` : `₹${service.price}`}
                        <span className="text-slate-400 font-normal ml-2">• {service.duration}</span>
                      </p>
                      <div className="mt-3 space-y-1">
                        {service.includes.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="text-slate-400 mt-0.5">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <button className="text-xs font-semibold text-blue-600 mt-2 hover:underline">View details</button>
                      {service.options && (
                        <p className="text-[11px] text-slate-400 mt-1">{service.options}</p>
                      )}
                    </div>

                    {/* Image + add button */}
                    <div className="relative shrink-0 w-28 pb-3 flex flex-col items-center">
                      <div className="w-28 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 z-10">
                        {count > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 shadow-md">
                            <button onClick={() => removeItemFromCart(service.id)} className="hover:text-emerald-900">-</button>
                            <span>{count}</span>
                            <button onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)} className="hover:text-emerald-900">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)}
                            className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[11px] py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase"
                          >
                            Add
                          </button>
                        )}
                      </div>
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
    </div>
  );
}
