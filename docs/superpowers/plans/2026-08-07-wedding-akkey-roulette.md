# Wedding Akkey Roulette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-first three-round wedding acrylic-keychain roulette PWA with deterministic state transitions, secure winner selection, persisted history, audio unlock, and reliable duplicate-input handling.

**Architecture:** A Next.js App Router client screen renders a pure reducer-driven game state machine. Pure domain modules own secure randomness, candidate filtering, winner selection, and persistence serialization; browser adapters own image/audio preloading and HTMLAudioElement lifecycle. Static local assets are precached by the PWA service worker; the supplied repository has no final media, so development placeholders preserve the exact local asset contract and are replaceable without code changes.

**Tech Stack:** Next.js 16.x, React, TypeScript strict, Tailwind CSS, motion/react, canvas-confetti, @serwist/next, serwist, Vitest, React Testing Library, Playwright, pnpm.

## Global Constraints

- Use a reducer-centered state machine; do not add Zustand, Redux, a database, API routes, Server Actions, authentication, or external runtime APIs.
- Use Web Crypto API rejection sampling for winner selection; do not use `Math.random()` for winner selection.
- Persist only confirmed `winnerIds` under `wedding-akkey-roulette:v1`; never restore `spinning` or `decelerating` as active phases.
- Confirm a winner synchronously at the first accepted STOP and never select again during deceleration.
- Guard START, STOP, and NEXT in the reducer/event boundary; UI `disabled` is not the only protection.
- Keep production assets local and precache app shell, JavaScript, CSS, 50 keychain images, four audio files, and icons.
- Required audio filenames are `waiting.mp3`, `roulette.mp3`, `deceleration.mp3`, and `winner.mp3`; required keychain filenames are `keychain-01` through `keychain-50`.
- Do not display keychain IDs, numbers, or names in the UI.
- Follow TDD for behavior changes: write one failing test, run the intended test and observe RED, implement minimally, run GREEN, then refactor without adding behavior.
- Every task ends with lint, typecheck, relevant tests, and a small commit; final verification must run lint, typecheck, unit/component tests, Playwright, and production build freshly.

---

