-- =====================================================================
-- DÉLÉGATION V2 — Schéma Supabase (utilisateur unique, sans authentification)
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists unaccent with schema extensions;

-- ---------- Fonctions utilitaires ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Texte « normalisé » : sans accents, minuscules, lettres/chiffres/espaces seulement
create or replace function public.normalize_text(t text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
           regexp_replace(lower(extensions.unaccent(coalesce(t,''))), '[^a-z0-9 ]', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

create or replace function public.set_nom_normalise()
returns trigger language plpgsql as $$
begin
  new.nom_normalise = public.normalize_text(new.nom || ' ' || coalesce(new.prenom,''));
  return new;
end $$;

-- ---------- Réglages (clé/valeur) ----------
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into public.app_settings(key, value) values
  ('maintenance_mode', 'false'::jsonb),
  ('mes_infos', '{"nom":"Amine","type":"DMC","secteur":""}'::jsonb)
on conflict (key) do nothing;

-- ---------- Produits ----------
create table if not exists public.produits (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  couleur     text not null default '4F81BD',   -- hex SANS « # » (ex: 4F81BD)
  ordre       int  not null default 0,
  actif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------- Listes simples ----------
create table if not exists public.grossistes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.secteurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- Médecins (portefeuille vierge prêt à l'emploi) ----------
create table if not exists public.medecins (
  id             uuid primary key default gen_random_uuid(),
  code_legacy    text unique,                       -- ancien identifiant éventuel
  nom            text not null,                     -- NOM COMPLET
  prenom         text not null default '',          -- réservé
  nom_normalise  text not null default '',          -- rempli automatiquement par trigger
  specialite     text not null default '',
  telephone      text not null default '',
  tel2           text not null default '',
  etab           text not null default '',          -- établissement
  secteur        text not null default '',          -- quartier / zone / ville
  wilaya         text not null default '',
  adresse        text not null default '',
  email          text not null default '',
  pot            text not null default '',          -- potentiel : A, A+, A++, A+++, B, C, D
  statut         text not null default '',          -- PUB (public) / CAB (cabinet)
  remplacant     text not null default '',
  commentaire    text not null default '',
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists medecins_nom_norm_idx on public.medecins(nom_normalise);
create index if not exists medecins_updated_idx  on public.medecins(updated_at);

-- ---------- Pharmacies ----------
create table if not exists public.pharmacies (
  id                 uuid primary key default gen_random_uuid(),
  nom                text not null,
  prenom             text not null default '',
  nom_normalise      text not null default '',
  secteur            text not null default '',
  grossiste_habituel text not null default '',
  telephone          text not null default '',
  adresse            text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists pharmacies_nom_norm_idx on public.pharmacies(nom_normalise);
create index if not exists pharmacies_updated_idx  on public.pharmacies(updated_at);

-- ---------- Visites médecins ----------
-- Photo figée des infos au moment de la visite (l'historique ne change jamais)
create table if not exists public.visites_medecins (
  id                uuid primary key default gen_random_uuid(),
  medecin_id        uuid,
  date_visite       date not null,
  nom               text not null,
  specialite        text not null default '',
  telephone         text not null default '',
  etab              text not null default '',
  secteur           text not null default '',
  statut            text not null default '',
  pot               text not null default '',
  email             text not null default '',
  remplacant        text not null default '',
  observation       text not null default '',
  produits_discutes jsonb not null default '[]'::jsonb,   -- liste d'ids de produits
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists vm_date_idx    on public.visites_medecins(date_visite);
create index if not exists vm_updated_idx on public.visites_medecins(updated_at);

-- ---------- Visites pharmacies ----------
create table if not exists public.visites_pharmacies (
  id             uuid primary key default gen_random_uuid(),
  pharmacie_id   uuid,
  date_visite    date not null,
  nom            text not null,
  secteur        text not null default '',
  grossiste      text not null default '',
  -- { "<id_produit>": { "dispo": true|false, "rot": "5" } }
  disponibilites jsonb not null default '{}'::jsonb,
  observation    text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists vp_date_idx    on public.visites_pharmacies(date_visite);
create index if not exists vp_updated_idx on public.visites_pharmacies(updated_at);

-- ---------- Triggers mise à jour automatique ----------
do $$
declare t text;
begin
  foreach t in array array['app_settings','produits','grossistes','secteurs','medecins',
                           'pharmacies','visites_medecins','visites_pharmacies']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated before insert or update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

drop trigger if exists trg_medecins_norm on public.medecins;
create trigger trg_medecins_norm before insert or update of nom, prenom on public.medecins
  for each row execute function public.set_nom_normalise();
drop trigger if exists trg_pharmacies_norm on public.pharmacies;
create trigger trg_pharmacies_norm before insert or update of nom, prenom on public.pharmacies
  for each row execute function public.set_nom_normalise();

-- ---------- Produits de départ Gamme AURA ----------
insert into public.produits (nom, couleur, ordre)
select * from (values
  ('ACIDE FOLIQUE','4F81BD',1),
  ('AURA VIT C','C0504D',2),
  ('AURA ZINC','9BBB59',3),
  ('AURA CALCI D','8064A2',4),
  ('AURAU MV','4BACC6',5),
  ('AURA APPETIT','F79646',6),
  ('AURA VOMISSEMENT','2C4D75',7),
  ('AURA DIARRHEE','772C2A',8),
  ('AURA BB TOUX','5F7530',9)
) v(nom,couleur,ordre)
where not exists (select 1 from public.produits);

-- ---------- SÉCURITÉ (RLS) ----------
-- Accès public restreint : SELECT, INSERT, UPDATE autorisés pour anon.
-- DELETE physique formellement interdit (suppression douce avec deleted_at).
do $$
declare t text;
begin
  foreach t in array array['app_settings','produits','grossistes','secteurs','medecins',
                           'pharmacies','visites_medecins','visites_pharmacies']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('create policy "%1$s_select" on public.%1$I for select to anon using (true)', t);
    execute format('create policy "%1$s_insert" on public.%1$I for insert to anon with check (true)', t);
    execute format('create policy "%1$s_update" on public.%1$I for update to anon using (true) with check (true)', t);
  end loop;
end $$;
