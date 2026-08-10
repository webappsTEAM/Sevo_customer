const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'ui', 'pages', 'LandingPage.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('KitchenCleaningModal') || line.includes('PackageModal')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