### Task 1: Project foundation and roulette domain

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/features/roulette/gameTypes.ts`, `src/features/roulette/keychains.ts`, `src/features/roulette/config.ts`
- Create: `src/features/roulette/lib/random.ts`, `src/features/roulette/lib/random.test.ts`
- Create: `src/features/roulette/lib/roulette.ts`, `src/features/roulette/lib/roulette.test.ts`
- Create: `README.md` sections for local setup and asset contract

**Interfaces:**
- `Keychain = { id: string; imageSrc: string }`
- `KEYCHAINS: Keychain[]` contains exactly 50 ordered entries.
- `secureRandomIndex(length: number): number` returns an unbiased integer or throws for non-positive length.
- `getAvailableKeychains(keychains, winnerIds): Keychain[]` returns a new array excluding confirmed winners.
- `selectWinner(keychains, winnerIds): Keychain` selects one available candidate and throws when none exist.

- [ ] Write failing tests for random boundaries/rejection sampling and immutable winner exclusion.
- [ ] Run `pnpm vitest run src/features/roulette/lib/random.test.ts src/features/roulette/lib/roulette.test.ts`; expected RED because modules are absent.
- [ ] Add the minimal package/tooling and domain implementations.
- [ ] Run the focused tests and verify GREEN, then run `pnpm lint` and `pnpm typecheck`.
- [ ] Commit as `feat: add roulette domain foundation`.

### Task 2: Reducer state machine

**Files:**
- Create: `src/features/roulette/state/gameReducer.ts`, `src/features/roulette/state/gameReducer.test.ts`
- Modify: `src/features/roulette/gameTypes.ts`

**Interfaces:**
- `GamePhase` is `boot | ready | idle | countdown | spinning | decelerating | reveal | winner | complete | error`.
- `GameState` contains `phase`, `round` (1|2|3), `currentKeychainId`, `pendingWinnerId`, `winnerIds`, and `assetsReady`.
- `GameAction` includes asset success/failure, ENTER, START, COUNTDOWN_COMPLETE, STOP with winner ID, DECELERATION_COMPLETE, REVEAL_COMPLETE, NEXT, and RESET.
- `gameReducer(state, action): GameState` is pure and ignores invalid phase actions.

- [ ] Write tests for every valid transition, invalid START/STOP, double STOP, and three-round completion.
- [ ] Run the reducer test before implementation and verify a feature-missing RED.
- [ ] Implement the smallest pure reducer with synchronous STOP transition to `decelerating` and winner append only at the landing/reveal boundary.
- [ ] Run focused and full unit tests; verify GREEN.
- [ ] Commit as `feat: add roulette game state machine`.

### Task 3: Persistence and restoration

**Files:**
- Create: `src/features/roulette/lib/persistence.ts`, `src/features/roulette/lib/persistence.test.ts`

**Interfaces:**
- `PersistedGameState = { winnerIds: string[]; completed: boolean; savedAt: string }`.
- `saveGameState(storage, winnerIds, completed): { ok: true } | { ok: false; error: Error }`.
- `loadGameState(storage): { winnerIds: string[]; completed: boolean } | null`.
- `getRestoredPhase(winnerIds, completed): "idle" | "complete"` and `getRestoredRound(winnerIds): 1|2|3`.

- [ ] Write tests for save/load, malformed JSON, storage exceptions, and 0/1/2/3 winner recovery.
- [ ] Run focused persistence tests and verify RED.
- [ ] Implement versioned serialization with validation and graceful null/error results.
- [ ] Run focused and full unit tests; verify GREEN.
- [ ] Commit as `feat: persist confirmed roulette winners`.

### Task 4: Asset preload and audio controller adapters

**Files:**
- Create: `src/features/roulette/lib/assets.ts`, `src/features/roulette/hooks/useAssetPreloader.ts`
- Create: `src/features/roulette/hooks/useAudioController.ts`
- Create: `src/features/roulette/lib/assets.test.ts`, `src/features/roulette/hooks/useAudioController.test.ts`
- Create: `public/assets/keychains/keychain-01.svg` through `keychain-50.svg`
- Create: `public/audio/waiting.mp3`, `public/audio/roulette.mp3`, `public/audio/deceleration.mp3`, `public/audio/winner.mp3` development placeholders with the exact production filenames

**Interfaces:**
- `AssetLoadState = { ready: boolean; progress: number; failedAssets: string[] }`.
- `preloadAssets(imageSources, audioSources, imageFactory, audioFactory): Promise<AssetLoadState>` resolves progress per asset and fails READY when any required asset fails; image decode is awaited when available.
- `AudioController` exposes `unlock`, `startWaiting`, `stopWaiting`, `startRoulette`, `startDeceleration`, `playWinner`, and `stopAll`.

- [ ] Write adapter tests with real lightweight fakes for all-loaded, image failure, audio failure, unlock, waiting stop, winner playback, and cleanup.
- [ ] Run focused tests and verify RED.
- [ ] Implement stable browser adapters with one audio-element set per hook instance and strict-mode cleanup.
- [ ] Run focused tests, lint, and typecheck; verify GREEN.
- [ ] Commit as `feat: add offline asset and audio adapters`.

### Task 5: App shell, manifest, and base styles

**Files:**
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/manifest.ts`
- Create: `src/features/roulette/components/RouletteImage.tsx`, `CountdownOverlay.tsx`, `StartButton.tsx`, `StopButton.tsx`, `WinnerOverlay.tsx`, `HistoryDialog.tsx`
- Create: `src/features/roulette/components/RouletteScreen.tsx`
- Create: `src/features/roulette/components/RouletteScreen.test.tsx`

**Interfaces:**
- `RouletteScreen` is the client orchestration boundary and owns dispatch, timers, persistence calls, and audio adapter calls; pure domain logic stays outside it.
- Components render BOOT, READY, IDLE, COUNTDOWN, SPINNING, REVEAL, WINNER, and COMPLETE user-visible states using buttons, labels, focus-visible styles, touch targets, and no ID/name text.

- [ ] Write RTL behavior tests for loading, ENTER, START, countdown, STOP, NEXT, COMPLETE, and history rendering.
- [ ] Run the component tests and verify RED.
- [ ] Implement the minimal responsive screen and components with semantic buttons and keyboard support.
- [ ] Run component/unit tests, lint, and typecheck; verify GREEN.
- [ ] Commit as `feat: add roulette screen states`.

### Task 6: Timing, spinning, and exact landing

**Files:**
- Create: `src/features/roulette/hooks/useRouletteAnimation.ts`, `src/features/roulette/hooks/useRouletteAnimation.test.ts`
- Modify: `src/features/roulette/components/RouletteScreen.tsx`, `src/features/roulette/state/gameReducer.ts`

