/**
 * reglages-screen.js — Onglet Réglages complet de l'application.
 * Regroupe : Mes infos, Gamme AURA, Grossistes & Secteurs, Portefeuille,
 * Contrôle de synchronisation, Sauvegarde JSON, Apparence et À propos.
 * Reçoit : conteneur HTML #tab-reglages.
 * Renvoie : interface modulaire et persistante.
 */
import { createCard } from '../../components/card.js';
import { createField } from '../../components/field.js';
import { createButton } from '../../components/button.js';
import { showToast } from '../../components/toast.js';
import { showConfirmModal } from '../../components/confirm-modal.js';
import { settings } from '../../core/settings.js';
import { APP_VERSION } from '../../config/constants.js';
import { renderProduitsManager } from './produits-manager.js';
import { renderListesManager } from './listes-manager.js';
import { renderBaseManager } from './base-manager.js';
import { renderSyncPanel } from './sync-panel.js';
import { exportLocalBackup, importLocalBackup } from './backup.js';

export function initReglagesScreen(container) {
  container.innerHTML = '';

  // 1. CARTE : MES INFOS PERSONNELLES
  const userSettings = settings.get();
  const nomField = createField({ label: 'Mon nom complet', value: userSettings.nom || 'Amine', placeholder: 'Ex: Amine' });
  const typeField = createField({
    label: 'Poste / Rôle',
    type: 'select',
    value: userSettings.type || 'DMC',
    options: [
      { value: 'DMC', label: 'DMC (Délégué Médico-Commercial)' },
      { value: 'DC', label: 'DC (Délégué Commercial)' }
    ]
  });
  const secteurField = createField({ label: 'Secteur principal', value: userSettings.secteur || '', placeholder: 'Ex: Alger Ouest' });

  const saveInfosBtn = createButton({
    text: 'Enregistrer mes informations',
    variant: 'primary',
    extraClass: 'btn-sm',
    onClick: () => {
      const nom = nomField.getValue().trim();
      const type = typeField.getValue();
      const secteur = secteurField.getValue().trim();
      settings.set({ nom, type, secteur });

      const greetingEl = document.getElementById('user-greeting');
      if (greetingEl) greetingEl.textContent = `Bonjour ${nom || 'Amine'}`;
      showToast({ message: 'Informations mises à jour ✓', type: 'success' });
    }
  });

  const mesInfosCard = createCard({
    title: '👤 Mes informations',
    children: [nomField.element, typeField.element, secteurField.element, saveInfosBtn]
  });
  container.appendChild(mesInfosCard);

  // 2. CARTE : GAMME DE PRODUITS AURA
  const produitsCard = createCard({ title: '📦 Produits & Gamme AURA' });
  renderProduitsManager(produitsCard.querySelector('.card-body'));
  container.appendChild(produitsCard);

  // 3. CARTE : GROSSISTES ET SECTEURS
  const listesCard = createCard({ title: '🏢 Grossistes & Secteurs' });
  renderListesManager(listesCard.querySelector('.card-body'));
  container.appendChild(listesCard);

  // 4. CARTE : MON PORTEFEUILLE (MÉDECINS & PHARMACIES)
  const baseCard = createCard({ title: '📁 Mon portefeuille' });
  renderBaseManager(baseCard.querySelector('.card-body'));
  container.appendChild(baseCard);

  // 5. CARTE : SYNCHRONISATION SUPABASE
  const syncCard = createCard({ title: '☁️ Synchronisation en ligne' });
  renderSyncPanel(syncCard.querySelector('.card-body'));
  container.appendChild(syncCard);

  // 6. CARTE : SAUVEGARDE & RESTAURATION (JSON)
  const backupCard = createCard({
    title: '💾 Sauvegarde & Restauration',
    children: [
      '<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Exportez une copie complète de toutes vos données locales (fichier .json) ou restaurez une sauvegarde précédente.</p>'
    ]
  });

  const backupBtnGroup = document.createElement('div');
  backupBtnGroup.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

  const exportBtn = createButton({
    text: 'Exporter mes données (JSON)',
    variant: 'secondary',
    extraClass: 'btn-sm',
    icon: '⬇️',
    onClick: async () => {
      try {
        const { filename } = await exportLocalBackup();
        showToast({ message: `Sauvegarde ${filename} téléchargée !`, type: 'success' });
      } catch (err) {
        showToast({ message: 'Erreur lors de l’export', type: 'error' });
      }
    }
  });

  const importFileInput = document.createElement('input');
  importFileInput.type = 'file';
  importFileInput.accept = '.json,application/json';
  importFileInput.style.display = 'none';

  const importBtn = createButton({
    text: 'Importer une sauvegarde',
    variant: 'secondary',
    extraClass: 'btn-sm',
    icon: '⬆️',
    onClick: () => importFileInput.click()
  });

  importFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showConfirmModal({
      title: 'Restaurer une sauvegarde ?',
      message: `Toutes les données du fichier « ${file.name} » seront fusionnées avec votre carnet actuel.`,
      confirmText: 'Confirmer l’import',
      onConfirm: async () => {
        try {
          const { count } = await importLocalBackup(file);
          showToast({ message: `${count} lignes restaurées avec succès !`, type: 'success' });
        } catch {
          showToast({ message: 'Fichier invalide ou corrompu', type: 'error' });
        }
      }
    });
  });

  backupBtnGroup.appendChild(exportBtn);
  backupBtnGroup.appendChild(importBtn);
  backupBtnGroup.appendChild(importFileInput);
  backupCard.querySelector('.card-body').appendChild(backupBtnGroup);
  container.appendChild(backupCard);

  // 7. CARTE : APPARENCE
  const themeCard = createCard({
    title: '🌓 Apparence & Thème',
    children: [
      '<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Choisissez le mode d’affichage qui vous convient le mieux sur le terrain.</p>'
    ]
  });

  const themeBtnGroup = document.createElement('div');
  themeBtnGroup.style.cssText = 'display: flex; gap: 8px;';

  const btnLight = createButton({
    text: '☀️ Clair',
    variant: 'secondary',
    extraClass: 'btn-sm',
    onClick: () => {
      document.documentElement.setAttribute('data-theme', 'light');
      settings.set({ theme: 'light' });
      showToast({ message: 'Thème clair activé', type: 'info' });
    }
  });

  const btnDark = createButton({
    text: '🌙 Sombre',
    variant: 'secondary',
    extraClass: 'btn-sm',
    onClick: () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      settings.set({ theme: 'dark' });
      showToast({ message: 'Thème sombre activé', type: 'info' });
    }
  });

  const btnAuto = createButton({
    text: '📱 Auto (système)',
    variant: 'secondary',
    extraClass: 'btn-sm',
    onClick: () => {
      document.documentElement.removeAttribute('data-theme');
      settings.set({ theme: 'auto' });
      showToast({ message: 'Thème automatique selon le téléphone', type: 'info' });
    }
  });

  themeBtnGroup.appendChild(btnLight);
  themeBtnGroup.appendChild(btnDark);
  themeBtnGroup.appendChild(btnAuto);
  themeCard.querySelector('.card-body').appendChild(themeBtnGroup);
  container.appendChild(themeCard);

  // 8. CARTE : À PROPOS
  const aboutCard = createCard({
    title: 'ℹ️ À propos de Délégation V2',
    children: [
      `
      <div style="font-size: 13px; line-height: 1.6; color: var(--text-muted);">
        <div><b>Version :</b> ${APP_VERSION} (PWA Offline-First)</div>
        <div><b>Laboratoire :</b> Africa Pure Lab (Algérie)</div>
        <div><b>Gamme :</b> AURA</div>
        <div style="margin-top: 10px;">
          <button type="button" id="btn-check-update" class="btn btn-sm btn-secondary">
            🔄 Vérifier les mises à jour
          </button>
        </div>
      </div>
      `
    ]
  });

  aboutCard.querySelector('#btn-check-update').addEventListener('click', async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        showToast({ message: 'Application à jour ✓', type: 'success' });
      } else {
        showToast({ message: 'Application à jour ✓', type: 'info' });
      }
    }
  });

  container.appendChild(aboutCard);
}
