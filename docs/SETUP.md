# TCGEmpire — Setup for the owner (once)

Until this is done the game runs in **local mode** only (everything in one browser, for development).
After it, every merge to `main` deploys the site and the database by itself.

*Checked against the Supabase docs in November 2026; dashboard menus move now and then, the names stay.*

## 1. Supabase (the server)

1. Create a project at supabase.com. Region: **Frankfurt (eu-central-1)**. Plan: Free.
   Save the database password you choose.
2. **Authentication → Sign In / Providers → "Allow anonymous sign-ins": turn ON.** Leave everything else as it is.
   (The game has its own login: e-mail or username plus a password. Supabase only hands every browser an
   anonymous session. The e-mail is not verified and the game never sends mail, so no mail settings are needed.)
3. **Integrations → Cron: enable it** (the `pg_cron` extension). Do this before the first database deploy in
   step 2 below: the game's server tick (market prices, NPC traders, events, cleanup) is scheduled by it, once a
   minute.
4. **Realtime → Settings → "Allow public access": turn OFF.**
   This does **not** make the game slower. The game already uses only private channels: the server sends small
   "something changed" signals, and the browser then fetches the new state as usual. With the switch off, Supabase
   checks once, when a browser connects to a channel, that it is a signed-in player; after that every signal goes
   through without any check. With it on, strangers who know the public key could open their own channels on your
   project and use up the free Realtime quota. (If Realtime were ever down, the game would still work and refresh
   every 15 seconds instead of instantly.)
5. Note three values:
   - **Project URL** and **publishable key**: Settings → API Keys → tab "Publishable and secret API keys" (the key
     starts with `sb_publishable_`; the *Connect* button at the top shows both as well). The older "anon" key also
     works, but Supabase retires it by the end of 2026. Never use the **secret** key anywhere in this setup.
   - **Connection string, "Session pooler"** (Connect button at the top), with your database password filled in.
     Its host ends in `pooler.supabase.com`. Not the "Direct connection" (`db.….supabase.co`): it needs IPv6, which
     GitHub's machines do not have ("Network is unreachable").

## 2. GitHub (automatic database updates)

**First create the branch `main`** (once): on the repository page open the branch menu above the file list, type
`main` and choose "Create branch main from claude/…"; then Settings → General → Default branch → `main`. Claude works
on its own branch, and only what is on `main` is live. To publish a new version, merge Claude's branch into `main`
(Pull requests → New pull request → base `main`, compare Claude's branch → Create → Merge), or tell Claude to do it.

Then: Repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|--------|-------|
| `SUPABASE_DB_URL` | the Session pooler connection string |
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_ANON_KEY` | the publishable key (the name stays from the time of the anon key) |

The workflow "Deploy database" runs all tests and then creates all tables and functions whenever `main` changes (or
start it by hand: Actions → Deploy database → Run workflow, branch `main`). "Keep Supabase awake" pings the project
once a day so the free plan never pauses it. If these jobs do not start, see section 5.

## 3. Vercel (the website)

1. Import the GitHub repository at vercel.com (framework is detected as Vite). Production branch: `main` (if Vercel
   was connected before `main` existed, change its production branch to `main` in the project settings).
2. Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | the Project URL |
| `VITE_SUPABASE_ANON_KEY` | the publishable key |

3. Deploy.

## 4. First start

1. Open the site and register **first** (e-mail, username, password and an invite code of your choice): the first
   account becomes the admin, and the invite code you type in becomes the code for everybody.
2. **Check the server tick:** Admin-Konsole → "Server-Tick". Within two minutes every system shows a recent
   "last run". If they stay empty, the cron job was not created (usually because Cron was not enabled before the
   first deploy). Fix it once in Supabase → SQL Editor:

   ```sql
   select cron.schedule('tcgempire-tick', '* * * * *', 'select private.tick()');
   ```

3. Give your friends the link and the invite code.

## 5. If GitHub Actions cannot run

GitHub Free includes a monthly amount of Actions time for private repositories, shared by all your private
repositories. When it is used up, the jobs above do not start ("The job was not started … spending limit") until it
resets; Settings → Billing and licensing shows the date. Nothing has to be paid:

- **Website:** Vercel builds it on its own servers, so it keeps deploying.
- **Database:** simplest is to make the repository public for one run: Settings → General → Danger Zone → Change
  visibility → Public, then Actions → Deploy database → Run workflow (branch `main`), and back to Private once it is
  green (about 10 minutes). Actions are free for public repositories; the repository holds no secrets, and the
  repository secrets stay hidden. Without going public, Claude can apply the same migrations over Supabase's HTTPS
  API (`scripts/db-migrate-api.sh`) with an access token saved as a network secret of the Claude environment (host
  `api.supabase.com`); each way skips what the other already applied.
- **Keep-alive:** only matters if nobody plays for a week.
- **Checks:** Claude runs the same tests before every commit.

## Good to know

- Nothing in the browser can read or write tables; the game talks to the database only through its server
  functions.
- Passwords are stored as bcrypt hashes. Tell your friends not to reuse an important password anyway. E-mail
  addresses are only a second login name: nobody else sees them, and deleting an account deletes the address.
- Second accounts are allowed but barely help (gift caps, price bands, small loans). The Admin-Konsole shows
  "Geldflüsse zwischen Spielern" (who sends value to whom), "Tempo" (levels per day) and "Server-Gesundheit"
  (database size against the free 500 MB). A look once a day during the playtest is enough.
- The site sends `noindex` and is not listed anywhere. Keep the link in the group.
