/**
 * backup.js — Sauvegarde et restauration complète du carnet local en JSON.
 * Reçoit : données brutes IndexedDB de toutes les tables.
 * Renvoie : fichier de sauvegarde JSON daté téléchargeable et import avec fusion.
 */
import { getLocalDb } from '../../core/db-local.js';
import { TABLES, APP_VERSION } from '../../config/constants.js';
import { todayLocal } from '../../core/dates.js';
import { events } from '../../core/events.js';

export async function exportLocalBackup() {
  const db = await getLocalDb();
  const backup = {
    version: APP_VERSION,
    export_date: new Date().toISOString(),
    tables: {}
  };

  const storeNames = [
    TABLES.PRODUITS,
    TABLES.GROSSISTES,
    TABLES.SECTEURS,
    TABLES.MEDECINS,
    TABLES.PHARMACIES,
    TABLES.VISITES_MEDECINS,
    TABLES.VISITES_PHARMACIES,
    TABLES.APP_SETTINGS
  ];

  for (const name of storeNames) {
    backup.tables[name] = await db.getAll(name);
  }

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `backup_delegation_v2_${todayLocal()}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { success: true, filename };
}

export async function importLocalBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (!backup.tables) {
          throw new Error('Format de fichier de sauvegarde invalide.');
        }

        const db = await getLocalDb();
        let totalRestored = 0;

        for (const [tableName, rows] of Object.entries(backup.tables)) {
          if (!Array.isArray(rows)) continue;
          const tx = db.transaction(tableName, 'readwrite');
          for (const row of rows) {
            await tx.store.put(row);
            totalRestored++;
          }
          await tx.done;
        }

        events.emit('data-changed', { action: 'backup-restore' });
        resolve({ success: true, count: totalRestored });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    reader.readAsText(file);
  });
}
