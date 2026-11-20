/**
 * events.js — Mini bus d'événements interne pour la communication entre modules.
 * Reçoit : nom de l'événement et données associées.
 * Renvoie : permet d'écouter (on), de désabonner (off) et d'émettre (emit) des événements.
 */

const listeners = new Map();

export const events = {
  on(event, callback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (listeners.has(event)) {
      listeners.get(event).delete(callback);
    }
  },

  emit(event, data) {
    if (listeners.has(event)) {
      for (const callback of listeners.get(event)) {
        try {
          callback(data);
        } catch (err) {
          console.error(`Erreur écouteur événement "${event}":`, err);
        }
      }
    }
  }
};
