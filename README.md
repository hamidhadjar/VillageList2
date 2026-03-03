# Biography Manager

A Next.js app to manage people biographies: add, edit, and remove entries. Uses **Supabase** (PostgreSQL + Storage) so it’s ready to deploy online (e.g. Vercel, Railway).

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough).

2. **Database**: In Supabase → **SQL Editor**, run the script in `docs/supabase-schema.sql` to create the `biographies` table.

3. **Storage**: In Supabase → **Storage** → **New bucket**:
   - Name: `biography-images`
   - Public bucket: **ON** (so image URLs work)

4. **Env vars** (copy `.env.example` to `.env.local`):
   - **Auth** (obligatoire) : `NEXTAUTH_SECRET` (générer avec `openssl rand -base64 32`), `NEXTAUTH_URL` (ex. `http://localhost:3001`)
   - **Supabase** (optionnel) : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` – sans eux, l’app utilise un fichier JSON et `public/uploads` pour les images.

5. **Premier utilisateur admin** (si aucun utilisateur n’existe) :
   ```bash
   set ADMIN_EMAIL=admin@example.com
   set ADMIN_PASSWORD=votre-mot-de-passe
   node scripts/create-first-admin.mjs
   ```
   Sous Linux/Mac : `ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/create-first-admin.mjs`

6. **Install and run**:

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Features

- **Authentification** – Connexion par email/mot de passe. Rôles : **admin** (tout + gestion utilisateurs), **edit** (ajouter/modifier/supprimer des biographies), **viewer** (lecture seule).
- **List** – Voir toutes les biographies sur la page d’accueil (recherche, tri, compteur).
- **Add** – Ajouter une biographie (nom, titre, dates, résumé, biographie complète, image optionnelle).
- **Edit** – Modifier une biographie existante.
- **Remove** – Supprimer une biographie (avec confirmation).
- **Pictures** – Upload d’images (JPEG, PNG, GIF, WebP, JFIF) ; stockage Supabase ou `public/uploads`.
- **Utilisateurs** – Les admins peuvent gérer les comptes (créer, modifier le rôle, supprimer) via **Utilisateurs** dans le menu.

## Deploying online

Deploy to Vercel, Railway, Netlify, or any Node host. Add the same env vars in the host’s dashboard. Use **Supabase** in production so data and images persist.

### Deploy on Netlify

**Pre-deploy checklist**

| Item | Status |
|------|--------|
| `netlify.toml` in repo | ✓ |
| `@netlify/plugin-nextjs` in package.json | ✓ |
| Supabase project + `biographies` table + bucket `biography-images` | Required for data/images |
| Env vars set in Netlify (see below) | Required |

1. **Push your repo** to GitHub (or GitLab/Bitbucket). Do **not** commit `data/users.json` or `.env*.local`.

2. **New site from Git**  
   [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project** → choose your repo.

3. **Build settings** (from `netlify.toml`): Build command `npm run build`; leave **Publish directory** empty.

4. **Environment variables** (Site settings → Environment variables):
   - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Netlify URL, e.g. `https://your-site-name.netlify.app` (no trailing slash)
   - `SUPABASE_URL` — Supabase → Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API (service_role key)

5. **Deploy.**  
   After the first deploy, set `NEXTAUTH_URL` to the real URL if Netlify assigned a random one, then trigger a new deploy. **Users** are stored in `data/users.json`; on Netlify this is **not persistent**. For production you may need to store users in Supabase. **Biographies** and images persist when Supabase env vars are set.

   **If you see a server error on Netlify:** ensure `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set in Site settings → Environment variables. The app avoids writing to disk in serverless (read-only); login and listing work using committed `data/` files or Supabase.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Storage)
- CSS (no UI framework)
