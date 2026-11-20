/**
 * medecin-form.js — Formulaire interactif de saisie d'une visite médecin.
 * Prend en charge le pré-remplissage complet, les produits discutés AURA,
 * le mode modification et la mise à jour conditionnelle de la fiche médecin.
 * Reçoit : { onSaveVisite, onQuickVisit, onCancelEdit }.
 * Renvoie : Conteneur HTML du formulaire avec méthodes de chargement et réinitialisation.
 */
import { createField } from '../../components/field.js';
import { createButton } from '../../components/button.js';
import { createChip } from '../../components/chip.js';
import { todayLocal } from '../../core/dates.js';
import { escapeHtml } from '../../core/text.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';

export function createMedecinForm({
  onSaveVisite = null,
  onQuickVisit = null,
  onCancelEdit = null
} = {}) {
  const container = document.createElement('div');
  container.className = 'card medecin-form-card';
  container.style.display = 'none'; // Masqué tant qu'aucun médecin n'est sélectionné

  // Bandeau d'édition
  const editBanner = document.createElement('div');
  editBanner.style.cssText = `
    display: none; background: #FEF3C7; border: 1px solid #F59E0B;
    padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 16px;
    font-size: 13px; color: #92400E; font-weight: 600; justify-content: space-between; align-items: center;
  `;
  container.appendChild(editBanner);

  const titleEl = document.createElement('h3');
  titleEl.className = 'card-title';
  titleEl.textContent = 'Détails de la visite';
  container.appendChild(titleEl);

  // État interne du formulaire
  let currentMedecin = null;
  let editingVisiteId = null;
  let selectedProduits = new Set();
  let originalMedecinSnapshot = null;

  // 1. Date de la visite (par défaut aujourd'hui)
  const dateField = createField({
    label: 'Date de visite',
    type: 'date',
    value: todayLocal(),
    required: true
  });
  container.appendChild(dateField.element);

  // 2. Nom complet & Spécialité
  const nomField = createField({
    label: 'Nom complet du médecin',
    placeholder: 'Ex: Dr. Benali Rachid',
    required: true
  });
  container.appendChild(nomField.element);

  const specialiteField = createField({
    label: 'Spécialité',
    placeholder: 'Ex: Cardiologue, Généraliste, Pédiatre...',
    required: true
  });
  container.appendChild(specialiteField.element);

  // 3. Téléphone, Secteur et Établissement
  const telField = createField({
    label: 'Téléphone',
    type: 'tel',
    placeholder: '05XXXXXXXX',
    inputmode: 'tel'
  });
  container.appendChild(telField.element);

  const secteurField = createField({
    label: 'Secteur (quartier / zone)',
    placeholder: 'Ex: Kouba, Alger Centre, Hydra...',
    required: true
  });
  container.appendChild(secteurField.element);

  const etabField = createField({
    label: 'Établissement',
    placeholder: 'Clinique, Cabinet, Hôpital, Polyclinique...'
  });
  container.appendChild(etabField.element);

  // 4. Observation
  const obsField = createField({
    label: 'Observation / Commentaires de visite',
    type: 'textarea',
    placeholder: 'Accueil, retours sur les produits AURA, promesses de prescription...'
  });
  container.appendChild(obsField.element);

  // 5. Bloc repliable « Plus d'infos » (Statut, Potentiel, Email, Remplaçant)
  const detailsToggle = document.createElement('button');
  detailsToggle.type = 'button';
  detailsToggle.style.cssText = `
    background: none; border: none; color: var(--brand); font-size: 13px; font-weight: 700;
    margin: 8px 0 14px; cursor: pointer; display: flex; align-items: center; gap: 4px;
  `;
  detailsToggle.innerHTML = '▶ Plus d’informations (Statut, Potentiel...)';

  const detailsContainer = document.createElement('div');
  detailsContainer.style.display = 'none';
  detailsContainer.style.cssText = 'padding: 12px; background: var(--bg-main); border-radius: var(--radius-md); margin-bottom: 16px;';

  const statutField = createField({
    label: 'Statut',
    type: 'select',
    options: [
      { value: '', label: 'Non spécifié' },
      { value: 'PUB', label: 'PUB (Secteur Public)' },
      { value: 'CAB', label: 'CAB (Cabinet Privé)' }
    ]
  });

  const potField = createField({
    label: 'Potentiel',
    type: 'select',
    options: [
      { value: '', label: 'Non spécifié' },
      { value: 'A', label: 'A' },
      { value: 'A+', label: 'A+' },
      { value: 'A++', label: 'A++' },
      { value: 'A+++', label: 'A+++' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' }
    ]
  });

  const emailField = createField({
    label: 'Email',
    type: 'text',
    placeholder: 'docteur@exemple.com'
  });

  const remplacantField = createField({
    label: 'Remplaçant habituel',
    placeholder: 'Nom du remplaçant éventuel'
  });

  detailsContainer.appendChild(statutField.element);
  detailsContainer.appendChild(potField.element);
  detailsContainer.appendChild(emailField.element);
  detailsContainer.appendChild(remplacantField.element);

  let detailsOpen = false;
  detailsToggle.addEventListener('click', () => {
    detailsOpen = !detailsOpen;
    detailsContainer.style.display = detailsOpen ? 'block' : 'none';
    detailsToggle.innerHTML = detailsOpen ? '▼ Moins d’informations' : '▶ Plus d’informations (Statut, Potentiel...)';
  });

  container.appendChild(detailsToggle);
  container.appendChild(detailsContainer);

  // 6. Produits discutés (Gamme AURA)
  const produitsTitle = document.createElement('label');
  produitsTitle.className = 'field-label';
  produitsTitle.textContent = 'Produits AURA présentés :';
  container.appendChild(produitsTitle);

  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'chip-container';
  chipsContainer.style.marginBottom = '16px';
  container.appendChild(chipsContainer);

  async function loadProduitsChips() {
    chipsContainer.innerHTML = '';
    const db = await getLocalDb();
    const allProduits = await db.getAll(TABLES.PRODUITS);
    const actifs = allProduits.filter(p => p.actif !== false && !p.deleted_at);
    actifs.sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

    for (const p of actifs) {
      const chip = createChip({
        label: p.nom,
        color: p.couleur || '4F81BD',
        selected: selectedProduits.has(p.id),
        onClick: (isSelected) => {
          if (isSelected) selectedProduits.add(p.id);
          else selectedProduits.delete(p.id);
        }
      });
      chipsContainer.appendChild(chip.element);
    }
  }

  // 7. Case à cocher « Mettre à jour la fiche médecin »
  const updateFicheRow = document.createElement('div');
  updateFicheRow.style.cssText = `
    display: none; align-items: center; gap: 8px; margin-bottom: 16px;
    padding: 10px 14px; background: rgba(71, 50, 196, 0.06); border-radius: var(--radius-sm);
  `;
  const updateFicheCheckbox = document.createElement('input');
  updateFicheCheckbox.type = 'checkbox';
  updateFicheCheckbox.id = 'chk-update-fiche';
  updateFicheCheckbox.style.width = '18px';
  updateFicheCheckbox.style.height = '18px';

  const updateFicheLabel = document.createElement('label');
  updateFicheLabel.htmlFor = 'chk-update-fiche';
  updateFicheLabel.style.fontSize = '13px';
  updateFicheLabel.style.fontWeight = '600';
  updateFicheLabel.textContent = 'Mettre à jour la fiche du médecin avec ces coordonnées';

  updateFicheRow.appendChild(updateFicheCheckbox);
  updateFicheRow.appendChild(updateFicheLabel);
  container.appendChild(updateFicheRow);

  // Détection des modifications pour activer la mise à jour de la fiche
  function checkFicheModifications() {
    if (!originalMedecinSnapshot) {
      updateFicheRow.style.display = 'none';
      return;
    }
    const hasChanged =
      telField.getValue() !== (originalMedecinSnapshot.telephone || '') ||
      secteurField.getValue() !== (originalMedecinSnapshot.secteur || '') ||
      etabField.getValue() !== (originalMedecinSnapshot.etab || '') ||
      statutField.getValue() !== (originalMedecinSnapshot.statut || '') ||
      potField.getValue() !== (originalMedecinSnapshot.pot || '') ||
      emailField.getValue() !== (originalMedecinSnapshot.email || '') ||
      remplacantField.getValue() !== (originalMedecinSnapshot.remplacant || '');

    if (hasChanged) {
      updateFicheRow.style.display = 'flex';
      updateFicheCheckbox.checked = true;
    } else {
      updateFicheRow.style.display = 'none';
    }
  }

  [telField, secteurField, etabField, statutField, potField, emailField, remplacantField].forEach(f => {
    f.input.addEventListener('input', checkFicheModifications);
    f.input.addEventListener('change', checkFicheModifications);
  });

  // 8. Boutons d'action
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 8px;';

  const saveBtn = createButton({
    text: 'Enregistrer la visite',
    variant: 'primary',
    icon: '💾',
    fullWidth: true,
    onClick: () => submitForm()
  });

  const quickBtn = createButton({
    text: '⚡ Visite rapide (1 tap)',
    variant: 'success',
    fullWidth: true,
    onClick: () => {
      if (typeof onQuickVisit === 'function') {
        onQuickVisit(getFormData());
      }
    }
  });

  btnGroup.appendChild(saveBtn);
  btnGroup.appendChild(quickBtn);
  container.appendChild(btnGroup);

  function getFormData() {
    return {
      id: editingVisiteId || undefined,
      medecin_id: currentMedecin ? currentMedecin.id : undefined,
      date_visite: dateField.getValue() || todayLocal(),
      nom: nomField.getValue().trim(),
      specialite: specialiteField.getValue().trim(),
      telephone: telField.getValue().trim(),
      secteur: secteurField.getValue().trim(),
      etab: etabField.getValue().trim(),
      statut: statutField.getValue(),
      pot: potField.getValue(),
      email: emailField.getValue().trim(),
      remplacant: remplacantField.getValue().trim(),
      observation: obsField.getValue().trim(),
      produits_discutes: Array.from(selectedProduits),
      shouldUpdateFiche: updateFicheCheckbox.checked
    };
  }

  function validate(data) {
    const missing = [];
    if (!data.nom) { missing.push('Nom complet'); nomField.setError(true); } else nomField.setError(false);
    if (!data.specialite) { missing.push('Spécialité'); specialiteField.setError(true); } else specialiteField.setError(false);
    if (!data.secteur) { missing.push('Secteur'); secteurField.setError(true); } else secteurField.setError(false);

    return missing;
  }

  function submitForm() {
    const data = getFormData();
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

  return {
    element: container,

    /**
     * Ouvre le formulaire avec les informations d'un médecin existant.
     */
    async loadMedecin(medecin) {
      currentMedecin = medecin;
      originalMedecinSnapshot = { ...medecin };
      editingVisiteId = null;

      editBanner.style.display = 'none';
      titleEl.textContent = `Visite chez ${medecin.nom}`;
      saveBtn.querySelector('span:last-child').textContent = 'Enregistrer la visite';
      quickBtn.style.display = 'inline-flex';

      dateField.setValue(todayLocal());
      nomField.setValue(medecin.nom || '');
      specialiteField.setValue(medecin.specialite || '');
      telField.setValue(medecin.telephone || '');
      secteurField.setValue(medecin.secteur || '');
      etabField.setValue(medecin.etab || '');
      obsField.setValue('');

      statutField.setValue(medecin.statut || '');
      potField.setValue(medecin.pot || '');
      emailField.setValue(medecin.email || '');
      remplacantField.setValue(medecin.remplacant || '');

      selectedProduits.clear();
      await loadProduitsChips();

      updateFicheRow.style.display = 'none';
      updateFicheCheckbox.checked = false;

      container.style.display = 'block';
      obsField.input.focus();
    },

    /**
     * Ouvre le formulaire pour créer un tout nouveau médecin.
     */
    async loadNewMedecin(initialName = '') {
      currentMedecin = null;
      originalMedecinSnapshot = null;
      editingVisiteId = null;

      editBanner.style.display = 'none';
      titleEl.textContent = 'Nouveau médecin & Visite';
      saveBtn.querySelector('span:last-child').textContent = 'Créer médecin & Enregistrer';
      quickBtn.style.display = 'none'; // Pas de visite rapide pour un nouveau médecin non renseigné

      dateField.setValue(todayLocal());
      nomField.setValue(initialName);
      specialiteField.setValue('');
      telField.setValue('');
      secteurField.setValue('');
      etabField.setValue('');
      obsField.setValue('');

      statutField.setValue('');
      potField.setValue('');
      emailField.setValue('');
      remplacantField.setValue('');

      selectedProduits.clear();
      await loadProduitsChips();

      updateFicheRow.style.display = 'none';
      container.style.display = 'block';

      if (!initialName) {
        nomField.input.focus();
      } else {
        specialiteField.input.focus();
      }
    },

    /**
     * Recharge une visite existante pour modification.
     */
    async loadVisiteForEdit(visite) {
      editingVisiteId = visite.id;
      currentMedecin = { id: visite.medecin_id, nom: visite.nom };
      originalMedecinSnapshot = null;

      editBanner.innerHTML = `
        <span>Modification de la visite de <b>${escapeHtml(visite.nom)}</b></span>
        <button type="button" class="btn-cancel-edit" style="background: none; border: none; font-size: 12px; font-weight: bold; color: var(--brand); cursor: pointer;">Annuler</button>
      `;
      editBanner.querySelector('.btn-cancel-edit').addEventListener('click', () => {
        if (typeof onCancelEdit === 'function') onCancelEdit();
      });
      editBanner.style.display = 'flex';

      titleEl.textContent = 'Modifier la visite';
      saveBtn.querySelector('span:last-child').textContent = 'Mettre à jour la visite';
      quickBtn.style.display = 'none';

      dateField.setValue(visite.date_visite || todayLocal());
      nomField.setValue(visite.nom || '');
      specialiteField.setValue(visite.specialite || '');
      telField.setValue(visite.telephone || '');
      secteurField.setValue(visite.secteur || '');
      etabField.setValue(visite.etab || '');
      obsField.setValue(visite.observation || '');

      statutField.setValue(visite.statut || '');
      potField.setValue(visite.pot || '');
      emailField.setValue(visite.email || '');
      remplacantField.setValue(visite.remplacant || '');

      selectedProduits = new Set(visite.produits_discutes || []);
      await loadProduitsChips();

      updateFicheRow.style.display = 'none';
      container.style.display = 'block';
      obsField.input.focus();
    },

    /**
     * Réinitialise et masque le formulaire.
     */
    reset() {
      currentMedecin = null;
      editingVisiteId = null;
      originalMedecinSnapshot = null;
      selectedProduits.clear();
      container.style.display = 'none';
      editBanner.style.display = 'none';
    }
  };
}
