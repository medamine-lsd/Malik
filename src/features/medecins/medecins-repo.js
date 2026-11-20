/**
 * medecins-repo.js — Dépôt de données pour les fiches médecins et leurs visites.
 * Encapsule les opérations IndexedDB et gère les requêtes métier (visites du jour, anti-doublon).
 * Reçoit : fiches médecins et visites médicales.
 * Renvoie : objets sauvegardés, listes filtrées et contrôles d'intégrité.
 */
import { createRepo } from '../../core/repo.js';
import { TABLES } from '../../config/constants.js';
import { normalize } from '../../core/text.js';

export const medecinsTable = createRepo(TABLES.MEDECINS);
export const visitesMedecinsTable = createRepo(TABLES.VISITES_MEDECINS);

export const medecinsRepo = {
  /**
   * Récupère tous les médecins actifs (non supprimés).
   */
  async getAllMedecins() {
    return medecinsTable.list();
  },

  /**
   * Récupère un médecin par son ID.
   */
  async getMedecinById(id) {
    return medecinsTable.getById(id);
  },

  /**
   * Enregistre ou met à jour une fiche médecin dans le carnet local.
   */
  async saveMedecin(medecin) {
    return medecinsTable.save(medecin);
  },

  /**
   * Vérifie si un médecin similaire existe déjà (même nom normalisé et même spécialité).
   */
  async findDuplicate(nom, specialite) {
    const normNom = normalize(nom);
    const normSpec = normalize(specialite);
    const all = await this.getAllMedecins();

    return all.find(m => {
      const matchNom = normalize(m.nom) === normNom;
      const matchSpec = !normSpec || normalize(m.specialite) === normSpec;
      return matchNom && matchSpec;
    });
  },

  /**
   * Récupère toutes les visites médicales d'une date spécifique (ex: '2026-11-20').
   */
  async getVisitesByDate(dateIso) {
    return visitesMedecinsTable.list({
      filterFn: (v) => v.date_visite === dateIso
    });
  },

  /**
   * Vérifie si un médecin a déjà été visité à cette date.
   */
  async hasVisitedOnDate(medecinId, dateIso) {
    if (!medecinId) return false;
    const visites = await this.getVisitesByDate(dateIso);
    return visites.some(v => v.medecin_id === medecinId);
  },

  /**
   * Enregistre une visite (prend une « photo figée » des infos du médecin).
   */
  async saveVisite(visiteData) {
    return visitesMedecinsTable.save(visiteData);
  },

  /**
   * Suppression douce d'une visite.
   */
  async deleteVisite(id) {
    return visitesMedecinsTable.softDelete(id);
  },

  /**
   * Restaure une visite supprimée par erreur.
   */
  async restoreVisite(id) {
    return visitesMedecinsTable.restore(id);
  }
};
