// Fallback static categories reference for offline or initial hydration
// The authoritative source of truth is the live database via GET /api/catalog/categories/
export const CATEGORIES = [
  { id: "home_pest_control", slug: "home_pest_control", name: "Cleaning & Pest Control", image: "/mockups/hero_pro_cleaning_rect.jpg", desc: "Deep clean & pest sanitization" },
  { id: "paintings", slug: "paintings", name: "Painting & Waterproofing", image: "/assets/Painting/Interior.webp", desc: "Walls, ceilings & textures" },
  { id: "electrician_plumbing_carpentry", slug: "electrician_plumbing_carpentry", name: "Electrician, Plumber & Carpenter", image: "/mockups/hero_pro_electrical_rect.jpg", desc: "Repairs, wiring, plumbing & woodwork" },
  { id: "ac_appliance", slug: "ac_appliance", name: "AC & Appliance Repair", image: "/mockups/hero_pro_ac_rect.jpg", desc: "AC service, cooling & appliance fixes" },
  { id: "mason", slug: "mason", name: "Masonry & Civil Work", image: "/mockups/brick_wall_construction_red.jpg", desc: "Brick, plaster & civil repair" },
  { id: "goods_transports", slug: "goods_transports", name: "Goods & Transport", image: "/assets/cat_goods_transport.jpg", desc: "Mini trucks, 2-wheelers & movers" },
  { id: "vegetables_groceries", slug: "vegetables_groceries", name: "Farm-Fresh Vegetables & Groceries", image: "/assets/cat_food_health.jpg", desc: "Daily farm-harvested produce" },
];
