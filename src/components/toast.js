/**
 * toast.js — Système de notifications flottantes avec support du bouton Annuler.
 * Reçoit : message, type ('info'|'success'|'error'), durée (ms), actionLabel, onAction.
 * Renvoie : Affiche le toast en haut de l'écran avec fermeture automatique.
 */
import { escapeHtml } from '../core/text.js';

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
  }
  return container;
}

export function showToast({
  message = '',
  type = 'info', // 'info' | 'success' | 'error'
  duration = 3500, // 3.5s standard, 6s si action
  actionLabel = '',
  onAction = null
} = {}) {
  const cont = ensureContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const textSpan = document.createElement('span');
  textSpan.innerHTML = escapeHtml(message);
  toast.appendChild(textSpan);

  let actionClicked = false;

  if (actionLabel && typeof onAction === 'function') {
    duration = Math.max(duration, 6000); // 6 secondes pour permettre l'annulation
    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-btn';
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener('click', () => {
      actionClicked = true;
      onAction();
      dismiss();
    });
    toast.appendChild(actionBtn);
  }

  function dismiss() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }

  const timer = setTimeout(() => {
    if (!actionClicked) dismiss();
  }, duration);

  cont.appendChild(toast);

  return { dismiss };
}
