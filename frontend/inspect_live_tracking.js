import fs from 'fs';

const filepath = 'c:/Users/user/sevok/sevo/frontend/src/ui/pages/BookingPage.jsx';
const content = fs.readFileSync(filepath, 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('function LiveTrackingPage') || l.includes('Ravi Kumar') || l.includes('Live Tracking')) {
    console.log(`${i + 1}: ${l}`);
  }
});
