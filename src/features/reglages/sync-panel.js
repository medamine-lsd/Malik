/**
 * sync-panel.js — Panneau d'état et de contrôle de la synchronisation Supabase.
 * Affiche les éléments en attente d'envoi et offre le bouton de synchronisation manuelle.
 * Reçoit : conteneur HTML.
 * Renvoie : interface interactive avec compteur d'attente et diagnostic.
 */
import { syncEngine } from '../../core/sync-engine.js';
import { getLocalDb } from '../../core/db-local.js';
import { createButton } from '../../components/button.js';
import { showToast } from '../../components/toast.js';
import { events } from '../../core/events.js';

export function renderSyncPanel(container) {
  container.innerHTML = '';

  const card = document.createElement('div');
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">État de la synchronisation</span>
      <span id="sync-status-badge" style="font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(16, 185, 129, 0.15); color: var(--success);">
        ${navigator.onLine ? 'En ligne' : 'Hors-ligne'}
      </span>
    </div>

    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;" id="sync-info-text">
      Chargement de l'état...
    </div>

    <div style="display: flex; gap: 8px;">
      <button type="button" id="btn-force-sync" class="btn btn-sm btn-primary" style="flex: 1;">
        🔄 Synchroniser maintenant
      </button>
    </div>
  `;

  const infoText = card.querySelector('#sync-info-text');
  const badgeEl = card.querySelector('#sync-status-badge');
  const syncBtn = card.querySelector('#btn-force-sync');

  async function updateInfo() {
    const db = await getLocalDb();
    const count = await db.count('outbox');

    if (!navigator.onLine) {
      badgeEl.textContent = 'Hors-ligne';
      badgeEl.style.background = 'rgba(148, 163, 184, 0.15)';
      badgeEl.style.color = '#94A3B8';
      infoText.innerHTML = `L'application fonctionne en local. <b>${count}</b> modification(s) en attente d'envoi dès le retour du réseau.`;
    } else if (count > 0) {
      badgeEl.textContent = `${count} en attente`;
      badgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
      badgeEl.style.color = 'var(--warning)';
      infoText.innerHTML = `<b>${count}</b> modification(s) prête(s) à être transmise(s) à Supabase.`;
    } else {
      badgeEl.textContent = 'Synchronisé';
      badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
      badgeEl.style.color = 'var(--success)';
      infoText.innerHTML = `Toutes vos données locales sont fidèlement sauvegardées sur le serveur Supabase.`;
    }
  }

  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Synchronisation en cours...';
    try {
      await syncEngine.syncNow();
      showToast({ message: 'Synchronisation réussie ✓', type: 'success' });
    } catch {
      showToast({ message: 'Erreur lors de la synchronisation', type: 'error' });
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 Synchroniser maintenant';
      await updateInfo();
    }
  });

  events.on('sync-status', updateInfo);
  events.on('data-changed', updateInfo);
  window.addEventListener('online', updateInfo);
  window.addEventListener('offline', updateInfo);

  updateInfo();
  container.appendChild(card);
}
