import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, Star, Check, X } from "lucide-react";

const BOOKING_CURRENCY_SYMBOL = "₹";

const FULL_HOUSE_SUB_TABS = [
  { id: "full_apartment", name: "Full apartment", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=150&q=80&fit=crop" },
  { id: "full_bungalow", name: "Full bungalow/duplex", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&q=80&fit=crop" },
  { id: "partial_home", name: "Home cleaning", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=150&q=80&fit=crop" }
];

const FULL_HOUSE_SERVICES = {
  full_apartment: [
    {
      id: "furnished-apt-deep",
      name: "Furnished apartment - Home deep cleaning",
      description: "Complete deep cleaning of your furnished apartment including rooms, kitchen, and bathrooms.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 3499,
      options: "Starts at",
      duration: "3 hrs 45 mins",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&q=80&fit=crop",
      includes: [
        "Deep cleaning of rooms, kitchen, balcony and bathrooms",
        "Advanced tools & eco-friendly chemicals used",
        "Sofa, carpet and mattress vacuuming included"
      ]
    },
    {
      id: "unfurnished-apt-deep",
      name: "Unfurnished apartment - Home deep cleaning",
      description: "Deep cleaning of empty/unfurnished apartment before moving in or after moving out.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 3199,
      options: "Starts at",
      duration: "3 hrs",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80&fit=crop",
      includes: [
        "Scrubbing of floors, wall tiles, windows and balcony",
        "Deep clean of empty kitchen cabinets & closets",
        "Thorough sanitization of bathrooms & fixtures"
      ]
    }
  ],
  full_bungalow: [
    {
      id: "furnished-bungalow-deep",
      name: "Furnished bungalow - Home deep cleaning",
      description: "Complete deep cleaning of your furnished independent house, villa, or duplex.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 3999,
      options: "Starts at",
      duration: "5 hrs 50 mins",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop",
      includes: [
        "Deep cleaning of all rooms, kitchen, stairs and balconies",
        "Floor machine scrubbing and wall dusting",
        "Sanitization of all toilets, basin, and bath areas"
      ]
    },
    {
      id: "unfurnished-bungalow-deep",
      name: "Unfurnished bungalow - Home deep cleaning",
      description: "Thorough deep cleaning of empty/unfurnished independent bungalow or villa.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 3499,
      options: "Starts at",
      duration: "5 hrs",
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=300&q=80&fit=crop",
      includes: [
        "Machine floor scrubbing, windows, doors & balconies clean",
        "Deep clean of all empty cabinets & closets",
        "Thorough sanitization of bathrooms & fixtures"
      ]
    }
  ],
  partial_home: [
    {
      id: "partial-home-clean",
      name: "Home cleaning",
      description: "Professional cleaning tailored to specific rooms or zones in your house.",
      rating: "4.81",
      reviews: "1.7M bookings",
      price: 999,
      options: "Starts at",
      duration: "2 hrs 45 mins",
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop",
      includes: [
        "choose customisable cleaning for kitchen,bedroom ,bathroom,balcony"
      ]
    }
  ]
};

const HOUSE_DETAILS_CONTENT = {
  "furnished-apt-deep": {
    covered: [
      "Bedroom & Living Room deep dusting & vacuuming",
      "Kitchen counters, slab, and exterior cabinet deep cleaning",
      "Bathroom floor scrubbing, wall tiles descaling, toilet deep clean",
      "Sofa, carpet, and mattress vacuuming",
      "Balcony cleaning & floor washing",
      "Doors, windows, fans, and light fixture dusting"
    ],
    tools: [
      "Heavy duty floor scrubbing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly sanitizing chemicals",
      "Microfiber dusting cloths & mops",
      "Stain removal agents"
    ],
    ready: [
      "Ensure running water & electricity are available",
      "Store fragile items and valuables safely away",
      "Remove toiletries and clothes from areas to clean"
    ],
    faqs: [
      { q: "Does this include inside cabinet cleaning?", a: "Standard furnished cleaning includes exterior cabinet cleaning. You can add interior cabinet cleaning under requirements." },
      { q: "Are sofa and carpet wet shampooed?", a: "Sofa/carpet vacuuming is included. Wet shampooing can be selected as an add-on requirement." },
      { q: "How long does it take?", a: "It typically takes 3 to 4 hours depending on the BHK size." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 3499 },
      { label: "2 BHK", price: 3899 },
      { label: "3 BHK", price: 4799 },
      { label: "4 BHK", price: 5699 }
    ],
    kitchenOptions: [
      { id: "kit-ext", name: "Cabinet exterior & stove", price: 0 },
      { id: "kit-int", name: "Cabinet interior with utensil arrangement", price: 499 },
      { id: "kit-chimney", name: "Chimney deep cleaning", price: 399 },
      { id: "kit-fridge", name: "Refrigerator deep cleaning", price: 449 }
    ],
    sofaOptions: [
      { id: "sofa-vac", name: "Dry vacuuming (Sofa & Mattress)", price: 0 },
      { id: "sofa-mattress", name: "Mattress shampoo (per bed)", price: 439 },
      { id: "sofa-wet-3", name: "Sofa wet shampoo (3/4 seater)", price: 449 },
      { id: "sofa-wet-5", name: "Sofa wet shampoo (5/6 seater)", price: 749 }
    ]
  },
  "unfurnished-apt-deep": {
    covered: [
      "Machine floor scrubbing & vacuuming",
      "Deep cleaning of empty kitchen cabinets & cupboards",
      "Sanitization of bathrooms, toilets, sinks, and wall tiles",
      "Window frames, doors, tracks, and glass cleaning",
      "Wall dry dusting and cobweb removal",
      "Balcony cleaning & floor washing"
    ],
    tools: [
      "Floor scrubbing & polishing machine",
      "Wet & dry vacuum cleaner",
      "Eco-friendly bathroom & kitchen cleaners",
      "Glass cleaning kits",
      "Scrubbing brushes & microfiber cloths"
    ],
    ready: [
      "Keep all cupboards and drawers empty",
      "Ensure continuous water and power supply",
      "Provide access to all rooms and balconies"
    ],
    faqs: [
      { q: "Is this suitable for post-construction cleanup?", a: "Yes, it helps remove plaster, dust, and minor cement marks from floors and tiles." },
      { q: "Does it include furniture cleaning?", a: "No, this is for empty/unfurnished apartments. Furnished apartments have a separate package." }
    ],
    apartmentSizes: [
      { label: "1 BHK", price: 3199 },
      { label: "2 BHK", price: 3699 },
      { label: "3 BHK", price: 4499 },
      { label: "4 BHK", price: 5199 }
    ],
    cupboardOptions: [
      { id: "cup-ext", name: "Only exterior cupboard cleaning", price: 0 },
      { id: "cup-all", name: "Interior & exterior cupboard cleaning", price: 599 }
    ],
    kitchenOptions: [
      { id: "kit-ext", name: "Cabinet exterior & stove", price: 0 },
      { id: "kit-int", name: "Kitchen cabinet Interior", price: 349 },
      { id: "kit-chimney", name: "Chimney deep cleaning", price: 399 }
    ],
    extraOptions: [
      { id: "ext-servant", name: "Servants room cleaning", price: 299 },
      { id: "ext-balcony", name: "Extra balcony cleaning", price: 199 }
    ]
  },
  "furnished-bungalow-deep": {
    covered: [
      "Deep cleaning of bedrooms, living rooms, kitchen, and bathrooms",
      "Sofa, carpet, and mattress vacuuming",
      "Floor machine scrubbing and tile descaling",
      "Staircase, railings, and balcony floor wash",
      "Dusting and wiping of window panes, fans, and light fixtures"
    ],
    tools: [
      "Professional floor scrubbing machine",
      "Industrial wet & dry vacuum",
      "Premium eco-chemicals",
      "Microfiber cloths, brushes, and wipers"
    ],
    ready: [
      "Ensure power and running water are available",
      "Store fragile items and small valuables in a safe room"
    ],
    faqs: [
      { q: "How many cleaners are sent for a bungalow?", a: "We send a team of 3 to 5 trained professionals depending on the size and scope." }
    ],
    bungalowSizes: [
      { label: "1 BHK", price: 3999 },
      { label: "2 BHK", price: 4499 },
      { label: "3 BHK", price: 5899 },
      { label: "4 BHK", price: 7899 },
      { label: "5 BHK", price: 9899 }
    ],
    floorOptions: [
      { id: "floor-g", name: "Ground Floor Only", price: 0 },
      { id: "floor-g1", name: "Ground + 1 Floor", price: 499 },
      { id: "floor-g2", name: "Ground + 2 Floors", price: 899 }
    ],
    kitchenOptions: [
      { id: "kit-ext", name: "Cabinet exterior & stove", price: 0 },
      { id: "kit-int", name: "Cabinet interior with utensil arrangement", price: 549 },
      { id: "kit-fridge", name: "Refrigerator deep cleaning", price: 449 },
      { id: "kit-chimney", name: "Chimney deep cleaning", price: 399 }
    ],
    sofaOptions: [
      { id: "sofa-vac", name: "Dry vacuuming (Sofa & Mattress)", price: 0 },
      { id: "sofa-mattress", name: "Mattress shampoo (per bed)", price: 439 },
      { id: "sofa-wet-3", name: "Sofa wet shampoo (3/4 seater)", price: 449 }
    ]
  },
  "unfurnished-bungalow-deep": {
    covered: [
      "Machine scrubbing of all bungalow floors",
      "Empty kitchen cabinet and cupboard deep clean",
      "Fixtures, window panes, tracks, doors and frames cleaning",
      "Complete sanitization of bathrooms & tiles descaling",
      "Stairs, balconies, and entrance porch wash"
    ],
    tools: [
      "Heavy duty scrubbing & polishing machine",
      "Wet & dry vacuum cleaner",
      "Sanitizers, degreasers and glass cleaners"
    ],
    ready: [
      "Ensure all wardrobes and drawers are empty",
      "Provide electricity & water access"
    ],
    faqs: [
      { q: "Does this include garden or lawn cleanup?", a: "No, garden or lawn clearing is not covered. It includes all internal tiled/marbled floor spaces and balconies." }
    ],
    bungalowSizes: [
      { label: "1 BHK", price: 3499 },
      { label: "2 BHK", price: 3999 },
      { label: "3 BHK", price: 5499 },
      { label: "4 BHK", price: 7499 },
      { label: "5 BHK", price: 9499 }
    ],
    floorOptions: [
      { id: "floor-g", name: "Ground Floor Only", price: 0 },
      { id: "floor-g1", name: "Ground + 1 Floor", price: 499 },
      { id: "floor-g2", name: "Ground + 2 Floors", price: 899 }
    ],
    kitchenOptions: [
      { id: "kit-ext", name: "Kitchen cabinet exterior", price: 0 },
      { id: "kit-int", name: "Kitchen cabinet Interior", price: 449 },
      { id: "kit-chimney", name: "Chimney deep cleaning", price: 399 }
    ],
    cupboardOptions: [
      { id: "cup-ext", name: "Only exterior cupboard cleaning", price: 0 },
      { id: "cup-all", name: "Interior & exterior cupboard cleaning", price: 949 }
    ]
  },
  "partial-home-clean": {
    covered: [
      "Custom room deep cleaning (bedrooms, living areas, and balconies)",
      "Kitchen sanitization including countertops, slabs, and stove scrubbing",
      "Bathroom floor scrubbing, tile descaling, and toilet sanitization"
    ],
    tools: [
      "Handheld scrubbers & brushes",
      "Safe, eco-friendly surface cleaners",
      "Microfiber cloths & mops"
    ],
    ready: [
      "Keep selected rooms/balconies accessible",
      "Ensure water supply is available"
    ],
    faqs: [
      { q: "Can I clean multiple rooms?", a: "Yes, you can customize your service package by choosing specific spaces like bedrooms, living rooms, kitchen, or bathrooms." }
    ],
    roomOptions: [
      { id: "room-none", name: "Not required (Bedroom/Living Room)", price: 0 },
      { id: "room-bed", name: "Bedroom cleaning", price: 999 },
      { id: "room-living", name: "Living room cleaning", price: 1199 },
      { id: "room-dusting", name: "Full home dusting", price: 1499 }
    ],
    kitchenOptions: [
      { id: "kit-none", name: "Not required (Kitchen & Appliances)", price: 0 },
      { id: "kit-clean", name: "Kitchen deep cleaning", price: 999 },
      { id: "kit-appliance", name: "Appliances cleaning (Fridge/Chimney/Oven)", price: 799 },
      { id: "kit-interior", name: "Kitchen Interior & exterior deep clean", price: 1499 },
      { id: "kit-exterior", name: "Kitchen Exterior-only deep clean", price: 999 }
    ],
    bathOptions: [
      { id: "bath-none", name: "Not required (Bathroom & Balcony)", price: 0 },
      { id: "bath-1", name: "1 Bathroom deep clean", price: 549 },
      { id: "bath-2", name: "2 Bathrooms deep clean", price: 918 },
      { id: "balc-1", name: "1 Balcony scrubbing", price: 299 }
    ]
  }
};

export function FullHouseCleaningModal({ activeSubTab: propActiveSubTab, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState(
    propActiveSubTab === "Full apartment" ? "full_apartment" :
    propActiveSubTab === "Full bungalow/duplex" ? "full_bungalow" : "partial_home"
  );
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

  // States for requirements selections in the details drawer/modal
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0); // Index for BHK sizes
  const [selectedKitchenOpt, setSelectedKitchenOpt] = useState(null);
  const [selectedSofaOpt, setSelectedSofaOpt] = useState(null);
  const [selectedCupboardOpt, setSelectedCupboardOpt] = useState(null);
  const [selectedFloorOpt, setSelectedFloorOpt] = useState(null);
  const [selectedExtraOpts, setSelectedExtraOpts] = useState([]); // Multiple for unfurnished extras
  const [selectedPartialOpts, setSelectedPartialOpts] = useState([]); // Multiple for partial cleaning choices

  const addCustomizedItemToCart = (baseId, name, price, duration, detailsString) => {
    const uniqueId = `${baseId}-${Date.now()}`;
    const cartName = `${name} (${detailsString})`;
    setCart(prev => [...prev, { id: uniqueId, name: cartName, price, duration, quantity: 1 }]);
  };

  const removeItemFromCart = (id) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const getActiveServices = () => {
    const list = FULL_HOUSE_SERVICES[activeTab] || [];
    if (!searchQuery) return list;
    return list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase())));
  };

  const activeServices = getActiveServices();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getSectionTitle = () => {
    if (activeTab === "full_apartment") return "FULL APARTMENT CLEANING";
    if (activeTab === "full_bungalow") return "BUNGALOW & DUPLEX CLEANING";
    return "HOME CLEANING";
  };

  const handleOpenDetails = (service) => {
    setSelectedServiceDetails(service);
    setSelectedSizeIdx(0);
    const details = HOUSE_DETAILS_CONTENT[service.id] || {};
    setSelectedKitchenOpt(details.kitchenOptions ? details.kitchenOptions[0] : null);
    setSelectedSofaOpt(details.sofaOptions ? details.sofaOptions[0] : null);
    setSelectedCupboardOpt(details.cupboardOptions ? details.cupboardOptions[0] : null);
    setSelectedFloorOpt(details.floorOptions ? details.floorOptions[0] : null);
    setSelectedExtraOpts([]);
    setSelectedPartialOpts([]);
    setActiveFaq(null);
  };

  const getModalPrice = () => {
    if (!selectedServiceDetails) return 0;
    const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
    
    let basePrice = selectedServiceDetails.price;
    if (details.apartmentSizes) {
      basePrice = details.apartmentSizes[selectedSizeIdx]?.price || basePrice;
    } else if (details.bungalowSizes) {
      basePrice = details.bungalowSizes[selectedSizeIdx]?.price || basePrice;
    }

    const kitchenPrice = selectedKitchenOpt ? selectedKitchenOpt.price : 0;
    const sofaPrice = selectedSofaOpt ? selectedSofaOpt.price : 0;
    const cupboardPrice = selectedCupboardOpt ? selectedCupboardOpt.price : 0;
    const floorPrice = selectedFloorOpt ? selectedFloorOpt.price : 0;
    const extrasPrice = selectedExtraOpts.reduce((sum, opt) => sum + opt.price, 0);
    const partialPrice = selectedPartialOpts.reduce((sum, opt) => sum + opt.price, 0);

    return basePrice + kitchenPrice + sofaPrice + cupboardPrice + floorPrice + extrasPrice + partialPrice;
  };

  const handleProceedFromModal = () => {
    if (!selectedServiceDetails) return;
    const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
    
    let baseLabel = "";
    if (details.apartmentSizes) {
      baseLabel = details.apartmentSizes[selectedSizeIdx]?.label || "";
    } else if (details.bungalowSizes) {
      baseLabel = details.bungalowSizes[selectedSizeIdx]?.label || "";
    }

    let detailParts = [];
    if (baseLabel) detailParts.push(baseLabel);
    if (selectedKitchenOpt && selectedKitchenOpt.price > 0) detailParts.push(selectedKitchenOpt.name);
    if (selectedSofaOpt && selectedSofaOpt.price > 0) detailParts.push(selectedSofaOpt.name);
    if (selectedCupboardOpt && selectedCupboardOpt.price > 0) detailParts.push(selectedCupboardOpt.name);
    if (selectedFloorOpt && selectedFloorOpt.price > 0) detailParts.push(selectedFloorOpt.name);
    
    selectedExtraOpts.forEach(opt => detailParts.push(opt.name));
    selectedPartialOpts.forEach(opt => detailParts.push(opt.name));

    const detailsString = detailParts.join(", ") || "Standard Package";
    const finalPrice = getModalPrice();

    addCustomizedItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, finalPrice, selectedServiceDetails.duration, detailsString);
    setSelectedServiceDetails(null);
  };

  return (
    <div className="w-full text-slate-700 bg-white min-h-screen">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white shadow-sm border-b border-slate-100">
        <div className="p-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4 px-6">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold mb-2 text-xs transition-colors border-none bg-transparent cursor-pointer"
            >
              <ChevronLeft size={16} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Full Home Cleaning</h2>
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

        {/* Sub-tabs exactly styled like Sofa/Kitchen/Bathroom Cleaning */}
        <div className="flex gap-5 pb-3 pt-4 px-6 border-b border-slate-100 justify-start bg-white overflow-x-auto scrollbar-none">
          {FULL_HOUSE_SUB_TABS.map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className="flex flex-col items-center justify-start p-1.5 transition-all cursor-pointer text-center bg-transparent w-[110px] shrink-0 border-none"
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
          <div className="pt-1 mb-4 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {getSectionTitle()}
            </h3>
          </div>

          <div className="space-y-4">
            {activeServices.map((service) => {
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
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline cursor-pointer border-none bg-transparent"
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
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-white/60 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-center text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer border-none"
              >
                Proceed to Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

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
              {/* Title & Ratings */}
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">{selectedServiceDetails.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-2">
                  <Star className="text-[#7C3AED] fill-[#7C3AED]" size={12} />
                  <span className="text-slate-800">{selectedServiceDetails.rating || "4.81"}</span>
                  <span className="text-slate-400 font-normal underline">({selectedServiceDetails.reviews || "1.7M bookings"})</span>
                </div>
                <p className="text-xs text-slate-500 font-bold">Starts at ₹{selectedServiceDetails.price} • {selectedServiceDetails.duration}</p>
              </div>

              {/* Requirements selection section */}
              {(() => {
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                return (
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Select Requirements</h4>

                    {/* 1. Size Selection (Apartment size or Bungalow size) */}
                    {details.apartmentSizes && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select size of apartment</label>
                        <div className="flex flex-wrap gap-2">
                          {details.apartmentSizes.map((size, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedSizeIdx(idx)}
                              className={`px-4 py-2.5 text-xs font-bold border rounded-xl transition-all cursor-pointer border-solid ${
                                selectedSizeIdx === idx
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-800 font-black scale-[1.02]"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div>{size.label}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">₹{size.price}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {details.bungalowSizes && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select overall size of bungalow</label>
                        <div className="flex flex-wrap gap-2">
                          {details.bungalowSizes.map((sz, idx) => {
                            const isChosen = selectedSizeIdx === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedSizeIdx(idx)}
                                className={`px-3 py-2 text-xs font-bold border rounded-xl transition-all cursor-pointer border-solid ${
                                  isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <div>{sz.label}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">₹{sz.price}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* B. Floor count for duplex/bungalow */}
                    {details.floorOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select number of floors</label>
                        <div className="flex flex-wrap gap-2">
                          {details.floorOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedFloorOpt(opt)}
                              className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${
                                selectedFloorOpt?.id === opt.id
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div>{opt.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">+{opt.price > 0 ? `₹${opt.price}` : "Free"}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* C. Kitchen cabinets options */}
                    {details.kitchenOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select kitchen cabinets & appliances</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {details.kitchenOptions.map((opt) => {
                            const isSelected = selectedKitchenOpt?.id === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setSelectedKitchenOpt(opt)}
                                className={`p-3 text-left border rounded-xl transition-all cursor-pointer border-solid ${
                                  isSelected
                                    ? "border-emerald-600 bg-emerald-50/30 text-emerald-800"
                                    : "border-slate-100 hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <div className="text-xs font-bold">{opt.name}</div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  {opt.price > 0 ? `+₹${opt.price}/visit` : "+Free"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* D. Sofa & upholstery options */}
                    {details.sofaOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select Sofa & Cushion cleaning</label>
                        <div className="flex flex-wrap gap-2">
                          {details.sofaOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedSofaOpt(opt)}
                              className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${
                                selectedSofaOpt?.id === opt.id
                                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div>{opt.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">+{opt.price > 0 ? `₹${opt.price}/visit` : "Free"}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* E. Cupboard interior options */}
                    {details.cupboardOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Cupboards interior cleaning</label>
                        <div className="flex flex-wrap gap-2">
                          {details.cupboardOptions.map((opt) => {
                            const isChosen = selectedCupboardOpt?.id === opt.id;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => setSelectedCupboardOpt(opt)}
                                className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${
                                  isChosen
                                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <div>{opt.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">+{opt.price > 0 ? `₹${opt.price}/visit` : "Free"}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* F. Unfurnished Extra Options */}
                    {details.extraOptions && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-800 block">Select extra room/area</label>
                        <div className="space-y-2">
                          {details.extraOptions.map((opt) => {
                            const isSelected = selectedExtraOpts.some(x => x.id === opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`flex justify-between items-center p-3 border rounded-xl transition-all ${
                                  isSelected ? "border-emerald-600 bg-emerald-50/30" : "border-slate-100"
                                }`}
                              >
                                <span className="text-xs font-medium text-slate-700">{opt.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-slate-900">+{opt.price > 0 ? `₹${opt.price}/visit` : "Free"}</span>
                                  <button
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedExtraOpts(prev => prev.filter(x => x.id !== opt.id));
                                      } else {
                                        setSelectedExtraOpts(prev => [...prev, opt]);
                                      }
                                    }}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer border ${
                                      isSelected
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

                    {/* G. Partial clean options (Custom rooms selection list) */}
                    {selectedServiceDetails.id === "partial-home-clean" && (
                      <div className="space-y-4">
                        {/* 1. Bedrooms & Living Room */}
                        {details.roomOptions && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 block">Select Bedroom/Living Room</label>
                            <div className="flex flex-wrap gap-2">
                              {details.roomOptions.map((opt) => {
                                const isSelected = selectedPartialOpts.some(p => p.id === opt.id) || (opt.id === "room-none" && !selectedPartialOpts.some(p => p.id.startsWith("room-") && p.id !== "room-none"));
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "room-none") {
                                        setSelectedPartialOpts(prev => prev.filter(p => !p.id.startsWith("room-")));
                                      } else {
                                        setSelectedPartialOpts(prev => {
                                          const filtered = prev.filter(p => !p.id.startsWith("room-"));
                                          return [...filtered, opt];
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${
                                      isSelected
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div>{opt.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {opt.price > 0 ? `₹${opt.price}` : "Free"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 2. Kitchen Option */}
                        {details.kitchenOptions && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 block">Select Kitchen Cleaning</label>
                            <div className="flex flex-wrap gap-2">
                              {details.kitchenOptions.map((opt) => {
                                const isSelected = selectedPartialOpts.some(p => p.id === opt.id) || (opt.id === "kit-none" && !selectedPartialOpts.some(p => p.id.startsWith("kit-") && p.id !== "kit-none"));
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "kit-none") {
                                        setSelectedPartialOpts(prev => prev.filter(p => !p.id.startsWith("kit-")));
                                      } else {
                                        setSelectedPartialOpts(prev => {
                                          const filtered = prev.filter(p => !p.id.startsWith("kit-"));
                                          return [...filtered, opt];
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${
                                      isSelected
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div>{opt.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {opt.price > 0 ? `₹${opt.price}` : "Free"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 3. Bathrooms & Balconies list */}
                        {details.bathOptions && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-800 block">Select Bathrooms & Balconies</label>
                            <div className="flex flex-wrap gap-2">
                              {details.bathOptions.map((opt) => {
                                const isSelected = selectedPartialOpts.some(p => p.id === opt.id) || (opt.id === "bath-none" && !selectedPartialOpts.some(p => (p.id.startsWith("bath-") || p.id.startsWith("balc-")) && p.id !== "bath-none"));
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (opt.id === "bath-none") {
                                        setSelectedPartialOpts(prev => prev.filter(p => !p.id.startsWith("bath-") && !p.id.startsWith("balc-")));
                                      } else {
                                        setSelectedPartialOpts(prev => {
                                          const isAlreadyChosen = prev.some(p => p.id === opt.id);
                                          if (isAlreadyChosen) {
                                            return prev.filter(p => p.id !== opt.id);
                                          } else {
                                            // Bathroom choices are mutually exclusive (e.g. either 1 or 2 bathrooms)
                                            let cleaned = prev;
                                            if (opt.id.startsWith("bath-")) {
                                              cleaned = prev.filter(p => !p.id.startsWith("bath-"));
                                            }
                                            return [...cleaned, opt];
                                          }
                                        });
                                      }
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold border rounded-xl transition-all cursor-pointer border-solid ${
                                      isSelected
                                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800"
                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    <div>{opt.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {opt.price > 0 ? `₹${opt.price}` : "Free"}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* What is Covered */}
              {(() => {
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
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
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
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
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
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
                const details = HOUSE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
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
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Price</div>
                <div className="text-base font-black text-slate-900">₹{getModalPrice().toLocaleString("en-IN")}</div>
              </div>
              <button
                onClick={handleProceedFromModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider cursor-pointer border-none"
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
