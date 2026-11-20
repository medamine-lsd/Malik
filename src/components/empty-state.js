/**
 * empty-state.js — Affiche un visuel clair lorsqu'une liste est vide.
 * Reçoit : { icon, title, description, actionButton }.
 * Renvoie : Un élément HTML centré et discret.
 */
import { escapeHtml } from '../core/text.js';

export function createEmptyState({
  icon = '📋',
  title = '',
  description = '',
  actionButton = null
} = {}) {
  const cont = document.createElement('div');
  cont.className = 'empty-state';

  cont.innerHTML = `
    <div class="empty-state-icon">${icon}</div>
    ${title ? `<div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: var(--text-main);">${escapeHtml(title)}</div>` : ''}
    <div class="empty-state-text">${escapeHtml(description)}</div>
  `;

  if (actionButton instanceof HTMLElement) {
    actionButton.style.marginTop = '16px';
    cont.appendChild(actionButton);
  }

  return cont;
}
