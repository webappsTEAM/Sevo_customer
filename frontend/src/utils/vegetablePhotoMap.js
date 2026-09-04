/**
 * Centralized Produce Photo Mapping for all Farm-Fresh Vegetables.
 * Uses high-resolution dedicated produce photography from /mockups/ and /mockups/veg/.
 */
export function getVegetableProducePhoto(name) {
  const n = (name || "").toLowerCase().trim()
  if (!n) return "/mockups/vegetables_realistic.png"

  // 1. Tomatoes
  if (n.includes("tomato") || n.includes("thakkali") || n.includes("tamatar") || n.includes("cherry")) {
    return "/mockups/veg_tomato.png"
  }

  // 2. Onions & Spring Onion
  if (n.includes("spring onion") || n.includes("vengaya thaal")) {
    return "/mockups/veg/spring_onion.jpg"
  }
  if (n.includes("chinna vengayam") || n.includes("sambar onion") || n.includes("sambhar onion") || n.includes("small onion") || n.includes("shallot")) {
    return "/mockups/veg/onion.jpg"
  }
  if (n.includes("periya vengayam") || n.includes("onion") || n.includes("vengayam") || n.includes("pyaz")) {
    return "/mockups/veg/onion.jpg"
  }

  // 3. Potatoes & Sweet Potato
  if (n.includes("sweet potato") || n.includes("sakkaraivalli") || n.includes("chakkara") || n.includes("shakarkand")) {
    return "/mockups/veg/sweet_potato.jpg"
  }
  if (n.includes("baby potato")) {
    return "/mockups/veg/baby_potato.jpg"
  }
  if (n.includes("potato") || n.includes("urulaikilangu") || n.includes("urulaikizhangu") || n.includes("aloo") || n.includes("ooty potato")) {
    return "/mockups/veg/potato.jpg"
  }

  // 4. Carrots
  if (n.includes("carrot") || n.includes("gajar")) {
    return "/mockups/veg/carrot.jpg"
  }

  // 5. Cucumbers
  if (n.includes("cucumber") || n.includes("vellarikkai") || n.includes("vellarikai") || n.includes("kheera")) {
    return "/mockups/veg/cucumber.jpg"
  }

  // 6. Lady Finger / Okra
  if (n.includes("lady finger") || n.includes("vendakkai") || n.includes("vendaikkai") || n.includes("bhindi") || n.includes("okra")) {
    return "/mockups/veg_bhindi.png"
  }

  // 7. Brinjal / Eggplant
  if (n.includes("brinjal - bharta") || n.includes("bharta brinjal")) {
    return "/mockups/veg_brinjal.png"
  }
  if (n.includes("brinjal") || n.includes("kathirikai") || n.includes("kathirikkai") || n.includes("baingan") || n.includes("vari kathirikkai")) {
    return "/mockups/veg_brinjal.png"
  }

  // 8. Cabbage & Cauliflower
  if (n.includes("cauliflower") || n.includes("pookosu") || n.includes("gobi")) {
    return "/mockups/veg/cauliflower.jpg"
  }
  if (n.includes("cabbage") || n.includes("muttaikose") || n.includes("patta gobi")) {
    return "/mockups/veg/cabbage.jpg"
  }

  // 9. Beetroot & Radish
  if (n.includes("beetroot") || n.includes("chukandar")) {
    return "/mockups/veg/beetroot.jpg"
  }
  if (n.includes("radish") || n.includes("mullangi") || n.includes("mooli")) {
    return "/mockups/veg/radish.jpg"
  }

  // 10. Garlic & Ginger
  if (n.includes("peeled garlic") || n.includes("uricha poondu")) {
    return "/mockups/veg/peeled_garlic.jpg"
  }
  if (n.includes("garlic") || n.includes("poondu") || n.includes("lehsun")) {
    return "/mockups/veg/garlic.jpg"
  }
  if (n.includes("ginger") || n.includes("inji") || n.includes("adrak")) {
    return "/mockups/veg_ginger.png"
  }

  // 11. Chillies & Capsicums
  if (n.includes("red bell pepper") || n.includes("red pepper") || n.includes("sigappu")) {
    return "/mockups/veg/red_bell_pepper.jpg"
  }
  if (n.includes("yellow bell pepper") || n.includes("yellow pepper") || n.includes("manjal kuda")) {
    return "/mockups/veg/yellow_bell_pepper.jpg"
  }
  if (n.includes("capsicum") || n.includes("kuda milagai") || n.includes("kudai milagaai") || n.includes("shimla") || n.includes("three pepper") || n.includes("assorted capsicum")) {
    return "/mockups/veg_capsicum_green.png"
  }
  if (n.includes("chilli") || n.includes("milagai") || n.includes("milagaai") || n.includes("mirch") || n.includes("green chilli")) {
    return "/mockups/veg/green_chilli.jpg"
  }

  // 12. Lemon & Amla
  if (n.includes("lemon") || n.includes("elumichai") || n.includes("nimbu")) {
    return "/mockups/veg_lemon.png"
  }
  if (n.includes("amla") || n.includes("nellikai") || n.includes("nellikaai")) {
    return "/mockups/veg/amla.jpg"
  }

  // 13. Herbs & Leafy Greens
  if (n.includes("curry") || n.includes("karuveppilai") || n.includes("karuvepillai") || n.includes("kadi patta")) {
    return "/mockups/veg_curry_leaves.png"
  }
  if (n.includes("coriander") || n.includes("kothamalli") || n.includes("dhaniya")) {
    return "/mockups/veg_coriander.png"
  }
  if (n.includes("mint") || n.includes("pudina")) {
    return "/mockups/veg/mint.jpg"
  }
  if (n.includes("red amaranthus") || n.includes("sivappu keerai") || n.includes("red spinach") || n.includes("lal saag")) {
    return "/mockups/veg/red_amaranthus.jpg"
  }
  if (n.includes("green amaranthus") || n.includes("sirukeerai") || n.includes("thandu keerai") || n.includes("pasalai")) {
    return "/mockups/veg/green_amaranthus.jpg"
  }
  if (n.includes("spinach") || n.includes("palak") || n.includes("keerai")) {
    return "/mockups/veg/spinach.jpg"
  }
  if (n.includes("drumstick leaves") || n.includes("moringa") || n.includes("murungai keerai")) {
    return "/mockups/veg_moringa_leaves.png"
  }
  if (n.includes("methi") || n.includes("fenugreek") || n.includes("vendhaya keerai")) {
    return "/mockups/veg_methi.png"
  }
  if (n.includes("lettuce")) {
    return "/mockups/veg/lettuce.jpg"
  }
  if (n.includes("rosemary")) {
    return "/mockups/veg/rosemary.png"
  }
  if (n.includes("basil")) {
    return "/mockups/veg/basil_leaves.jpg"
  }
  if (n.includes("neem") || n.includes("veppilai")) {
    return "/mockups/veg_curry_leaves.png"
  }

  // 14. Beans & Peas
  if (n.includes("french beans") || (n.includes("beans") && !n.includes("broad") && !n.includes("cluster") && !n.includes("cowpea") && !n.includes("avarakkai") && !n.includes("kothavarangai") && !n.includes("karamani"))) {
    return "/mockups/veg_french_beans.png"
  }
  if (n.includes("broad beans") || n.includes("avarakkai") || n.includes("sem fali")) {
    return "/mockups/veg/broad_beans.jpg"
  }
  if (n.includes("cluster beans") || n.includes("kothavarangai") || n.includes("guar") || n.includes("gavar")) {
    return "/mockups/veg/cluster_beans.jpg"
  }
  if (n.includes("cowpea") || n.includes("karamani") || n.includes("chawli") || n.includes("yardlong")) {
    return "/mockups/veg/cowpea_beans.jpg"
  }
  if (n.includes("peas") || n.includes("pattani") || n.includes("matar")) {
    return "/mockups/veg/peas.jpg"
  }

  // 15. Gourds
  if (n.includes("drumstick") || n.includes("murungakkai")) {
    return "/mockups/veg_drumstick.png"
  }
  if (n.includes("bitter gourd") || n.includes("pavakkai") || n.includes("karela")) {
    return "/mockups/veg_bitter_gourd.png"
  }
  if (n.includes("bottle gourd") || n.includes("surakkai") || n.includes("lauki")) {
    return "/mockups/veg_lauki.png"
  }
  if (n.includes("ridge gourd") || n.includes("peerangai") || n.includes("peerkangai")) {
    return "/mockups/veg/ridge_gourd.jpg"
  }
  if (n.includes("snake gourd") || n.includes("pudalangai")) {
    return "/mockups/veg_snake_gourd.png"
  }
  if (n.includes("ash gourd") || n.includes("sambal pusanikkai") || n.includes("winter melon") || n.includes("petha")) {
    return "/mockups/veg_ash_gourd.png"
  }
  if (n.includes("ivy gourd") || n.includes("kovakkai") || n.includes("tindora") || n.includes("dondakaya")) {
    return "/mockups/veg_ivy_gourd.png"
  }
  if (n.includes("pointed gourd") || n.includes("parwal")) {
    return "/mockups/veg_ivy_gourd.png"
  }
  if (n.includes("chow chow") || n.includes("chayote")) {
    return "/mockups/veg_chow_chow.png"
  }
  if (n.includes("green pumpkin") || n.includes("pusanikkai")) {
    return "/mockups/veg/green_pumpkin.jpg"
  }
  if (n.includes("pumpkin yellow (cut)") || n.includes("cut pumpkin") || n.includes("pumpkin yellow")) {
    return "/mockups/veg/pumpkin_cut.jpg"
  }
  if (n.includes("disco pumpkin") || n.includes("pumpkin") || n.includes("parangikkai")) {
    return "/mockups/veg/pumpkin.jpg"
  }

  // 16. Exotic, Mushrooms, Corn, Zucchini, Sprouts & Roots
  if (n.includes("mushroom") || n.includes("kaalan")) {
    return "/mockups/veg_mushroom.png"
  }
  if (n.includes("broccoli")) {
    return "/mockups/veg/broccoli.jpg"
  }
  if (n.includes("baby corn")) {
    return "/mockups/veg/baby_corn.jpg"
  }
  if (n.includes("corn") || n.includes("cholam") || n.includes("solam")) {
    return "/mockups/veg/corn.jpg"
  }
  if (n.includes("zucchini")) {
    return "/mockups/veg/zucchini.jpg"
  }
  if (n.includes("sprouts") || n.includes("moong sprouts")) {
    return "/mockups/veg/sprouts.jpg"
  }
  if (n.includes("colocasia") || n.includes("seppankizhangu") || n.includes("arvi")) {
    return "/mockups/veg/arvi.jpg"
  }
  if (n.includes("knol khol") || n.includes("nookal")) {
    return "/mockups/veg/knol_khol.jpg"
  }
  if (n.includes("raw papaya") || n.includes("pappalikkai")) {
    return "/mockups/veg/raw_papaya.jpg"
  }
  if (n.includes("banana stem") || n.includes("vazhai thandu") || n.includes("vazhaithandu")) {
    return "/mockups/veg/banana_stem.jpg"
  }
  if (n.includes("raw banana") || n.includes("vazhakkai")) {
    return "/mockups/veg/raw_banana.jpg"
  }
  if (n.includes("turmeric") || n.includes("manjal")) {
    return "/mockups/veg/turmeric.jpg"
  }

  return "/mockups/vegetables_realistic.png"
}

