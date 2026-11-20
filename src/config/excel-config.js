/**
 * excel-config.js — Configuration officielle et stricte du format Excel AURA.
 * Reçoit : aucune entrée directe.
 * Renvoie : feuilles, largeurs de colonnes, couleurs et fonctions de contraste.
 */

export const EXCEL_CONFIG = {
  SHEETS: {
    MED: 'RAPPORT MED',
    COM: 'RAPPORT COM',
    PF: 'PF'
  },

  COLORS: {
    HEADER_BLUE: 'FF4F81BD',    // Fond bleu officiel en-tête médecins
    HEADER_GREY: 'FFD9D9D9',    // Fond gris colonnes fixes pharmacie
    TITLE_RED: 'FFFF0000',      // Rouge "DISPONIBILITE /Rotation/S"
    TEXT_WHITE: 'FFFFFFFF',
    TEXT_BLACK: 'FF000000',
    BORDER_GREY: 'FFD3D3D3'
  },

  MED_COLUMNS: [
    { key: 'date_visite', title: 'Date', width: 12 },
    { key: 'nom', title: 'Nom', width: 35 },
    { key: 'specialite', title: 'SPECIALITE', width: 15 },
    { key: 'telephone', title: 'Téléphone', width: 15 },
    { key: 'statut', title: 'STATUT', width: 12 },
    { key: 'secteur', title: 'Secteur', width: 25 },
    { key: 'pot', title: 'Pot', width: 8 },
    { key: 'email', title: 'Email', width: 20 },
    { key: 'remplacant', title: 'Remplacant', width: 20 },
    { key: 'observation', title: 'Commentaire', width: 40 }
  ],

  COM_FIXED_COLUMNS: [
    { key: 'date_visite', title: 'Date', width: 12 },
    { key: 'nom', title: 'Pharmacie', width: 35 },
    { key: 'secteur', title: 'Secteur', width: 20 },
    { key: 'grossiste', title: 'Grossiste', width: 20 }
  ],

  PF_COLUMNS: [
    { key: 'num', title: 'N°', width: 6 },
    { key: 'nom', title: 'Nom', width: 35 },
    { key: 'specialite', title: 'SPECIALITE', width: 15 },
    { key: 'telephone', title: 'Téléphone', width: 15 },
    { key: 'statut', title: 'STATUT', width: 12 },
    { key: 'secteur', title: 'Secteur', width: 25 },
    { key: 'pot', title: 'Pot', width: 8 },
    { key: 'email', title: 'Email', width: 20 },
    { key: 'remplacant', title: 'Remplacant', width: 20 }
  ]
};

/**
 * Calcule dynamiquement la couleur du texte (blanc ou noir) selon la luminance du fond hex.
 * Formule : 0.299R + 0.587G + 0.114B < 150 -> Texte blanc
 */
export function getContrastTextColor(hex = '4F81BD') {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 150 ? 'FFFFFFFF' : 'FF000000';
}
