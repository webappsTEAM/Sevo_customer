const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'ui', 'pages', 'BookingPage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('fixed inset-0') || line.includes('bg-black/')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
