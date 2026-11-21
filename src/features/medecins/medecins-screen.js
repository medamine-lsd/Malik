/**
 * medecins-screen.js — Écran complet de gestion des médecins et des visites médicales.
 * Conforme à la maquette de référence (Photo 4) :
 * - Barre de recherche compacte avec bouton validation ✔ et nouveau médecin 👤+
 * - Filtres rapides de spécialités au-dessus/sous la recherche
 * - Exclusion stricte des médecins déjà visités aujourd'hui
 * - Formulaire de visite ouvert par défaut
 * - Historique du jour moderne
 */
import { createAutocomplete } from '../../components/autocomplete.js';
import { createMedecinForm } from './medecin-form.js';
import { buildSearchIndex, searchMedecins } from './medecin-search.js';
import { medecinsRepo } from './medecins-repo.js';
import { showToast } from '../../components/toast.js';
import { showConfirmModal } from '../../components/confirm-modal.js';
import { todayLocal } from '../../core/dates.js';
import { escapeHtml, normalize } from '../../core/text.js';
import { events } from '../../core/events.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';

export function initMedecinsScreen(container) {
  container.innerHTML = '';

  let currentDate = todayLocal();
  let allProduitsMap = new Map();
  let todayVisitedMedecinIds = new Set();
  let todayVisitedNames = new Set();
  let activeSpecFilter = 'TOUS';
  let form = null;

  // 1. ZONE 1 — BARRE DE RECHERCHE + BOUTONS D'ACTION (Photo 4)
  const searchSection = document.createElement('div');
  searchSection.className = 'screen-section';
  searchSection.style.marginBottom = '8px';

  // Ligne de recherche : Input + Bouton ✔ + Bouton 👤+
  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';

  const autocompleteWrapper = document.createElement('div');
  autocompleteWrapper.style.cssText = 'flex: 1; min-width: 0;';

  const autocomplete = createAutocomplete({
    placeholder: 'Taper le nom...',
    onSearch: (query) => searchMedecins(query, 8, {
      specialiteFilter: activeSpecFilter,
      excludeIds: todayVisitedMedecinIds
    }),
    onSelect: (medecin) => {
      form.loadMedecin(medecin);
      autocomplete.clear();
    },
    onAddNew: (queryText) => {
      form.loadNewMedecin(queryText, activeSpecFilter !== 'TOUS' ? activeSpecFilter : '');
      autocomplete.clear();
    }
  });
  autocompleteWrapper.appendChild(autocomplete.element);
  searchRow.appendChild(autocompleteWrapper);

  // Bouton Validation rapide ✔ (Photo 4)
  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.className = 'btn-icon-sq btn-check';
  checkBtn.innerHTML = '✔';
  checkBtn.title = 'Valider / Enregistrer la visite';
  checkBtn.addEventListener('click', () => {
    form.submit();
  });
  searchRow.appendChild(checkBtn);

  // Bouton Nouveau Médecin avec remplissage moderne 👤+ (Photo 4 - Exigence 8)
  const addMedBtn = document.createElement('button');
  addMedBtn.type = 'button';
  addMedBtn.className = 'btn-icon-sq btn-add-med';
  addMedBtn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="20" y1="8" x2="20" y2="14"></line>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
  `;
  addMedBtn.title = 'Nouveau médecin (ouvrir/fermer formulaire)';
  addMedBtn.addEventListener('click', () => {
    if (form.isOpen()) {
      form.toggle();
    } else {
      autocomplete.clear();
      form.loadNewMedecin('', activeSpecFilter !== 'TOUS' ? activeSpecFilter : '');
    }
  });
  searchRow.appendChild(addMedBtn);

  searchSection.appendChild(searchRow);

  // Barre de filtres de spécialité (Exigence 7)
  const filterBar = document.createElement('div');
  filterBar.className = 'spec-filter-bar';

  const specsList = ['TOUS', 'PED', 'PEDL', 'MG', 'MGL', 'VACC', 'GY', 'DT'];
  const filterPillEls = {};

  specsList.forEach(spec => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `spec-filter-pill ${spec === activeSpecFilter ? 'active' : ''}`;
    pill.textContent = spec;
    pill.addEventListener('click', () => {
      setSpecFilter(spec);
    });
    filterBar.appendChild(pill);
    filterPillEls[spec] = pill;
  });

  function setSpecFilter(spec) {
    activeSpecFilter = spec;
    Object.keys(filterPillEls).forEach(k => {
      if (k === activeSpecFilter) {
        filterPillEls[k].classList.add('active');
      } else {
        filterPillEls[k].classList.remove('active');
      }
    });

    if (activeSpecFilter !== 'TOUS') {
      form.setSpecialite(activeSpecFilter);
    }
  }

  searchSection.appendChild(filterBar);
  container.appendChild(searchSection);

  // 2. ZONE 2 — FORMULAIRE DE VISITE (OUVERT PAR DÉFAUT - Photo 4)
  form = createMedecinForm({
    onSaveVisite: async (res) => {
      if (res.error) {
        showToast({ message: res.error, type: 'error' });
        return;
      }
      await handleSaveVisite(res.data);
    },
    onQuickVisit: async (data) => {
      await handleQuickVisit(data);
    },
    onCancelEdit: () => {
      form.reset();
      autocomplete.focus();
    }
  });
  container.appendChild(form.element);

  // 3. ZONE 3 — HISTORIQUE DU JOUR (Photo 4)
  const listSection = document.createElement('div');
  listSection.className = 'screen-section';
  listSection.style.marginTop = '16px';
  listSection.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Historique du jour</h3>
      <span id="med-visit-badge" style="font-size: 12px; font-weight: 700; background: var(--brand-light); color: var(--brand); padding: 3px 8px; border-radius: 999px;">0 visite</span>
    </div>
    <div id="med-visits-list"></div>
  `;
  container.appendChild(listSection);

  const visitsListEl = listSection.querySelector('#med-visits-list');
  const visitBadgeEl = listSection.querySelector('#med-visit-badge');

  /**
   * Sauvegarde standard d'une visite avec anti-doublon et exclusion des visites répétées le même jour.
   */
  async function handleSaveVisite(data) {
    let medecinId = data.medecin_id;

    // Règle 6 : Interdiction formelle de visiter 2 fois le même médecin le même jour
    if (!data.id) {
      if (medecinId && todayVisitedMedecinIds.has(medecinId)) {
        showToast({ message: '⚠️ Ce médecin a déjà été visité aujourd’hui !', type: 'error' });
        return;
      }

      const normName = normalize(data.nom);
      if (todayVisitedNames.has(normName)) {
        showToast({ message: '⚠️ Ce médecin a déjà été visité aujourd’hui !', type: 'error' });
        return;
      }
    }

    // A. Si c'est un nouveau médecin, contrôle anti-doublon dans le carnet
    if (!medecinId) {
      const duplicate = await medecinsRepo.findDuplicate(data.nom, data.specialite);
      if (duplicate) {
        showConfirmModal({
          title: 'Ce médecin existe déjà',
          message: `La fiche « ${duplicate.nom} (${duplicate.specialite || 'Généraliste'}) - ${duplicate.secteur || ''} » est déjà dans votre base. Souhaitez-vous l'utiliser ?`,
          confirmText: 'Oui, utiliser',
          cancelText: 'Non, créer un nouveau',
          onConfirm: async () => {
            data.medecin_id = duplicate.id;
            await proceedSaveVisite(data);
          },
          onCancel: async () => {
            const newMed = await medecinsRepo.saveMedecin({
              nom: data.nom,
              specialite: data.specialite,
              telephone: data.telephone,
              secteur: data.secteur,
              etab: data.etab,
              statut: data.statut,
              pot: data.pot,
              email: data.email,
              remplacant: data.remplacant
            });
            data.medecin_id = newMed.id;
            await proceedSaveVisite(data);
          }
        });
        return;
      }

      // Création de la nouvelle fiche médecin
      const newMed = await medecinsRepo.saveMedecin({
        nom: data.nom,
        specialite: data.specialite,
        telephone: data.telephone,
        secteur: data.secteur,
        etab: data.etab,
        statut: data.statut,
        pot: data.pot,
        email: data.email,
        remplacant: data.remplacant
      });
      medecinId = newMed.id;
      data.medecin_id = newMed.id;
    } else if (data.shouldUpdateFiche) {
      // B. Mise à jour de la fiche existante si demandé
      await medecinsRepo.saveMedecin({
        id: medecinId,
        nom: data.nom,
        specialite: data.specialite,
        telephone: data.telephone,
        secteur: data.secteur,
        etab: data.etab,
        statut: data.statut,
        pot: data.pot,
        email: data.email,
        remplacant: data.remplacant
      });
    }

    await proceedSaveVisite(data);
  }

  async function handleQuickVisit(data) {
    if (!data.medecin_id) {
      showToast({ message: 'Veuillez sélectionner un médecin pour la visite', type: 'error' });
      return;
    }

    if (todayVisitedMedecinIds.has(data.medecin_id)) {
      showToast({ message: '⚠️ Ce médecin a déjà été visité aujourd’hui !', type: 'error' });
      return;
    }

    data.observation = '';
    await proceedSaveVisite(data);
  }

  async function proceedSaveVisite(data) {
    await medecinsRepo.saveVisite({
      id: data.id,
      medecin_id: data.medecin_id,
      date_visite: data.date_visite,
      nom: data.nom,
      specialite: data.specialite,
      telephone: data.telephone,
      secteur: data.secteur,
      etab: data.etab,
      statut: data.statut,
      pot: data.pot,
      email: data.email,
      remplacant: data.remplacant,
      observation: data.observation,
      produits_discutes: data.produits_discutes || []
    });

    showToast({ message: 'Visite enregistrée ✓', type: 'success' });
    form.reset();
    autocomplete.clear();
    await refreshAll();
  }

  /**
   * Recharge la liste des visites du jour, l'index de recherche et les exclusions.
   */
  async function refreshAll() {
    // 1. Charger la carte des produits pour colorer les pastilles
    const db = await getLocalDb();
    const produits = await db.getAll(TABLES.PRODUITS);
    allProduitsMap.clear();
    for (const p of produits) {
      allProduitsMap.set(p.id, p);
    }

    // 2. Charger les visites du jour pour construire la liste d'exclusion
    const visites = await medecinsRepo.getVisitesByDate(currentDate);
    visites.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    todayVisitedMedecinIds.clear();
    todayVisitedNames.clear();

    visites.forEach(v => {
      if (v.medecin_id) todayVisitedMedecinIds.add(v.medecin_id);
      if (v.nom) todayVisitedNames.add(normalize(v.nom));
    });

    // 3. Reconstruire l'index de recherche
    const allMeds = await medecinsRepo.getAllMedecins();
    buildSearchIndex(allMeds);

    // 4. Mettre à jour l'affichage de l'historique du jour
    visitBadgeEl.textContent = `${visites.length} visite${visites.length > 1 ? 's' : ''}`;

    visitsListEl.innerHTML = '';
    if (visites.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'text-align: center; padding: 24px 16px; color: var(--text-muted); font-size: 14px;';
      emptyDiv.textContent = 'Aucune visite aujourd’hui';
      visitsListEl.appendChild(emptyDiv);
      return;
    }

    for (const v of visites) {
      const card = document.createElement('div');
      card.className = 'visit-card';

      // Pastilles des produits présentés
      let chipsHtml = '';
      if (Array.isArray(v.produits_discutes) && v.produits_discutes.length > 0) {
        chipsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0;">' +
          v.produits_discutes.map(pid => {
            const p = allProduitsMap.get(pid);
            if (!p) return '';
            const hex = p.couleur ? (p.couleur.startsWith('#') ? p.couleur : `#${p.couleur}`) : '#007AFF';
            return `<span style="font-size: 11px; font-weight: 700; background: ${hex}18; color: ${hex}; border: 1px solid ${hex}35; padding: 2px 8px; border-radius: 999px;">${escapeHtml(p.nom)}</span>`;
          }).join('') +
          '</div>';
      }

      const potBadge = v.pot ? `<span style="font-size: 10px; background: rgba(0, 122, 255, 0.1); color: var(--brand); padding: 2px 7px; border-radius: 999px; font-weight: 800;">${escapeHtml(v.pot)}</span>` : '';
      const statutBadge = v.statut ? `<span style="font-size: 10px; background: rgba(16, 185, 129, 0.12); color: var(--success); padding: 2px 7px; border-radius: 999px; font-weight: 800;">${escapeHtml(v.statut)}</span>` : '';

      card.innerHTML = `
        <div class="visit-card-header">
          <div>
            <div class="visit-card-name">${escapeHtml(v.nom)}</div>
            <div class="visit-card-meta">
              <span>${escapeHtml(v.specialite || 'Généraliste')}</span>
              ${v.secteur ? `<span>· ${escapeHtml(v.secteur)}</span>` : ''}
              ${v.etab ? `<span>(${escapeHtml(v.etab)})</span>` : ''}
            </div>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            ${potBadge}${statutBadge}
          </div>
        </div>

        ${v.observation ? `<div class="visit-card-obs">${escapeHtml(v.observation)}</div>` : ''}
        ${chipsHtml}

        <div class="visit-card-actions">
          <button type="button" class="btn-edit btn btn-sm btn-secondary" style="padding: 4px 10px;">✏️ Modifier</button>
          <button type="button" class="btn-del btn btn-sm btn-danger" style="padding: 4px 10px;">🗑️ Supprimer</button>
        </div>
      `;

      // Modifier la visite
      card.querySelector('.btn-edit').addEventListener('click', () => {
        form.loadVisiteForEdit(v);
      });

      // Supprimer la visite
      card.querySelector('.btn-del').addEventListener('click', async () => {
        await medecinsRepo.deleteVisite(v.id);
        await refreshAll();

        showToast({
          message: `Visite de ${v.nom} supprimée`,
          type: 'info',
          actionLabel: 'Annuler',
          onAction: async () => {
            await medecinsRepo.restoreVisite(v.id);
            await refreshAll();
            showToast({ message: 'Visite restaurée ✓', type: 'success' });
          }
        });
      });

      visitsListEl.appendChild(card);
    }
  }

  // Écouteur pour rafraîchir en temps réel dès que les données changent
  events.on('data-changed', (e) => {
    if (e.table === TABLES.MEDECINS || e.table === TABLES.VISITES_MEDECINS || e.table === TABLES.PRODUITS) {
      refreshAll();
    }
  });

  // Chargement initial
  refreshAll();
}
