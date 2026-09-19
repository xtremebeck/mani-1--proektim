# UzQuest — Uzbekistan, One Quest at a Time

UzQuest is a story-driven quest travel app for Tashkent and Samarkand, inspired by [SubQuester](https://www.subquester.app/).

| URL | What it is |
|---|---|
| `/` | **Project website**, modelled on subquester.app: features, how it works, cities, screenshots, a live playable demo, a partners section and an FAQ. In UZ, EN and RU. |
| `/app/` | **The web app.** This is the version to test now and move to the mobile app later. |
| `/admin` | Partner dashboard: metrics, a funnel per place, partner offers, and redemption of vouchers and coupons. Key: `uzquest-dev-admin` |

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

### Secret words (for partner staff and testing)

| City | Place | Local | Secret word |
|---|---|---|---|
| Tashkent | Chorsu Bazaar | Ravshan aka (spice seller) | `zira` |
| Tashkent | Plov Centre | Botir aka (plov master) | `qozon` |
| Samarkand | Siab Bazaar | Dilnoza opa (baker) | `yulduz` |
| Samarkand | Konigil | Usta Zarif (paper master) | `qog'oz` |

In a real launch, a partner's staff member plays this person. The names are placeholders.

## Test mode

Test mode is **on by default** (Profile → 🧪 Test mode) so you can play everything from home:
- "Simulate arrival" completes treasure hunts without GPS.
- "Skip photo" completes photo spots without taking a picture.
- The secret word is shown under each meet-a-local quest.

Turn it off to experience the real thing. For real rewards, start the server with `ALLOW_TEST_EVENTS=false` so it rejects simulated completions.

## Run locally

```bash
cd uz-quest
npm start      # http://127.0.0.1:4174
npm test       # 12 tests of the game rules
```

To test on your phone over the same Wi-Fi, run `HOST=0.0.0.0 npm start` and open `http://<your-PC-IP>:4174`. GPS and the camera need `https://`, so use the GitHub Pages link for real treasure hunts.

**Claude AI guide (optional).** Run `npm install`, then `ANTHROPIC_API_KEY=... npm start`. Without a key, Hamroh uses its built-in offline answers.

**Static hosting.** `npm run build` writes `dist/`. GitHub Pages publishes it automatically on every push to `main`.

## Project layout

```
public/
  index.html, landing.css, landing.mjs   ← project website (/)
  app/                                   ← the web app (/app/)
  shared/content.mjs                     ← stories, places, quests, cards, offers, gift stamps (UZ/EN/RU)
  shared/engine.mjs                      ← game rules: answer checks, XP, coupons, stamps, suggestions
  assets/screens/*.jpg                   ← real app screenshots used on the website
  admin.html, admin.mjs                  ← partner dashboard
backend/src/                             ← zero-dependency Node server, sync API, Claude guide
```

**Adding a place or quest.** Add it to `shared/content.mjs`. It appears everywhere automatically. The tests check that every quest has all three languages and a valid answer.

**Engine.** The same `engine.mjs` runs on the phone and on the server. It checks answers, secret words, timeline order and GPS distance.

## Before real users

- **Check every place on site.** Coordinates are approximate, especially the treasure-hunt points. Check the quiz and riddle facts, and opening hours.
- **Sign real partners.** Replace the demo offers, and agree secret words with the staff who play the "locals".
- **Infrastructure.**
  - Change `ADMIN_KEY`.
  - Set `ALLOW_TEST_EVENTS=false`.
  - Move from the JSON file store to PostgreSQL.
  - Use a commercial map tile provider.
  - Bump `CACHE` in `sw.js` on every release.
