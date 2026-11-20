/**
 * text.js — Fonctions utilitaires de manipulation et sécurisation de texte.
 * Reçoit : des chaînes de caractères (noms, recherches, saisies utilisateur).
 * Renvoie : du texte normalisé (pour la recherche) ou échappé (contre les failles XSS).
 */

/**
 * Normalise un texte : minuscules, sans accents, sans caractères spéciaux.
 * Aligné avec la fonction SQL normalize_text() de Supabase.
 */
export function normalize(t = '') {
  return String(t)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Échappe les caractères HTML dangereux pour éviter toute injection dans l'UI.
 */
export function escapeHtml(t = '') {
  return String(t).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

/**
 * Formate un numéro de téléphone algérien propre en 10 chiffres (ex: 0550123456).
 */
export function formatPhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('213') && digits.length >= 11) {
    return '0' + digits.slice(3);
  }
  if (!digits.startsWith('0') && digits.length === 9) {
    return '0' + digits;
  }
  return digits;
}
