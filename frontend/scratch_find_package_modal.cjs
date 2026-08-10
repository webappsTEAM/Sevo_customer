const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'ui', 'pages');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (file.endsWith('.jsx') || file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    if (content.includes('PackageModal')) {
      console.log(`File ${file} references PackageModal`);
    }
    if (content.includes('KitchenCleaningModal')) {
      console.log(`File ${file} references KitchenCleaningModal`);
    }
  }
});
