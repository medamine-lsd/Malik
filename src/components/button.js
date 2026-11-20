/**
 * button.js — Composant bouton réutilisable.
 * Reçoit : { text, variant, icon, onClick, type, fullWidth, id, extraClass }.
 * Renvoie : Un élément HTML <button> interactif et stylisé.
 */
import { escapeHtml } from '../core/text.js';

export function createButton({
  text = '',
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger'
  icon = '',
  onClick = null,
  type = 'button',
  fullWidth = false,
  id = '',
  extraClass = '',
  disabled = false
} = {}) {
  const btn = document.createElement('button');
  btn.type = type;
  if (id) btn.id = id;
  
  const classes = ['btn', `btn-${variant}`];
  if (fullWidth) classes.push('btn-block');
  if (extraClass) classes.push(extraClass);
  btn.className = classes.join(' ');
  btn.disabled = disabled;

  let content = '';
  if (icon) content += `<span class="btn-icon">${icon}</span> `;
  content += `<span>${escapeHtml(text)}</span>`;
  btn.innerHTML = content;

  if (typeof onClick === 'function') {
    btn.addEventListener('click', onClick);
  }

  return btn;
}
