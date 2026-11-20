/**
 * main.js — Point d'entrée de l'application Délégation V2.
 * Initialise les polices locales, charge les feuilles de style,
 * enregistre le Service Worker PWA, et monte l'App Shell.
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

// Initialisation de la coquille applicative
const appRoot = document.getElementById('app');
initAppShell(appRoot);
