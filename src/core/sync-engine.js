/**
 * sync-engine.js — Moteur de synchronisation bidirectionnelle (le « facteur »).
 * Envoie les données hors-ligne (push) et récupère les nouveautés distantes (pull).
 * Reçoit : demandes de synchronisation planifiées ou immédiates.
 * Renvoie : état de synchronisation temps réel émis via le bus d'événements.
 */
import { getLocalDb } from './db-local.js';
import { supabase, isConfigured } from './supabase-client.js';
import { SYNC_TABLE_ORDER } from '../config/constants.js';
import { events } from './events.js';

let isSyncing = false;
let syncTimeout = null;

export const syncEngine = {
  /**
   * Demande une synchronisation avec délai anti-rebond de 1.5s pour regrouper les saisies.
   */
  requestSync(delay = 1500) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      this.syncNow();
    }, delay);
  },

  /**
   * Lance immédiatement le cycle de synchronisation complète.
   */
  async syncNow() {
    if (isSyncing || !navigator.onLine || !isConfigured || !supabase) {
      this.updateStatus();
      return;
    }

    isSyncing = true;
    events.emit('sync-status', { state: 'syncing' });

    try {
      // 1. PUSH : Envoi des éléments de la boîte d'envoi (outbox)
      await this.pushOutbox();

      // 2. PULL : Récupération des nouveautés depuis Supabase
      await this.pullRemote();

      events.emit('sync-status', { state: 'synced', pendingCount: 0 });
    } catch (err) {
      console.warn('SyncEngine : Problème lors de la synchronisation:', err);
      events.emit('sync-status', { state: 'error', error: err.message });
    } finally {
      isSyncing = false;
      this.updateStatus();
    }
  },

  /**
   * PUSH : Vide la boîte d'envoi vers Supabase dans l'ordre strict des tables.
   */
  async pushOutbox() {
    const db = await getLocalDb();
    const outboxItems = await db.getAll('outbox');

    if (outboxItems.length === 0) return;

    // Regrouper par table
    const byTable = new Map();
    for (const item of outboxItems) {
      if (!byTable.has(item.table)) {
        byTable.set(item.table, []);
      }
      byTable.get(item.table).push(item);
    }

    // Traiter dans l'ordre strict des dépendances
    for (const tableName of SYNC_TABLE_ORDER) {
      const items = byTable.get(tableName);
      if (!items || items.length === 0) continue;

      // Par lots de 100
      for (let i = 0; i < items.length; i += 100) {
        const batch = items.slice(i, i + 100);
        const payloads = batch.map(b => b.payload);

        const { error } = await supabase
          .from(tableName)
          .upsert(payloads, { onConflict: tableName === 'app_settings' ? 'key' : 'id' });

        if (error) {
          throw new Error(`Erreur envoi table ${tableName}: ${error.message}`);
        }

        // Succès : supprimer les entrées envoyées de l'outbox
        const tx = db.transaction('outbox', 'readwrite');
        for (const b of batch) {
          await tx.store.delete(b.seq);
        }
        await tx.done;
      }
    }
  },

  /**
   * PULL : Récupère les données modifiées dans Supabase depuis le dernier last_pull.
   */
  async pullRemote() {
    const db = await getLocalDb();

    for (const tableName of SYNC_TABLE_ORDER) {
      const meta = await db.get('meta', `last_pull:${tableName}`);
      const lastPull = meta ? meta.value : '1970-01-01T00:00:00Z';

      let query = supabase
        .from(tableName)
        .select('*')
        .gt('updated_at', lastPull)
        .order('updated_at', { ascending: true })
        .limit(1000);

      const { data, error } = await query;
      if (error) {
        console.warn(`Erreur pull table ${tableName}:`, error.message);
        continue;
      }

      if (data && data.length > 0) {
        const outboxItems = await db.getAll('outbox');
        const pendingIds = new Set(
          outboxItems.filter(o => o.table === tableName).map(o => o.row_id)
        );

        let maxUpdatedAt = lastPull;
        const tx = db.transaction([tableName, 'meta'], 'readwrite');
        const store = tx.objectStore(tableName);

        for (const row of data) {
          // Si une modification locale est déjà en attente d'envoi, on la préserve
          if (!pendingIds.has(row.id || row.key)) {
            await store.put(row);
          }
          if (row.updated_at > maxUpdatedAt) {
            maxUpdatedAt = row.updated_at;
          }
        }

        // Mettre à jour last_pull
        await tx.objectStore('meta').put({ key: `last_pull:${tableName}`, value: maxUpdatedAt });
        await tx.done;

        events.emit('data-changed', { table: tableName, action: 'pull' });
      }
    }
  },

  /**
   * Met à jour et diffuse l'état visuel de synchronisation.
   */
  async updateStatus() {
    if (!navigator.onLine) {
      events.emit('sync-status', { state: 'offline' });
      return;
    }
    const db = await getLocalDb();
    const count = await db.count('outbox');
    if (count > 0) {
      events.emit('sync-status', { state: 'pending', pendingCount: count });
    } else {
      events.emit('sync-status', { state: 'synced', pendingCount: 0 });
    }
  },

  /**
   * Démarre les écouteurs réseau et périodiques.
   */
  init() {
    window.addEventListener('online', () => this.syncNow());
    window.addEventListener('offline', () => this.updateStatus());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.syncNow();
      }
    });

    // Périodique toutes les 2 minutes si l'app est ouverte
    setInterval(() => this.syncNow(), 2 * 60 * 1000);

    // Écouteur des changements locaux pour demander un envoi
    events.on('data-changed', (e) => {
      if (e.action === 'save' || e.action === 'delete') {
        this.requestSync();
      }
    });

    // Premier déclenchement immédiat
    this.syncNow();
  }
};
