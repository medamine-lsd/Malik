/**
 * app-shell.js — Cadre structurel principal de l'application mobile (Bleu AURA Moderne).
 * En-tête épuré et compact sans bandeau encombrant, navigation fluide et responsive.
 * Reçoit : conteneur racine (#app).
 * Renvoie : l'interface globale prête avec navigation instantanée.
 */
import { formatDateFr, todayLocal } from './core/dates.js';
import { createSyncBadge } from './components/sync-badge.js';
import { createBottomNav } from './components/bottom-nav.js';
import { renderUiShowcase } from './features/ui-showcase.js';
import { events } from './core/events.js';
import { initMedecinsScreen } from './features/medecins/medecins-screen.js';
import { initPharmaciesScreen } from './features/pharmacies/pharmacies-screen.js';
import { initRapportScreen } from './features/rapport/rapport-screen.js';
import { initReglagesScreen } from './features/reglages/reglages-screen.js';
import { getLocalDb } from './core/db-local.js';
import { TABLES } from './config/constants.js';

const TAB_TITLES = {
  medecins: '🩺 Rapport Médical',
  pharmacies: '💊 Rapport Pharmacie',
  rapport: '📊 Rapports & Export',
  reglages: '⚙️ Réglages & Profil',
  ui: '🎨 Galerie UI'
};

export function initAppShell(rootEl) {
  rootEl.innerHTML = '';

  const viewport = document.createElement('div');
  viewport.className = 'app-viewport';

  // 1. Décoration d'arrière-plan avec cercles bleus doux
  const bgCircles = document.createElement('div');
  bgCircles.className = 'bg-circles';
  bgCircles.innerHTML = '<div class="circle circle-1"></div><div class="circle circle-2"></div>';
  viewport.appendChild(bgCircles);

  // 2. En-tête mobile compact et moderne (Exigence utilisateur : éliminer le gros bandeau)
  const header = document.createElement('header');
  header.className = 'app-header-compact';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'header-compact-left';

  const tabTitle = document.createElement('h1');
  tabTitle.className = 'header-tab-title';
  tabTitle.id = 'current-tab-title';
  tabTitle.textContent = '🩺 Rapport Médical';

  const tabDate = document.createElement('p');
  tabDate.className = 'header-tab-subtitle';
  tabDate.id = 'current-tab-date';
  tabDate.textContent = formatDateFr(todayLocal());

  headerLeft.appendChild(tabTitle);
  headerLeft.appendChild(tabDate);

  // Pastille de synchronisation discrète en haut à droite
  const syncBadge = createSyncBadge({
    state: navigator.onLine ? 'synced' : 'offline',
    onClick: () => {
      switchTab('reglages');
    }
  });

  header.appendChild(headerLeft);
  header.appendChild(syncBadge.element);
  viewport.appendChild(header);

  // 3. Zone de contenu des onglets (pleine hauteur pour téléphone)
  const contentArea = document.createElement('main');
  contentArea.className = 'app-content';

  const tabs = {
    medecins: document.createElement('section'),
    pharmacies: document.createElement('section'),
    rapport: document.createElement('section'),
    reglages: document.createElement('section'),
    ui: document.createElement('section') // Page de test cachée /#/ui
  };

  for (const [key, section] of Object.entries(tabs)) {
    section.className = 'tab-content';
    section.id = `tab-${key}`;
    contentArea.appendChild(section);
  }

  // Montage des 4 écrans complets
  initMedecinsScreen(tabs.medecins);
  initPharmaciesScreen(tabs.pharmacies);
  initRapportScreen(tabs.rapport);
  initReglagesScreen(tabs.reglages);
  renderUiShowcase(tabs.ui);

  viewport.appendChild(contentArea);

  // 4. Barre de navigation flottante
  const bottomNav = createBottomNav({
    activeTab: 'medecins',
    onTabChange: (tabId) => {
      window.location.hash = `#/${tabId}`;
    }
  });
  viewport.appendChild(bottomNav.element);

  rootEl.appendChild(viewport);

  // 5. Navigation par onglet (Router simple par hash)
  function switchTab(tabId) {
    const target = tabs[tabId] ? tabId : 'medecins';
    for (const [key, section] of Object.entries(tabs)) {
      if (key === target) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    }
    bottomNav.setActiveTab(target);

    // Mise à jour du titre de l'écran dans l'en-tête
    if (tabTitle && TAB_TITLES[target]) {
      tabTitle.textContent = TAB_TITLES[target];
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash === 'ui') {
      switchTab('ui');
    } else if (tabs[hash]) {
      switchTab(hash);
    } else {
      switchTab('medecins');
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Écoute des événements du moteur de synchronisation
  events.on('sync-status', (status) => {
    syncBadge.setState(status.state, status.pendingCount || 0);
  });

  // Mise à jour automatique des compteurs dans les badges de navigation
  async function refreshTodayCounters() {
    try {
      const db = await getLocalDb();
      const today = todayLocal();

      const medVisites = await db.getAllFromIndex(TABLES.VISITES_MEDECINS, 'date_visite', today);
      const activeMeds = medVisites.filter(v => !v.deleted_at);

      const pharmVisites = await db.getAllFromIndex(TABLES.VISITES_PHARMACIES, 'date_visite', today);
      const activePharms = pharmVisites.filter(v => !v.deleted_at);

      const total = activeMeds.length + activePharms.length;
      bottomNav.setBadge('medecins', activeMeds.length);
      bottomNav.setBadge('pharmacies', activePharms.length);
    } catch (err) {
      console.warn('Erreur mise à jour compteurs:', err);
    }
  }

  events.on('data-changed', refreshTodayCounters);
  refreshTodayCounters();

  return {
    setGreeting: () => {},
    updateStats: ({ med = 0, pharm = 0 } = {}) => {
      bottomNav.setBadge('medecins', med);
      bottomNav.setBadge('pharmacies', pharm);
    },
    switchTab
  };
}
