/**
 * medecin-form.js — Formulaire de visite médicale conforme à la maquette officielle (Photo 4).
 * Champs organisés en grille mobile, sélection du potentiel [ A ] [ B ] [ C ],
 * affectation automatique du statut (PEDL/MGL/GY -> CAB, PED/MG/VACC/DT -> PUB),
 * et bloc repliable « Plus d'informations ». Ouvert par défaut.
 */
import { createField } from '../../components/field.js';
import { createButton } from '../../components/button.js';
import { createChip } from '../../components/chip.js';
import { todayLocal } from '../../core/dates.js';
import { escapeHtml } from '../../core/text.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';

const CAB_SPECS = ['PEDL', 'MGL', 'GY'];
const PUB_SPECS = ['PED', 'MG', 'VACC', 'DT'];

export function createMedecinForm({
  onSaveVisite = null,
  onQuickVisit = null,
  onCancelEdit = null
} = {}) {
  const container = document.createElement('div');
  container.className = 'card medecin-form-card';
  container.style.display = 'block'; // OUVERT PAR DÉFAUT selon l'exigence utilisateur

  // 1. Bandeau d'édition (si modification d'une visite existante)
  const editBanner = document.createElement('div');
  editBanner.style.cssText = `
    display: none; background: #EFF6FF; border: 1px solid var(--brand);
    padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 14px;
    font-size: 13px; color: var(--brand); font-weight: 700; justify-content: space-between; align-items: center;
  `;
  container.appendChild(editBanner);

  // État interne du formulaire
  let currentMedecin = null;
  let editingVisiteId = null;
  let selectedProduits = new Set();
  let originalMedecinSnapshot = null;
  let currentPot = 'A'; // Par défaut potentiel A

  // 2. Champ 1 : Date de la visite (pleine largeur)
  const dateField = createField({
    label: 'Date de la visite',
    type: 'date',
    value: todayLocal(),
    required: true
  });
  container.appendChild(dateField.element);

  // 3. Champ 2 : Nom et Prénom * (pleine largeur)
  const nomField = createField({
    label: 'Nom et Prénom',
    placeholder: 'Dr. Nom Prénom',
    required: true
  });
  container.appendChild(nomField.element);

  // 4. Ligne 2 colonnes : Spécialité * & Téléphone
  const row1 = document.createElement('div');
  row1.className = 'field-row-2';

  const specialiteField = createField({
    label: 'Spécialité',
    type: 'select',
    required: true,
    options: [
      { value: '', label: '-- Choisir' },
      { value: 'PEDL', label: 'PEDL' },
      { value: 'PED', label: 'PED' },
      { value: 'MGL', label: 'MGL' },
      { value: 'MG', label: 'MG' },
      { value: 'VACC', label: 'VACC' },
      { value: 'GY', label: 'GY' },
      { value: 'DT', label: 'DT' }
    ]
  });

  const telField = createField({
    label: 'Téléphone',
    type: 'tel',
    placeholder: '05/06/07',
    inputmode: 'tel'
  });

  row1.appendChild(specialiteField.element);
  row1.appendChild(telField.element);
  container.appendChild(row1);

  // 5. Ligne 2 colonnes : Secteur * & Établissement *
  const row2 = document.createElement('div');
  row2.className = 'field-row-2';

  const secteurField = createField({
    label: 'Secteur',
    placeholder: 'ex: Dal...',
    required: true
  });

  const etabField = createField({
    label: 'Établissement',
    placeholder: 'Hôpital / C...',
    required: true
  });

  row2.appendChild(secteurField.element);
  row2.appendChild(etabField.element);
  container.appendChild(row2);

  // 6. Potentiel : Boutons carrés [ A ] [ B ] [ C ]
  const potContainer = document.createElement('div');
  potContainer.className = 'pot-container';

  const potLabel = document.createElement('label');
  potLabel.className = 'field-label';
  potLabel.textContent = 'Potentiel';
  potContainer.appendChild(potLabel);

  const potSquares = document.createElement('div');
  potSquares.className = 'pot-squares';

  const potBtns = {};
  ['A', 'B', 'C'].forEach(potLetter => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `pot-square ${potLetter === currentPot ? 'active' : ''}`;
    btn.textContent = potLetter;
    btn.addEventListener('click', () => {
      setPotentiel(potLetter);
      checkFicheModifications();
    });
    potSquares.appendChild(btn);
    potBtns[potLetter] = btn;
  });

  function setPotentiel(potLetter) {
    currentPot = potLetter || '';
    Object.keys(potBtns).forEach(letter => {
      if (letter === currentPot) {
        potBtns[letter].classList.add('active');
      } else {
        potBtns[letter].classList.remove('active');
      }
    });
  }

  potContainer.appendChild(potSquares);
  container.appendChild(potContainer);

  // 7. Bloc repliable « Plus d'informations » (Statut, Email, Remplaçant, Gamme AURA)
  const detailsToggle = document.createElement('button');
  detailsToggle.type = 'button';
  detailsToggle.style.cssText = `
    background: none; border: none; color: var(--brand); font-size: 13px; font-weight: 700;
    margin: 8px 0 14px; cursor: pointer; display: flex; align-items: center; gap: 6px;
    padding: 0;
  `;
  detailsToggle.innerHTML = '▶ Plus d’informations (Statut, Email, Produits...)';

  const detailsContainer = document.createElement('div');
  detailsContainer.style.display = 'none';
  detailsContainer.style.cssText = `
    padding: 12px; background: var(--bg-main); border-radius: var(--radius-md);
    margin-bottom: 14px; border: 1px solid var(--border);
  `;

  // Statut (CAB / PUB - calculé automatiquement mais modifiable ici)
  const statutField = createField({
    label: 'Statut du médecin (affecté automatiquement)',
    type: 'select',
    options: [
      { value: 'PUB', label: 'PUB (Public)' },
      { value: 'CAB', label: 'CAB (Cabinet Privé)' }
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

  // Produits Gamme AURA dans Plus d'infos
  const produitsTitle = document.createElement('label');
  produitsTitle.className = 'field-label';
  produitsTitle.style.marginTop = '10px';
  produitsTitle.textContent = 'Produits AURA présentés :';

  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'chip-container';
  chipsContainer.style.marginTop = '6px';

  detailsContainer.appendChild(statutField.element);
  detailsContainer.appendChild(emailField.element);
  detailsContainer.appendChild(remplacantField.element);
  detailsContainer.appendChild(produitsTitle);
  detailsContainer.appendChild(chipsContainer);

  let detailsOpen = false;
  detailsToggle.addEventListener('click', () => {
    detailsOpen = !detailsOpen;
    detailsContainer.style.display = detailsOpen ? 'block' : 'none';
    detailsToggle.innerHTML = detailsOpen
      ? '▼ Moins d’informations'
      : '▶ Plus d’informations (Statut, Email, Produits...)';
  });

  container.appendChild(detailsToggle);
  container.appendChild(detailsContainer);

  // Affectation automatique du statut selon la spécialité (Exigence 3)
  function applyAutoStatus(specialite) {
    const spec = (specialite || '').toUpperCase().trim();
    if (CAB_SPECS.includes(spec)) {
      statutField.setValue('CAB');
    } else if (PUB_SPECS.includes(spec)) {
      statutField.setValue('PUB');
    }
  }

  specialiteField.input.addEventListener('change', () => {
    applyAutoStatus(specialiteField.getValue());
    checkFicheModifications();
  });

  // 8. Champ Observations
  const obsField = createField({
    label: 'Observations',
    type: 'textarea',
    placeholder: 'Notes optionnelles...'
  });
  container.appendChild(obsField.element);

  // 9. Case à cocher « Mettre à jour la fiche médecin »
  const updateFicheRow = document.createElement('div');
  updateFicheRow.style.cssText = `
    display: none; align-items: center; gap: 8px; margin-bottom: 14px;
    padding: 10px 12px; background: rgba(0, 122, 255, 0.06); border-radius: var(--radius-sm);
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
      currentPot !== (originalMedecinSnapshot.pot || '') ||
      emailField.getValue() !== (originalMedecinSnapshot.email || '') ||
      remplacantField.getValue() !== (originalMedecinSnapshot.remplacant || '');

    if (hasChanged) {
      updateFicheRow.style.display = 'flex';
      updateFicheCheckbox.checked = true;
    } else {
      updateFicheRow.style.display = 'none';
    }
  }

  [telField, secteurField, etabField, statutField, emailField, remplacantField].forEach(f => {
    f.input.addEventListener('input', checkFicheModifications);
    f.input.addEventListener('change', checkFicheModifications);
  });

  // 10. Bouton principal « Enregistrer » (Photo 4)
  const saveBtn = createButton({
    text: 'Enregistrer',
    variant: 'primary',
    fullWidth: true,
    onClick: () => submitForm()
  });
  container.appendChild(saveBtn);

  // Chargement des puces produits AURA
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
  loadProduitsChips();

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
      statut: statutField.getValue() || (CAB_SPECS.includes(specialiteField.getValue().toUpperCase().trim()) ? 'CAB' : 'PUB'),
      pot: currentPot,
      email: emailField.getValue().trim(),
      remplacant: remplacantField.getValue().trim(),
      observation: obsField.getValue().trim(),
      produits_discutes: Array.from(selectedProduits),
      shouldUpdateFiche: updateFicheCheckbox.checked
    };
  }

  function validate(data) {
    const missing = [];
    if (!data.nom) { missing.push('Nom et Prénom'); nomField.setError(true); } else nomField.setError(false);
    if (!data.specialite) { missing.push('Spécialité'); specialiteField.setError(true); } else specialiteField.setError(false);
    if (!data.secteur) { missing.push('Secteur'); secteurField.setError(true); } else secteurField.setError(false);
    if (!data.etab) { missing.push('Établissement'); etabField.setError(true); } else etabField.setError(false);

    return missing;
  }

  async function submitForm() {
    const data = getFormData();
    const missing = validate(data);
    if (missing.length > 0) {
      if (typeof onSaveVisite === 'function') {
        onSaveVisite({ error: `Veuillez remplir les champs obligatoires : ${missing.join(', ')}` });
      }
      return;
    }

    if (typeof onSaveVisite === 'function') {
      await onSaveVisite({ data });
    }
  }

  function reset() {
    currentMedecin = null;
    editingVisiteId = null;
    originalMedecinSnapshot = null;
    selectedProduits.clear();

    editBanner.style.display = 'none';
    editBanner.innerHTML = '';

    dateField.setValue(todayLocal());
    nomField.setValue('');
    specialiteField.setValue('');
    telField.setValue('');
    secteurField.setValue('');
    etabField.setValue('');
    statutField.setValue('PUB');
    setPotentiel('A');
    emailField.setValue('');
    remplacantField.setValue('');
    obsField.setValue('');

    updateFicheCheckbox.checked = false;
    updateFicheRow.style.display = 'none';

    nomField.setError(false);
    specialiteField.setError(false);
    secteurField.setError(false);
    etabField.setError(false);

    loadProduitsChips();
  }

  function loadMedecin(medecin) {
    if (!medecin) return;
    currentMedecin = medecin;
    originalMedecinSnapshot = { ...medecin };
    editingVisiteId = null;

    editBanner.style.display = 'none';
    container.style.display = 'block';

    nomField.setValue(medecin.nom || '');
    
    // Si la spécialité est dans la liste, on la sélectionne, sinon on l'ajoute temporairement
    const specUpper = (medecin.specialite || '').toUpperCase().trim();
    specialiteField.setValue(specUpper);
    if (!specialiteField.getValue() && medecin.specialite) {
      const opt = document.createElement('option');
      opt.value = medecin.specialite;
      opt.textContent = medecin.specialite;
      opt.selected = true;
      specialiteField.input.appendChild(opt);
    }

    telField.setValue(medecin.telephone || '');
    secteurField.setValue(medecin.secteur || '');
    etabField.setValue(medecin.etab || '');
    
    // Potentiel
    setPotentiel(medecin.pot || 'A');

    // Statut
    if (medecin.statut) {
      statutField.setValue(medecin.statut);
    } else {
      applyAutoStatus(medecin.specialite);
    }

    emailField.setValue(medecin.email || '');
    remplacantField.setValue(medecin.remplacant || '');
    obsField.setValue('');

    updateFicheCheckbox.checked = false;
    updateFicheRow.style.display = 'none';
  }

  function loadNewMedecin(initialName = '', initialSpecialite = '') {
    reset();
    nomField.setValue(initialName);
    if (initialSpecialite) {
      specialiteField.setValue(initialSpecialite.toUpperCase().trim());
      applyAutoStatus(initialSpecialite);
    }
    container.style.display = 'block';
    setTimeout(() => {
      if (!initialName) nomField.input.focus();
      else if (!initialSpecialite) specialiteField.input.focus();
      else secteurField.input.focus();
    }, 50);
  }

  function loadVisiteForEdit(visite) {
    if (!visite) return;
    editingVisiteId = visite.id;
    currentMedecin = visite.medecin_id ? { id: visite.medecin_id } : null;

    editBanner.style.display = 'flex';
    editBanner.innerHTML = `
      <span>✏️ Modification de la visite : <b>${escapeHtml(visite.nom_medecin || '')}</b></span>
      <button type="button" id="btn-cancel-edit" style="background: none; border: none; color: var(--danger); font-weight: 700; cursor: pointer;">
        ✕ Annuler
      </button>
    `;
    editBanner.querySelector('#btn-cancel-edit').addEventListener('click', () => {
      if (typeof onCancelEdit === 'function') onCancelEdit();
    });

    container.style.display = 'block';

    dateField.setValue(visite.date_visite || todayLocal());
    nomField.setValue(visite.nom_medecin || '');
    
    const specUpper = (visite.specialite || '').toUpperCase().trim();
    specialiteField.setValue(specUpper);
    if (!specialiteField.getValue() && visite.specialite) {
      const opt = document.createElement('option');
      opt.value = visite.specialite;
      opt.textContent = visite.specialite;
      opt.selected = true;
      specialiteField.input.appendChild(opt);
    }

    telField.setValue(visite.telephone || '');
    secteurField.setValue(visite.secteur || '');
    etabField.setValue(visite.etab || '');
    statutField.setValue(visite.statut || (CAB_SPECS.includes(specUpper) ? 'CAB' : 'PUB'));
    setPotentiel(visite.pot || 'A');
    obsField.setValue(visite.observation || '');

    selectedProduits = new Set(visite.produits_discutes || []);
    loadProduitsChips();

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return {
    element: container,
    loadMedecin,
    loadNewMedecin,
    loadVisiteForEdit,
    reset,
    submit: submitForm,
    getFormData,
    isOpen: () => container.style.display !== 'none',
    toggle: () => {
      const isVisible = container.style.display !== 'none';
      container.style.display = isVisible ? 'none' : 'block';
    },
    open: () => { container.style.display = 'block'; },
    close: () => { container.style.display = 'none'; },
    setSpecialite: (spec) => {
      if (spec && spec !== 'TOUS') {
        specialiteField.setValue(spec.toUpperCase().trim());
        applyAutoStatus(spec);
      }
    }
  };
}
