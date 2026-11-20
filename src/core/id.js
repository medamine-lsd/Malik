/**
 * id.js — Générateur d'identifiants uniques universels (UUID v4).
 * Reçoit : aucun argument.
 * Renvoie : une chaîne UUID v4 conforme (ex: 'd2b815a3-e3cf-4545-b4f3-e98976d7227e').
 */

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback robuste si crypto.randomUUID n'est pas disponible
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
