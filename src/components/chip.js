/**
 * chip.js — Pastille de produit cliquable avec couleur personnalisée.
 * Reçoit : { label, color, selected, onClick }.
 * Renvoie : Un élément HTML interactif avec puce de couleur et état sélectionné.
 */
import { escapeHtml } from '../core/text.js';

export function createChip({
  label = '',
  color = '4F81BD', // Code hex sans dièse
  selected = false,
  onClick = null
} = {}) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = `chip ${selected ? 'selected' : ''}`.trim();
  
  const cleanHex = color.startsWith('#') ? color : `#${color}`;

  chip.innerHTML = `
    <span class="chip-dot" style="background-color: ${cleanHex};"></span>
    <span class="chip-text">${escapeHtml(label)}</span>
  `;

  let isSelected = selected;

  chip.addEventListener('click', () => {
    isSelected = !isSelected;
    if (isSelected) chip.classList.add('selected');
    else chip.classList.remove('selected');
    if (typeof onClick === 'function') {
      onClick(isSelected);
    }
  });

  return {
    element: chip,
    isSelected: () => isSelected,
    setSelected: (state) => {
      isSelected = Boolean(state);
      if (isSelected) chip.classList.add('selected');
      else chip.classList.remove('selected');
    }
  };
}
