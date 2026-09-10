# KNIGHT

A gym app for people who actually train. Offline-first, dark, and built around
the one number that matters: what you did last time.

Built by [SwizzKnight](https://swizzknight.vercel.app/).

---

## What it does

**Train**
- Live session logger with the previous session's numbers inline on every row —
  tap them to copy and beat them
- Rest timer that auto-starts when you tick a set, survives navigating away, and
  keeps time from an absolute clock so backgrounding the app can't make it drift
- Plate calculator that draws the loaded bar, with your plate set and bar weight
- Warm-up, drop and failure set types; swipe a row away to delete it
- Supersets, per-exercise rest overrides and session notes

**Plan**
- Routine builder with days, exercises, target sets and rep ranges
- Cut Split preloaded — Legs/Shoulders, Back/Biceps, Chest/Triceps, high rep.
  Push/Pull/Legs, Upper/Lower and Full Body are there as templates too
- The Today screen queues the next session by following your split from whatever
  you did last, so missing a day doesn't put you out of sync
- 115 exercises with muscle mapping and a coaching cue on the ones that need it,
  plus your own custom exercises

**Measure**
- Automatic record detection on estimated 1RM, heaviest set and session volume
- Weekly volume trend, week-over-week deltas and a training streak counted in
  weeks, not days — a daily streak punishes rest days
- Muscle heat map that weights prime movers over assisting muscles
- 20-week consistency grid shaded by session volume
- Per-exercise progress charts you can drag to scrub

**Fuel & Body**
- Macro and calorie tracking with saved foods for one-tap re-logging
- Water tracking
- Bodyweight with a 7-day rolling average, measurements and progress photos

Everything is stored on your phone. Nothing is uploaded anywhere, so Settings
has JSON export and restore — that's the only way to move to a new device.

---

## Running it

Requires [Node](https://nodejs.org) 20+. No Android Studio needed for day-to-day
development.

```bash
npm install
npm start
```

Install **Expo Go** on your Android phone, then scan the QR code from the
terminal. The phone and computer need to be on the same network.

Other commands:

```bash
npm run android    # open on a connected device or emulator
npm run typecheck  # tsc --noEmit
npm run assets     # regenerate app icons and the rest-timer chime
```

### Don't rebuild for a JS change

A full EAS build can sit in the free-tier queue for over an hour. You rarely
need one. In order of how fast they are:

**Testing a change — Expo Go, no build at all.** Every native module this app
uses ships inside Expo Go, so `npm start` and a QR scan runs the current code
instantly.

**Updating an app already installed on your phone — an over-the-air push:**

```bash
npm run update
```

That takes about thirty seconds and no queue. The installed APK picks the change
up next time it launches. Works for anything written in JS or TS, which is
almost everything: screens, logic, styling, the exercise library, routines.

**A full APK build is only needed when the native side changes** — adding or
removing an `expo-*` / `react-native-*` package, or editing `app.json`'s
plugins, permissions, icon or app name. `runtimeVersion` is pinned to
`appVersion`, so bumping `version` in `app.json` also cuts existing installs off
from further updates until they take a new build.

### Getting an installable APK

Built in Expo's cloud, so no Android SDK is needed locally. One-time setup:

```bash
npx eas-cli login
npx eas-cli init
```

`init` links the project to your Expo account and writes an `extra.eas.projectId`
into `app.json` — commit that. Then, any time you want a new build:

```bash
npm run build:apk
```

It uploads the project, builds for ~10-20 minutes, and prints a download URL.
Open that URL on your phone, download, and install. Android will ask you to
allow installs from your browser the first time.

The `preview` profile is set to `"buildType": "apk"` on purpose — EAS defaults
Android builds to an `.aab`, which the Play Store accepts but a phone cannot
install directly.

Building locally instead needs Android Studio and the SDK (~10 GB), then:

```bash
npm run build:local
```

---

## Design

One accent colour carries the whole app. Electric lime appears only where
something is live, achieved, or actionable; everything else is neutral. If the
lime starts showing up on decoration, the hierarchy is broken.

Two typefaces, strictly divided: **Space Grotesk** for numbers, stats and screen
titles, **Inter** for everything you actually read.

Motion has rules, in `src/theme/motion.ts`:

1. Anything your finger is touching uses a spring — it should feel attached to
   your hand, not scheduled.
2. Anything appearing or disappearing on its own uses a timing curve.
3. Nothing eases linearly.
4. Entrances decelerate; exits accelerate, because you've already moved on.

Entrance animations go through `<Appear>` rather than Reanimated's
`entering={...}` layout animations. Layout animations take an element out of
flow while they run — fine on native, but on web they leave it absolutely
positioned forever and every screen collapses into a pile.

### Keyboard

The app runs edge-to-edge, and under edge-to-edge Android stops resizing the
window when the keyboard opens. Everything that relied on that resize —
`KeyboardAvoidingView`, a ScrollView shrinking, a bottom sheet staying visible —
silently does nothing, and the field you're typing into ends up behind the
keyboard.

So layout reacts to `useKeyboardHeight()` explicitly: the logger shrinks its
scroll viewport (which is what makes Android scroll the focused input into
view), and `Sheet` lifts by the keyboard height. Anything with a text input
needs to account for it — nothing handles this for you.

### Rendering in the logger

A live session can have thirty text inputs on screen. Two rules keep typing
fast:

- Screens select narrowly from the store. Subscribing to the whole thing
  re-renders every card on every keystroke.
- `patchSet` only gives a new object identity to the exercise that actually
  changed, so a memoised `ExerciseCard` re-renders alone.

---

## Layout

```
app/                    Routes (expo-router)
  (tabs)/               Today, Train, Stats, Fuel, Body
  workout/[id]          The live logger
  workout/summary/[id]  Post-session summary and records
  routine/[id]          Routine editor
  exercise/[id]         Per-exercise history and charts
src/
  components/ui/        Design system primitives
  components/charts/    Hand-built SVG charts and the muscle map
  db/                   SQLite schema, migrations, seed data, queries
  features/             Screen-specific composition
  lib/                  Strength maths, dates, haptics, sound, backup
  store/                Zustand: settings, live session, rest timer
  theme/                Colour, type, spacing and motion tokens
scripts/                Asset and sound generators
```

### Data

SQLite via `expo-sqlite`, with forward-only migrations in `src/db/schema.ts`.
Add a new entry to `MIGRATIONS` to change the schema; never edit one that has
already shipped.

Estimated 1RM uses Epley (`weight × (1 + reps/30)`), chosen over Brzycki because
it stays sane at the higher rep counts most accessory work lives in. Above about
12 reps treat it as indicative only.

---

## Stack

Expo SDK 57 · React Native 0.86 · TypeScript (strict) · expo-router ·
Reanimated 4 · react-native-svg · Zustand · expo-sqlite
