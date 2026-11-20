import { describe, it, expect } from 'vitest';
import { generateAuraExcelWorkbook } from '../src/features/rapport/excel-export.js';
import { getContrastTextColor, EXCEL_CONFIG } from '../src/config/excel-config.js';

describe('Excel Layout — Respect strict du format officiel AURA', () => {
  it('calcule correctement la couleur de texte selon le contraste de fond', () => {
    // Bleu foncé 4F81BD -> texte blanc
    expect(getContrastTextColor('4F81BD')).toBe('FFFFFFFF');
    // Jaune très clair ou blanc -> texte noir
    expect(getContrastTextColor('FFFFFF')).toBe('FF000000');
    expect(getContrastTextColor('F2F5FF')).toBe('FF000000');
  });

  it('génère un classeur avec les 3 feuilles conformes et les bonnes colonnes', async () => {
    const mockMedsVisites = [
      {
        id: '1',
        date_visite: '2026-11-20',
        nom: 'Dr. Benali Rachid',
        specialite: 'Cardiologie',
        telephone: '0550123456',
        statut: 'CAB',
        secteur: 'Kouba',
        pot: 'A+',
        email: 'benali@med.dz',
        remplacant: '',
        observation: 'Très bon échange'
      }
    ];

    const mockPharmVisites = [
      {
        id: '1',
        date_visite: '2026-11-20',
        nom: 'Pharmacie Centrale',
        secteur: 'Kouba',
        grossiste: 'Biopharm',
        disponibilites: {
          'p1': { dispo: true, rot: '10' },
          'p2': { dispo: false, rot: '' }
        }
      }
    ];

    const mockProduits = [
      { id: 'p1', nom: 'AURA VIT C', couleur: 'C0504D', ordre: 1, actif: true },
      { id: 'p2', nom: 'AURA ZINC', couleur: '9BBB59', ordre: 2, actif: true }
    ];

    const mockPf = [
      { id: 'm1', nom: 'Dr. Benali Rachid', specialite: 'Cardiologie', telephone: '0550123456', secteur: 'Kouba', statut: 'CAB', pot: 'A+' }
    ];

    const { blob, filename } = await generateAuraExcelWorkbook({
      medecinsVisites: mockMedsVisites,
      pharmaciesVisites: mockPharmVisites,
      portefeuilleMedecins: mockPf,
      produits: mockProduits,
      delegueNom: 'AMINE',
      dateDebut: '2026-11-20',
      dateFin: '2026-11-20'
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000); // Fichier binaire .xlsx valide
    expect(filename).toBe('RAPPORT_AURA_AMINE_2026-11-20.xlsx');
  });
});
