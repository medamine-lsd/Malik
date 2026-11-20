/**
 * app-shell.js — Cadre structurel principal de l'application mobile.
 * Gère l'en-tête Aura, les cartes de statistiques, les onglets et la navigation.
 * Reçoit : conteneur racine (#app), configuration initiale.
 * Renvoie : l'interface globale prête avec navigation instantanée.
 */
import { formatDateFr, todayLocal } from './core/dates.js';
import { createSyncBadge } from './components/sync-badge.js';
import { createStatCard } from './components/stat-card.js';
import { createBottomNav } from './components/bottom-nav.js';
import { renderUiShowcase } from './features/ui-showcase.js';
import { createEmptyState } from './components/empty-state.js';
import { events } from './core/events.js';
import { initMedecinsScreen } from './features/medecins/medecins-screen.js';
import { initPharmaciesScreen } from './features/pharmacies/pharmacies-screen.js';
import { getLocalDb } from './core/db-local.js';
import { TABLES } from './config/constants.js';

export function initAppShell(rootEl) {
  rootEl.innerHTML = '';

  const viewport = document.createElement('div');
  viewport.className = 'app-viewport';

  // 1. Décoration d'arrière-plan
  const bgCircles = document.createElement('div');
  bgCircles.className = 'bg-circles';
  bgCircles.innerHTML = '<div class="circle circle-1"></div><div class="circle circle-2"></div>';
  viewport.appendChild(bgCircles);

  // 2. En-tête mobile dégradé
  const header = document.createElement('header');
  header.className = 'app-header';

  const headerTop = document.createElement('div');
  headerTop.className = 'header-top';

  const logo = document.createElement('div');
  logo.className = 'logo-text';
  logo.innerHTML = `Aura <span>Report</span> <span class="logo-badge">V2</span>`;

  // Pastille de synchronisation
  const syncBadge = createSyncBadge({
    state: navigator.onLine ? 'synced' : 'offline',
    onClick: () => {
      // Ouvre les réglages de synchro
      switchTab('reglages');
    }
  });

  headerTop.appendChild(logo);
  headerTop.appendChild(syncBadge.element);
  header.appendChild(headerTop);

  const welcome = document.createElement('div');
  welcome.className = 'header-welcome';
  welcome.innerHTML = `
    <h1 id="user-greeting">Bonjour Amine</h1>
    <p id="header-date">${formatDateFr(todayLocal())}</p>
  `;
  header.appendChild(welcome);
  viewport.appendChild(header);

  // 3. Grille de statistiques (2x2)
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const statTotal = createStatCard({ label: 'Total Visites', value: 0, featured: true, id: 'stat-total' });
  const statMed = createStatCard({ label: 'Médecins', value: 0, id: 'stat-med' });
  const statPharm = createStatCard({ label: 'Pharmacies', value: 0, id: 'stat-pharm' });
  const statSync = createStatCard({ label: 'Synchro', value: navigator.onLine ? 'OK' : 'OFF', id: 'stat-sync' });

  statsGrid.appendChild(statTotal.element);
  statsGrid.appendChild(statMed.element);
  statsGrid.appendChild(statPharm.element);
  statsGrid.appendChild(statSync.element);
  viewport.appendChild(statsGrid);

  // 4. Zone de contenu des onglets
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

  // Montage de l'écran Médecins complet (Phase 5)
  initMedecinsScreen(tabs.medecins);

  // Montage de l'écran Pharmacies complet (Phase 6)
  initPharmaciesScreen(tabs.pharmacies);

  tabs.rapport.appendChild(createEmptyState({
    icon: '📊',
    title: 'Rapport Journalier & Excel',
    description: 'Génération du rapport officiel en 1 clic et partage WhatsApp (disponible en Phase 7).'
  }));

  tabs.reglages.appendChild(createEmptyState({
    icon: '⚙️',
    title: 'Paramètres & Produits',
    description: 'Gestion de la gamme AURA, des grossistes et des secteurs (disponible en Phase 8).'
  }));

  // Page de test UI
  renderUiShowcase(tabs.ui);

  viewport.appendChild(contentArea);

  // 5. Barre de navigation flottante
  const bottomNav = createBottomNav({
    activeTab: 'medecins',
    onTabChange: (tabId) => {
      window.location.hash = `#/${tabId}`;
    }
  });
  viewport.appendChild(bottomNav.element);

  rootEl.appendChild(viewport);

  // 6. Navigation par onglet (Router simple par hash)
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
    if (status.state === 'synced') {
      statSync.setValue('OK');
    } else if (status.state === 'syncing') {
      statSync.setValue('...');
    } else if (status.state === 'pending') {
      statSync.setValue(`${status.pendingCount} att.`);
    } else if (status.state === 'offline') {
      statSync.setValue('OFF');
    } else if (status.state === 'error') {
      statSync.setValue('ERR');
    }
  });

  // Mise à jour automatique des compteurs du jour
  async function refreshTodayCounters() {
    try {
      const db = await getLocalDb();
      const today = todayLocal();

      const medVisites = await db.getAllFromIndex(TABLES.VISITES_MEDECINS, 'date_visite', today);
      const activeMeds = medVisites.filter(v => !v.deleted_at);

      const pharmVisites = await db.getAllFromIndex(TABLES.VISITES_PHARMACIES, 'date_visite', today);
      const activePharms = pharmVisites.filter(v => !v.deleted_at);

      statTotal.setValue(activeMeds.length + activePharms.length);
      statMed.setValue(activeMeds.length);
      statPharm.setValue(activePharms.length);
      bottomNav.setBadge('medecins', activeMeds.length);
      bottomNav.setBadge('pharmacies', activePharms.length);
    } catch {}
  }

  events.on('data-changed', refreshTodayCounters);
  refreshTodayCounters();

  return {
    setGreeting: (nom) => {
      const el = document.getElementById('user-greeting');
      if (el) el.textContent = `Bonjour ${nom || 'Amine'}`;
    },
    updateStats: ({ total = 0, med = 0, pharm = 0 } = {}) => {
      statTotal.setValue(total);
      statMed.setValue(med);
      statPharm.setValue(pharm);
      bottomNav.setBadge('medecins', med);
      bottomNav.setBadge('pharmacies', pharm);
    },
    switchTab
  };
}
