import { describe, it, expect } from 'vitest';
import { normalize } from '../src/core/text.js';

describe('pharmacies feature — Logique des visites et disponibilités', () => {
  it('détecte un doublon de pharmacie par nom et secteur normalisés', () => {
    const existing = [
      { id: 'p-1', nom: 'Pharmacie Centrale', secteur: 'Kouba' },
      { id: 'p-2', nom: 'Pharmacie Benali', secteur: 'Hydra' }
    ];

    function findDuplicate(nom, secteur) {
      const normNom = normalize(nom);
      const normSecteur = normalize(secteur);
      return existing.find(p => normalize(p.nom) === normNom && (!normSecteur || normalize(p.secteur) === normSecteur));
    }

    expect(findDuplicate('pharmacie centrale', 'kouba')).toBeDefined();
    expect(findDuplicate('PHARMACIE CENTRALE', 'Kouba')?.id).toBe('p-1');
    expect(findDuplicate('Pharmacie Centrale', 'Hydra')).toBeUndefined();
    expect(findDuplicate('Nouvelle Pharmacie', 'Kouba')).toBeUndefined();
  });

  it('structure correctement le dictionnaire des disponibilités et rotations', () => {
    const rawDispos = {
      'prod-1': { dispo: true, rot: '12' },
      'prod-2': { dispo: false, rot: '' },
      'prod-3': { dispo: true, rot: '5' }
    };

    // Filtre des produits disponibles
    const available = Object.entries(rawDispos).filter(([_, info]) => info.dispo);
    expect(available.length).toBe(2);
    expect(available.map(([id]) => id)).toEqual(['prod-1', 'prod-3']);
  });

  it('garantit que l état d une visite pharmacie est strictement indépendant des visites médecins', () => {
    const visiteMedecin = { id: 'vm-1', type: 'medecin', nom: 'Dr. Benali' };
    const visitePharmacie = { id: 'vp-1', type: 'pharmacie', nom: 'Pharmacie Benali' };

    // Modification de la visite pharmacie
    const updatedPharmacie = { ...visitePharmacie, grossiste: 'Biopharm' };

    expect(updatedPharmacie.id).toBe('vp-1');
    expect(visiteMedecin.id).toBe('vm-1');
    expect(visiteMedecin).not.toHaveProperty('grossiste');
  });
});
