const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const standardSvg = fs.readFileSync(path.join(__dirname, '../public/icon.svg'), 'utf8');

// For maskable icon:
// A full bleed background without rounded corners (rx=0), and the artwork scaled with padding to stay within the 80% safe circle.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1016"/>
      <stop offset="100%" stop-color="#090d13"/>
    </linearGradient>
    <linearGradient id="pen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#6ab0ff"/>
      <stop offset="100%" stop-color="#4f8ef7"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c5cf7"/>
      <stop offset="100%" stop-color="#9b7fff"/>
    </linearGradient>
  </defs>
  <!-- Full bleed background for Android adaptive/maskable shapes -->
  <rect width="512" height="512" fill="url(#bg)"/>
  <!-- Central content scaled ~80% into the safe zone centered at (256, 256) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Subtle grid lines in background -->
    <g stroke="rgba(79,142,247,0.12)" stroke-width="1.8">
      <line x1="128" y1="60" x2="128" y2="452"/>
      <line x1="256" y1="60" x2="256" y2="452"/>
      <line x1="384" y1="60" x2="384" y2="452"/>
      <line x1="60" y1="128" x2="452" y2="128"/>
      <line x1="60" y1="256" x2="452" y2="256"/>
      <line x1="60" y1="384" x2="452" y2="384"/>
    </g>
    <!-- Set square / triangle -->
    <path d="M 110 390 L 110 140 L 370 390 Z"
      fill="none" stroke="url(#rule)" stroke-width="22"
      stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Right angle mark -->
    <path d="M 110 358 L 142 358 L 142 390"
      fill="none" stroke="rgba(124,92,247,0.7)" stroke-width="10"
      stroke-linejoin="round" stroke-linecap="round"/>
    <!-- Drafting pencil -->
    <g transform="rotate(-38, 290, 220)">
      <rect x="270" y="100" width="40" height="200" rx="6" fill="url(#pen)"/>
      <polygon points="270,300 310,300 290,345" fill="#c8deff"/>
      <polygon points="278,335 302,335 290,345" fill="#1a1a1a"/>
      <rect x="270" y="95" width="40" height="18" rx="4" fill="rgba(255,255,255,0.25)"/>
    </g>
    <!-- Ruler tick marks -->
    <g stroke="rgba(124,92,247,0.5)" stroke-width="5" stroke-linecap="round">
      <line x1="152" y1="390" x2="152" y2="374"/>
      <line x1="194" y1="390" x2="194" y2="374"/>
      <line x1="236" y1="390" x2="236" y2="374"/>
      <line x1="278" y1="390" x2="278" y2="374"/>
      <line x1="320" y1="390" x2="320" y2="374"/>
    </g>
  </g>
</svg>`;

const sizes = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

async function generate() {
  const standardBuffer = Buffer.from(standardSvg);
  const maskableBuffer = Buffer.from(maskableSvg);

  for (const s of sizes) {
    const dest = path.join(outDir, `icon-${s}.png`);
    await sharp(standardBuffer)
      .resize(s, s)
      .png()
      .toFile(dest);
    console.log(`Generated: icon-${s}.png`);
  }

  // Maskable icons
  for (const s of [192, 512]) {
    const dest = path.join(outDir, `maskable-${s}.png`);
    await sharp(maskableBuffer)
      .resize(s, s)
      .png()
      .toFile(dest);
    console.log(`Generated: maskable-${s}.png`);
  }

  // Also root apple-touch-icon.png
  await sharp(standardBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));

  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
