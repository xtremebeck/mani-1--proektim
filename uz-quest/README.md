# UzQuest — Uzbekistan, One Quest at a Time

UzQuest is a quest-based travel app for Tashkent and Samarkand, inspired by [SubQuester](https://www.subquester.app/). The project has two parts:

| URL | What it is |
|---|---|
| `/` | **Project website**, modelled on subquester.app: hero with a phone fan, features, how it works, cities, screenshots, a live playable demo, a partners section and an FAQ. In UZ, EN and RU. |
| `/app/` | **The web app.** This is the version to test now and move to the mobile app later. |
| `/admin` | Partner dashboard: traveller metrics, a funnel per place, and voucher redemption. Key: `uzquest-dev-admin` |

## The app flow

1. **Onboarding.** Choose a language, your name and avatar, a city, and your interests (history, food, crafts, hidden gems…).
2. **Suggestions.** The Home screen suggests places, with a reason for each ("Because you like Food", "800 m from you", "You started this one").
3. **Choose a place.** You see its story, a local tip, directions, and its quests. Then tap **Start adventure**.
4. **Complete quests.** Each place has 3–4 quests:
   - 📍 Check in
   - ❓ Quiz (the answer is checked)
   - 📸 Photo (you can also complete it without a photo)
   - 🍽️ Taste
   - 🔎 Find
   - 💬 Talk

   You tap **Mark complete** on each one to earn XP.
5. **Adventure complete.** After the last quest you get a stamp animation, the XP you earned, any new badges or level-up, and the next suggestion.
6. **City conquered.** Finishing every place in a city gives you a certificate and a **voucher** for the reward. Partners redeem it in `/admin`.

Other features:
- Daily quest.
- 20-minute digital-detox timer.
- Passport: stamps, 9 badges and a photo journal.
- Hamroh chat guide.
- City map.
- Profile, with levels, rewards and settings.

The two cities have 15 places and 45 quests between them.

## Run locally

```bash
cd uz-quest
npm start      # http://127.0.0.1:4174
npm test
```

To test on your phone over the same Wi-Fi, run `HOST=0.0.0.0 npm start` and open `http://<your-PC-IP>:4174`.

**Claude AI guide (optional).** Run `npm install`, then set `ANTHROPIC_API_KEY=... npm start`. Without a key, Hamroh uses its built-in offline answers.

**Static hosting.** `npm run build` writes `dist/` (the website plus the app, without the admin panel). You can upload it to Netlify, Vercel or GitHub Pages. Progress then stays on each phone.

## Project layout

```
public/
  index.html, landing.css, landing.mjs   ← project website (/)
  app/                                   ← the web app (/app/)
  shared/content.mjs                     ← cities, places, quests, badges, levels (UZ/EN/RU)
  shared/engine.mjs                      ← game rules: XP, completion, suggestions, vouchers
  assets/screens/*.jpg                   ← real app screenshots used on the website
  admin.html, admin.mjs                  ← partner dashboard
backend/src/                             ← zero-dependency Node server, sync API, Claude guide
```

**Adding a place.** Add it to `shared/content.mjs`. It appears in the app, the website's stats and city cards, and the admin funnel automatically.

**Updating the website screenshots.** They are real captures of the app. After UI changes, retake them at a 390×844 phone size.

**Engine.** The same `engine.mjs` runs on the phone and on the server. The phone works offline and syncs events to the server later. The server replays them to build the admin statistics and check vouchers.

## Before real users

- **Check each place on site.** Coordinates are approximate. Also check the quiz facts and opening hours.
- **Completion is honour-based** ("Mark complete"), which is right for testing. Before rewards are handed out, add GPS or QR verification to check-in quests.
- **Infrastructure.**
  - Change `ADMIN_KEY`.
  - Move from the JSON file store to PostgreSQL.
  - Use a commercial map tile provider.
  - Bump `CACHE` in `sw.js` on every release.
