/**
 * dates.js — Gestion stricte des dates dans le fuseau horaire d'Algérie ('Africa/Algiers').
 * Évite le piège de toISOString() qui décale les dates à minuit passé.
 * Reçoit : des dates JS ou des chaînes ISO 'AAAA-MM-JJ'.
 * Renvoie : des dates locales normalisées et formatées en français.
 */

const TZ = 'Africa/Algiers';

/**
 * Renvoie la date du jour au format 'AAAA-MM-JJ' en heure locale d'Algérie.
 */
export function todayLocal(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Formate une date ISO en libellé français lisible (ex: '2026-11-20' -> 'ven. 20 novembre').
 */
export function formatDateFr(iso = '') {
  if (!iso || !iso.includes('-')) return '';
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('fr-DZ', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Ajoute n jours à une date ISO sans dépendre de l'heure locale de la machine.
 */
export function addDays(iso = '', n = 0) {
  if (!iso || !iso.includes('-')) return '';
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day + n, 12));
  return d.toISOString().slice(0, 10);
}
