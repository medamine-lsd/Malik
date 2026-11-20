/**
 * repo.js — Fabrique de dépôts de données locaux avec boîte d'envoi intégrée.
 * Reçoit : nom de table et options.
 * Renvoie : méthodes standardisées (save, softDelete, restore, list, getById).
 */
import { getLocalDb } from './db-local.js';
import { newId } from './id.js';
import { normalize } from './text.js';
import { events } from './events.js';

export function createRepo(tableName) {
  return {
    tableName,

    /**
     * Enregistre ou met à jour un élément dans le carnet local et dans l'outbox.
     */
    async save(item) {
      const db = await getLocalDb();
      const now = new Date().toISOString();

      const record = { ...item };
      if (!record.id) {
        record.id = newId();
        record.created_at = now;
      }
      record.updated_at = now;

      // Normalisation automatique du nom pour les recherches
      if (record.nom !== undefined) {
        record.nom_normalise = normalize(`${record.nom} ${record.prenom || ''}`);
      }

      const tx = db.transaction([tableName, 'outbox'], 'readwrite');
      const store = tx.objectStore(tableName);
      const outbox = tx.objectStore('outbox');

      // 1. Écriture locale
      await store.put(record);

      // 2. Gestion de l'outbox (remplacement si déjà en attente pour éviter l'accumulation)
      const outboxIndex = outbox.index('row_id');
      const existingEntries = await outboxIndex.getAll(record.id);
      for (const entry of existingEntries) {
        if (entry.table === tableName) {
          await outbox.delete(entry.seq);
        }
      }

      await outbox.add({
        table: tableName,
        row_id: record.id,
        payload: record,
        created_at: now,
        tries: 0
      });

      await tx.done;

      // 3. Notification d'événement
      events.emit('data-changed', { table: tableName, action: 'save', item: record });

      return record;
    },

    /**
     * Suppression douce (soft delete) : marque deleted_at sans jamais supprimer physiquement.
     */
    async softDelete(id) {
      const item = await this.getById(id);
      if (!item) return false;

      item.deleted_at = new Date().toISOString();
      await this.save(item);
      events.emit('data-changed', { table: tableName, action: 'delete', item });
      return true;
    },

    /**
     * Annule une suppression en réactivant la ligne (deleted_at = null).
     */
    async restore(id) {
      const item = await this.getById(id);
      if (!item) return false;

      item.deleted_at = null;
      await this.save(item);
      events.emit('data-changed', { table: tableName, action: 'restore', item });
      return true;
    },

    /**
     * Récupère un élément par son ID.
     */
    async getById(id) {
      const db = await getLocalDb();
      return db.get(tableName, id);
    },

    /**
     * Liste tous les éléments actifs (filtre par défaut les éléments supprimés).
     */
    async list({ includeDeleted = false, filterFn = null } = {}) {
      const db = await getLocalDb();
      const all = await db.getAll(tableName);

      let results = includeDeleted ? all : all.filter(r => !r.deleted_at);
      if (typeof filterFn === 'function') {
        results = results.filter(filterFn);
      }
      return results;
    }
  };
}
