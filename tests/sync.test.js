import { describe, it, expect } from 'vitest';
import { SYNC_TABLE_ORDER, TABLES } from '../src/config/constants.js';

describe('sync-engine & outbox — Règles de synchronisation', () => {
  it('respecte l ordre de priorité des tables pour préserver l intégrité', () => {
    // Les produits et référentiels doivent précéder les visites
    const idxProduits = SYNC_TABLE_ORDER.indexOf(TABLES.PRODUITS);
    const idxMedecins = SYNC_TABLE_ORDER.indexOf(TABLES.MEDECINS);
    const idxVisitesMed = SYNC_TABLE_ORDER.indexOf(TABLES.VISITES_MEDECINS);

    expect(idxProduits).toBeLessThan(idxMedecins);
    expect(idxMedecins).toBeLessThan(idxVisitesMed);
  });

  it('les tables de base contiennent les tables obligatoires', () => {
    expect(SYNC_TABLE_ORDER).toContain(TABLES.PRODUITS);
    expect(SYNC_TABLE_ORDER).toContain(TABLES.MEDECINS);
    expect(SYNC_TABLE_ORDER).toContain(TABLES.PHARMACIES);
    expect(SYNC_TABLE_ORDER).toContain(TABLES.VISITES_MEDECINS);
    expect(SYNC_TABLE_ORDER).toContain(TABLES.VISITES_PHARMACIES);
  });
});
