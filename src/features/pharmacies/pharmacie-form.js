/**
 * pharmacie-form.js — Formulaire de saisie d'une visite commerciale en pharmacie.
 * Gère l'autocomplétion des officines, les produits AURA avec D/ND et ROT,
 * le bouton global « Tout D / Tout ND », et le pré-remplissage depuis la dernière visite.
 * Reçoit : { onSaveVisite, onCancelEdit }.
 * Renvoie : Conteneur HTML du formulaire avec méthodes de chargement et réinitialisation.
 */
import { createField } from '../../components/field.js';
import { createButton } from '../../components/button.js';
import { createToggleDN } from '../../components/toggle-dn.js';
import { todayLocal, formatDateFr } from '../../core/dates.js';
import { escapeHtml } from '../../core/text.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';
import { pharmaciesRepo } from './pharmacies-repo.js';

export function createPharmacieForm({
  onSaveVisite = null,
  onCancelEdit = null
} = {}) {
  const container = document.createElement('div');
  container.className = 'card pharmacie-form-card';

  // Bandeau d'édition
  const editBanner = document.createElement('div');
  editBanner.style.cssText = `
    display: none; background: #FEF3C7; border: 1px solid #F59E0B;
    padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 16px;
    font-size: 13px; color: #92400E; font-weight: 600; justify-content: space-between; align-items: center;
  `;
  container.appendChild(editBanner);

  // Bannière de pré-remplissage historique
  const prefillBanner = document.createElement('div');
  prefillBanner.style.cssText = `
    display: none; background: rgba(0, 122, 255, 0.08); border-left: 3px solid var(--brand);
    padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 14px;
    font-size: 12px; color: var(--brand); font-weight: 600;
  `;
  container.appendChild(prefillBanner);

  const titleEl = document.createElement('h3');
  titleEl.className = 'card-title';
  titleEl.textContent = 'Nouvelle visite pharmacie';
  container.appendChild(titleEl);

  let currentPharmacie = null;
  let editingVisiteId = null;
  const productRowsMap = new Map(); // idProduit -> { getDispo, setDispo, getRot, setRot }

  // 1. Date de la visite
  const dateField = createField({
    label: 'Date de visite',
    type: 'date',
    value: todayLocal(),
    required: true
  });
  container.appendChild(dateField.element);

  // 2. Nom de la pharmacie
  const nomField = createField({
    label: 'Nom de la pharmacie',
    placeholder: 'Ex: Pharmacie Centrale, Pharmacie Benali...',
    required: true
  });
  container.appendChild(nomField.element);

  // 3. Secteur et Grossiste
  const secteurField = createField({
    label: 'Secteur (quartier / zone)',
    placeholder: 'Ex: Kouba, Bab Ezzouar, Hydra...',
    required: true
  });
  container.appendChild(secteurField.element);

  const grossisteField = createField({
    label: 'Grossiste habituel',
    placeholder: 'Ex: Biopharm, Hydrapharm, Cpa...',
    required: true
  });
  container.appendChild(grossisteField.element);

  // 4. Section Disponibilités & Rotations AURA
  const dispoSectionHeader = document.createElement('div');
  dispoSectionHeader.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border);
  `;
  dispoSectionHeader.innerHTML = `
    <span style="font-weight: 700; font-size: 14px; color: var(--text-main);">Gamme AURA (Dispo & Rotation)</span>
  `;

  // Bouton bascule « Tout D / Tout ND »
  let allDState = false;
  const toggleAllBtn = createButton({
    text: 'Tout marquer D',
    variant: 'secondary',
    extraClass: 'btn-sm',
    onClick: () => {
      allDState = !allDState;
      toggleAllBtn.querySelector('span:last-child').textContent = allDState ? 'Tout marquer ND' : 'Tout marquer D';
      const targetState = allDState ? 'D' : 'ND';
      for (const row of productRowsMap.values()) {
        row.setDispo(targetState);
      }
    }
  });
  dispoSectionHeader.appendChild(toggleAllBtn);
  container.appendChild(dispoSectionHeader);

  // Conteneur de la liste des produits
  const productsListContainer = document.createElement('div');
  productsListContainer.className = 'pharmacie-products-list';
  productsListContainer.style.marginBottom = '16px';
  container.appendChild(productsListContainer);

  /**
   * Construit la grille des produits actifs AURA.
   */
  async function renderProductRows() {
    productsListContainer.innerHTML = '';
    productRowsMap.clear();

    const db = await getLocalDb();
    const allProduits = await db.getAll(TABLES.PRODUITS);
    const actifs = allProduits.filter(p => p.actif !== false && !p.deleted_at);
    actifs.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    for (const p of actifs) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0; border-bottom: 1px dashed var(--border); gap: 10px;
      `;

      const hex = p.couleur ? (p.couleur.startsWith('#') ? p.couleur : `#${p.couleur}`) : '#4F81BD';

      // Nom du produit avec pastille
      const nameCol = document.createElement('div');
      nameCol.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;';
      nameCol.innerHTML = `
        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${hex}; flex-shrink: 0;"></span>
        <span style="font-weight: 600; font-size: 13px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.nom)}</span>
      `;

      // Champ ROT (rotation)
      const rotCol = document.createElement('div');
      rotCol.style.cssText = 'width: 65px; flex-shrink: 0;';
      const rotInput = document.createElement('input');
      rotInput.type = 'text';
      rotInput.inputMode = 'numeric';
      rotInput.placeholder = 'ROT';
      rotInput.className = 'field-input';
      rotInput.style.cssText = 'padding: 6px 8px; text-align: center; font-size: 13px; min-height: 38px;';
      rotCol.appendChild(rotInput);

      // Interrupteur D / ND
      const toggle = createToggleDN({ value: 'ND' });

      row.appendChild(nameCol);
      row.appendChild(rotCol);
      row.appendChild(toggle.element);
      productsListContainer.appendChild(row);

      productRowsMap.set(p.id, {
        getDispo: () => toggle.getValue(),
        setDispo: (v) => toggle.setValue(v),
        getRot: () => rotInput.value.trim(),
        setRot: (v) => { rotInput.value = v || ''; }
      });
    }
  }

  // 5. Observation
  const obsField = createField({
    label: 'Observation / Commentaires',
    type: 'textarea',
    placeholder: 'Accueil du pharmacien, besoins en réapprovisionnement, remarques...'
  });
  container.appendChild(obsField.element);

  // 6. Bouton Enregistrer
  const saveBtn = createButton({
    text: 'Ajouter au rapport',
    variant: 'primary',
    icon: '💾',
    fullWidth: true,
    onClick: () => submitForm()
  });
  container.appendChild(saveBtn);

  function getDisponibilitesData() {
    const res = {};
    for (const [pId, controls] of productRowsMap.entries()) {
      res[pId] = {
        dispo: controls.getDispo() === 'D',
        rot: controls.getRot()
      };
    }
    return res;
  }

  function validate(data) {
    const missing = [];
    if (!data.nom) { missing.push('Nom de la pharmacie'); nomField.setError(true); } else nomField.setError(false);
    if (!data.secteur) { missing.push('Secteur'); secteurField.setError(true); } else secteurField.setError(false);
    if (!data.grossiste) { missing.push('Grossiste'); grossisteField.setError(true); } else grossisteField.setError(false);
    return missing;
  }

  async function submitForm() {
    const data = {
      id: editingVisiteId || undefined,
      pharmacie_id: currentPharmacie ? currentPharmacie.id : undefined,
      date_visite: dateField.getValue() || todayLocal(),
      nom: nomField.getValue().trim(),
      secteur: secteurField.getValue().trim(),
      grossiste: grossisteField.getValue().trim(),
      disponibilites: getDisponibilitesData(),
      observation: obsField.getValue().trim()
    };

    const missing = validate(data);
    if (missing.length > 0) {
      if (typeof onSaveVisite === 'function') {
        onSaveVisite({ error: `Champs obligatoires manquants : ${missing.join(', ')}` });
      }
      return;
    }

    if (typeof onSaveVisite === 'function') {
      onSaveVisite({ success: true, data });
    }
  }

  // Chargement initial des lignes de produits
  renderProductRows();

  return {
    element: container,

    /**
     * Sélectionne une pharmacie existante et applique le pré-remplissage intelligent.
     */
    async loadPharmacie(pharmacie) {
      currentPharmacie = pharmacie;
      editingVisiteId = null;
      editBanner.style.display = 'none';

      titleEl.textContent = `Visite : ${pharmacie.nom}`;
      saveBtn.querySelector('span:last-child').textContent = 'Ajouter au rapport';

      dateField.setValue(todayLocal());
      nomField.setValue(pharmacie.nom || '');
      secteurField.setValue(pharmacie.secteur || '');
      grossisteField.setValue(pharmacie.grossiste_habituel || '');
      obsField.setValue('');

      // Pré-remplissage depuis la dernière visite
      const lastVisite = await pharmaciesRepo.getLastVisit(pharmacie.id);
      if (lastVisite && lastVisite.disponibilites) {
        prefillBanner.innerHTML = `ℹ️ Valeurs pré-remplies d'après la dernière visite du <b>${formatDateFr(lastVisite.date_visite)}</b> — à vérifier.`;
        prefillBanner.style.display = 'block';

        for (const [pId, controls] of productRowsMap.entries()) {
          const prev = lastVisite.disponibilites[pId];
          if (prev) {
            controls.setDispo(prev.dispo ? 'D' : 'ND');
            controls.setRot(prev.rot || '');
          } else {
            controls.setDispo('ND');
            controls.setRot('');
          }
        }
      } else {
        prefillBanner.style.display = 'none';
        for (const controls of productRowsMap.values()) {
          controls.setDispo('ND');
          controls.setRot('');
        }
      }
    },

    /**
     * Charge une visite existante pour modification.
     */
    async loadVisiteForEdit(visite) {
      editingVisiteId = visite.id;
      currentPharmacie = { id: visite.pharmacie_id, nom: visite.nom };
      prefillBanner.style.display = 'none';

      editBanner.innerHTML = `
        <span>Modification de la visite : <b>${escapeHtml(visite.nom)}</b></span>
        <button type="button" class="btn-cancel-edit" style="background: none; border: none; font-size: 12px; font-weight: bold; color: var(--brand); cursor: pointer;">Annuler</button>
      `;
      editBanner.querySelector('.btn-cancel-edit').addEventListener('click', () => {
        if (typeof onCancelEdit === 'function') onCancelEdit();
      });
      editBanner.style.display = 'flex';

      titleEl.textContent = 'Modifier la visite pharmacie';
      saveBtn.querySelector('span:last-child').textContent = 'Mettre à jour la visite';

      dateField.setValue(visite.date_visite || todayLocal());
      nomField.setValue(visite.nom || '');
      secteurField.setValue(visite.secteur || '');
      grossisteField.setValue(visite.grossiste || '');
      obsField.setValue(visite.observation || '');

      const dispos = visite.disponibilites || {};
      for (const [pId, controls] of productRowsMap.entries()) {
        const item = dispos[pId];
        if (item) {
          controls.setDispo(item.dispo ? 'D' : 'ND');
          controls.setRot(item.rot || '');
        } else {
          controls.setDispo('ND');
          controls.setRot('');
        }
      }
    },

    /**
     * Réinitialise le formulaire.
     */
    reset() {
      currentPharmacie = null;
      editingVisiteId = null;
      editBanner.style.display = 'none';
      prefillBanner.style.display = 'none';
      titleEl.textContent = 'Nouvelle visite pharmacie';
      saveBtn.querySelector('span:last-child').textContent = 'Ajouter au rapport';

      dateField.setValue(todayLocal());
      nomField.setValue('');
      secteurField.setValue('');
      grossisteField.setValue('');
      obsField.setValue('');

      for (const controls of productRowsMap.values()) {
        controls.setDispo('ND');
        controls.setRot('');
      }
    }
  };
}
