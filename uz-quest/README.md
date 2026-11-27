# UzQuest — Uzbekistan, One Quest at a Time

UzQuest is a story-driven quest travel app for Tashkent and Samarkand, inspired by [SubQuester](https://www.subquester.app/).

| URL | What it is |
|---|---|
| `/` | **Project website**, modelled on subquester.app: features, how it works, cities, screenshots, a live playable demo, a partners section and an FAQ. In Uzbek, English, Russian, Turkish and Chinese. |
| `/app/` | **The web app.** This is the version to test now and move to the mobile app later. |
| `/admin` | Partner dashboard: metrics, a funnel per place, partner offers, and redemption of vouchers and coupons. Local dev key: `uzquest-dev-admin` (only accepted on `127.0.0.1` outside production) |

## How the game works

**Every city is a story campaign, and every place is one chapter.**

- **Tashkent — "The Silk Road Courier"** (8 chapters). Carry a sealed letter from the Khast Imam library across the city and deliver it at the TV Tower.
- **Samarkand — "The Lost Star Map"** (7 chapters). Collect the 7 torn pieces of Ulugh Beg's star map and bring them back to the Observatory.

Each chapter ends with a clue that leads to the next place. In some chapters, a local you meet gives you that direction.

### Quest types

There are 59 quests across 15 places.

| Type | How it's completed | Rarity |
|---|---|---|
| 📍 Check in | Tap when you arrive | Common |
| ❓ Quiz | Choose the right answer (checked) | Common |
| 💬 Talk | Talk to a local, e.g. ask the price in Uzbek | Common |
| 📸 Photo spot | Take a photo of a *specific* shot: fountains mid-splash, the Konigil water wheel, both minarets in one frame… | Rare |
| 🧩 Riddle | Type the answer. Spelling is forgiving: `Ko'k`, `kok` and `KO‘K` all match | Rare |
| ⏳ Timeline | Tap the landmarks in the order they were built | Rare/Epic |
| 🍽️ Taste · 🔎 Find | Tap when done | Rare |
| 🧭 Treasure hunt | Walk to a hidden spot while the phone shows 🔥 hot / 🌤️ warm / ❄️ cold from GPS | Epic |
| 🤝 Meet a local | Find a person, get their **secret word**, type it in. They then "hand you" a letter with directions to the next chapter | Epic |

XP by rarity: Common 30 · Rare 50 · Epic 80 · Legendary 150. Finishing a chapter adds +50 and finishing a city adds +300.

### Rewards after quests and travel

- **Stamps.** One per finished place, in the digital passport.
- **Collectible cards.** 15 cards from Common to Legendary, one per place, each with a real fact.
- **Gift stamps.** 8 special stamps for *how* you travel:
  - 🌅 Early Bird (before 9 am)
  - 🌇 Golden Hour (5–8 pm)
  - 🦉 Night Owl (after 8 pm)
  - 🤝 Local Friend (meet a local)
  - 🧭 Treasure Hunter (finish a hunt)
  - 🎟️ First Deal (unlock your first coupon)
  - ✉️ The Courier (finish the Tashkent story)
  - 🌌 Star Keeper (finish the Samarkand story)
- **Partner coupons.** Discounts at cafés, restaurants and shops. Each unlocks when you finish a certain place, a whole city, or reach a level. A coupon lasts 30 days and has its own code for the cashier. Partners redeem it in `/admin`, and each code works only once.
- **City voucher.** Finishing a whole city gives a voucher for a medal and postcard.
- Also 9 badges, 7 levels, a daily quest, and a 20-minute digital-detox timer.

⚠️ The 8 partner offers in `shared/content.mjs` (`OFFERS`) are **sample partners marked "(demo)"**. Replace them with real signed partners before launch.

### Secret words (meet-a-local quests)

In a real launch, a partner's staff member plays the "local" and tells travellers the secret word on site. The names are placeholders.

The words **never ship to the browser**. Only the server knows them and checks them:

- The app asks `POST /api/v1/meet/check` when a word is typed, so a wrong word is refused on the spot.
- With no connection, the word counts for now, and the next sync confirms it or removes it.
- Each address gets 10 wrong words per minute, across the check endpoint and sync, so the words cannot be guessed from a dictionary.

| Environment | Where the words come from |
|---|---|
| Production (`NODE_ENV=production`) | The `MEET_CODES` variable (JSON), or the file `MEET_CODES_FILE`, default `data/meet-codes.json` (not in git). The server will not start without a word for every meet quest. |
| Development | The same file if it exists, otherwise the public demo words in `backend/meet-codes.dev.json`. |

The file maps quest ids to words, for example `{ "tas-chorsu-meet": "…", "tas-plov-meet": "…", "sam-siy-meet": "…", "sam-kon-meet": "…" }`. Spelling is forgiving, as with riddles.

⚠️ **Do not reuse the demo words** (`zira`, `qozon`, `yulduz`, `qog'oz`). They are public in this repository and its history. Choose words that are not in the place's story (for example a word plus two digits), and change them if they leak.

The static GitHub Pages demo has no server, so there any word is accepted.

## Test mode

Test mode is **on by default** (Profile → 🧪 Test mode) so you can play everything from home:
- "Simulate arrival" completes treasure hunts without GPS.
- "Skip photo" completes photo spots without taking a picture.
- "Skip" completes meet-a-local quests without the secret word.

Turn it off to experience the real thing. The server rejects simulated completions when `NODE_ENV=production` (or `ALLOW_TEST_EVENTS=false`); the app then hides the test buttons. Set `ALLOW_TEST_EVENTS=true` to force them on.

## Run locally

Needs Node.js 22.13 or newer, which ships the built-in SQLite driver the server uses.

```bash
cd uz-quest
npm start      # http://127.0.0.1:4174
npm test       # game rules and server tests
```

**Data.** Progress is stored in SQLite at `data/uzquest.db` (set `DATABASE_FILE` to move it). A `data/store.json` from before SQLite is imported on the first start and kept as `data/store.json.imported`. The server refuses to import it into a database that already has data, so nothing is merged by accident.

**Backups.** Once a day the server copies the database to `backups/` next to it (`uzquest-YYYY-MM-DD.db`) and keeps the last 7 days. `BACKUP_DIR` moves the folder; `BACKUP_KEEP` sets how many days to keep, and `0` turns the copies off. They sit on the same disk as the database, so also download one now and then from the admin panel (**Download backup**, or `GET /api/v1/admin/backup` with the admin key) and keep it elsewhere. To restore, stop the server and put the copy in place of `uzquest.db`, removing any `uzquest.db-wal` and `uzquest.db-shm` files.

**Browser tests.** `npm run test:e2e` plays the app in headless Chromium against a real server: onboarding, quests, photo upload, sync, the admin panel, production settings and offline use. First run `npm install` and `npx playwright install chromium`. To reuse a Chromium you already have, set `CHROMIUM_PATH` to its executable.

To test on your phone over the same Wi-Fi, run `HOST=0.0.0.0 ADMIN_KEY=<your-key> npm start` (the server refuses to listen on the network with the dev key) and open `http://<your-PC-IP>:4174`. GPS and the camera need `https://`, so use the GitHub Pages link for real treasure hunts.

**Telegram login (optional).** Create a bot with [@BotFather](https://t.me/BotFather) and start the server with `TELEGRAM_BOT_TOKEN=<token>`. The server polls Telegram for the bot's messages, so it needs no public URL. Do not set a webhook for the same bot, because long polling and a webhook cannot be used together. Profile then shows "Log in with Telegram":

1. The app opens the bot.
2. The traveller taps Start and confirms with "Yes, it's me".
3. The phone is logged in.

Progress from every phone the traveller logs in with is merged into the account, and a quest done twice counts once. Logging out starts the phone over; the account keeps the progress. **Delete account** in Profile removes the account and everything kept about it (its devices, events, coupons and vouchers, sessions) on every phone. Without a token the button is hidden.

**Claude AI guide (optional).** Run `npm install`, then `ANTHROPIC_API_KEY=... npm start`. Without a key, Hamroh uses its built-in offline answers.

**Server hosting.** [DEPLOY.md](DEPLOY.md) runs the server on Railway, with the database on a persistent volume. That is what Telegram login, sync and the partner dashboard need.

**Static hosting.** `npm run build` writes `dist/`. GitHub Pages publishes it automatically on every push to `main`, after `npm test` and the browser tests pass. Pull requests run the same tests.

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the parts fit together: the shared engine, event sourcing, sync and the trust model.

```
public/
  index.html, landing.css, landing.mjs   ← project website (/)
  app/                                   ← the web app (/app/)
  shared/content.mjs                     ← stories, places, quests, cards, offers, gift stamps (UZ/EN/RU)
  shared/lang/tr.mjs, zh.mjs             ← Turkish and Chinese for the content, app, website, guide and bot
  shared/languages.mjs                   ← the list of supported languages
  shared/engine.mjs                      ← game rules: answer checks, XP, coupons, stamps, suggestions
  assets/screens/*.jpg                   ← real app screenshots used on the website
  admin.html, admin.mjs                  ← partner dashboard
backend/src/                             ← zero-dependency Node server, sync API, Claude guide
```

**Adding a place or quest.** Add it to `shared/content.mjs`. It appears everywhere automatically. The tests check that every quest has all five languages and a valid answer.

**Languages.** Uzbek, English and Russian are written inline (`tr(uz, en, ru)` in `content.mjs`, `STRINGS` in `app/i18n.mjs`, the website's `STRINGS`). Turkish and Chinese live in `shared/lang/tr.mjs` and `zh.mjs`, with content looked up by its English text. A missing translation falls back to English, and `backend/test/languages.test.mjs` names every missing or stale entry and checks that `{placeholders}` match. When you change an English text, update its Turkish and Chinese entries too; the test tells you which. For a riddle, add the Turkish and Chinese answers to its `answers`.

⚠️ The Turkish and Chinese texts were drafted with Claude. Have a native speaker review them before launch.

**Engine.** The same `engine.mjs` runs on the phone and on the server. It checks answers, timeline order and GPS distance. Secret words are only checked on the server, which passes them to the engine.

## Before real users

- **Check every place on site.** Coordinates are approximate, especially the treasure-hunt points. Check the quiz and riddle facts, and opening hours.
- **Sign real partners.** Replace the demo offers, and agree secret words with the staff who play the "locals". Put the words in `data/meet-codes.json` on the server, or in the `MEET_CODES` variable as JSON (see [Secret words](#secret-words-meet-a-local-quests)).
- **Infrastructure.**
  - Run with `NODE_ENV=production`, your own `ADMIN_KEY` and your own secret words file. The server will not start without either. Production mode also turns test events off.
  - Daily and detox XP is only accepted within 48 hours, and the API is rate-limited per IP. Behind a hosting proxy (Railway, nginx…) set `TRUST_PROXY=1`, or every traveller shares the proxy's limit.
  - Keep downloaded backups somewhere other than the server (see **Backups** above). A plain copy of `uzquest.db` is only safe while the server is stopped, because SQLite also keeps `-wal` and `-shm` files next to it.
  - Use a commercial map tile provider.
  - Bump `CACHE` in `sw.js` on every release.
