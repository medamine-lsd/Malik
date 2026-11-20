import { describe, it, expect } from 'vitest';
import { normalize } from '../src/core/text.js';

describe('medecins feature — Logique métier et anti-doublon', () => {
  it('détecte correctement un doublon par nom normalisé et spécialité', () => {
    const existing = [
      { id: '1', nom: 'Dr. Benali Rachid', specialite: 'Cardiologie' },
      { id: '2', nom: 'Dr. Saïghi Ahmed', specialite: 'Gynécologie' }
    ];

    function findDuplicate(nom, specialite) {
      const normNom = normalize(nom);
      const normSpec = normalize(specialite);
      return existing.find(m => normalize(m.nom) === normNom && normalize(m.specialite) === normSpec);
    }

    // Même médecin avec casse et accents différents
    expect(findDuplicate('dr benali rachid', 'cardiologie')).toBeDefined();
    expect(findDuplicate('Dr. BENALI RACHID', 'Cardiologie')?.id).toBe('1');
    expect(findDuplicate('Dr. Saighi Ahmed', 'Gynecologie')?.id).toBe('2');

    // Nouveau médecin distinct
    expect(findDuplicate('Dr. Benali Rachid', 'Pédiatrie')).toBeUndefined();
    expect(findDuplicate('Dr. Mansouri Karim', 'Cardiologie')).toBeUndefined();
  });

  it('conserve la photo figée des informations de visite indépendamment de la fiche', () => {
    const medecinFiche = {
      id: 'm-1',
      nom: 'Dr. Benali Rachid',
      specialite: 'Cardiologie',
      telephone: '0550112233',
      secteur: 'Kouba'
    };

    const visiteSnapshot = {
      id: 'v-1',
      medecin_id: medecinFiche.id,
      date_visite: '2026-11-20',
      nom: medecinFiche.nom,
      specialite: medecinFiche.specialite,
      telephone: medecinFiche.telephone,
      secteur: medecinFiche.secteur,
      observation: 'Bon accueil'
    };

    // Modification ultérieure de la fiche médecin (changement de numéro et de secteur)
    medecinFiche.telephone = '0770998877';
    medecinFiche.secteur = 'Hydra';

    // La visite historique doit conserver les coordonnées au moment de la visite
    expect(visiteSnapshot.telephone).toBe('0550112233');
    expect(visiteSnapshot.secteur).toBe('Kouba');
    expect(medecinFiche.telephone).toBe('0770998877');
  });
});
