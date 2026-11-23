# Plan: split `public/app/app.mjs` into modules

**Status:** proposed, not started. Start after PR #1 is merged (see [Prerequisites](#prerequisites)).

`public/app/app.mjs` holds the whole web app in one 874-line file: storage, session state, sync, the router and all 11 screens. This plan splits it into small modules without changing behaviour, one safe step at a time.

See [ARCHITECTURE.md](../ARCHITECTURE.md) for how the app fits into the rest of the system.

## Goals and non-goals

- **Goal:** each screen and each core concern lives in its own file; the largest file drops from 874 to about 120 lines.
- **Goal:** adding a screen means adding one file and one line of registration.
- **Non-goal:** changing behaviour, the UI or the build. There is still no bundler and no framework.
- **Non-goal:** touching `shared/engine.mjs` or `shared/content.mjs`.

## The two hard parts

### 1. Shared mutable state

The top of `app.mjs` declares about 14 module-level variables (`profile`, `state`, `log`, `deviceId`, `server`, `position`, `chat`, `lastCompletion`, `hunt`, `map`, …). Several are **reassigned**, for example `state = replay(log)` after a sync rejection and `profile = {…}` on reset.

An importing module cannot reassign an imported `let`; it sees a read-only live binding. So the shared values move onto one exported object:

```js
// core/session.mjs
export const session = { profile, state, log, deviceId, server, position: null, chat: [], lastCompletion: null };
// elsewhere
session.state = replay(session.log);
```

State that only one screen uses (`hunt`, `map`, `timelinePicks`, `exploreFilter`, `detoxTimer`, `pendingPhotoQuest`) moves into that screen's module instead.

### 2. Router ↔ screens cycle

Screens call `render()` and `go()`; `render()` calls the screens. To avoid a circular import, the router never imports screens. `app.mjs` registers them:

```js
// app.mjs
import { registerScreens, render } from "./core/router.mjs";
import { renderHome } from "./screens/home.mjs";
// …
registerScreens({ home: renderHome, explore: renderExplore, /* … */ });
render();
```

## Target layout

```
public/app/
  app.mjs                 entry only: register screens, global listeners, first render, SW   ~30
  core/
    storage.mjs           KEYS, localStorage wrapper, IndexedDB photos, uuid                   ~45
    session.mjs           session object; saveProfile, testAllowed, testMode, city(), resetAll ~55
    ui.mjs                $, all, t, L, esc, pad, formatDistance, formatDate, gradient, art,
                          interestName, rarityChip, errorText                                   ~30
    feedback.mjs          toast, raiseToasts, clearToasts, confetti, countUp                   ~45
    sync.mjs              dispatch, flush, syncOutbox, checkServer, apiUrl                     ~85
    router.mjs            route, go, render, registerScreens                                   ~35
    location.mjs          locate (GPS position)                                                ~15
  components/
    cards.mjs             placeCard, reasonText, storyCard, otherCityCard, bindOtherCity,
                          collectibleCard, couponTile, unlockText                              ~90
  screens/
    welcome.mjs           onboarding                                                           ~35
    home.mjs              home + digital detox card                                            ~80
    explore.mjs           list / map, filter, drawMap                                          ~35
    place.mjs             chapter screen, questCard, bindPlace, completeQuest, timeline        ~120
    hunt.mjs              treasure hunt (startHunt, stopHunt)                                  ~30
    photos.mjs            handlePhoto, downscale, loadQuestPhotos                              ~30
    done.mjs              chapter complete                                                     ~45
    city.mjs              city conquered + voucher                                             ~35
    rewards.mjs           wallet + coupon detail                                               ~45
    passport.mjs          passport, cards, badges, journal                                     ~35
    guide.mjs             Hamroh chat                                                          ~40
    profile.mjs           settings, test mode, reset                                           ~35
```

### Dependency rule

```
screens  →  components  →  core  →  shared/engine.mjs, shared/content.mjs
```

`core` never imports `components` or `screens`, and screens do not import each other. The one exception is `place.mjs`, which uses `hunt.mjs` and `photos.mjs`. Those two are helpers rather than routed screens, and they import only `core`.

## Steps

Each step is one commit. After every step the app must work exactly as before: `npm test` and the browser test both pass.

| # | Step | Risk |
|---|---|---|
| 0 | **Safety net.** Add the Playwright browser walkthrough as `npm run test:e2e` (dev mode 21 checks, production mode 7), plus an offline check: load the app, `context.setOffline(true)`, reload, play a quest. The current 23 tests do not exercise `app.mjs` at all, so without this the refactor is blind. | low |
| 1 | Extract `core/storage.mjs` and `core/ui.mjs`. Both are stateless helpers. | low |
| 2 | **Inside the single file**, replace the shared variables with the `session` object (`profile` → `session.profile`, …). This touches the most lines, but the change is mechanical, and doing it before any move keeps the diff reviewable. | **medium** |
| 3 | Extract `core/feedback.mjs`, `core/sync.mjs`, `core/router.mjs` (with `registerScreens`) and `core/location.mjs`. Today `render()` itself stops the hunt, removes the map and clears the detox timer. Until step 6, the router exposes `onBeforeRender(fn)` so those modules register their own teardown, and the router never imports them. | medium |
| 4 | Move shared cards to `components/cards.mjs`. | low |
| 5 | Move screens one per commit, simplest first: rewards/coupon → passport → profile → guide → city → done → welcome → explore → home → **place + hunt + photos last** (most cross-links). | low → medium |
| 6 | *(optional, behaviour change)* Let each screen return a cleanup function so `render()` no longer needs to know about the map, the hunt watcher or the detox timer. Separate PR. | medium |
| 7 | Add every new file to `SHELL` in `public/sw.js` and bump `CACHE`. Update the directory map in `ARCHITECTURE.md`. | **high if forgotten** |

Steps 0–5 come to about 7–8 small commits.

## Risks and how to catch them

| Risk | Symptom | Guard |
|---|---|---|
| A new module missing from the service worker `SHELL` | The app works online but **fails offline**; online testing will not notice | Offline check in step 0; do step 7 in the same PR as the moves |
| Init order changes | `profile`, `state` and `deviceId` are read at load time today; a module reading `session` before it is initialised gets `undefined` | `app.mjs` imports `core/session.mjs` first; session initialises itself on import |
| Accidental circular import | `ReferenceError: Cannot access … before initialization` at load | Follow the dependency rule; the browser test fails on any page error |
| More requests on first load | ~22 module requests instead of 1 | Add `<link rel="modulepreload">` for the core modules in `app/index.html` |
| A lost `export` or a misspelled import | Import error, blank screen | Browser test (any `pageerror` fails it) |

## Prerequisites

- **PR #1 merged.** It changes `app.mjs` (event log, sync reconciliation, test-mode policy). Start from an updated `main` on a new branch, for example `refactor/split-app-module`, to avoid conflicts.
- Playwright as a dev dependency for step 0. Decide whether CI runs the browser test; it needs a Chromium download in `pages.yml`.

## Done when

- `public/app/app.mjs` is entry-only and no file under `public/app/` is over ~150 lines.
- `npm test` and `npm run test:e2e` (including the offline check) pass.
- `sw.js` precaches every module, and `ARCHITECTURE.md` shows the new layout.
