import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchMedecins } from '../src/features/medecins/medecin-search.js';

describe('medecin-search.js — Recherche instantanée en mémoire', () => {
  const sampleMedecins = [
    { id: '1', nom: 'Dr. Benali Rachid', specialite: 'Cardiologie', secteur: 'Kouba', etab: 'Clinique Al Azhar' },
    { id: '2', nom: 'Dr. Saïghi Ahmed', specialite: 'Gynécologie', secteur: 'Hydra', etab: 'Cabinet' },
    { id: '3', nom: 'Dr. Benali Karim', specialite: 'Pédiatrie', secteur: 'Bab El Oued', etab: 'Hôpital' },
    { id: '4', nom: 'Dr. Khelifi Mohamed', specialite: 'Médecine Générale', secteur: 'El Harrach', etab: 'Polyclinique' },
    { id: '5', nom: 'Dr. Khelifi Chérif', specialite: 'Gastro', secteur: 'Alger Centre', etab: 'Cabinet' },
    { id: '6', nom: 'Dr. Ziani Fatima', specialite: 'Pédiatrie', secteur: 'Kouba', etab: 'Cabinet' },
    { id: '7', nom: 'Dr. Diabi Mustapha', specialite: 'Cardiologie', secteur: 'Hussein Dey', etab: 'Hôpital Parnet' }
  ];

  buildSearchIndex(sampleMedecins);

  it('trouve un médecin en tapant son nom avec ou sans accents', () => {
    const results = searchMedecins('saighi');
    expect(results.length).toBe(1);
    expect(results[0].nom).toBe('Dr. Saïghi Ahmed');
  });

  it('recherche multi-mots (nom + spécialité ou lieu)', () => {
    const results = searchMedecins('benali pediatrie');
    expect(results.length).toBe(1);
    expect(results[0].nom).toBe('Dr. Benali Karim');
  });

  it('priorise les résultats commençant par la requête', () => {
    const results = searchMedecins('khelifi');
    expect(results.length).toBe(2);
    // Les deux Khelifi sont remontés
    expect(results.some(r => r.nom.includes('Chérif'))).toBe(true);
    expect(results.some(r => r.nom.includes('Mohamed'))).toBe(true);
  });

  it('recherche par établissement ou secteur', () => {
    const results = searchMedecins('parnet');
    expect(results.length).toBe(1);
    expect(results[0].nom).toBe('Dr. Diabi Mustapha');
  });

  it('renvoie au maximum la limite spécifiée (défaut 8)', () => {
    const results = searchMedecins('dr', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
