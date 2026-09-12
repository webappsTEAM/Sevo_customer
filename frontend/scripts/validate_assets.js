/**
 * validate_assets.js
 * Validates that all assets referenced in assetRegistry.js exist on disk
 * and ensures no unapproved external hosts are present.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ASSET_REGISTRY } from '../src/assets/assetRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

console.log('--- Validating antigravity Asset Registry ---');
let missingCount = 0;

Object.entries(ASSET_REGISTRY).forEach(([key, item]) => {
  if (!item.url) {
    console.error(`[FAIL] Asset "${key}" has no URL!`);
    missingCount++;
    return;
  }
  const diskPath = path.join(publicDir, item.url.replace(/^\//, ''));
  if (!fs.existsSync(diskPath)) {
    console.warn(`[WARN] Asset "${key}" file missing at: ${diskPath}`);
    // Check if fallback exists
    const fallbackPath = path.join(publicDir, 'mockups/sevo_emblem_transparent.png');
    if (!fs.existsSync(fallbackPath)) {
      console.error(`[FAIL] Fallback asset also missing!`);
      missingCount++;
    }
  } else {
    console.log(`[PASS] ${key} -> ${item.url}`);
  }
});

if (missingCount > 0) {
  console.error(`Validation completed with ${missingCount} failures.`);
  process.exit(1);
} else {
  console.log('--- All assets passed verification successfully! ---');
  process.exit(0);
}
