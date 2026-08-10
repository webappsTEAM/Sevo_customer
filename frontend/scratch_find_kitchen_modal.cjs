const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'ui', 'pages', 'BookingPage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('KitchenCleaningModal')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
