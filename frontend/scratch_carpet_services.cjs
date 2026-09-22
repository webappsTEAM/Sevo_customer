const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'ui', 'pages', 'SofaCleaningModal.jsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. Replace CARPET_SERVICES array
const oldCarpetStart = 'const CARPET_SERVICES = [';
const oldCarpetEnd = 'const SOFA_DETAIL_DATA = {';

const startIndex = content.indexOf(oldCarpetStart);
const endIndex = content.indexOf(oldCarpetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find CARPET_SERVICES bounds!");
  process.exit(1);
}

const newCarpetServicesBlock = `const CARPET_SERVICES = [
  {
    id: "carpet-deep",
    name: "Carpet Cleaning",
    price: 369,
    options: "Starts at",
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Removal of accumulated dust particles, dirt",
      "Foam based shampooing on the carpet using a sponge",
      "Vacuuming & wiping shampoo"
    ]
  }
];

`;

content = content.substring(0, startIndex) + newCarpetServicesBlock + content.substring(endIndex);

// 2. Add details mapping key for carpet-deep to SOFA_DETAIL_DATA
const oldDetailDataEnd = `"mattress-pillow-refresh": {
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
};`;

const newDetailDataEnd = `"mattress-pillow-refresh": {
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
  },
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
  }
};`;

if (!content.includes(oldDetailDataEnd)) {
  console.error("Could not find oldDetailDataEnd!");
  process.exit(1);
}
content = content.replace(oldDetailDataEnd, newDetailDataEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated Carpet Cleaning service inside SofaCleaningModal.jsx!");
