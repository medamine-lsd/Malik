/**
 * listes-manager.js — Gestion des listes simples (Grossistes et Secteurs).
 * Reçoit : conteneur HTML.
 * Renvoie : interface interactive avec ajout et suppression de grossistes et secteurs.
 */
import { createRepo } from '../../core/repo.js';
import { TABLES } from '../../config/constants.js';
import { createButton } from '../../components/button.js';
import { createField } from '../../components/field.js';
import { showToast } from '../../components/toast.js';
import { escapeHtml } from '../../core/text.js';

const grossistesTable = createRepo(TABLES.GROSSISTES);
const secteursTable = createRepo(TABLES.SECTEURS);

export function renderListesManager(container) {
  container.innerHTML = '';

  function createSimpleListSection({ title, repo, placeholder, tableName }) {
    const sec = document.createElement('div');
    sec.style.marginBottom = '20px';

    sec.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">${escapeHtml(title)}</span>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <input type="text" class="field-input input-new-item" placeholder="${escapeHtml(placeholder)}" style="flex: 1; min-height: 38px; font-size: 13px; padding: 6px 12px;">
        <button type="button" class="btn btn-sm btn-primary btn-add-item">Ajouter</button>
      </div>
      <div class="items-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
    `;

    const input = sec.querySelector('.input-new-item');
    const addBtn = sec.querySelector('.btn-add-item');
    const listEl = sec.querySelector('.items-list');

    async function loadItems() {
      listEl.innerHTML = '';
      const items = await repo.list();
      items.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

      if (items.length === 0) {
        listEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Aucun élément enregistré.</span>';
        return;
      }

      for (const item of items) {
        const chip = document.createElement('span');
        chip.style.cssText = `
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
          background: var(--bg-main); border-radius: var(--radius-pill); border: 1px solid var(--border);
          font-size: 12px; font-weight: 600; color: var(--text-main);
        `;
        chip.innerHTML = `
          <span>${escapeHtml(item.nom)}</span>
          <button type="button" class="btn-del-item" style="background: none; border: none; font-size: 12px; color: var(--danger); cursor: pointer; padding: 0 2px;">✕</button>
        `;

        chip.querySelector('.btn-del-item').addEventListener('click', async () => {
          await repo.softDelete(item.id);
          showToast({ message: `"${item.nom}" supprimé`, type: 'info' });
          await loadItems();
        });

        listEl.appendChild(chip);
      }
    }

    addBtn.addEventListener('click', async () => {
      const val = input.value.trim();
      if (!val) return;
      await repo.save({ nom: val });
      input.value = '';
      showToast({ message: `"${val}" ajouté !`, type: 'success' });
      await loadItems();
    });

    loadItems();
    return sec;
  }

  container.appendChild(createSimpleListSection({
    title: 'Grossistes référencés',
    repo: grossistesTable,
    placeholder: 'Ex: Biopharm, Cpa, Hydrapharm...',
    tableName: TABLES.GROSSISTES
  }));

  container.appendChild(createSimpleListSection({
    title: 'Secteurs d’activité',
    repo: secteursTable,
    placeholder: 'Ex: Kouba, Hydra, Alger Centre...',
    tableName: TABLES.SECTEURS
  }));
}
