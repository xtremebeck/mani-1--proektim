# UzQuest architecture

UzQuest is an **offline-first web app with a shared game engine and event sourcing**. The browser is where the game is played. The server keeps a verified copy of each traveller's progress, runs the partner dashboard and talks to Claude. Both sides run the same rules file.

There is no framework and no build step. The code is plain ES modules. The only server dependency is the optional `@anthropic-ai/sdk`.

For setup, gameplay and content, see [README.md](README.md). This document explains how the parts fit together and why.

## Overview

```mermaid
flowchart TB
  subgraph Browser["Browser / phone (PWA)"]
    UI["app/app.mjs<br/>screens, hash router"]
    Engine1["shared/engine.mjs<br/>game rules"]
    Content1["shared/content.mjs<br/>cities, quests, offers"]
    LS[("localStorage<br/>state · event log · outbox")]
    IDB[("IndexedDB<br/>photos")]
    SW["sw.js<br/>offline cache"]
    LG["app/local-guide.mjs<br/>offline Hamroh"]
    UI --> Engine1 --> Content1
    UI --> LS
    UI --> IDB
    UI --> LG
  end

  subgraph Server["Node server (backend/src)"]
    HTTP["server.mjs<br/>API + static files"]
    Engine2["shared/engine.mjs<br/>same rules, re-checked"]
    Store[("store.mjs<br/>data/store.json")]
    Guide["guide.mjs<br/>Claude"]
    HTTP --> Engine2
    HTTP --> Store
    HTTP --> Guide
  end

  UI -- "POST /api/v1/sync (events)" --> HTTP
  UI -- "POST /api/v1/guide" --> HTTP
  Admin["admin.html / admin.mjs"] -- "x-admin-key" --> HTTP
```

## Directory map

| Path | Role | Runs in |
|---|---|---|
| `public/shared/content.mjs` | All game content as data: cities, places, quests, rarities, offers, badges, levels, in UZ/EN/RU | browser + server |
| `public/shared/engine.mjs` | Pure game rules: `applyEvent`, `replay`, answer checks, XP, coupons, badges, suggestions | browser + server |
| `public/app/app.mjs` | The web app: hash router, every screen, sync client, photo storage | browser |
| `public/app/i18n.mjs` | UI strings in three languages | browser |
| `public/app/local-guide.mjs` | Offline Hamroh: keyword intents answered from local tips | browser |
| `public/sw.js` | Service worker: precaches the app shell, network-first with cache fallback | browser |
| `public/index.html`, `landing.*` | Project website with an embedded live demo | browser |
| `public/admin.html`, `admin.mjs` | Partner dashboard: metrics, funnels, voucher redemption | browser |
| `backend/src/server.mjs` | HTTP server: API routes, static files, rate limits, security headers | server |
| `backend/src/store.mjs` | JSON file store with serialized, atomic writes | server |
| `backend/src/guide.mjs` | Hamroh with Claude | server |
| `scripts/build.mjs` | Copies `public/` to `dist/` (without admin) for static hosting | build |

## Core ideas

### 1. One rules engine, two places

`engine.mjs` imports only `content.mjs` and has no I/O, so the browser and the server run exactly the same code. The phone uses it to give instant feedback while offline. The server uses it to re-check every event before accepting it. Because there is only one copy of the rules, the two sides cannot drift apart.

