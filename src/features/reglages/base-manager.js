/**
 * base-manager.js — Gestionnaire du répertoire Médecins et Pharmacies.
 * Permet de consulter l'annuaire, de modifier les coordonnées ou d'archiver une fiche.
 * Reçoit : conteneur HTML.
 * Renvoie : interface interactive avec onglets Médecins / Pharmacies et recherche rapide.
 */
import { medecinsRepo } from '../medecins/medecins-repo.js';
import { pharmaciesRepo } from '../pharmacies/pharmacies-repo.js';
import { escapeHtml, normalize } from '../../core/text.js';
import { showToast } from '../../components/toast.js';

export function renderBaseManager(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px;';
  header.innerHTML = `
    <button type="button" class="btn btn-sm btn-primary btn-tab-med">Médecins (<span id="bm-med-count">0</span>)</button>
    <button type="button" class="btn btn-sm btn-secondary btn-tab-pharm">Pharmacies (<span id="bm-pharm-count">0</span>)</button>
  `;
  container.appendChild(header);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'field-input';
  searchInput.placeholder = 'Filtrer les fiches...';
  searchInput.style.cssText = 'margin-bottom: 12px; font-size: 13px; padding: 6px 12px; min-height: 38px;';
  container.appendChild(searchInput);

  const listContainer = document.createElement('div');
  listContainer.style.cssText = 'max-height: 320px; overflow-y: auto;';
  container.appendChild(listContainer);

  let activeTab = 'medecins'; // 'medecins' | 'pharmacies'
  let meds = [];
  let pharms = [];

  const btnMed = header.querySelector('.btn-tab-med');
  const btnPharm = header.querySelector('.btn-tab-pharm');

  btnMed.addEventListener('click', () => {
    activeTab = 'medecins';
    btnMed.className = 'btn btn-sm btn-primary';
    btnPharm.className = 'btn btn-sm btn-secondary';
    renderList();
  });

  btnPharm.addEventListener('click', () => {
    activeTab = 'pharmacies';
    btnPharm.className = 'btn btn-sm btn-primary';
    btnMed.className = 'btn btn-sm btn-secondary';
    renderList();
  });

  searchInput.addEventListener('input', () => renderList());

  async function loadData() {
    meds = await medecinsRepo.getAllMedecins();
    pharms = await pharmaciesRepo.getAllPharmacies();

    container.querySelector('#bm-med-count').textContent = meds.length;
    container.querySelector('#bm-pharm-count').textContent = pharms.length;
    renderList();
  }

  function renderList() {
    listContainer.innerHTML = '';
    const q = normalize(searchInput.value);

    if (activeTab === 'medecins') {
      const filtered = meds.filter(m => !q || normalize(`${m.nom} ${m.specialite || ''} ${m.secteur || ''}`).includes(q));
      if (filtered.length === 0) {
        listContainer.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 12px;">Aucun médecin trouvé.</div>';
        return;
      }

      for (const m of filtered) {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 8px 10px; background: var(--bg-main); border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;';
        item.innerHTML = `
          <div>
            <b>${escapeHtml(m.nom)}</b>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(m.specialite || 'Généraliste')} · ${escapeHtml(m.secteur || 'Secteur')} · ${escapeHtml(m.telephone || '')}</div>
          </div>
          <button type="button" class="btn-del" style="background: none; border: none; font-size: 14px; color: var(--danger); cursor: pointer;" title="Supprimer la fiche">🗑️</button>
        `;

        item.querySelector('.btn-del').addEventListener('click', async () => {
          await medecinsRepo.saveMedecin({ ...m, deleted_at: new Date().toISOString() });
          showToast({ message: `Fiche de ${m.nom} archivée`, type: 'info' });
          await loadData();
        });

        listContainer.appendChild(item);
      }
    } else {
      const filtered = pharms.filter(p => !q || normalize(`${p.nom} ${p.secteur || ''} ${p.grossiste_habituel || ''}`).includes(q));
      if (filtered.length === 0) {
        listContainer.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 12px;">Aucune pharmacie trouvée.</div>';
        return;
      }

      for (const p of filtered) {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 8px 10px; background: var(--bg-main); border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 13px;';
        item.innerHTML = `
          <div>
            <b>${escapeHtml(p.nom)}</b>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(p.secteur || 'Secteur')} · Grossiste : ${escapeHtml(p.grossiste_habituel || 'N/A')}</div>
          </div>
          <button type="button" class="btn-del" style="background: none; border: none; font-size: 14px; color: var(--danger); cursor: pointer;" title="Supprimer la fiche">🗑️</button>
        `;

        item.querySelector('.btn-del').addEventListener('click', async () => {
          await pharmaciesRepo.savePharmacie({ ...p, deleted_at: new Date().toISOString() });
          showToast({ message: `Fiche de ${p.nom} archivée`, type: 'info' });
          await loadData();
        });

        listContainer.appendChild(item);
      }
    }
  }

  loadData();
}
