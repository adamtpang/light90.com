const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const sourceIcon = path.join(__dirname, '../public/logo.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  for (const size of sizes) {
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outputDir, `logo${size}.png`));
  }

  // Generate favicon
  await sharp(sourceIcon)
    .resize(32, 32)
    .toFile(path.join(outputDir, 'favicon.ico'));
}

generateIcons().catch(console.error);