Keep the engine pure. Anything that touches the DOM, storage, the network or the clock (other than an event's own `at`) belongs in `app.mjs` or `server.mjs`.

### 2. Event sourcing

Progress is never edited directly. Every action becomes an immutable event:

| Event `type` | Key fields | Effect |
|---|---|---|
| `start` | `placeId` | Marks a place as started |
| `quest` | `questId` plus the proof for its type (`answer`, `text`, `code`, `order`, `hasPhoto`, `lat`/`lng`/`accuracy`, `test`) | Completes a quest; may complete the place and the city |
| `daily` | `cityId`, `dailyId` | Daily quest XP, once per Uzbekistan calendar day |
| `detox` | `startedAt` | Digital-detox XP, once per day, after `DETOX_MINUTES` |
| `reward` | `cityId` | Issues the city voucher once the city is complete |

`applyEvent(state, event, options)` returns `{ ok, state, gained, ... }` or `{ ok: false, error }`. It never mutates its input. `replay(events)` folds a list of events into a state. Coupons are unlocked as a side effect of any successful event.

Every event has a client-generated `id`, so the server can recognize a repeat and resending is always safe (idempotent). Voucher and coupon codes are derived from event ids, so the phone and the server compute the same code independently.

### 3. Offline-first sync

```mermaid
sequenceDiagram
  participant UI as app.mjs
  participant LS as localStorage
  participant S as server.mjs
  UI->>UI: applyEvent (instant feedback)
  UI->>LS: save state, append to log + outbox
  UI->>S: POST /api/v1/sync { deviceId, events }
  S->>S: applyEvent each event (allowTest, now)
  S-->>UI: { accepted, rejected, state }
  UI->>LS: remove settled events from outbox
  alt some events rejected (not DUPLICATE)
    UI->>LS: drop them from the log, replay(log) → state
    UI->>UI: toast "could not verify"
  end
```

- The phone is usable with no network. The outbox drains whenever the server is reachable. Syncs run one at a time.
- The server is authoritative. If it rejects an event, the phone rebuilds its state from its own log without that event, so the two copies agree again.
- Installs created before the log existed have no log (`null`). They keep their state as is.
- Photos stay on the device in IndexedDB. Only `hasPhoto: true` is sent.

### 4. Content is data

Adding a city, place, quest, offer or badge means editing `content.mjs` only. The UI, the suggestions, the admin funnels and the tests all read from it. `engine.test.mjs` checks that ids are unique, answers are valid and every text exists in three languages.

### 5. Two deployment shapes

| Shape | Command | What works |
|---|---|---|
| Full | `npm start` | Everything: sync, admin dashboard, voucher redemption, Claude guide |
| Static | `npm run build` → `dist/` (GitHub Pages) | The whole game, offline-first. No sync, no admin. Hamroh uses its offline answers |

The app detects the server through `GET /api/v1/health` and degrades on its own when there is none.

## Server API

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/v1/health` | — | Liveness, whether Claude is available, whether test events are allowed |
| `POST /api/v1/sync` | `deviceId` | Upload events; returns accepted and rejected ids plus the server state |
| `POST /api/v1/guide` | — | Ask Hamroh (Claude); returns 503 if not configured, 502 if it failed |
| `GET /api/v1/admin/overview` | `x-admin-key` | Metrics, funnels per place, offers, vouchers, recent travellers |
| `POST /api/v1/admin/redeem` | `x-admin-key` | Redeem a city voucher or partner coupon once |

Everything else is served as a static file from `public/`, with protection against path traversal.

### Data model (`data/store.json`)

```js
{
  devices: {
    [deviceId]: {
      createdAt, lastSeenAt, lang,
      events: [ /* accepted events, known fields only, with receivedAt */ ],
      state:  { v: 3, xp, started, quests, places, dailies, detox, rewards, coupons },
      redeemed: { [cityId | "coupon:<offerId>"]: timestamp }
    }
  }
}
```

`store.mutate(fn)` queues writes one after another. Each write goes to a temporary file that is then renamed over the old one, so a crash cannot leave a half-written file. A device whose state has an older `v` is reset to an empty state on its next sync.

## Trust and security

Content and rules ship to the browser, so **nothing on the client is secret**: quiz answers and secret words can be read from the bundle. The server's job is to limit what a cheating client can gain, not to make cheating impossible.

| Control | Where |
|---|---|
| Every event is re-validated with the shared engine | `sync()` |
| Daily and detox claims older than 48h are rejected (`CLAIM_EXPIRED`) | `engine.mjs`, enforced when the server passes `now` |
| Timestamps from the future are clamped to the server time | `sync()` |
| Test shortcuts (simulated GPS, skipped photo) are off when `NODE_ENV=production` unless `ALLOW_TEST_EVENTS=true` | `server.mjs`; the app hides them via `/health` |
| The dev admin key is refused in production or on a non-loopback host | startup |
| Rate limits per IP: admin failures, sync, guide, new devices | `rateLimit()` |
| Only known event fields are stored; bodies are capped at 256 KB | `cleanEvent()`, `readBody()` |
| Ambiguous voucher codes are refused instead of guessed | `redeem()` |
| All rendered text is escaped; Claude replies are set as `textContent` | `app.mjs`, `admin.mjs` |

## Testing

- `backend/test/engine.test.mjs` covers the rules as pure functions: content integrity, every quest type, XP, coupons, story order, time-of-day stamps and the claim window.
- `backend/test/server.test.mjs` starts real server processes on temporary data files and covers crashes, status codes, rate limits, production settings, event cleaning and redemption.

Run both with `npm test`. CI runs the same tests before each GitHub Pages deploy.

## Known limits and next steps

| Limit | Impact | Direction |
|---|---|---|
| JSON file store | Every sync rewrites the whole file; one process only | Move to PostgreSQL or SQLite; the `JsonStore` interface (`snapshot`, `mutate`) is the seam |
| Answers ship to the client | Quests can be completed without visiting | Check high-value quests (meet, hunt) on the server; accept losing offline completion for those |
| Identity is a random `deviceId` | Progress is lost with the phone or browser data | Add accounts (phone number or Telegram) and link devices |
| In-memory rate limits | Reset on restart; behind a proxy all clients share one IP | Rate-limit at the reverse proxy |
| `app.mjs` holds every screen | Harder to change as the app grows | Split into one module per screen behind the same router |
| String-built UI (`innerHTML`) | Manual event wiring; escaping must not be forgotten | Revisit when moving to native apps |
