/**
 * field.js — Composant champ de saisie (texte, téléphone, sélection, zone de texte).
 * Reçoit : { label, name, type, value, placeholder, required, options, inputmode, onChange }.
 * Renvoie : Un conteneur HTML avec étiquette, champ interactif et gestion d'erreur.
 */
import { escapeHtml } from '../core/text.js';

export function createField({
  label = '',
  name = '',
  type = 'text', // 'text' | 'tel' | 'number' | 'date' | 'textarea' | 'select'
  value = '',
  placeholder = '',
  required = false,
  options = [], // Pour type='select' : [{ value, label }]
  inputmode = '',
  onChange = null,
  id = ''
} = {}) {
  const container = document.createElement('div');
  container.className = 'field-group';
  const fieldId = id || `field-${name || Math.random().toString(36).slice(2, 7)}`;

  if (label) {
    const lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.htmlFor = fieldId;
    lbl.innerHTML = `${escapeHtml(label)}${required ? ' <span class="req">*</span>' : ''}`;
    container.appendChild(lbl);
  }

  let inputEl;

  if (type === 'textarea') {
    inputEl = document.createElement('textarea');
    inputEl.className = 'field-textarea';
    inputEl.rows = 2;
    inputEl.value = value;
    // Auto-agrandissement
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = `${inputEl.scrollHeight}px`;
    });
  } else if (type === 'select') {
    inputEl = document.createElement('select');
    inputEl.className = 'field-select';
    for (const opt of options) {
      const optEl = document.createElement('option');
      optEl.value = typeof opt === 'object' ? opt.value : opt;
      optEl.textContent = typeof opt === 'object' ? opt.label : opt;
      if (optEl.value === value) optEl.selected = true;
      inputEl.appendChild(optEl);
    }
  } else {
    inputEl = document.createElement('input');
    inputEl.type = type;
    inputEl.className = 'field-input';
    inputEl.value = value;
    if (inputmode) inputEl.inputMode = inputmode;
  }

  inputEl.id = fieldId;
  inputEl.name = name;
  if (placeholder) inputEl.placeholder = placeholder;
  if (required) inputEl.required = true;

  if (typeof onChange === 'function') {
    inputEl.addEventListener('input', (e) => onChange(e.target.value));
    inputEl.addEventListener('change', (e) => onChange(e.target.value));
  }

  container.appendChild(inputEl);

  return {
    element: container,
    input: inputEl,
    getValue: () => inputEl.value,
    setValue: (val) => { inputEl.value = val; },
    setError: (hasError) => {
      if (hasError) inputEl.classList.add('has-error');
      else inputEl.classList.remove('has-error');
    }
  };
}
