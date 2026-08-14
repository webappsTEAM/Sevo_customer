import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Search, ShoppingCart, Star, Check, X, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "../../api/client.js";
import { AppBannerAndFooter } from "../components/AppBannerAndFooter.jsx";

const BOOKING_CURRENCY_SYMBOL = "₹";

const PEST_SUB_TABS = [
  { id: "cockroach", name: "Cockroach Control", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=150&q=80&fit=crop" },
  { id: "termite", name: "Termite Control", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=150&q=80&fit=crop" }
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
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
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
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&q=80&fit=crop",
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
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop",
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
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
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
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&q=80&fit=crop",
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
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=300&q=80&fit=crop",
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
      "Thorough inspection of kitchen under-sink areas, cabinets, and drawers",
      "Gel bait application in cabinet hinges, corners, and crawlspaces",
      "Odorless spray treatment along skirting boards & bathroom drains",
      "Follow-up visit (2nd visit) after 14 days to target newly hatched pests"
    ],
    tools: ["Eco-safe Herbal Gel Bait", "Odorless Residual Chemical Spray", "Handheld pressurized sprayer"],
    reviews_list: [
      { author: "Rajesh K.", rating: 5, date: "2 days ago", comment: "Excellent service. The technician cleared the utensils carefully and put gel in all hinges." },
      { author: "Anjali S.", rating: 4, date: "1 week ago", comment: "Very professional. The treatment is odorless and highly effective." }
    ],
    faqs: [
      { q: "Is the treatment safe for kids and pets?", a: "Yes, we use government-approved odorless chemicals that are completely safe. However, we recommend keeping them away during active spraying." },
      { q: "Do you clear the utensils?", a: "Before the inspection and treatment, our technician will assist in removing the utensils. After treatment, the customer is requested to put them back." },
      { q: "How long does a session take?", a: "Typically, a kitchen cockroach treatment takes about 45 to 60 minutes." },
      { q: "How quickly do cockroaches die?", a: "You will start seeing a significant reduction within 48 hours, and complete elimination of active roaches in 7 to 10 days." },
      { q: "Do I need to leave the kitchen?", a: "It is not required to leave the house, but we suggest avoiding the kitchen during the spray application for about 30 minutes." },
      { q: "Is a second visit mandatory?", a: "Yes, the follow-up visit after 14 days is essential to destroy newly hatched nymphs before they start breeding." },
      { q: "Does the spray stain cabinets?", a: "No, our water-based chemicals are non-staining and odorless, making them safe for wooden, laminate, and steel modular kitchens." },
      { q: "Do you offer any service warranty?", a: "Yes, we offer a 90-day protection warranty. If cockroaches return during this period, we do a free re-treatment." }
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
      "Whole house (living room, bedrooms, kitchen & balcony) skirting spray",
      "Cabinet gel treatment for cockroaches and ants",
      "Odorless insecticide spray for drains and pipe entryways",
      "Second chemical treatment visit after 2 weeks for egg eradication"
    ],
    tools: ["Odorless skirting chemicals", "Syringe gel applicator", "Whole house spray rig"],
    reviews_list: [
      { author: "Vikram M.", rating: 5, date: "3 days ago", comment: "Roach problem resolved completely. Best service ever." },
      { author: "Neha G.", rating: 5, date: "2 weeks ago", comment: "Awesome odorless spray. They handled the kitchen prep too." }
    ],
    faqs: [
      { q: "How long does the effect last?", a: "The treatment prevents pest return for up to 90 days. A second visit at 14 days is included to ensure complete eradication." },
      { q: "Is pre-cleaning of the rooms required?", a: "No, but clearing toys, clothes, and loose items from skirting boards helps the partner spray more efficiently." },
      { q: "Does this spray have a strong chemical smell?", a: "No, we use premium water-soluble odorless chemical sprays that leave no foul scent behind." },
      { q: "What should I do after the treatment?", a: "Keep ventilation open for 15 minutes, avoid wet wiping the skirting boards for at least 48 hours so the chemical barrier stays intact." },
      { q: "Do you treat electrical boxes?", a: "Yes, we use Eco-safe Herbal Gel bait instead of liquid spray inside electrical switch boards and sockets." },
      { q: "Are balcony areas covered in the apartment plan?", a: "Yes, balcony drains, washing areas, and main entry doors are sprayed to block external entry points." },
      { q: "What chemicals do you use?", a: "We use only government-approved, low-toxicity synthetic pyrethroids which are highly target-specific for insects." },
      { q: "Is there any preparation for pet food bowls?", a: "Yes, please remove and store all pet food bowls and water bowls before our technician begins the spray." }
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
      "Staircase, multi-floor, and veranda chemical spray",
      "Gel bait spots inside all wooden cabinets & wardrobe drawers",
      "Odorless skirting barriers applied inside and outside",
      "Second chemical treatment visit after 2 weeks"
    ],
    tools: ["Multi-floor spray rig", "Wardrobe-safe gel", "Veranda mist sprayer"],
    reviews_list: [
      { author: "Suresh P.", rating: 4, date: "5 days ago", comment: "Detailed inspection and gel application. Highly recommended." }
    ],
    faqs: [
      { q: "Do you cover all floors of the bungalow?", a: "Yes, we treat all rooms, staircase areas, terraces, and external verandas." },
      { q: "How long does a bungalow cockroach treatment take?", a: "It takes about 1.5 to 2.5 hours depending on the total floor count and rooms." },
      { q: "Do you treat external drainage chambers?", a: "Yes, external manholes and drain chambers are treated with chemical sprays to prevent entry from the drainage system." },
      { q: "Is garden area spraying included?", a: "No, this is an indoor-focused treatment. However, we spray immediate porches, verandas, and outer door frames." },
      { q: "Can we clean the house immediately after treatment?", a: "You can sweep, but avoid washing or mopping along skirting boards for 2 to 3 days to maximize residual action." },
      { q: "What type of gel do you use?", a: "We use advanced fipronil/imidacloprid gels which act as highly palatable bait for roaches." },
      { q: "What is the warranty period for bungalows?", a: "We provide a 90-day complete protection warranty from the date of the first service." },
      { q: "How many partners are sent for a bungalow?", a: "Usually 1 to 2 trained service partners are assigned depending on the size of the duplex/villa." }
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
      "Termite infestation area inspection",
      "Wall base drilling and localized pressure chemical injection",
      "Anti-termite wood treatment spray"
    ],
    tools: ["High precision drill", "Anti-termite pump sprayer", "Government approved termiticide"],
    reviews_list: [
      { author: "Mahesh S.", rating: 5, date: "1 week ago", comment: "Excellent termite control. Wood cabinets are completely safe now." }
    ],
    faqs: [
      { q: "Does the drilling damage walls?", a: "No, we use fine-tip drills and seal the holes cleanly with color-matched cement/putty." },
      { q: "What chemicals do you use for termites?", a: "We use premium termiticides containing imidacloprid or fipronil, which create a chemical barrier to block and destroy termites." },
      { q: "Is termite treatment odorless?", a: "Yes, the chemical solutions are completely odorless and do not cause any respiratory discomfort." },
      { q: "How deep do you drill?", a: "We drill about 4 to 6 inches deep into the base of walls at regular intervals to inject chemicals into the foundation." },
      { q: "Can termites return after drilling?", a: "Our treatment kills the existing infestation and prevents return. We offer a long-term warranty to secure your kitchen wood structures." },
      { q: "Do I need to empty my kitchen cabinets?", a: "Yes, emptying cabinets in the treatment zone is required so we can access and inject chemicals behind the wood ply." },
      { q: "How long does this termite treatment take?", a: "It takes about 2 to 3 hours depending on the number of bathrooms and kitchen cabinets treated." },
      { q: "Does it kill termite eggs?", a: "Termiticide is a systemic chemical. Termites carry it back to their colony, which leads to total colony elimination, including eggs." }
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
      "Whole apartment perimeter wall base drilling and termiticide injection",
      "Wood furniture protection spray for wardrobes, beds, and tables",
      "Anti-termite drainage block treatment"
    ],
    tools: ["Heavy-duty Hammer Drills", "Chemical Pressure Pumps", "Odourless Termiticide"],
    reviews_list: [
      { author: "Karan T.", rating: 5, date: "1 month ago", comment: "Professional termite drilling. They gave a 5-year warranty certificate." }
    ],
    faqs: [
      { q: "What does the 5-year warranty cover?", a: "If termites reappear anywhere in the treated zones within 5 years, we will re-treat the area completely free of charge." },
      { q: "Is the entire apartment treated in this plan?", a: "Yes, we drill and inject termiticide along the floor-wall junctions of all rooms in the apartment." },
      { q: "How safe is the chemical inside rooms?", a: "The termiticide is injected deep inside the walls and sealed, so there is no chemical exposure to children or pets." },
      { q: "Do we need to vacate the house during treatment?", a: "No, there is no need to vacate as the service is clean, non-toxic, and odorless." },
      { q: "Will the drill noise disturb neighbors?", a: "There will be drill noises during the first 1-2 hours. We recommend informing neighbors beforehand." },
      { q: "How do you seal the drilled holes?", a: "We fill the holes with white cement mixed with wall putty, smoothing them out so they blend with your floor trim." },
      { q: "Does this cover wooden wardrobes?", a: "Yes, we spray anti-termite chemicals on the back boards and frames of all fixed wooden wardrobes." },
      { q: "Can we clean floors after termite drilling?", a: "You can mop the center of the rooms immediately. Avoid washing wall-floor junctions for 24 hours." }
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
      "Multi-floor bungalow base drilling and barrier treatment",
      "Extensive internal wardrobe and attic spray guard protection",
      "Anti-termite external perimeter soil spray treatment"
    ],
    tools: ["Bungalow scale injection systems", "Veranda mist sprayers", "Warranty card"],
    reviews_list: [
      { author: "Pooja V.", rating: 5, date: "2 weeks ago", comment: "Very thorough treatment. They spent hours securing our duplex. Great service!" }
    ],
    faqs: [
      { q: "Do we need to vacate the bungalow?", a: "No vacation needed. The chemicals are safe and completely odorless." },
      { q: "What does the bungalow termite plan cover?", a: "It covers drilling and chemical injection of all levels of the bungalow, wardrobe backboards, and soil barrier misting around the duplex perimeter." },
      { q: "How long does a bungalow termite service take?", a: "A complete bungalow service takes about 4 to 6 hours depending on the size." },
      { q: "Is external soil treatment included?", a: "Yes, we spray the soil borders around the bungalow's foundation to prevent termites from migrating inside." },
      { q: "What is the warranty period?", a: "We provide a 5-year warranty with a physical certificate for the bungalow termite treatment." },
      { q: "Do you treat wooden staircases?", a: "Yes, wooden stair casings and railings are carefully injected and sprayed to protect them." },
      { q: "How many technicians are sent?", a: "Usually 2 to 3 trained professionals equipped with heavy hammer drills and high-pressure chemical pumps." },
      { q: "What happens if termites appear in my furniture?", a: "During the 5-year warranty, if any termites emerge in treated structures, contact us and we will re-inject them at no extra cost." }
    ]
  }
};

