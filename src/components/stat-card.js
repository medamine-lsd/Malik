/**
 * stat-card.js — Carte de statistique pour la grille 2x2 sous l'en-tête.
 * Reçoit : { label, value, featured, id }.
 * Renvoie : Un conteneur HTML stylisé avec son chiffre en grand et son intitulé.
 */
import { escapeHtml } from '../core/text.js';

export function createStatCard({
  label = '',
  value = 0,
  featured = false,
  id = ''
} = {}) {
  const card = document.createElement('div');
  card.className = `stat-card ${featured ? 'featured' : ''}`.trim();
  if (id) card.id = id;

  card.innerHTML = `
    <div class="stat-val" data-role="val">${escapeHtml(String(value))}</div>
    <div class="stat-label">${escapeHtml(label)}</div>
  `;

  return {
    element: card,
    setValue: (newVal) => {
      const valEl = card.querySelector('[data-role="val"]');
      if (valEl) valEl.textContent = String(newVal);
    }
  };
}
