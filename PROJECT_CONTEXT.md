# PROJECT_CONTEXT.md — Mémoire vivante du projet « Délégation V2 »

> Ce fichier est le journal de bord et la mémoire technique du projet. Il est mis à jour à chaque phase pour documenter l'état d'avancement, les décisions d'architecture, les pièges évités et les scénarios de test.

---

## 1. Vue d'ensemble du projet
- **Nom :** Délégation V2 (Gamme AURA — Africa Pure Lab, Algérie)
- **Utilisateur unique :** Amine (Délégué médico-commercial)
- **Objectif :** PWA mobile offline-first ultra-rapide (< 10s par saisie) pour la saisie des visites médecins et pharmacies et l'exportation du rapport journalier Excel officiel (3 feuilles : `RAPPORT MED`, `RAPPORT COM`, `PF`).
- **Stack :** Vite + JavaScript Vanilla (ES modules, sans framework) + IndexedDB (`idb`) + Supabase (PostgreSQL distant, RLS anon) + ExcelJS (chargé à la demande) + Workbox PWA.

---

## 2. Décisions clés & Règles d'or
1. **Mono-utilisateur sans Auth :** Pas de login, pas de mot de passe, pas de profils, pas de Supabase Auth. Clé publique `anon` côté navigateur.
2. **Offline-first avec Outbox :** L'UI lit et écrit exclusivement dans IndexedDB. Les modifications s'enregistrent dans une table `outbox` locale et sont poussées vers Supabase dès que le réseau est disponible.
3. **Noms de fichiers stricts :** Tous les dossiers et fichiers en `minuscules-avec-tirets`. Vérification par script `check-filenames.mjs` au build.
4. **Dates fiables :** Pas de `toISOString()` pour les dates de calendrier — utilisation stricte de `dates.js` avec fuseau horaire `Africa/Algiers`.
5. **Excel officiel figé :** Feuilles `RAPPORT MED`, `RAPPORT COM`, `PF` respectant la structure historique. Données de visite « photo figée » au moment de l'enregistrement.
6. **Suppression douce :** Aucun `DELETE` physique en base, champ `deleted_at`, toast avec bouton Annuler (6 secondes).
7. **Zéro secrets dans Git :** Seules les clés anonymes dans `.env`. `SUPABASE_SERVICE_ROLE_KEY` uniquement dans `.env.local` pour le script d'import.

---

## 3. État d'avancement des phases

| Phase | Description | Statut | Notes / Livrables |
|---|---|---|---|
| **Phase 0** | Lecture & validation du brief, questions bloquantes | 🟡 En cours | Validation du brief, copie référence `v01`, création `PROJECT_CONTEXT.md` |
| **Phase 1** | Squelette Vite, PWA, build, vercel.json, check-filenames | ⚪ En attente | — |
| **Phase 2** | Design tokens, composants UI de base, navigation & coquille | ⚪ En attente | — |
| **Phase 3** | Supabase SQL, script d'import des médecins, exécution | ⚪ En attente | — |
| **Phase 4** | IndexedDB, moteur de synchro outbox, recherche en mémoire | ⚪ En attente | — |
| **Phase 5** | Écran Médecins complet (recherche, formulaire, visite rapide, liste) | ⚪ En attente | — |
| **Phase 6** | Écran Pharmacies complet (D/ND dynamique, ROT, historique) | ⚪ En attente | — |
| **Phase 7** | Moteur Excel (ExcelJS on-demand), partage, écran Rapport | ⚪ En attente | — |
| **Phase 8** | Écran Réglages (produits, secteurs, grossistes, backup, sync) | ⚪ En attente | — |
| **Phase 9** | Recette, durcissement offline, sécurité, tests, README | ⚪ En attente | — |
| **Phase 10** | Intégration fine des maquettes graphiques finales | ⚪ En attente | — |

---

## 4. Note de Sécurité
L'application ne dispose pas d'authentification utilisateur dans sa version 1. La clé Supabase `anon` étant exposée dans le bundle web, les politiques de sécurité au niveau des lignes (RLS) autorisent l'insertion, la sélection et la mise à jour, mais interdisent formellement les suppressions physiques (`DELETE`). Aucune donnée confidentielle de santé de patient ni donnée financière ne doit être stockée. Une barrière par mot de passe/code d'accès simple pourra être ajoutée ultérieurement devant l'application sans impacter le schéma.
