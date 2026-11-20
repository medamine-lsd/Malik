/**
 * check-filenames.mjs — Vérifie que tous les fichiers et imports respectent
 * la règle d'or : minuscules-avec-tirets, sans casse discordante.
 * Évite les crashs 404 sur les serveurs Linux (Vercel).
 */
import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve('src');
let hasErrors = false;

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const name = entry.name;

    // Vérifie le pattern minuscules, chiffres, tirets et extensions courantes
    if (!/^[a-z0-9\-.]+$/.test(name)) {
      console.error(`❌ Erreur de nommage : "${fullPath}" contient des majuscules ou des caractères non autorisés.`);
      hasErrors = true;
    }

    if (entry.isDirectory()) {
      checkDir(fullPath);
    } else if (name.endsWith('.js')) {
      checkImports(fullPath);
    }
  }
}

function checkImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Regex pour capturer les imports relatifs : import ... from './...' ou '../...'
  const importRegex = /(?:import|export)\s+(?:.*?from\s+)?['"](\.[^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importTarget = match[1];
    const fileDir = path.dirname(filePath);
    let resolved = path.resolve(fileDir, importTarget);
    
    // Si pas d'extension, tester .js
    if (!fs.existsSync(resolved) && fs.existsSync(resolved + '.js')) {
      resolved += '.js';
    }

    if (!fs.existsSync(resolved)) {
      console.error(`❌ Import introuvable dans ${filePath} : "${importTarget}"`);
      hasErrors = true;
    } else {
      // Vérifier la correspondance exacte de casse sur disque
      const baseNameOnDisk = fs.readdirSync(path.dirname(resolved)).find(f => f.toLowerCase() === path.basename(resolved).toLowerCase());
      if (baseNameOnDisk && baseNameOnDisk !== path.basename(resolved)) {
        console.error(`❌ Discordance de casse dans ${filePath} : "${importTarget}" (sur disque: ${baseNameOnDisk})`);
        hasErrors = true;
      }
    }
  }
}

console.log('Vérification de la casse et des noms de fichiers...');
checkDir(srcDir);

if (hasErrors) {
  console.error('\nÉchec : Corrigez les noms de fichiers avant de continuer.');
  process.exit(1);
} else {
  console.log('✅ Tous les noms de fichiers et imports sont conformes (minuscules-avec-tirets).');
}
