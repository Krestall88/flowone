const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const sizes = [192, 512];
  const publicDir = path.join(__dirname, '..', 'public');

  // Create a simple green square with rounded corners
  const svgIcon = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="80" fill="#10b981"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="180" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">H</text>
    </svg>
  `;

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}.png`);
    
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated ${outputPath}`);
  }
}

generateIcons().catch(console.error);
