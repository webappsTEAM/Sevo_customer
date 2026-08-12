import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, X, Star } from "lucide-react";

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
  }
];

const SOFA_CLEANING_SERVICES = [
  {
    id: "fabric-sofa-clean",
    name: "Fabric Sofa Cleaning",
    price: 329,
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
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
    image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop",
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
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&q=80&fit=crop",
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
    price: 599,
    duration: "1.5 hrs",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
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
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&q=80&fit=crop",
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
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop",
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
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Removal of accumulated dust particles, dirt",
      "Foam based shampooing on the carpet using a sponge",
      "Vacuuming & wiping shampoo"
    ]
  }
];

const SOFA_DETAIL_DATA = {
  "fabric-sofa-clean": {
    tools: [
      "Fabric-safe cleaning shampoo",
      "Microfiber cloths",
      "Soft cleaning brushes",
      "Wet & dry vacuum"
    ],
    ready: [
      "Keep the sofa area accessible",
      "Remove personal items from the sofa",
      "Keep nearby furniture and valuables safely away",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The sofa looks much cleaner and fresh. The team did a neat job."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good cleaning service. They removed most of the dust and stains."' }
    ],
    faqs: [
      { q: "Will you clean the sofa cushions?", a: "Normal sofa seats and back cushions are covered. Separate loose/removable cushions are not included." },
      { q: "Will you remove stains?", a: "We treat common food, dust and everyday stains. Very old or permanent stains may not be completely removable." },
      { q: "Will the sofa be completely dry immediately?", a: "The team removes excess moisture, but some drying time may still be required." },
      { q: "Do I need to provide cleaning products?", a: "No. Our team brings the required cleaning products and equipment." }
    ]
  },
  "fabric-sofa-cushion-clean": {
    tools: [
      "Fabric-safe cleaning shampoo",
      "Microfiber cloths",
      "Soft cleaning brushes",
      "Wet & dry vacuum"
    ],
    ready: [
      "Keep the sofa and cushions accessible",
      "Remove personal items from the sofa",
      "Keep nearby furniture and valuables safely away",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The sofa and cushions were cleaned really well. Everything looks fresh now."' },
      { name: "Karthik M.", rating: "4.9", text: '"Very good service. They cleaned the sofa and cushions carefully."' }
    ],
    faqs: [
      { q: "Are loose cushions included?", a: "Yes. Loose/removable cushions belonging to the sofa are included." },
      { q: "How many cushions are included?", a: "The cushions that belong to the selected sofa are included. Extra cushions can be added separately if available." },
      { q: "Will you remove all stains?", a: "Common stains will be treated, but very old or permanent stains may not completely disappear." },
      { q: "Can the sofa be used immediately?", a: "Some drying time may be required after cleaning." }
    ]
  },
  "leather-sofa-clean": {
    tools: [
      "Leather-safe cleaning solution",
      "Leather conditioner",
      "Soft microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Keep the sofa area accessible",
      "Remove personal items from the sofa",
      "Keep valuables safely away",
      "Provide a well-ventilated area"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The leather sofa looks clean and fresh again. Very neat work."' },
      { name: "Rahul K.", rating: "4.8", text: '"The team handled the leather sofa carefully and professionally."' }
    ],
    faqs: [
      { q: "Will you use shampoo on the leather sofa?", a: "No. We use products specifically suitable for leather surfaces." },
      { q: "Will you remove scratches from the leather?", a: "No. Cleaning cannot repair deep scratches, cuts or damaged leather." },
      { q: "Will you polish the leather sofa?", a: "The sofa receives a leather-safe conditioning and finishing treatment." },
      { q: "Can you clean all types of leather?", a: "We clean commonly used finished leather surfaces. Special or delicate leather may require an additional assessment." }
    ]
  },
  "leather-sofa-cushion-clean": {
    tools: [
      "Leather-safe cleaning solution",
      "Leather conditioner",
      "Soft microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Keep the sofa and cushions accessible",
      "Remove personal items from the sofa",
      "Keep valuables safely away",
      "Provide a well-ventilated area"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The sofa and cushions were cleaned very carefully. They look much better now."' },
      { name: "Karthik M.", rating: "4.9", text: '"Good service and the leather was handled properly."' }
    ],
    faqs: [
      { q: "Are removable leather cushions included?", a: "Yes. Loose/removable cushions belonging to the sofa are included." },
      { q: "Will you repair damaged leather?", a: "No. Cuts, cracks, peeling and other leather damage are not repairable through this cleaning service." },
      { q: "Will you use water on the leather?", a: "Only suitable amounts are used with leather-safe cleaning products." },
      { q: "Will the leather become shiny after cleaning?", a: "The conditioning and finishing treatment gives the leather a clean and well-maintained appearance." }
    ]
  },
  "mattress-deep": {
    tools: [
      "Fabric-safe mattress shampoo",
      "Wet & dry vacuum",
      "Microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Keep the mattress accessible",
      "Remove bedsheets, pillows and blankets",
      "Keep nearby items safely away",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The mattress had a lot of dust and stains. It looks much cleaner now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the mattress was cleaned properly."' }
    ],
    faqs: [
      { q: "Will you clean the entire mattress?", a: "Yes, all accessible sides and surfaces included in the selected service will be cleaned." },
      { q: "Will you remove all stains?", a: "Common stains will be treated, but very old or permanent stains may not completely disappear." },
      { q: "Can I use the mattress immediately after cleaning?", a: "Some drying time is required before using the mattress." },
      { q: "Do I need to remove the bedsheets?", a: "Yes, please remove bedsheets, blankets and other items before the service." }
    ]
  },
  "mattress-pillow-refresh": {
    tools: [
      "Fabric-safe cleaning products",
      "Wet & dry vacuum",
      "Microfiber cloths",
      "Soft cleaning brushes"
    ],
    ready: [
      "Remove bedsheets and covers",
      "Keep mattress and pillows accessible",
      "Clear the surrounding area",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The mattress and pillows were cleaned very neatly. Good service."' },
      { name: "Karthik M.", rating: "4.9", text: '"Everything was handled carefully and the mattress feels much fresher."' }
    ],
    faqs: [
      { q: "Are pillows included?", a: "Yes, pillows are included in this package." },
      { q: "How many pillows are included?", a: "Up to 2 standard pillows are included." },
      { q: "Will you remove difficult stains?", a: "We treat common stains, but permanent stains may not be completely removable." },
      { q: "How long does the mattress take to dry?", a: "How long does the mattress take to dry?" }
    ]
  }
,
  "carpet-deep": {
    tools: [
      "Carpet shampoo",
      "Wet & dry vacuum",
      "Microfiber cloths",
      "Sponge scrubbers"
    ],
    ready: [
      "Keep the carpet area accessible",
      "Clear any furniture on top of the carpet",
      "Provide a power connection"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The carpet looks extremely clean and the dirt was extracted nicely."' },
      { name: "Karthik M.", rating: "4.8", text: '"Good shampoo cleaning and quick drying. Professional team."' }
    ],
    faqs: [
      { q: "Will you remove all stains from the carpet?", a: "We treat common food and dirt stains. Very old or permanent stains may not be completely removable." },
      { q: "How long will the carpet take to dry?", a: "Drying time depends on the carpet thickness and room ventilation, usually takes a few hours." },
      { q: "Do I need to clear furniture before cleaning?", a: "Yes, please remove tables, chairs, and other items from the carpet before the service." }
    ]
  }};

export function SofaCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("sofa");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);

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
                      <button 
                        onClick={() => setSelectedServiceDetails(service)}
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        View details
                      </button>
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
                            className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[11px] py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase cursor-pointer"
                          >
                            <ShoppingCart size={12} /> Add
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

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100/80 rounded-2xl p-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      ₹{selectedServiceDetails.price}
                      <span className="text-slate-400 text-xs font-normal ml-2">• {selectedServiceDetails.duration}</span>
                    </div>
                  </div>

                  {/* Add button inside details modal */}
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
              </div>

              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SOFA_DETAIL_DATA[id] || {};
                const tools = detail.tools || [];
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
                const detail = SOFA_DETAIL_DATA[id] || {};
                const readyList = detail.ready || [];
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
                  const detail = SOFA_DETAIL_DATA[id] || {};
                  const reviews = detail.reviews || [];
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
                    const detail = SOFA_DETAIL_DATA[id] || {};
                    const faqs = detail.faqs || [];
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
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{selectedServiceDetails.name}</div>
              <button
                onClick={() => {
                  if (getCount(selectedServiceDetails.id) === 0) {
                    addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration);
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
