/**
 * medecin-search.js — Index de recherche en mémoire ultra-rapide (< 50 ms).
 * Construit un index local à chaque mise à jour des médecins.
 * Reçoit : requête textuelle de recherche (nom, spécialité, secteur, etc.).
 * Renvoie : liste ordonnée des médecins correspondants (max 8 résultats).
 */
import { normalize } from '../../core/text.js';

let searchIndex = [];

/**
 * Reconstruit l'index de recherche à partir de la liste des médecins.
 */
export function buildSearchIndex(medecinsList = []) {
  searchIndex = medecinsList
    .filter(m => !m.deleted_at)
    .map(m => ({
      id: m.id,
      nom: m.nom,
      specialite: m.specialite || '',
      secteur: m.secteur || '',
      etab: m.etab || '',
      pot: m.pot || '',
      statut: m.statut || '',
      telephone: m.telephone || '',
      haystack: normalize(`${m.nom} ${m.specialite || ''} ${m.secteur || ''} ${m.etab || ''}`),
      ref: m
    }));
}

/**
 * Effectue une recherche instantanée sur l'index en mémoire.
 */
export function searchMedecins(query = '', limit = 8) {
  const rawTrimmed = String(query).trim().toLowerCase();
  if (!rawTrimmed) return [];

  const normQuery = normalize(rawTrimmed);
  const words = (normQuery || rawTrimmed).split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];

  const matches = [];

  for (const item of searchIndex) {
    // Tous les mots saisis doivent être présents
    const matchesAll = words.every(w => item.haystack.includes(w));
    if (matchesAll) {
      // Calcul du score de pertinence
      let score = 3;
      const normNom = normalize(item.nom);

      if (normNom.startsWith(normQuery)) {
        score = 1; // Priorité 1 : le nom commence exactement par la requête
      } else if (normNom.includes(normQuery)) {
        score = 2; // Priorité 2 : le nom contient la requête
      }

      matches.push({ score, item });
    }
  }

  // Tri par pertinence puis alphabétique
  matches.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.item.nom.localeCompare(b.item.nom, 'fr', { sensitivity: 'base' });
  });

  return matches.slice(0, limit).map(m => m.item.ref);
}
