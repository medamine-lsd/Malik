/**
 * settings.js — Gestion des préférences utilisateur et informations personnelles.
 * Reçoit : préférences (nom, profil DMC/DC, secteur, thème).
 * Renvoie : lecture et sauvegarde persistante dans IndexedDB et Supabase.
 */
import { TABLES } from '../config/constants.js';
import { events } from './events.js';

const SETTINGS_KEY = 'mes_infos';

const defaultSettings = {
  nom: 'Amine',
  type: 'DMC',
  secteur: '',
  theme: 'auto'
};

let currentSettings = { ...defaultSettings };

export const settings = {
  get() {
    return { ...currentSettings };
  },

  set(newValues) {
    currentSettings = { ...currentSettings, ...newValues };
    try {
      localStorage.setItem('delegation_user_settings', JSON.stringify(currentSettings));
    } catch {}
    events.emit('settings-changed', currentSettings);
  },

  loadFromLocal() {
    try {
      const raw = localStorage.getItem('delegation_user_settings');
      if (raw) {
        currentSettings = { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch {}
    return currentSettings;
  }
};
