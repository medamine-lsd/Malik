/**
 * produits-manager.js — Gestionnaire de la gamme de produits AURA.
 * Permet d'ajouter, renommer, changer la couleur hexadécimale,
 * réordonner (↑ ↓) et activer/désactiver chaque produit.
 * Reçoit : conteneur HTML.
 * Renvoie : interface interactive connectée à la table produits.
 */
import { getLocalDb } from '../../core/db-local.js';
import { createRepo } from '../../core/repo.js';
import { TABLES } from '../../config/constants.js';
import { createButton } from '../../components/button.js';
import { createField } from '../../components/field.js';
import { showToast } from '../../components/toast.js';
import { escapeHtml } from '../../core/text.js';

const produitsTable = createRepo(TABLES.PRODUITS);

export function renderProduitsManager(container) {
  container.innerHTML = '';

  const headerRow = document.createElement('div');
  headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
  headerRow.innerHTML = `
    <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">Gamme AURA</span>
    <button type="button" id="btn-add-product" style="font-size: 12px; font-weight: 700; color: var(--brand); background: none; border: none; cursor: pointer;">
      ➕ Ajouter un produit
    </button>
  `;
  container.appendChild(headerRow);

  const listEl = document.createElement('div');
  listEl.className = 'produits-list';
  container.appendChild(listEl);

  // Formulaire d'ajout rapide (replié par défaut)
  const addForm = document.createElement('div');
  addForm.style.cssText = 'display: none; padding: 12px; background: var(--bg-main); border-radius: var(--radius-md); margin-bottom: 14px; border: 1px solid var(--border);';
  
  const nameInput = createField({ label: 'Nom du produit', placeholder: 'Ex: AURA MAGNESIUM' });
  const colorInput = createField({ label: 'Couleur (code hex)', placeholder: '4F81BD', value: '4F81BD' });
  
  const saveProductBtn = createButton({
    text: 'Créer ce produit',
    variant: 'primary',
    extraClass: 'btn-sm',
    onClick: async () => {
      const nom = nameInput.getValue().trim();
      const couleur = colorInput.getValue().replace('#', '').trim() || '4F81BD';
      if (!nom) {
        showToast({ message: 'Veuillez saisir un nom de produit', type: 'error' });
        return;
      }

      const all = await produitsTable.list({ includeDeleted: true });
      await produitsTable.save({
        nom,
        couleur,
        ordre: all.length + 1,
        actif: true
      });

      showToast({ message: `Produit ${nom} ajouté !`, type: 'success' });
      nameInput.setValue('');
      addForm.style.display = 'none';
      await loadProduits();
    }
  });

  addForm.appendChild(nameInput.element);
  addForm.appendChild(colorInput.element);
  addForm.appendChild(saveProductBtn);
  container.appendChild(addForm);

  headerRow.querySelector('#btn-add-product').addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
  });

  async function loadProduits() {
    listEl.innerHTML = '';
    const all = await produitsTable.list();
    all.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    if (all.length === 0) {
      listEl.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 12px;">Aucun produit configuré.</div>';
      return;
    }

    all.forEach((p, idx) => {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 10px; background: var(--bg-main); border-radius: var(--radius-sm);
        margin-bottom: 6px; border: 1px solid var(--border); font-size: 13px; gap: 8px;
        opacity: ${p.actif !== false ? '1' : '0.5'};
      `;

      const hex = p.couleur ? (p.couleur.startsWith('#') ? p.couleur : `#${p.couleur}`) : '#4F81BD';

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <input type="color" value="${hex}" class="color-picker" style="width: 24px; height: 24px; border: none; border-radius: 4px; cursor: pointer; background: none;">
          <span style="font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.nom)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="btn-up" style="background: none; border: none; font-size: 12px; cursor: pointer; padding: 4px;" title="Monter">⬆️</button>
          <button type="button" class="btn-down" style="background: none; border: none; font-size: 12px; cursor: pointer; padding: 4px;" title="Descendre">⬇️</button>
          <button type="button" class="btn-toggle-active" style="background: none; border: none; font-size: 12px; cursor: pointer; padding: 4px;" title="Activer / Désactiver">
            ${p.actif !== false ? '✅' : '⏸️'}
          </button>
        </div>
      `;

      // Changement de couleur
      row.querySelector('.color-picker').addEventListener('change', async (e) => {
        p.couleur = e.target.value.replace('#', '');
        await produitsTable.save(p);
        showToast({ message: `Couleur de ${p.nom} mise à jour`, type: 'info' });
      });

      // Monter / Descendre
      row.querySelector('.btn-up').addEventListener('click', async () => {
        if (idx === 0) return;
        const prev = all[idx - 1];
        const temp = p.ordre;
        p.ordre = prev.ordre;
        prev.ordre = temp;
        await produitsTable.save(p);
        await produitsTable.save(prev);
        await loadProduits();
      });

      row.querySelector('.btn-down').addEventListener('click', async () => {
        if (idx === all.length - 1) return;
        const next = all[idx + 1];
        const temp = p.ordre;
        p.ordre = next.ordre;
        next.ordre = temp;
        await produitsTable.save(p);
        await produitsTable.save(next);
        await loadProduits();
      });

      // Activer / Désactiver
      row.querySelector('.btn-toggle-active').addEventListener('click', async () => {
        p.actif = p.actif === false;
        await produitsTable.save(p);
        showToast({ message: `${p.nom} ${p.actif ? 'activé' : 'désactivé'}`, type: 'info' });
        await loadProduits();
      });

      listEl.appendChild(row);
    });
  }

  loadProduits();
}
