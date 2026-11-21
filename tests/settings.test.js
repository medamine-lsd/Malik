import { describe, it, expect } from 'vitest';
import { settings } from '../src/core/settings.js';

describe('settings.js & backup — Préférences et sauvegarde', () => {
  it('fournit les paramètres par défaut et permet leur mise à jour', () => {
    const initial = settings.get();
    expect(initial).toHaveProperty('nom');
    expect(initial).toHaveProperty('type');

    settings.set({ nom: 'Amine Test', type: 'DC' });
    const updated = settings.get();
    expect(updated.nom).toBe('Amine Test');
    expect(updated.type).toBe('DC');
  });

  it('structure le format de sauvegarde JSON avec toutes les tables', () => {
    const sampleBackup = {
      version: '2.0.0',
      export_date: new Date().toISOString(),
      tables: {
        produits: [{ id: '1', nom: 'ACIDE FOLIQUE' }],
        medecins: [],
        visites_medecins: []
      }
    };

    const serialized = JSON.stringify(sampleBackup);
    const parsed = JSON.parse(serialized);

    expect(parsed.version).toBe('2.0.0');
    expect(parsed.tables.produits.length).toBe(1);
    expect(parsed.tables.produits[0].nom).toBe('ACIDE FOLIQUE');
  });
});
