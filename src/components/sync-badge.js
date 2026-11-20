/**
 * sync-badge.js — Pastille visuelle d'état de synchronisation dans l'en-tête.
 * Reçoit : { state: 'synced'|'syncing'|'pending'|'offline'|'error', pendingCount, onClick }.
 * Renvoie : Un élément HTML cliquable affichant l'état en temps réel.
 */
export function createSyncBadge({
  state = 'synced',
  pendingCount = 0,
  onClick = null
} = {}) {
  const badge = document.createElement('div');
  badge.className = `sync-badge ${state}`;
  badge.setAttribute('role', 'button');
  badge.tabIndex = 0;

  function render(currentState, currentCount) {
    badge.className = `sync-badge ${currentState}`;
    let label = 'Synchronisé';

    if (currentState === 'syncing') {
      label = 'En cours...';
    } else if (currentState === 'pending') {
      label = `${currentCount} en attente`;
    } else if (currentState === 'offline') {
      label = 'Hors-ligne';
    } else if (currentState === 'error') {
      label = 'Erreur sync';
    }

    badge.innerHTML = `
      <span class="sync-dot"></span>
      <span class="sync-text">${label}</span>
    `;
  }

  render(state, pendingCount);

  if (typeof onClick === 'function') {
    badge.addEventListener('click', onClick);
  }

  return {
    element: badge,
    setState: (newState, newCount = 0) => {
      render(newState, newCount);
    }
  };
}
