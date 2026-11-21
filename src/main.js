/**
 * main.js — Point d'entrée de l'application Délégation V2.
 * Initialise les polices locales, charge les feuilles de style,
 * enregistre le Service Worker PWA, et monte l'App Shell avec barrière d'erreur.
 */
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

import { initAppShell } from './app-shell.js';
import { settings } from './core/settings.js';
import { syncEngine } from './core/sync-engine.js';

// Barrière d'erreur globale pour éviter les écrans blancs mystérieux
window.addEventListener('error', (event) => {
  console.error('Erreur globale détectée:', event.error || event.message);
  const appEl = document.getElementById('app');
  if (appEl && (!appEl.innerHTML || appEl.innerHTML.trim() === '')) {
    appEl.innerHTML = `
      <div style="padding: 24px; font-family: -apple-system, sans-serif; color: #1E293B; background: #FFFFFF; min-height: 100vh; box-sizing: border-box;">
        <h2 style="color: #EF4444; margin-bottom: 12px; font-size: 20px;">⚠️ Erreur de démarrage</h2>
        <p style="font-size: 14px; color: #64748B; margin-bottom: 14px;">Une anomalie s'est produite lors du chargement :</p>
        <pre style="background: #FEE2E2; color: #991B1B; padding: 14px; border-radius: 8px; font-size: 12px; overflow: auto; white-space: pre-wrap;">${event.error?.stack || event.message || event}</pre>
        <button onclick="localStorage.clear(); location.reload();" style="margin-top: 16px; padding: 12px 20px; background: #007AFF; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">
          Réinitialiser et recharger
        </button>
      </div>
    `;
  }
});

// Enregistrement PWA via Workbox (si supporté)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('PWA Service Worker actif avec le scope:', reg.scope);
    }).catch(err => {
      console.warn('Erreur enregistrement Service Worker:', err);
    });
  });
}

try {
  // Chargement des préférences locales
  settings.loadFromLocal();

  // Initialisation de la coquille applicative
  const appRoot = document.getElementById('app');
  if (appRoot) {
    initAppShell(appRoot);
  }

  // Démarrage du moteur de synchronisation en arrière-plan
  syncEngine.init();
} catch (err) {
  console.error('Erreur critique initialisation:', err);
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = `
      <div style="padding: 24px; font-family: -apple-system, sans-serif; color: #1E293B; background: #FFFFFF; min-height: 100vh; box-sizing: border-box;">
        <h2 style="color: #EF4444; margin-bottom: 12px; font-size: 20px;">⚠️ Erreur d'initialisation</h2>
        <pre style="background: #FEE2E2; color: #991B1B; padding: 14px; border-radius: 8px; font-size: 12px; overflow: auto; white-space: pre-wrap;">${err.stack || err.message || err}</pre>
        <button onclick="localStorage.clear(); location.reload();" style="margin-top: 16px; padding: 12px 20px; background: #007AFF; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">
          Réinitialiser et recharger
        </button>
      </div>
    `;
  }
}
