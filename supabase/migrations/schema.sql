-- =============================================================================
-- Schéma complet Cotizpro — script unique idempotent
-- Contient TOUTES les migrations (001 profil/déclarations/cotisations/abonnements,
--   002 notifications_email, 003 cron rappels, 004 backup_codes 2FA,
--   005 multi-activité Premium)
--
-- Peut être ré-exécuté sans erreur sur une base déjà initialisée.
--
-- Prérequis pour le cron (section 9) :
--   • Extensions pg_cron et pg_net activées dans Supabase Dashboard > Extensions
--   • Secret FUNCTION_SECRET défini dans Edge Functions > Secrets
--     ET en GUC Postgres : ALTER DATABASE postgres SET app.function_secret = 'xxx';
--   • Secret RESEND_API_KEY défini dans Edge Functions > Secrets
--
-- Principe de sécurité : RLS activé sur TOUTES les tables.
-- Chaque utilisateur ne peut accéder qu'à SES PROPRES données (user_id = auth.uid()).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TYPES ENUM
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE regime_fiscal AS ENUM (
    'bic_marchandises',
    'bic_services',
    'bnc'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE frequence_declaration AS ENUM (
    'mensuelle',
    'trimestrielle'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_abonnement AS ENUM (
    'actif',
    'inactif',
    'expire',
    'annule'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FONCTION UTILITAIRE : updated_at automatique
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLE : profiles
--    Un profil par utilisateur (1:1 avec auth.users)
--    Inclut notifications_email (migration 002)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  regime                  regime_fiscal NOT NULL,
  date_debut_activite     DATE NOT NULL,
  acre                    BOOLEAN NOT NULL DEFAULT false,
  versement_liberatoire   BOOLEAN NOT NULL DEFAULT false,
  notifications_email     BOOLEAN NOT NULL DEFAULT false,
  frequence_declaration   frequence_declaration NOT NULL DEFAULT 'mensuelle',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Colonne ajoutée après coup sur bases existantes (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.notifications_email IS
  'Si true, l''utilisateur reçoit un email de rappel avant l''échéance de déclaration';

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

DO $$ BEGIN
  CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "profiles_delete_own" ON profiles
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLE : declarations
--    Déclarations CA mensuelles ou trimestrielles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS declarations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mois        SMALLINT NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee       SMALLINT NOT NULL CHECK (annee BETWEEN 2000 AND 2100),
  montant_ca  NUMERIC(12, 2) NOT NULL CHECK (montant_ca >= 0),
  regime      regime_fiscal NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT declarations_unique_period UNIQUE (user_id, mois, annee)
);

CREATE INDEX IF NOT EXISTS idx_declarations_user_id   ON declarations(user_id);
CREATE INDEX IF NOT EXISTS idx_declarations_user_annee ON declarations(user_id, annee);

DO $$ BEGIN
  CREATE TRIGGER declarations_updated_at
    BEFORE UPDATE ON declarations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE declarations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "declarations_select_own" ON declarations
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "declarations_insert_own" ON declarations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "declarations_update_own" ON declarations
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "declarations_delete_own" ON declarations
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABLE : cotisations
--    Cotisations URSSAF calculées, liées à une déclaration
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cotisations (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id                UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  montant_cotisations           NUMERIC(12, 2) NOT NULL CHECK (montant_cotisations >= 0),
  montant_versement_liberatoire NUMERIC(12, 2) CHECK (montant_versement_liberatoire >= 0),
  taux_applique                 NUMERIC(5, 4) NOT NULL CHECK (taux_applique > 0),
  acre_applique                 BOOLEAN NOT NULL DEFAULT false,
  periode                       CHAR(7) NOT NULL, -- format : "YYYY-MM"
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cotisations_declaration_unique UNIQUE (declaration_id)
);

CREATE INDEX IF NOT EXISTS idx_cotisations_user_id        ON cotisations(user_id);
CREATE INDEX IF NOT EXISTS idx_cotisations_declaration_id ON cotisations(declaration_id);

ALTER TABLE cotisations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "cotisations_select_own" ON cotisations
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cotisations_insert_own" ON cotisations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cotisations_update_own" ON cotisations
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "cotisations_delete_own" ON cotisations
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TABLE : abonnements
--    Statut abonnement Stripe par utilisateur
--    INSERT/UPDATE/DELETE réservés au service_role (webhook Stripe)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS abonnements (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT NOT NULL,
  stripe_subscription_id   TEXT NOT NULL,
  statut                   statut_abonnement NOT NULL DEFAULT 'inactif',
  periode_fin              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT abonnements_user_id_unique            UNIQUE (user_id),
  CONSTRAINT abonnements_stripe_customer_unique     UNIQUE (stripe_customer_id),
  CONSTRAINT abonnements_stripe_subscription_unique UNIQUE (stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_abonnements_user_id ON abonnements(user_id);

DO $$ BEGIN
  CREATE TRIGGER abonnements_updated_at
    BEFORE UPDATE ON abonnements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "abonnements_select_own" ON abonnements
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT/UPDATE/DELETE sur abonnements : uniquement via service_role (webhook Stripe)


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CODES DE SECOURS 2FA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS backup_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backup_codes_user_active
  ON backup_codes(user_id) WHERE used_at IS NULL;

ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "backup_codes_select_own" ON backup_codes
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "backup_codes_insert_own" ON backup_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "backup_codes_update_own" ON backup_codes
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "backup_codes_delete_own" ON backup_codes
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TABLE : activites (multi-activité Premium)
--    Permet à un utilisateur Premium d'avoir jusqu'à 5 activités distinctes
--    (régimes différents) liées à ses déclarations.
--    activite_id = NULL sur declarations → activité principale (profiles.regime)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom                   TEXT NOT NULL,
  regime                regime_fiscal NOT NULL,
  date_debut            DATE NOT NULL,
  acre                  BOOLEAN NOT NULL DEFAULT false,
  versement_liberatoire BOOLEAN NOT NULL DEFAULT false,
  actif                 BOOLEAN NOT NULL DEFAULT true,
  ordre                 SMALLINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT activites_nom_length CHECK (char_length(nom) BETWEEN 1 AND 80)
);

CREATE INDEX IF NOT EXISTS activites_user_id_actif_idx
  ON activites (user_id, actif);

DO $$ BEGIN
  CREATE TRIGGER activites_updated_at
    BEFORE UPDATE ON activites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE activites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "activites_select_own" ON activites
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "activites_insert_own" ON activites
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "activites_update_own" ON activites
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "activites_delete_own" ON activites
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Colonne activite_id sur declarations (non-destructif, nullable)
-- NULL = déclaration liée à l'activité principale (profiles.regime)
ALTER TABLE declarations
  ADD COLUMN IF NOT EXISTS activite_id UUID
    REFERENCES activites(id) ON DELETE SET NULL;

-- Contrainte UNIQUE étendue : doublon = même mois + année + activité
-- (remplace l'ancienne contrainte uniquement si elle n'existe pas encore)
DO $$ BEGIN
  ALTER TABLE declarations
    DROP CONSTRAINT IF EXISTS declarations_unique_period;
  ALTER TABLE declarations
    ADD CONSTRAINT declarations_unique_period
      UNIQUE (user_id, mois, annee, activite_id);
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS declarations_user_activite_annee_idx
  ON declarations (user_id, activite_id, annee);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. CRON : rappels email mensuels
--    Nécessite pg_cron + pg_net activés dans Supabase Dashboard > Extensions
--    Avant d'exécuter cette section, définir le secret :
--      ALTER DATABASE postgres SET app.function_secret = 'votre-secret';
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Déprogramme le job si déjà existant (ré-exécution idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'envoyer-rappels-ca') THEN
    PERFORM cron.unschedule('envoyer-rappels-ca');
  END IF;
END $$;

-- Cron le 25 de chaque mois à 9h UTC
-- Remplace FUNCTION_SECRET_ICI par la valeur réelle avant d'exécuter
SELECT cron.schedule(
  'envoyer-rappels-ca',
  '0 9 25 * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/envoyer-rappels',
    headers := jsonb_build_object(
      'Content-Type',      'application/json',
      'X-Function-Secret', 'FUNCTION_SECRET_ICI'
    ),
    body    := '{}'::jsonb
  );
  $$
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. TABLE : push_subscriptions
--     Abonnements Web Push (PWA) par utilisateur et appareil.
--     Un utilisateur peut avoir plusieurs appareils (mobile + desktop).
--     INSERT/UPDATE/DELETE autorisés par l'utilisateur propriétaire.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne voit et ne manipule que ses propres abonnements push
DROP POLICY IF EXISTS "push_subscriptions_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_own" ON push_subscriptions
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
