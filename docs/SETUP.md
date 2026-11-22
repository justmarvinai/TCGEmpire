# TCGEmpire — Setup for the owner (once)

Until this is done the game runs in **local mode** only (everything in one browser, for development).
After it, every merge to `main` deploys the site and the database by itself.

## 1. Supabase (the server)

1. Create a project at supabase.com. Region: **Frankfurt (eu-central-1)**. Plan: Free.
   Save the database password you choose.
2. **Authentication → Sign In / Providers → Anonymous sign-ins: turn ON.**
   (The game has its own username + password login; Supabase only hands every browser an anonymous
   session. No e-mails are ever sent.)
3. **Realtime → Settings → "Allow public access": turn OFF.** (Live updates use private channels; the game
   works without them too, just a few seconds slower.)
4. Note three values:
   - **Project URL** and **anon / publishable key** (Project Settings → API).
   - **Connection string, "Session pooler"** (Connect button at the top), with your password filled in.

## 2. GitHub (automatic database updates)

Repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `SUPABASE_DB_URL` | the Session pooler connection string |
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_ANON_KEY` | the anon / publishable key |

The workflow "Deploy database" then creates all tables and functions on the next change to `main`
(or start it by hand: Actions → Deploy database → Run workflow). "Keep Supabase awake" pings the project
once a day so the free plan never pauses it.

## 3. Vercel (the website)

1. Import the GitHub repository at vercel.com (framework is detected as Vite). Production branch: `main`.
2. Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | the Project URL |
| `VITE_SUPABASE_ANON_KEY` | the anon / publishable key |

3. Deploy.

## 4. First start

1. Open the site and register **first**: the first account becomes the admin, and the invite code you
   type in becomes the code for everybody.
2. Give your friends the link and the invite code.

## Good to know

- Nothing in the browser can read or write tables; the game talks to the database only through its
  server functions.
- Passwords are stored as bcrypt hashes. Tell your friends not to reuse an important password anyway.
- The site sends `noindex` and is not listed anywhere. Keep the link in the group.