**Interfaces:**
- `SPIN_INTERVAL_MS = 75`.
- `DECELERATION_STEPS_MS = [90, 110, 140, 180, 230, 300, 390, 500, 650]`.
- `useRouletteAnimation` starts an interval that never repeats the immediately previous candidate, accepts one STOP only, locks `pendingWinnerId`, and lands on it after the deceleration schedule before reveal.

- [ ] Write fake-timer tests for 3/2/1/START!! timing, 75ms spinning, one-time STOP winner lock, ~2.8s deceleration, and exact final winner.
- [ ] Run focused animation tests and verify RED.
- [ ] Implement timers with cleanup on phase change/unmount and no winner reselection during deceleration.
- [ ] Run focused/component/full tests; verify GREEN.
- [ ] Commit as `feat: add roulette timing and deceleration`.

### Task 7: Winner effects, persistence wiring, and history

**Files:**
- Modify: `src/features/roulette/components/WinnerOverlay.tsx`, `HistoryDialog.tsx`, `RouletteScreen.tsx`
- Create: `src/features/roulette/components/WinnerOverlay.test.tsx`, `HistoryDialog.test.tsx`

**Interfaces:**
- Winner flow keeps the image-only reveal for approximately 1 second, then displays `WINNER!`, plays winner audio, fires local confetti, sparkle, flash, and a reduced-motion-safe light shake.
- Confirmed winners are persisted immediately after landing; localStorage failure shows a non-blocking warning while the draw remains usable.
- History shows only winner images labeled by round number.

- [ ] Write tests for reveal-to-winner behavior, reduced-motion class, confetti trigger boundary, and persisted history-only rendering.
- [ ] Run focused tests and verify RED.
- [ ] Implement effects and persistence/history wiring with no ID/number/name leakage.
- [ ] Run focused/full tests and verify GREEN.
- [ ] Commit as `feat: add winner effects and persisted history`.

### Task 8: PWA offline cache

**Files:**
- Modify: `next.config.ts`, `package.json`
- Create: `src/app/sw.ts`, `public/icons/icon-192.svg`, `public/icons/icon-512.svg`
- Create: `src/app/manifest.test.ts`

**Interfaces:**
- Manifest name is `Wedding Lucky Draw`, short name `Lucky Draw`, `start_url` `/`, `display` `standalone`, landscape orientation, and local theme/background colors.
- Service worker precaches app shell, source assets, keychain images, audio, and icons, and supports navigation fallback, clients claim, skip waiting, navigation preload, and static asset caching.

- [ ] Write manifest/config integration tests for required metadata and local precache paths.
- [ ] Run them and verify RED.
- [ ] Implement Serwist configuration and service worker using only local asset URLs.
- [ ] Run lint, typecheck, tests, and build; verify GREEN.
- [ ] Commit as `feat: configure installable offline PWA`.

### Task 9: End-to-end reliability

**Files:**
- Create: `playwright.config.ts`, `e2e/roulette.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Playwright covers three rounds, unique winners, double START, double STOP, and reload after one/two/three winners.
- Tests use local asset paths and deterministic test hooks only where needed to avoid asserting random IDs.

- [ ] Write E2E scenarios and run them against the current app to verify initial RED/failure if behavior is absent.
- [ ] Implement only test harness helpers needed for stable timing and browser storage.
- [ ] Run `pnpm playwright test`; fix product behavior, not assertions, until GREEN.
- [ ] Commit as `test: cover roulette reliability e2e`.

### Task 10: Production polish and final verification

**Files:**
- Modify: `src/app/globals.css`, all affected roulette components, `README.md`
- Create: `docs/acceptance-checklist.md`

**Interfaces:**
- Layout targets 1920x1080 first, iPad landscape second, and smartphone third; central image is max 55–65vh with `object-fit: contain` and preserved aspect ratio.
- README documents pnpm setup, final asset replacement, PWA install, offline full-three-round test, rehearsal reset via `?reset=1` confirmation, and operational precautions.
- Acceptance checklist maps every design criterion to a file or command and records unavailable final media as a release prerequisite.

- [ ] Write/update final UX/accessibility tests for focus-visible, keyboard activation, 64px touch targets, and reduced motion.
- [ ] Run focused tests and verify RED for missing polish behavior.
- [ ] Implement the final style/accessibility/documentation changes.
- [ ] Run fresh `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm playwright test`, and `pnpm build`; verify all exit 0.
- [ ] Commit as `feat: finalize wedding roulette production polish`.

