/**
 * db-local.js — Gestion du carnet de poche interne au téléphone (IndexedDB via idb).
 * Reçoit : requêtes de lecture, écriture et transactions locales.
 * Renvoie : la connexion à la base IndexedDB et les méthodes d'accès direct.
 */
import { openDB } from 'idb';
import { DB_NAME, DB_VERSION, TABLES } from '../config/constants.js';

let dbPromise = null;

export function getLocalDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Tables de référence
        const refTables = [
          TABLES.PRODUITS,
          TABLES.GROSSISTES,
          TABLES.SECTEURS,
          TABLES.MEDECINS,
          TABLES.PHARMACIES,
          TABLES.APP_SETTINGS
        ];

        for (const tableName of refTables) {
          if (!db.objectStoreNames.contains(tableName)) {
            const store = db.createObjectStore(tableName, { keyPath: tableName === TABLES.APP_SETTINGS ? 'key' : 'id' });
            if (tableName !== TABLES.APP_SETTINGS) {
              store.createIndex('updated_at', 'updated_at');
              if (tableName === TABLES.MEDECINS || tableName === TABLES.PHARMACIES) {
                store.createIndex('nom_normalise', 'nom_normalise');
              }
            }
          }
        }

        // 2. Tables des visites
        const visitTables = [TABLES.VISITES_MEDECINS, TABLES.VISITES_PHARMACIES];
        for (const tableName of visitTables) {
          if (!db.objectStoreNames.contains(tableName)) {
            const store = db.createObjectStore(tableName, { keyPath: 'id' });
            store.createIndex('date_visite', 'date_visite');
            store.createIndex('updated_at', 'updated_at');
          }
        }

        // 3. Boîte d'envoi hors-ligne (Outbox)
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
          outboxStore.createIndex('row_id', 'row_id');
          outboxStore.createIndex('table', 'table');
        }

        // 4. Métadonnées (last_pull, etc.)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      }
    });
  }
  return dbPromise;
}
