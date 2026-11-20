/**
 * constants.js — Constantes globales de l'application Délégation V2.
 * Reçoit : aucune entrée directe.
 * Renvoie : les noms de tables, la version de l'application et le fuseau horaire.
 */

export const APP_VERSION = '2.0.0';
export const TIMEZONE = 'Africa/Algiers';
export const DB_NAME = 'delegation-v2';
export const DB_VERSION = 1;

// Tables synchronisées entre IndexedDB et Supabase
export const TABLES = {
  APP_SETTINGS: 'app_settings',
  PRODUITS: 'produits',
  GROSSISTES: 'grossistes',
  SECTEURS: 'secteurs',
  MEDECINS: 'medecins',
  PHARMACIES: 'pharmacies',
  VISITES_MEDECINS: 'visites_medecins',
  VISITES_PHARMACIES: 'visites_pharmacies'
};

// Ordre strict d'envoi pour respecter les dépendances (clés et listes en premier)
export const SYNC_TABLE_ORDER = [
  TABLES.PRODUITS,
  TABLES.GROSSISTES,
  TABLES.SECTEURS,
  TABLES.MEDECINS,
  TABLES.PHARMACIES,
  TABLES.VISITES_MEDECINS,
  TABLES.VISITES_PHARMACIES,
  TABLES.APP_SETTINGS
];
