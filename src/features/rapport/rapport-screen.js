/**
 * rapport-screen.js — Écran officiel de synthèse et de génération des rapports Excel AURA.
 * Permet de sélectionner une période (Aujourd'hui, Hier, Cette semaine, Personnalisé),
 * d'inspecter les visites enregistrées et d'exporter le fichier .xlsx officiel en 1 tap.
 * Reçoit : conteneur de l'onglet #tab-rapport.
 * Renvoie : interface interactive avec génération Excel à la demande et partage WhatsApp.
 */
import { createButton } from '../../components/button.js';
import { createCard } from '../../components/card.js';
import { createEmptyState } from '../../components/empty-state.js';
import { showToast } from '../../components/toast.js';
import { showConfirmModal } from '../../components/confirm-modal.js';
import { todayLocal, formatDateFr, addDays } from '../../core/dates.js';
import { escapeHtml } from '../../core/text.js';
import { getLocalDb } from '../../core/db-local.js';
import { TABLES } from '../../config/constants.js';
import { settings } from '../../core/settings.js';
import { generateAuraExcelWorkbook } from './excel-export.js';
import { shareOrDownloadFile } from './share-or-download.js';
import { events } from '../../core/events.js';

export function initRapportScreen(container) {
  container.innerHTML = '';

  let currentPeriod = 'today'; // 'today' | 'yesterday' | 'week' | 'custom'
  let startDate = todayLocal();
  let endDate = todayLocal();

  // 1. CARTE DE SÉLECTION DE PÉRIODE
  const filterCard = document.createElement('div');
  filterCard.className = 'card';
  filterCard.style.marginBottom = '16px';

  filterCard.innerHTML = `
    <h3 class="card-title">Période du rapport</h3>
    <div style="display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap;" id="period-pills">
      <button type="button" class="btn btn-sm btn-primary" data-p="today">Aujourd’hui</button>
      <button type="button" class="btn btn-sm btn-secondary" data-p="yesterday">Hier</button>
      <button type="button" class="btn btn-sm btn-secondary" data-p="week">Cette semaine</button>
      <button type="button" class="btn btn-sm btn-secondary" data-p="custom">Personnalisé</button>
    </div>
    <div id="custom-date-row" style="display: none; gap: 8px; align-items: center; margin-bottom: 10px;">
      <input type="date" id="date-debut" class="field-input" style="flex: 1; padding: 8px;" value="${startDate}">
      <span style="font-size: 13px; color: var(--text-muted);">au</span>
      <input type="date" id="date-fin" class="field-input" style="flex: 1; padding: 8px;" value="${endDate}">
    </div>
    <div id="period-summary-text" style="font-size: 13px; font-weight: 600; color: var(--brand);"></div>
  `;
  container.appendChild(filterCard);

  const pillsContainer = filterCard.querySelector('#period-pills');
  const customDateRow = filterCard.querySelector('#custom-date-row');
  const inputDebut = filterCard.querySelector('#date-debut');
  const inputFin = filterCard.querySelector('#date-fin');
  const periodSummaryText = filterCard.querySelector('#period-summary-text');

  // 2. RÉSUMÉ DES COMPTEURS SUR LA PÉRIODE
  const statsRow = document.createElement('div');
  statsRow.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 20px 16px;';
  statsRow.innerHTML = `
    <div class="stat-card" style="text-align: center; padding: 12px 8px;">
      <div class="stat-val" style="font-size: 20px; color: var(--brand);" id="rep-med-count">0</div>
      <div class="stat-label" style="font-size: 10px;">Médecins</div>
    </div>
    <div class="stat-card" style="text-align: center; padding: 12px 8px;">
      <div class="stat-val" style="font-size: 20px; color: var(--brand);" id="rep-pharm-count">0</div>
      <div class="stat-label" style="font-size: 10px;">Pharmacies</div>
    </div>
    <div class="stat-card featured" style="text-align: center; padding: 12px 8px;">
      <div class="stat-val" style="font-size: 20px;" id="rep-total-count">0</div>
      <div class="stat-label" style="font-size: 10px;">Total Visites</div>
    </div>
  `;
  container.appendChild(statsRow);

  const repMedCount = statsRow.querySelector('#rep-med-count');
  const repPharmCount = statsRow.querySelector('#rep-pharm-count');
  const repTotalCount = statsRow.querySelector('#rep-total-count');

  // 3. BOUTONS D'EXPORT ET PARTAGE
  const actionSection = document.createElement('div');
  actionSection.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin: 0 20px 20px;';

  const exportBtn = createButton({
    text: 'Télécharger le rapport Excel (.xlsx)',
    variant: 'success',
    icon: '📊',
    fullWidth: true,
    onClick: () => handleExport(false)
  });

  const shareBtn = createButton({
    text: 'Partager le rapport (WhatsApp / Email)',
    variant: 'primary',
    icon: '📤',
    fullWidth: true,
    onClick: () => handleExport(true)
  });

  actionSection.appendChild(exportBtn);
  actionSection.appendChild(shareBtn);
  container.appendChild(actionSection);

  // 4. APERÇU DÉTAILLÉ DES VISITES DE LA PÉRIODE
  const previewSection = document.createElement('div');
  previewSection.className = 'screen-section';
  previewSection.innerHTML = `
    <div class="section-header">
      <h3 class="section-title">Aperçu des visites</h3>
    </div>
    <div id="period-visits-preview"></div>
  `;
  container.appendChild(previewSection);

  const previewContainer = previewSection.querySelector('#period-visits-preview');

  // 5. ZONE DE DANGER : SUPPRIMER UNE JOURNÉE COMPLÈTE
  const dangerZone = document.createElement('div');
  dangerZone.style.cssText = 'margin: 30px 20px 20px; text-align: center;';
  const deleteDayBtn = createButton({
    text: 'Supprimer toutes les visites de cette journée',
    variant: 'danger',
    extraClass: 'btn-sm',
    onClick: () => confirmDeleteDay()
  });
  dangerZone.appendChild(deleteDayBtn);
  container.appendChild(dangerZone);

  // Données en mémoire pour l'export
  let periodMeds = [];
  let periodPharms = [];

  function updatePeriodDates() {
    const today = todayLocal();
    if (currentPeriod === 'today') {
      startDate = today;
      endDate = today;
      customDateRow.style.display = 'none';
      periodSummaryText.textContent = formatDateFr(today);
    } else if (currentPeriod === 'yesterday') {
      const yesterday = addDays(today, -1);
      startDate = yesterday;
      endDate = yesterday;
      customDateRow.style.display = 'none';
      periodSummaryText.textContent = formatDateFr(yesterday);
    } else if (currentPeriod === 'week') {
      startDate = addDays(today, -6);
      endDate = today;
      customDateRow.style.display = 'none';
      periodSummaryText.textContent = `Du ${formatDateFr(startDate)} au ${formatDateFr(endDate)}`;
    } else if (currentPeriod === 'custom') {
      startDate = inputDebut.value;
      endDate = inputFin.value;
      customDateRow.style.display = 'flex';
      periodSummaryText.textContent = `Du ${formatDateFr(startDate)} au ${formatDateFr(endDate)}`;
    }

    refreshPeriodData();
  }

  // Écouteurs de pilules de période
  pillsContainer.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      pillsContainer.querySelectorAll('button').forEach(b => {
        b.className = 'btn btn-sm btn-secondary';
      });
      btn.className = 'btn btn-sm btn-primary';
      currentPeriod = btn.dataset.p;
      updatePeriodDates();
    });
  });

  inputDebut.addEventListener('change', () => {
    startDate = inputDebut.value;
    updatePeriodDates();
  });
  inputFin.addEventListener('change', () => {
    endDate = inputFin.value;
    updatePeriodDates();
  });

  /**
   * Recharge les visites de la période sélectionnée.
   */
  async function refreshPeriodData() {
    const db = await getLocalDb();

    const allMedVisites = await db.getAll(TABLES.VISITES_MEDECINS);
    periodMeds = allMedVisites.filter(v =>
      !v.deleted_at &&
      v.date_visite >= startDate &&
      v.date_visite <= endDate
    );

    const allPharmVisites = await db.getAll(TABLES.VISITES_PHARMACIES);
    periodPharms = allPharmVisites.filter(v =>
      !v.deleted_at &&
      v.date_visite >= startDate &&
      v.date_visite <= endDate
    );

    repMedCount.textContent = periodMeds.length;
    repPharmCount.textContent = periodPharms.length;
    const total = periodMeds.length + periodPharms.length;
    repTotalCount.textContent = total;

    // État des boutons
    if (total === 0) {
      exportBtn.disabled = true;
      shareBtn.disabled = true;
      exportBtn.style.opacity = '0.5';
      shareBtn.style.opacity = '0.5';
    } else {
      exportBtn.disabled = false;
      shareBtn.disabled = false;
      exportBtn.style.opacity = '1';
      shareBtn.style.opacity = '1';
    }

    renderPreview();
  }

  function renderPreview() {
    previewContainer.innerHTML = '';
    const total = periodMeds.length + periodPharms.length;

    if (total === 0) {
      previewContainer.appendChild(createEmptyState({
        icon: '📊',
        title: 'Aucune visite sur cette période',
        description: 'Sélectionnez une autre date ou enregistrez de nouvelles visites dans les onglets Médecins et Pharmacie.'
      }));
      return;
    }

    // Aperçu Médecins
    if (periodMeds.length > 0) {
      const medHeader = document.createElement('h4');
      medHeader.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--brand); margin: 12px 0 6px;';
      medHeader.textContent = `🩺 Médecins (${periodMeds.length})`;
      previewContainer.appendChild(medHeader);

      periodMeds.forEach(m => {
        const row = document.createElement('div');
        row.style.cssText = 'padding: 8px 12px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 6px; font-size: 13px;';
        row.innerHTML = `<b>${escapeHtml(m.nom)}</b> · <span style="color: var(--text-muted);">${escapeHtml(m.specialite || 'Généraliste')} (${escapeHtml(m.secteur || 'Secteur')})</span>`;
        previewContainer.appendChild(row);
      });
    }

    // Aperçu Pharmacies
    if (periodPharms.length > 0) {
      const pharmHeader = document.createElement('h4');
      pharmHeader.style.cssText = 'font-size: 13px; font-weight: 700; color: var(--brand); margin: 16px 0 6px;';
      pharmHeader.textContent = `💊 Pharmacies (${periodPharms.length})`;
      previewContainer.appendChild(pharmHeader);

      periodPharms.forEach(p => {
        const row = document.createElement('div');
        row.style.cssText = 'padding: 8px 12px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border); margin-bottom: 6px; font-size: 13px;';
        row.innerHTML = `<b>${escapeHtml(p.nom)}</b> · <span style="color: var(--text-muted);">${escapeHtml(p.grossiste || 'Grossiste')} (${escapeHtml(p.secteur || 'Secteur')})</span>`;
        previewContainer.appendChild(row);
      });
    }
  }

  /**
   * Génération et téléchargement/partage du fichier Excel.
   */
  async function handleExport(isShare = false) {
    const total = periodMeds.length + periodPharms.length;
    if (total === 0) {
      showToast({ message: 'Aucune visite sur cette période à exporter.', type: 'info' });
      return;
    }

    const originalText = exportBtn.querySelector('span:last-child').textContent;
    exportBtn.disabled = true;
    exportBtn.querySelector('span:last-child').textContent = 'Génération de l’Excel en cours...';

    try {
      const db = await getLocalDb();
      const allProduits = await db.getAll(TABLES.PRODUITS);
      const allMedecins = await db.getAll(TABLES.MEDECINS);
      const userSettings = settings.get();

      const { blob, filename } = await generateAuraExcelWorkbook({
        medecinsVisites: periodMeds,
        pharmaciesVisites: periodPharms,
        portefeuilleMedecins: allMedecins,
        produits: allProduits,
        delegueNom: userSettings.nom || 'Amine',
        dateDebut: startDate,
        dateFin: endDate
      });

      await shareOrDownloadFile(blob, filename);

      showToast({
        message: isShare ? 'Menu de partage ouvert !' : 'Rapport Excel téléchargé avec succès ✓',
        type: 'success'
      });
    } catch (err) {
      console.error('Erreur génération Excel:', err);
      showToast({ message: 'Erreur lors de la création de l’Excel', type: 'error' });
    } finally {
      exportBtn.disabled = false;
      exportBtn.querySelector('span:last-child').textContent = originalText;
    }
  }

  /**
   * Double confirmation pour supprimer une journée complète de visites.
   */
  function confirmDeleteDay() {
    const total = periodMeds.length + periodPharms.length;
    if (total === 0) {
      showToast({ message: 'Aucune visite à supprimer sur cette date.', type: 'info' });
      return;
    }

    showConfirmModal({
      title: 'Supprimer toutes les visites ?',
      message: `Attention : cette action va archiver les ${total} visites (médecins & pharmacies) du ${formatDateFr(startDate)}. Confirmez-vous ?`,
      confirmText: 'Oui, tout supprimer',
      isDanger: true,
      onConfirm: async () => {
        const db = await getLocalDb();
        const now = new Date().toISOString();

        for (const m of periodMeds) {
          m.deleted_at = now;
          await db.put(TABLES.VISITES_MEDECINS, m);
        }
        for (const p of periodPharms) {
          p.deleted_at = now;
          await db.put(TABLES.VISITES_PHARMACIES, p);
        }

        events.emit('data-changed', { action: 'delete-day' });
        showToast({ message: 'Journée archivée avec succès ✓', type: 'info' });
        refreshPeriodData();
      }
    });
  }

  events.on('data-changed', refreshPeriodData);

  // Initialisation
  updatePeriodDates();
}
