const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk('src/ui/pages');
const issues = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const totalBgWhite = (content.match(/bg-white/g) || []).length;
  const totalDarkBg = (content.match(/dark:bg/g) || []).length;
  const hasDark = content.includes('dark:');
  const hasSevoTokens = content.includes('var(--sevo-') || content.includes('var(--surface') || content.includes('var(--bg');

  if (totalBgWhite > 0 && totalDarkBg === 0) {
    issues.push({ file: f, totalBgWhite, totalDarkBg, hasDark, hasSevoTokens, type: 'NO_DARK_BG' });
  } else if (totalBgWhite > 5 && totalDarkBg < 3) {
    issues.push({ file: f, totalBgWhite, totalDarkBg, hasDark, hasSevoTokens, type: 'LOW_DARK_BG' });
  }
});

console.log(JSON.stringify(issues, null, 2));
