/**
 * pharmacies-repo.js — Dépôt de données pour les pharmacies et leurs visites commerciales.
 * Gère le stockage IndexedDB, l'anti-doublon et l'historique de rotation des produits AURA.
 * Reçoit : fiches pharmacies et relevés de stocks/visites.
 * Renvoie : fiches sauvegardées, visites du jour et dernière visite connue d'une officine.
 */
import { createRepo } from '../../core/repo.js';
import { TABLES } from '../../config/constants.js';
import { normalize } from '../../core/text.js';

export const pharmaciesTable = createRepo(TABLES.PHARMACIES);
export const visitesPharmaciesTable = createRepo(TABLES.VISITES_PHARMACIES);

export const pharmaciesRepo = {
  /**
   * Récupère toutes les pharmacies actives.
   */
  async getAllPharmacies() {
    return pharmaciesTable.list();
  },

  /**
   * Récupère une pharmacie par son identifiant.
   */
  async getPharmacieById(id) {
    return pharmaciesTable.getById(id);
  },

  /**
   * Enregistre ou met à jour une fiche pharmacie.
   */
  async savePharmacie(pharmacie) {
    return pharmaciesTable.save(pharmacie);
  },

  /**
   * Vérifie si une pharmacie du même nom dans le même secteur existe déjà.
   */
  async findDuplicate(nom, secteur = '') {
    const normNom = normalize(nom);
    const normSecteur = normalize(secteur);
    const all = await this.getAllPharmacies();

    return all.find(p => {
      const matchNom = normalize(p.nom) === normNom;
      const matchSecteur = !normSecteur || normalize(p.secteur) === normSecteur;
      return matchNom && matchSecteur;
    });
  },

  /**
   * Récupère toutes les visites pharmacies d'une date donnée (ex: '2026-11-20').
   */
  async getVisitesByDate(dateIso) {
    return visitesPharmaciesTable.list({
      filterFn: (v) => v.date_visite === dateIso
    });
  },

  /**
   * Retrouve la dernière visite effectuée chez une pharmacie spécifique
   * pour pré-remplir intelligemment les disponibilités D/ND et ROT.
   */
  async getLastVisit(pharmacieId) {
    if (!pharmacieId) return null;
    const allVisites = await visitesPharmaciesTable.list({
      filterFn: (v) => v.pharmacie_id === pharmacieId
    });

    if (allVisites.length === 0) return null;
    // Tri par date décroissante puis par date de création
    allVisites.sort((a, b) => {
      const dComp = b.date_visite.localeCompare(a.date_visite);
      if (dComp !== 0) return dComp;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return allVisites[0];
  },

  /**
   * Enregistre une visite pharmacie (photo figée des disponibilités par produit).
   */
  async saveVisite(visiteData) {
    return visitesPharmaciesTable.save(visiteData);
  },

  /**
   * Suppression douce d'une visite pharmacie.
   */
  async deleteVisite(id) {
    return visitesPharmaciesTable.softDelete(id);
  },

  /**
   * Restaure une visite pharmacie supprimée par erreur.
   */
  async restoreVisite(id) {
    return visitesPharmaciesTable.restore(id);
  }
};
