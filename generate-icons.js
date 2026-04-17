/**
 * App Icon Generator for GoodPharma MR
 *
 * Usage:
 *   1. Save your source icon image as "icon-source.png" in this directory
 *   2. Run: node generate-icons.js
 *
 * Requires: npm install sharp --save-dev  (one-time setup)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, 'icon-source.png');

const ANDROID_SIZES = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const RES_BASE = path.join(
  __dirname,
  'android', 'app', 'src', 'main', 'res'
);

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`ERROR: Source image not found at ${SOURCE}`);
    console.error('Please save your icon as "icon-source.png" in the project root.');
    process.exit(1);
  }

  console.log(`Source: ${SOURCE}\n`);

  for (const { dir, size } of ANDROID_SIZES) {
    const outDir = path.join(RES_BASE, dir);

    // square icon
    const squarePath = path.join(outDir, 'ic_launcher.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(squarePath);
    console.log(`  [OK] ${dir}/ic_launcher.png  (${size}x${size})`);

    // round icon — same image, sharp will handle it; launchers apply the mask
    const roundPath = path.join(outDir, 'ic_launcher_round.png');
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(roundPath);
    console.log(`  [OK] ${dir}/ic_launcher_round.png  (${size}x${size})`);
  }

  console.log('\nDone! Rebuild the app to see the new icon:');
  console.log('  npm run android');
}

generate().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