export function CockroachControlModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("cockroach");
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

  const getDynamicPestServices = () => {
    let services = JSON.parse(JSON.stringify(PEST_SERVICES));
    if (dbPackages.length > 0) {
      Object.keys(services).forEach(key => {
        services[key] = services[key].map(item => {
          const dbMatch = dbPackages.find(p => p.slug === item.id || p.id === item.id);
          if (dbMatch) {
            item.name = dbMatch.name;
            item.price = Math.round(Number(dbMatch.base_price) || item.price);
            item.duration = dbMatch.duration || item.duration;
            item.description = dbMatch.description || item.description;
            item.includes = Array.isArray(dbMatch.includes) && dbMatch.includes.length > 0 ? dbMatch.includes : item.includes;
            item.tools = dbMatch.tools;
            item.ready = dbMatch.ready;
            item.reviews = dbMatch.reviews;
            item.faqs = dbMatch.faqs;
            item.image = dbMatch.image || item.image;
            item.badge = dbMatch.tag || item.badge;
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
      sizeLabel
    );
    setSelectedServiceDetails(null);
  };

  // Filter lists based on search
  const filterList = (list) => {
    if (!searchQuery) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.includes.some(inc => inc.toLowerCase().includes(searchQuery.toLowerCase()))
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

                            {service.rating && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold mb-1">
                                <Star className="text-violet-600 fill-violet-600" size={11} />
                                <span className="text-slate-800">{service.rating}</span>
                                <span className="text-slate-400 font-normal">({service.reviews})</span>
                              </div>
                            )}

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

                            {service.rating && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold mb-1">
                                <Star className="text-violet-600 fill-violet-600" size={11} />
                                <span className="text-slate-800">{service.rating}</span>
                                <span className="text-slate-400 font-normal">({service.reviews})</span>
                              </div>
                            )}

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

                            {service.rating && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold mb-1">
                                <Star className="text-violet-600 fill-violet-600" size={11} />
                                <span className="text-slate-800">{service.rating}</span>
                                <span className="text-slate-400 font-normal">({service.reviews})</span>
                              </div>
                            )}

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

                            {service.rating && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold mb-1">
                                <Star className="text-violet-600 fill-violet-600" size={11} />
                                <span className="text-slate-800">{service.rating}</span>
                                <span className="text-slate-400 font-normal">({service.reviews})</span>
                              </div>
                            )}

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
                No services added. Select from the packages on the left.
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

              {/* Inclusions Box */}
              {selectedServiceDetails.includes && selectedServiceDetails.includes.length > 0 && (
                <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-2xl p-4 text-left">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    What's included
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

              {/* What does this service include? */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const includes = details.includes || [];
                if (includes.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What does this service include?</h4>
                    <div className="space-y-2">
                      {includes.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-slate-400 font-bold shrink-0 mt-0.5">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Tools we use */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const tools = details.tools || [];
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Chemicals We Use</h4>
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

              {/* Customer Reviews Section */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const reviews = details.reviews_list || [];
                if (reviews.length === 0) return null;
                return (
                  <div className="space-y-4 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Customer Reviews</h4>
                    <div className="space-y-3">
                      {reviews.map((rev, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="text-[11px] font-bold text-slate-700">{rev.author}</div>
                            <div className="text-[9px] text-slate-400 font-semibold">{rev.date}</div>
                          </div>
                          <div className="flex items-center gap-0.5 mb-1.5">
                            {[...Array(5)].map((_, idx) => (
                              <Star 
                                key={idx} 
                                size={10} 
                                className={idx < rev.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-300"} 
                              />
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* FAQs Section */}
              {(() => {
                const details = SERVICE_DETAILS_CONTENT[selectedServiceDetails.id] || {};
                const faqs = details.faqs || [];
                if (faqs.length === 0) return null;
                return (
                  <div className="space-y-3 border-t border-slate-100 pt-5 text-left pb-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                    <div className="space-y-2">
                      {faqs.map((faq, idx) => {
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

            {/* Sticky Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Price</div>
                <div className="text-base font-black text-slate-900">₹{getModalPrice()}</div>
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
