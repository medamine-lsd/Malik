/**
 * bottom-nav.js — Barre de navigation mobile flottante à 4 onglets.
 * Reçoit : { activeTab, onTabChange, badges: { medecins, pharmacies } }.
 * Renvoie : L'élément HTML de la barre de navigation avec écouteurs de clic.
 */
export function createBottomNav({
  activeTab = 'medecins',
  onTabChange = null,
  badges = { medecins: 0, pharmacies: 0 }
} = {}) {
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  const tabs = [
    { id: 'medecins', label: 'Médecins', icon: '🩺' },
    { id: 'pharmacies', label: 'Pharmacie', icon: '💊' },
    { id: 'rapport', label: 'Rapport', icon: '📊' },
    { id: 'reglages', label: 'Réglages', icon: '⚙️' }
  ];

  let currentTab = activeTab;

  function render() {
    nav.innerHTML = '';
    for (const t of tabs) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `nav-item ${t.id === currentTab ? 'active' : ''}`;
      item.setAttribute('data-tab', t.id);

      const count = badges[t.id] || 0;
      const badgeHtml = count > 0 ? `<span class="nav-badge">${count}</span>` : '';

      item.innerHTML = `
        <span class="nav-icon">${t.icon}</span>
        <span class="nav-label">${t.label}</span>
        ${badgeHtml}
      `;

      item.addEventListener('click', () => {
        if (currentTab !== t.id) {
          currentTab = t.id;
          render();
          if (typeof onTabChange === 'function') {
            onTabChange(t.id);
          }
        }
      });

      nav.appendChild(item);
    }
  }

  render();

  return {
    element: nav,
    setActiveTab: (tabId) => {
      currentTab = tabId;
      render();
    },
    setBadge: (tabId, count) => {
      badges[tabId] = count;
      render();
    }
  };
}
