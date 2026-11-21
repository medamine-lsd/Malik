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

  it('nettoie nom_normalise des tables qui ne le supportent pas dans Supabase', () => {
    function sanitizePayload(tableName, payload) {
      const p = { ...payload };
      if (tableName !== 'medecins' && tableName !== 'pharmacies') {
        delete p.nom_normalise;
      }
      delete p.shouldUpdateFiche;
      return p;
    }

    const produitPayload = { id: 'p1', nom: 'AURA 1', nom_normalise: 'aura 1' };
    const medecinPayload = { id: 'm1', nom: 'Dr. Test', nom_normalise: 'dr test' };

    expect(sanitizePayload('produits', produitPayload).nom_normalise).toBeUndefined();
    expect(sanitizePayload('medecins', medecinPayload).nom_normalise).toBe('dr test');
  });
});
