/**
 * autocomplete.js — Composant de recherche avec autocomplétion tactile et clavier.
 * Gère la navigation clavier (flèches, Entrée, Échap) et l'affichage des suggestions.
 * Reçoit : { placeholder, onSearch, onSelect, onAddNew }.
 * Renvoie : Un conteneur HTML interactif avec champ de recherche et liste déroulante.
 */
import { escapeHtml } from '../core/text.js';

export function createAutocomplete({
  placeholder = 'Rechercher...',
  onSearch = null,
  onSelect = null,
  onAddNew = null
} = {}) {
  const container = document.createElement('div');
  container.className = 'autocomplete-container';
  container.style.cssText = 'position: relative; width: 100%;';

  const inputWrapper = document.createElement('div');
  inputWrapper.style.cssText = 'position: relative; width: 100%;';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'field-input';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.style.cssText = 'padding-right: 36px;';

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.innerHTML = '✕';
  clearBtn.style.cssText = `
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; font-size: 14px; color: var(--text-muted);
    cursor: pointer; display: none; width: 24px; height: 24px;
  `;

  inputWrapper.appendChild(input);
  inputWrapper.appendChild(clearBtn);
  container.appendChild(inputWrapper);

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  dropdown.style.cssText = `
    position: absolute; top: calc(100% + 4px); left: 0; right: 0;
    background: var(--bg-card); border-radius: var(--radius-md);
    box-shadow: var(--shadow-float); border: 1px solid var(--border);
    max-height: 280px; overflow-y: auto; z-index: 1000; display: none;
  `;
  container.appendChild(dropdown);

  let activeIndex = -1;
  let currentItems = [];

  function closeDropdown() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    activeIndex = -1;
  }

  function renderItems(items, query) {
    currentItems = items;
    dropdown.innerHTML = '';
    activeIndex = -1;

    if (items.length === 0) {
      if (query.trim() && typeof onAddNew === 'function') {
        const addNewRow = document.createElement('div');
        addNewRow.style.cssText = `
          padding: 14px 16px; font-size: 14px; font-weight: 600;
          color: var(--brand); cursor: pointer; display: flex; align-items: center; gap: 8px;
        `;
        addNewRow.innerHTML = `➕ Ajouter <b>« ${escapeHtml(query.trim())} »</b> comme nouveau médecin`;
        addNewRow.addEventListener('click', () => {
          closeDropdown();
          onAddNew(query.trim());
        });
        dropdown.appendChild(addNewRow);
        dropdown.style.display = 'block';
      } else {
        closeDropdown();
      }
      return;
    }

    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'autocomplete-item';
      row.style.cssText = `
        padding: 12px 16px; border-bottom: 1px solid var(--border);
        cursor: pointer; transition: background 0.15s ease;
      `;

      const potBadge = item.pot ? `<span style="font-size: 10px; background: rgba(0, 122, 255, 0.1); color: var(--brand); padding: 2px 6px; border-radius: 999px; font-weight: 700;">${escapeHtml(item.pot)}</span>` : '';
      const statutBadge = item.statut ? `<span style="font-size: 10px; background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 2px 6px; border-radius: 999px; font-weight: 700;">${escapeHtml(item.statut)}</span>` : '';

      row.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
          <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">${escapeHtml(item.nom)}</div>
          <div style="display: flex; gap: 4px;">${potBadge}${statutBadge}</div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          ${escapeHtml(item.specialite || 'Généraliste')} ${item.secteur ? '· ' + escapeHtml(item.secteur) : ''} ${item.etab ? '(' + escapeHtml(item.etab) + ')' : ''}
        </div>
      `;

      row.addEventListener('mouseenter', () => setActive(index));
      row.addEventListener('click', () => {
        closeDropdown();
        input.value = item.nom;
        clearBtn.style.display = 'block';
        if (typeof onSelect === 'function') onSelect(item);
      });

      dropdown.appendChild(row);
    });

    dropdown.style.display = 'block';
  }

  function setActive(index) {
    const rows = dropdown.querySelectorAll('.autocomplete-item');
    rows.forEach((r, i) => {
      if (i === index) {
        r.style.background = 'var(--bg-main)';
      } else {
        r.style.background = 'none';
      }
    });
    activeIndex = index;
  }

  // Écouteur de saisie instantané (0 ms de délai anti-rebond)
  input.addEventListener('input', () => {
    const val = input.value;
    clearBtn.style.display = val ? 'block' : 'none';
    if (typeof onSearch === 'function') {
      const results = onSearch(val);
      renderItems(results, val);
    }
  });

  // Navigation au clavier
  input.addEventListener('keydown', (e) => {
    const rows = dropdown.querySelectorAll('.autocomplete-item');
    if (dropdown.style.display === 'none' || rows.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = activeIndex < rows.length - 1 ? activeIndex + 1 : 0;
      setActive(next);
      rows[next].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = activeIndex > 0 ? activeIndex - 1 : rows.length - 1;
      setActive(prev);
      rows[prev].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && currentItems[activeIndex]) {
        const chosen = currentItems[activeIndex];
        closeDropdown();
        input.value = chosen.nom;
        if (typeof onSelect === 'function') onSelect(chosen);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    closeDropdown();
    input.focus();
  });

  // Fermer quand on clique en dehors
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeDropdown();
    }
  });

  return {
    element: container,
    input,
    setValue: (val) => {
      input.value = val;
      clearBtn.style.display = val ? 'block' : 'none';
    },
    clear: () => {
      input.value = '';
      clearBtn.style.display = 'none';
      closeDropdown();
    },
    focus: () => input.focus()
  };
}
