/**
 * make-icons.mjs — Génère les icônes PWA nécessaires à partir du SVG source.
 * Entrée : public/favicon.svg
 * Sortie : public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const iconsDir = path.join(publicDir, 'icons');
const svgPath = path.join(publicDir, 'favicon.svg');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generate() {
  console.log('Génération des icônes PWA depuis favicon.svg...');
  
  // 192x192 standard
  await sharp(svgPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ icon-192.png créé');

  // 512x512 standard
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ icon-512.png créé');

  // 512x512 maskable (avec marge de sécurité de 10% pour l'arrondi Android)
  const maskableSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#4732C4"/>
    <text x="50%" y="54%" font-family="Montserrat, system-ui, sans-serif" font-size="280" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central">A</text>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('✓ icon-maskable-512.png créé');
  
  console.log('Toutes les icônes PWA sont prêtes.');
}

generate().catch(err => {
  console.error('Erreur lors de la création des icônes :', err);
  process.exit(1);
});
