/**
 * card.js — Composant conteneur de carte blanche arrondie.
 * Reçoit : { title, actionElement, children, className }.
 * Renvoie : Un élément HTML <div> structuré avec son en-tête et son contenu.
 */
import { escapeHtml } from '../core/text.js';

export function createCard({
  title = '',
  actionElement = null,
  children = [],
  className = ''
} = {}) {
  const card = document.createElement('div');
  card.className = `card ${className}`.trim();

  if (title || actionElement) {
    const header = document.createElement('div');
    header.className = 'card-title';
    
    const titleSpan = document.createElement('span');
    titleSpan.innerHTML = escapeHtml(title);
    header.appendChild(titleSpan);

    if (actionElement) {
      header.appendChild(actionElement);
    }
    card.appendChild(header);
  }

  const content = document.createElement('div');
  content.className = 'card-body';
  for (const child of children) {
    if (typeof child === 'string') {
      const p = document.createElement('div');
      p.innerHTML = child;
      content.appendChild(p);
    } else if (child instanceof HTMLElement) {
      content.appendChild(child);
    }
  }
  card.appendChild(content);

  return card;
}
