/**
 * medecin-search.js — Index de recherche en mémoire ultra-rapide (< 50 ms).
 * Construit un index local à chaque mise à jour des médecins.
 * Reçoit : requête textuelle, limite, filtre de spécialité, exclusion des médecins déjà visités.
 * Renvoie : liste ordonnée des médecins correspondants.
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
 * Effectue une recherche instantanée sur l'index en mémoire avec filtres optionnels.
 * @param {string} query Texte recherché
 * @param {number} limit Nombre maximum de résultats (défaut 8)
 * @param {object} options { specialiteFilter: string, excludeIds: Set|Array }
 */
export function searchMedecins(query = '', limit = 8, { specialiteFilter = '', excludeIds = null } = {}) {
  const excludeSet = excludeIds instanceof Set ? excludeIds : (Array.isArray(excludeIds) ? new Set(excludeIds) : null);
  const rawTrimmed = String(query || '').trim().toLowerCase();
  const normQuery = normalize(rawTrimmed);
  const words = (normQuery || rawTrimmed).split(/\s+/).filter(Boolean);

  const filterSpecNorm = specialiteFilter && specialiteFilter !== 'TOUS' ? normalize(specialiteFilter) : '';

  const matches = [];

  for (const item of searchIndex) {
    // 1. Exclusion des médecins déjà visités aujourd'hui si demandé
    if (excludeSet && excludeSet.has(item.id)) {
      continue;
    }

    // 2. Filtre par spécialité si actif
    if (filterSpecNorm) {
      const itemSpecNorm = normalize(item.specialite);
      if (!itemSpecNorm.includes(filterSpecNorm)) {
        continue;
      }
    }

    // 3. Si aucun mot saisi mais un filtre spécialité est actif, on inclut directement
    if (words.length === 0) {
      if (filterSpecNorm) {
        matches.push({ score: 10, item });
      }
      continue;
    }

    // 4. Tous les mots saisis doivent être présents
    const matchesAll = words.every(w => item.haystack.includes(w));
    if (matchesAll) {
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
