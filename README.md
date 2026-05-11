# Cotizpro

Calculateur de cotisations URSSAF et suivi du chiffre d'affaires pour auto-entrepreneurs français.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

## Fonctionnalités

**Gratuit**

- Calcul des cotisations URSSAF en temps réel (BIC marchandises / BIC services / BNC)
- Prise en compte de l'ACRE et du versement libératoire
- Déclarations CA mensuelles
- Dashboard KPIs (CA cumulé, cotisations, progression vers le plafond)
- Alertes seuils TVA (80 %, 90 %, 100 %)

**Premium (4,99 €/mois ou 39,99 €/an)**

- Historique multi-années
- Export PDF et CSV
- Import CSV multi-activités
- Graphiques d'évolution CA / cotisations
- Simulateur de comparaison de régimes fiscaux
- Aide au remplissage du formulaire 2042-C-PRO
- Rappels automatiques par email avant échéance URSSAF
- Multi-activités (jusqu'à 5 activités par compte)

## Stack technique

- **Next.js 16** (React 19) — App Router, Server Actions, TypeScript strict
- **Supabase** — PostgreSQL, Auth, RLS, Edge Functions (Deno)
- **Stripe** — Abonnements mensuel et annuel
- **Tailwind CSS v4** + **shadcn/ui**
- **Cloudflare Turnstile** — Protection CAPTCHA
- **Resend** — Emails transactionnels
- **Zod** — Validation des entrées

## Démarrage en local

### Prérequis

- Node.js 20+
- Un projet [Supabase](https://supabase.com)
- Un compte [Stripe](https://stripe.com) (mode test suffisant)
- Un compte [Resend](https://resend.com) (optionnel pour les emails)
- Un compte [Cloudflare Turnstile](https://dash.cloudflare.com) (optionnel pour le CAPTCHA)

### Installation

```bash
git clone https://github.com/Lydiaix-Code/Cotizpro.git
cd Cotizpro
npm install
cp .env.example .env.local
```

Remplir les variables dans `.env.local` (voir la section ci-dessous).

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer l'URL et les clés API dans **Project Settings > API**
3. Exécuter le schéma SQL dans **SQL Editor** :
   ```
   supabase/migrations/schema.sql
   ```
   > Avant d'exécuter, remplacer `YOUR_PROJECT_REF` par votre référence de projet dans la section cron (ligne ~424).
4. Activer les extensions **pg_cron** et **pg_net** dans **Database > Extensions** (nécessaires pour les rappels automatiques)
5. Mettre à jour `supabase/config.toml` avec votre `project_id`

### Configuration Stripe

1. Créer deux produits dans Stripe Dashboard :
   - **Premium Mensuel** — 4,99 €/mois (récurrent)
   - **Premium Annuel** — 39,99 €/an (récurrent)
2. Copier les `price_...` dans `.env.local`
3. Créer un webhook Stripe pointant vers `https://votre-domaine.fr/api/stripe/webhook` avec les événements :
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

### Variables d'environnement

Voir [`.env.example`](.env.example) pour la liste complète et les instructions.

### Notifications push PWA (optionnel)

Générer une paire de clés VAPID :

```bash
npx web-push generate-vapid-keys
```

Copier les valeurs dans `.env.local`.

## Tests

```bash
# Tests unitaires (calcul URSSAF)
npm run test

# Tests end-to-end (Playwright)
npm run test:e2e
```

## Déploiement

Le projet est conçu pour être déployé sur **Vercel** :

1. Connecter le repo GitHub à Vercel
2. Configurer toutes les variables d'environnement dans Vercel > Settings > Environment Variables
3. Déployer

## Contribuer

Les contributions sont les bienvenues. Ouvrez une issue pour discuter des changements importants avant de soumettre une PR.

## Licence

[GPL v3](LICENSE) — Copyright (c) 2026 Lydiaix-Code
