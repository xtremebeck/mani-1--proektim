# Deploying the server to Railway

GitHub Pages serves the static app only. Telegram login, sync, the partner dashboard and server-checked secret words need the Node server. This guide runs it on [Railway](https://railway.com), with the SQLite database on a persistent volume. It takes about 15 minutes and uses the Railway dashboard only, with no CLI.

`uz-quest/railway.json` already sets the build and start commands and the health check (`/api/v1/health`). It also requires a volume at `/data` (`requiredMountPath`) and runs a single replica (`numReplicas: 1`), because the database file and the Telegram bot's polling must not run twice.

## 1. Create the service

1. Sign in at railway.com with the GitHub account that owns the repository, and choose a plan. A persistent volume is not available on every free tier; check Railway's current pricing.
2. **New Project → Deploy from GitHub repo →** `xtremebeck/mani-1--proektim`. Allow Railway to access the repository if asked.
3. Open the new service → **Settings → Source → Root Directory**: `uz-quest`.
4. The first deploy will fail until the next steps are done. That is expected: `requiredMountPath` refuses to run without the volume.

## 2. Add the volume

Add a volume to the service, with mount path **`/data`**. In the Railway dashboard this is under the service's options; the labels may differ from version to version, so search their docs for "volume" if you do not find it.

Everything that must survive a redeploy goes there: the database (`uzquest.db` with its `-wal` and `-shm` files).

## 3. Set the variables

Service → **Variables**:

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Turns test shortcuts off and requires the settings below |
| `HOST` | `0.0.0.0` | Listen on Railway's network. Railway sets `PORT` itself |
| `ADMIN_KEY` | a long random string, e.g. from `openssl rand -hex 24` | Partner dashboard login. The server refuses to start without it |
| `DATABASE_FILE` | `/data/uzquest.db` | Keeps the database on the volume |
| `TRUST_PROXY` | `1` | Rate limits per traveller, not per Railway proxy |
| `MEET_CODES` | `{"tas-chorsu-meet":"…","tas-plov-meet":"…","sam-siy-meet":"…","sam-kon-meet":"…"}` | Secret words agreed with the partners. **Not** the public demo words. The server refuses to start without a word for every meet quest |
| `TELEGRAM_BOT_TOKEN` | from @BotFather (optional) | Enables "Log in with Telegram". Do not set a webhook for this bot |
| `ANTHROPIC_API_KEY` | (optional) | Lets Hamroh answer with Claude instead of its offline replies |

Saving the variables redeploys the service.

## 4. Give it an address

Service → **Settings → Networking → Generate Domain**. Railway gives an `https://….up.railway.app` address; a custom domain can be added there too.

HTTPS matters: phones only allow GPS and the camera on secure pages, so treasure hunts and photo quests work here, unlike on a plain `http://` address.

## 5. Check it

- `https://<domain>/api/v1/health` shows `"status":"ok"`, `"testEvents":false`, and the bot's name under `"telegram"` if a token is set.
- `https://<domain>/app/` opens the app; play a quest and open `https://<domain>/admin` with your `ADMIN_KEY` to see it arrive.
- The deploy log's first line names the data file and says `secret words: the MEET_CODES variable`.

Every push to `main` now redeploys the server, and GitHub Pages still publishes the static site. Railway restarts the service briefly on each deploy.

## Backups

The server copies the database to `/data/backups/` once a day and keeps the last 7 days. That undoes a bad update or a mistaken delete, but those copies live on the same volume. So also:

- **Download a copy** from the admin panel (**Download backup**) every week or so, and keep it off the server, for example in your cloud drive.
- **Railway volume backups:** if your plan offers them, under the volume's settings.

To restore, put the copy on the volume as `/data/uzquest.db` while the service is stopped, and remove `uzquest.db-wal` and `uzquest.db-shm`.

## Moving existing data

If a local server has data you want to keep, stop it and copy its `data/uzquest.db` onto the volume. Railway's docs describe the current ways to put files on a volume. Alternatively, place an old `store.json` at `/data/store.json` and set `DATA_FILE=/data/store.json`. It is imported once into the empty database.
