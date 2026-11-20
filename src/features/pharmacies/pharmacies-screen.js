/**
 * pharmacies-screen.js — Écran complet de gestion des pharmacies et des visites commerciales.
 * Regroupe la recherche d'officines, le formulaire avec la gamme AURA (D/ND, ROT),
 * et la liste des visites pharmacies du jour avec modification/suppression.
 * Reçoit : conteneur de l'onglet #tab-pharmacies.
 * Renvoie : interface interactive connectée à IndexedDB.
 */
import { createAutocomplete } from '../../components/autocomplete.js';
import { createPharmacieForm } from './pharmacie-form.js';
import { pharmaciesRepo } from './pharmacies-repo.js';
import { showToast } from '../../components/toast.js';
import { showConfirmModal } from '../../components/confirm-modal.js';
import { createEmptyState } from '../../components/empty-state.js';
import { todayLocal } from '../../core/dates.js';
import { escapeHtml, normalize } from '../../core/text.js';
import { events } from '../../core/events.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';

export function initPharmaciesScreen(container) {
  container.innerHTML = '';

  let currentDate = todayLocal();
  let allPharmacies = [];
  let allProduitsMap = new Map();

  // 1. ZONE DE RECHERCHE RAPIDE D'OFFICINE
  const searchSection = document.createElement('div');
  searchSection.className = 'screen-section';
  searchSection.style.marginBottom = '16px';

  const searchHeader = document.createElement('div');
  searchHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
  searchHeader.innerHTML = `
    <span style="font-weight: 700; font-size: 15px; color: var(--text-main);">Recherche Pharmacie</span>
    <button type="button" id="btn-new-pharm-direct" style="font-size: 13px; font-weight: 700; color: var(--brand); cursor: pointer; background: none; border: none;">
      ➕ Nouvelle pharmacie
    </button>
  `;
  searchSection.appendChild(searchHeader);

  const autocomplete = createAutocomplete({
    placeholder: 'Nom de la pharmacie, secteur...',
    onSearch: (query) => {
      const q = normalize(query);
      if (!q) return [];
      return allPharmacies.filter(p => normalize(`${p.nom} ${p.secteur || ''}`).includes(q)).slice(0, 8);
    },
    onSelect: (pharmacie) => {
      form.loadPharmacie(pharmacie);
    },
    onAddNew: (queryText) => {
      form.reset();
      const nomInput = form.element.querySelector('input[name=""]'); // auto focus
      form.loadPharmacie({ nom: queryText });
    }
  });
  searchSection.appendChild(autocomplete.element);
  container.appendChild(searchSection);

  searchSection.querySelector('#btn-new-pharm-direct').addEventListener('click', () => {
    autocomplete.clear();
    form.reset();
  });

  // 2. FORMULAIRE DE SAISIE
  const form = createPharmacieForm({
    onSaveVisite: async (res) => {
      if (res.error) {
        showToast({ message: res.error, type: 'error' });
        return;
      }
      await handleSaveVisite(res.data);
    },
    onCancelEdit: () => {
      form.reset();
      autocomplete.focus();
    }
  });
  container.appendChild(form.element);

  // 3. LISTE DES VISITES PHARMACIES DU JOUR
  const listSection = document.createElement('div');
  listSection.className = 'screen-section';
  listSection.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Visites pharmacies du jour (<span id="pharm-visit-count">0</span>)</h3>
    </div>
    <div id="pharm-visits-list"></div>
  `;
  container.appendChild(listSection);

  const visitsListEl = listSection.querySelector('#pharm-visits-list');
  const countEl = listSection.querySelector('#pharm-visit-count');

  /**
   * Sauvegarde de la visite avec création/mise à jour de la pharmacie et anti-doublon.
   */
  async function handleSaveVisite(data) {
    let pharmacieId = data.pharmacie_id;

    // A. Nouvelle pharmacie ou vérification anti-doublon
    if (!pharmacieId) {
      const duplicate = await pharmaciesRepo.findDuplicate(data.nom, data.secteur);
      if (duplicate) {
        pharmacieId = duplicate.id;
        data.pharmacie_id = duplicate.id;
      } else {
        const newPharm = await pharmaciesRepo.savePharmacie({
          nom: data.nom,
          secteur: data.secteur,
          grossiste_habituel: data.grossiste
        });
        pharmacieId = newPharm.id;
        data.pharmacie_id = newPharm.id;
      }
    } else {
      // Mettre à jour grossiste habituel si précisé
      const existing = await pharmaciesRepo.getPharmacieById(pharmacieId);
      if (existing && existing.grossiste_habituel !== data.grossiste) {
        existing.grossiste_habituel = data.grossiste;
        await pharmaciesRepo.savePharmacie(existing);
      }
    }

    // B. Enregistrement de la visite
    await pharmaciesRepo.saveVisite({
      id: data.id,
      pharmacie_id: pharmacieId,
      date_visite: data.date_visite,
      nom: data.nom,
      secteur: data.secteur,
      grossiste: data.grossiste,
      disponibilites: data.disponibilites || {},
      observation: data.observation || ''
    });

    showToast({ message: 'Visite pharmacie enregistrée ✓', type: 'success' });
    form.reset();
    autocomplete.clear();
    await refreshAll();
  }

  /**
   * Recharge la liste des visites et l'annuaire des pharmacies.
   */
  async function refreshAll() {
    // 1. Produits AURA pour les libellés et couleurs
    const db = await getLocalDb();
    const produits = await db.getAll(TABLES.PRODUITS);
    allProduitsMap.clear();
    for (const p of produits) {
      allProduitsMap.set(p.id, p);
    }

    // 2. Liste des pharmacies pour l'autocomplétion
    allPharmacies = await pharmaciesRepo.getAllPharmacies();

    // 3. Visites pharmacies du jour
    const visites = await pharmaciesRepo.getVisitesByDate(currentDate);
    visites.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    countEl.textContent = visites.length;

    visitsListEl.innerHTML = '';
    if (visites.length === 0) {
      visitsListEl.appendChild(createEmptyState({
        icon: '💊',
        title: 'Aucune visite pharmacie aujourd’hui',
        description: 'Remplissez le formulaire ci-dessus pour ajouter votre premier relevé de stocks et rotations.'
      }));
      return;
    }

    for (const v of visites) {
      const card = document.createElement('div');
      card.className = 'visit-card';

      // Afficher uniquement les produits DISPONIBLES (dispo = true)
      let dispoChipsHtml = '';
      if (v.disponibilites && typeof v.disponibilites === 'object') {
        const dispoItems = [];
        for (const [pId, info] of Object.entries(v.disponibilites)) {
          if (info && info.dispo) {
            const prod = allProduitsMap.get(pId);
            const pNom = prod ? prod.nom : 'Produit';
            const hex = prod && prod.couleur ? (prod.couleur.startsWith('#') ? prod.couleur : `#${prod.couleur}`) : '#10B981';
            const rotLabel = info.rot ? ` (ROT: ${escapeHtml(info.rot)})` : '';
            dispoItems.push(`
              <span style="font-size: 11px; font-weight: 700; background: ${hex}20; color: ${hex}; border: 1px solid ${hex}40; padding: 2px 8px; border-radius: 999px;">
                ${escapeHtml(pNom)}${rotLabel}
              </span>
            `);
          }
        }

        if (dispoItems.length > 0) {
          dispoChipsHtml = `
            <div style="margin: 6px 0;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Produits disponibles :</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">${dispoItems.join('')}</div>
            </div>
          `;
        } else {
          dispoChipsHtml = `<div style="font-size: 12px; color: var(--danger); font-weight: 600; margin: 4px 0;">Rupture totale (aucun produit AURA disponible)</div>`;
        }
      }

      card.innerHTML = `
        <div class="visit-card-header">
          <div>
            <div class="visit-card-name">${escapeHtml(v.nom)}</div>
            <div class="visit-card-meta">
              <span><b>Grossiste :</b> ${escapeHtml(v.grossiste || 'N/A')}</span>
              ${v.secteur ? `<span>· ${escapeHtml(v.secteur)}</span>` : ''}
            </div>
          </div>
        </div>

        ${dispoChipsHtml}
        ${v.observation ? `<div class="visit-card-obs" style="margin-top: 6px;">${escapeHtml(v.observation)}</div>` : ''}

        <div class="visit-card-actions">
          <button type="button" class="btn-edit btn btn-sm btn-secondary" style="padding: 4px 10px;">✏️ Modifier</button>
          <button type="button" class="btn-del btn btn-sm btn-danger" style="padding: 4px 10px;">🗑️ Supprimer</button>
        </div>
      `;

      // Modifier
      card.querySelector('.btn-edit').addEventListener('click', () => {
        form.loadVisiteForEdit(v);
        window.scrollTo({ top: form.element.offsetTop - 20, behavior: 'smooth' });
      });

      // Supprimer
      card.querySelector('.btn-del').addEventListener('click', async () => {
        await pharmaciesRepo.deleteVisite(v.id);
        await refreshAll();

        showToast({
          message: `Visite de la pharmacie ${v.nom} supprimée`,
          type: 'info',
          actionLabel: 'Annuler',
          onAction: async () => {
            await pharmaciesRepo.restoreVisite(v.id);
            await refreshAll();
            showToast({ message: 'Visite pharmacie restaurée ✓', type: 'success' });
          }
        });
      });

      visitsListEl.appendChild(card);
    }
  }

  // Écouteur pour rafraîchir en temps réel
  events.on('data-changed', (e) => {
    if (e.table === TABLES.PHARMACIES || e.table === TABLES.VISITES_PHARMACIES || e.table === TABLES.PRODUITS) {
      refreshAll();
    }
  });

  // Chargement initial
  refreshAll();
}
