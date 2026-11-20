/**
 * confirm-modal.js — Boîte de dialogue de confirmation élégante.
 * Reçoit : { title, message, confirmText, cancelText, onConfirm, onCancel, isDanger }.
 * Renvoie : Affiche un dialogue centré avec arrière-plan flou.
 */
import { escapeHtml } from '../core/text.js';
import { createButton } from './button.js';

export function showConfirmModal({
  title = 'Confirmation',
  message = 'Êtes-vous sûr ?',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  onConfirm = null,
  onCancel = null,
  isDanger = false
} = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';

  dialog.innerHTML = `
    <h3 class="modal-title">${escapeHtml(title)}</h3>
    <p class="modal-body">${escapeHtml(message)}</p>
  `;

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const cancelBtn = createButton({
    text: cancelText,
    variant: 'secondary',
    onClick: () => {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
  });

  const confirmBtn = createButton({
    text: confirmText,
    variant: isDanger ? 'danger' : 'primary',
    onClick: () => {
      close();
      if (typeof onConfirm === 'function') onConfirm();
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(actions);
  backdrop.appendChild(dialog);

  function close() {
    if (backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      close();
      if (typeof onCancel === 'function') onCancel();
    }
  });

  document.body.appendChild(backdrop);
}
