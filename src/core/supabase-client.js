/**
 * supabase-client.js — Initialisation du client Supabase officiel.
 * Lit les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.
 * Reçoit : aucune entrée directe (lit import.meta.env).
 * Renvoie : l'instance du client Supabase (ou null si non configuré).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const isConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('xxxxxxxx')
);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isConfigured) {
  console.info('Supabase : Clés en attente de configuration dans .env.local');
}
