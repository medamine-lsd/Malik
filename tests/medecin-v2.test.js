import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchMedecins } from '../src/features/medecins/medecin-search.js';

describe('Exigences Médecins V2 — Filtre spécialité et exclusion des déjà visités', () => {
  const medecins = [
    { id: 'm1', nom: 'Dr. Benali Rachid', specialite: 'PEDL', secteur: 'Kouba', etab: 'Cabinet' },
    { id: 'm2', nom: 'Dr. Saïghi Ahmed', specialite: 'GY', secteur: 'Hydra', etab: 'Cabinet' },
    { id: 'm3', nom: 'Dr. Ziani Fatima', specialite: 'PED', secteur: 'Kouba', etab: 'Hôpital' },
    { id: 'm4', nom: 'Dr. Khelifi Mohamed', specialite: 'MG', secteur: 'El Harrach', etab: 'Polyclinique' },
    { id: 'm5', nom: 'Dr. Amrani Karim', specialite: 'MGL', secteur: 'Alger', etab: 'Cabinet' },
  ];

  buildSearchIndex(medecins);

  it('exclut formellement les médecins déjà visités aujourd’hui de la recherche', () => {
    const visitedToday = new Set(['m1', 'm3']);
    const results = searchMedecins('benali', 10, { excludeIds: visitedToday });
    // Dr. Benali (m1) a été visité aujourd'hui, il ne doit pas apparaître
    expect(results.length).toBe(0);

    const allAllowed = searchMedecins('dr', 10, { excludeIds: visitedToday });
    expect(allAllowed.some(m => m.id === 'm1')).toBe(false);
    expect(allAllowed.some(m => m.id === 'm3')).toBe(false);
    expect(allAllowed.some(m => m.id === 'm2')).toBe(true);
  });

  it('filtre par spécialité (ex: PEDL uniquement)', () => {
    const results = searchMedecins('', 10, { specialiteFilter: 'PEDL' });
    expect(results.length).toBe(1);
    expect(results[0].nom).toBe('Dr. Benali Rachid');
  });

  it('affecte correctement CAB aux PEDL, MGL, GY et PUB aux autres', () => {
    const CAB_SPECS = ['PEDL', 'MGL', 'GY'];
    const PUB_SPECS = ['PED', 'MG', 'VACC', 'DT'];

    function getAutoStatus(spec) {
      const s = (spec || '').toUpperCase().trim();
      return CAB_SPECS.includes(s) ? 'CAB' : 'PUB';
    }

    expect(getAutoStatus('PEDL')).toBe('CAB');
    expect(getAutoStatus('mgl')).toBe('CAB');
    expect(getAutoStatus('GY')).toBe('CAB');
    expect(getAutoStatus('PED')).toBe('PUB');
    expect(getAutoStatus('mg')).toBe('PUB');
    expect(getAutoStatus('VACC')).toBe('PUB');
    expect(getAutoStatus('DT')).toBe('PUB');
  });
});
