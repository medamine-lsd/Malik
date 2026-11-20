/**
 * medecins-screen.js — Écran complet de gestion des médecins et des visites médicales.
 * Regroupe la recherche instantanée (Zone 1), le formulaire de visite (Zone 2)
 * et la liste des visites du jour avec modification/suppression (Zone 3).
 * Reçoit : conteneur de l'onglet #tab-medecins.
 * Renvoie : interface connectée et réactive en temps réel.
 */
import { createAutocomplete } from '../../components/autocomplete.js';
import { createMedecinForm } from './medecin-form.js';
import { buildSearchIndex, searchMedecins } from './medecin-search.js';
import { medecinsRepo } from './medecins-repo.js';
import { showToast } from '../../components/toast.js';
import { showConfirmModal } from '../../components/confirm-modal.js';
import { createButton } from '../../components/button.js';
import { createEmptyState } from '../../components/empty-state.js';
import { todayLocal } from '../../core/dates.js';
import { escapeHtml } from '../../core/text.js';
import { events } from '../../core/events.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';

export function initMedecinsScreen(container) {
  container.innerHTML = '';

  let currentDate = todayLocal();
  let allProduitsMap = new Map();

  // 1. ZONE 1 — BARRE DE RECHERCHE
  const searchSection = document.createElement('div');
  searchSection.className = 'screen-section';
  searchSection.style.marginBottom = '16px';

  const searchHeader = document.createElement('div');
  searchHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
  searchHeader.innerHTML = `
    <span style="font-weight: 700; font-size: 15px; color: var(--text-main);">Recherche Médecin</span>
    <button type="button" id="btn-new-med-direct" style="font-size: 13px; font-weight: 700; color: var(--brand); cursor: pointer; background: none; border: none;">
      ➕ Nouveau médecin
    </button>
  `;
  searchSection.appendChild(searchHeader);

  const autocomplete = createAutocomplete({
    placeholder: 'Nom du médecin, spécialité, lieu (ex: Benali)...',
    onSearch: (query) => searchMedecins(query, 8),
    onSelect: (medecin) => {
      form.loadMedecin(medecin);
    },
    onAddNew: (queryText) => {
      form.loadNewMedecin(queryText);
    }
  });
  searchSection.appendChild(autocomplete.element);
  container.appendChild(searchSection);

  // Bouton direct « Nouveau médecin »
  searchSection.querySelector('#btn-new-med-direct').addEventListener('click', () => {
    autocomplete.clear();
    form.loadNewMedecin('');
  });

  // 2. ZONE 2 — CARTE FORMULAIRE DE VISITE
  const form = createMedecinForm({
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

  // 3. ZONE 3 — LISTE DES VISITES DU JOUR
  const listSection = document.createElement('div');
  listSection.className = 'screen-section';
  listSection.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Visites du jour (<span id="med-visit-count">0</span>)</h3>
    </div>
    <div id="med-visits-list"></div>
  `;
  container.appendChild(listSection);

  const visitsListEl = listSection.querySelector('#med-visits-list');
  const countEl = listSection.querySelector('#med-visit-count');

  /**
   * Sauvegarde standard d'une visite avec anti-doublon et avertissement de visite répétée.
   */
  async function handleSaveVisite(data) {
    let medecinId = data.medecin_id;

    // A. Si c'est un nouveau médecin, contrôle anti-doublon
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

    // C. Vérification si déjà visité aujourd'hui
    if (!data.id) { // Uniquement en création, pas en modification
      const alreadyVisited = await medecinsRepo.hasVisitedOnDate(medecinId, data.date_visite);
      if (alreadyVisited) {
        showConfirmModal({
          title: 'Médecin déjà visité aujourd’hui',
          message: `Vous avez déjà enregistré une visite aujourd'hui pour ${data.nom}. Souhaitez-vous en ajouter une deuxième ?`,
          confirmText: 'Ajouter quand même',
          cancelText: 'Annuler',
          onConfirm: async () => {
            await proceedSaveVisite(data);
          }
        });
        return;
      }
    }

    await proceedSaveVisite(data);
  }

  /**
   * Visite rapide (1 tap).
   */
  async function handleQuickVisit(data) {
    if (!data.medecin_id) {
      showToast({ message: 'Veuillez sélectionner un médecin pour la visite rapide', type: 'error' });
      return;
    }

    const alreadyVisited = await medecinsRepo.hasVisitedOnDate(data.medecin_id, todayLocal());
    if (alreadyVisited) {
      showConfirmModal({
        title: 'Déjà visité aujourd’hui',
        message: `${data.nom} a déjà été visité aujourd'hui. Ajouter une nouvelle visite rapide ?`,
        confirmText: 'Ajouter',
        cancelText: 'Annuler',
        onConfirm: async () => {
          data.observation = '';
          await proceedSaveVisite(data);
        }
      });
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
   * Recharge la liste des visites du jour et l'index de recherche.
   */
  async function refreshAll() {
    // 1. Charger la carte des produits pour colorer les pastilles
    const db = await getLocalDb();
    const produits = await db.getAll(TABLES.PRODUITS);
    allProduitsMap.clear();
    for (const p of produits) {
      allProduitsMap.set(p.id, p);
    }

    // 2. Reconstruire l'index de recherche
    const allMeds = await medecinsRepo.getAllMedecins();
    buildSearchIndex(allMeds);

    // 3. Charger les visites du jour
    const visites = await medecinsRepo.getVisitesByDate(currentDate);
    visites.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    countEl.textContent = visites.length;

    visitsListEl.innerHTML = '';
    if (visites.length === 0) {
      visitsListEl.appendChild(createEmptyState({
        icon: '🩺',
        title: 'Aucune visite médecin aujourd’hui',
        description: 'Recherchez un médecin ou cliquez sur « ➕ Nouveau médecin » ci-dessus pour commencer votre saisie.'
      }));
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
            const hex = p.couleur ? (p.couleur.startsWith('#') ? p.couleur : `#${p.couleur}`) : '#4F81BD';
            return `<span style="font-size: 11px; font-weight: 700; background: ${hex}20; color: ${hex}; border: 1px solid ${hex}40; padding: 2px 8px; border-radius: 999px;">${escapeHtml(p.nom)}</span>`;
          }).join('') +
          '</div>';
      }

      const potBadge = v.pot ? `<span style="font-size: 10px; background: rgba(71, 50, 196, 0.1); color: var(--brand); padding: 2px 6px; border-radius: 999px; font-weight: 700;">${escapeHtml(v.pot)}</span>` : '';
      const statutBadge = v.statut ? `<span style="font-size: 10px; background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 2px 6px; border-radius: 999px; font-weight: 700;">${escapeHtml(v.statut)}</span>` : '';

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
          <div style="display: flex; gap: 4px;">
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
        window.scrollTo({ top: form.element.offsetTop - 20, behavior: 'smooth' });
      });

      // Supprimer la visite (suppression douce + annuler)
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
