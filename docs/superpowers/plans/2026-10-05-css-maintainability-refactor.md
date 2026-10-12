# CSS Maintainability Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate global and screen-owned CSS, remove unreachable legacy UI, and consolidate effective styles while preserving all rendered behaviour.

**Architecture:** Keep the present global class names and import all global screen stylesheets from the root layout in a fixed order. `globals.css` becomes the application foundation; co-located stylesheets own the intro, active roulette, rules, and history dialog. Integrate the late neutral-palette overrides into their owning selectors rather than preserving an override layer.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-05-css-maintainability-refactor-design.md`

## Global Constraints

- Preserve current colors, dimensions, spacing, placement, breakpoints, animation, transition, and focus behaviour.
- Keep existing rendered class names and `data-*` state attributes.
- Keep the `620px` breakpoint values and both sides of that breakpoint unchanged.
- Do not add dependencies, `!important`, unrelated source changes, or overwrite existing working-tree changes.
- Remove the explicitly approved unreachable `StartButton`, `StopButton`, and `WinnerOverlay` components and their test.
- Verify desktop, 620px/621px, focus-visible, and reduced-motion states.

## Review Focus

- Intro video end state keeps its title visible and the game-start control remains keyboard-focusable; verify in `e2e/intro.spec.ts`.
- At exactly 620px and 621px, responsive console sizing retains the current media-query boundary; verify in `e2e/how-to-play.spec.ts` and `e2e/roulette.spec.ts`.
- The ready, spinning, winner, retry, complete, and history-dialog states retain their prior computed palette and action affordances; verify in `e2e/roulette.spec.ts`.
- Reduced-motion mode removes animation without changing phase transitions; verify in `e2e/intro.spec.ts` and `e2e/roulette.spec.ts`.
- Keyboard focus on the MATCH RESULTS trigger retains a visible outline; add an E2E assertion in `e2e/roulette.spec.ts`.

---

### Task 1: Capture the current visual and computed-style baseline

**Files:**
- Create: `/private/tmp/wedding-akkey-css-baseline/` screenshots and computed-style JSON (verification artifacts only)
- Test: `e2e/intro.spec.ts`, `e2e/how-to-play.spec.ts`, `e2e/roulette.spec.ts`

**Interfaces:**
- Consumes: existing routes `/`, `/roulette`, and `/roulette/play`.
- Produces: baseline artifacts for comparison after Tasks 2–4.

- [ ] **Step 1: Run the existing E2E suite before changing styles**

Run: `node node_modules/@playwright/test/cli.js test`

Expected: all existing tests pass.

- [ ] **Step 2: Capture same-runtime screenshots and computed values**

Capture intro, rules, ready, spinning, winner, complete, and history dialog at desktop; capture rules and roulette at 620px and 621px; record focus outline and reduced-motion values.

- [ ] **Step 3: Confirm baseline artifacts are readable and record any unavailable state**

Expected: every route/state used by current E2E is represented, or the unavailable state is documented before refactoring.

### Task 2: Establish stylesheet boundaries and remove unreachable legacy UI

**Files:**
- Modify: `src/app/layout.tsx:1-3`
- Modify: `src/app/globals.css:1-1138`
- Create: `src/features/intro/components/intro-screen.css`
- Create: `src/features/roulette/components/roulette-screen.css`
- Create: `src/features/roulette/components/how-to-play-screen.css`
- Create: `src/features/roulette/components/history-dialog.css`
- Delete: `src/features/roulette/components/StartButton.tsx`
- Delete: `src/features/roulette/components/StopButton.tsx`
- Delete: `src/features/roulette/components/WinnerOverlay.tsx`
- Delete: `src/features/roulette/components/WinnerOverlay.test.tsx`
- Test: `e2e/roulette.spec.ts`, `e2e/how-to-play.spec.ts`

**Interfaces:**
- Consumes: class names rendered by `IntroScreen`, `RouletteScreen`, `HowToPlayScreen`, and `HistoryDialog`.
- Produces: root-layout stylesheet imports in this order: foundation, intro, roulette, how-to-play, history-dialog.

- [ ] **Step 1: Add coverage for the retained MATCH RESULTS focus indicator**

In `e2e/roulette.spec.ts`, tab or focus `.arcade-live__results-trigger` and assert its computed outline remains visible with the current green color and 4px width.

- [ ] **Step 2: Run the focused E2E test to establish the expected baseline**

Run: `node node_modules/@playwright/test/cli.js test e2e/roulette.spec.ts`

Expected: PASS before CSS reorganization.

- [ ] **Step 3: Create screen-owned global CSS files and move selectors without changing effective declarations**

Move `.intro-screen*` and `intro-start-blink` to intro CSS; move all active `.arcade-mock*`, `.arcade-live*`, and `.roulette-stage*` selectors to roulette CSS; move `.how-to-play*` selectors to how-to-play CSS; move `.history-*` selectors to history CSS. Expand compact rules and group normal, state, responsive, and animation sections with purpose comments.

- [ ] **Step 4: Keep only document-wide rules in `globals.css` and import screen sheets from `layout.tsx`**

Retain root/body defaults, universal box sizing, image defaults, button font/focus, and global reduced-motion policy. Import the four new stylesheets after `globals.css` in the fixed order from the Interfaces block.

- [ ] **Step 5: Remove confirmed-unreachable legacy selectors and component files**

Remove Ballpit, legacy shell/card/header, winner-drop keyframes, old overlay/button/control/status selectors, unrendered corner selectors, and the approved unreferenced components/tests. Preserve `.history-button` because it remains part of `HistoryDialog`'s public conditional UI.

- [ ] **Step 6: Run focused route/state tests**

Run: `node node_modules/@playwright/test/cli.js test e2e/intro.spec.ts e2e/how-to-play.spec.ts e2e/roulette.spec.ts`

Expected: PASS with no selector, keyboard, reduced-motion, or route regressions.

### Task 3: Integrate final palette and sizing values into owning live selectors

**Files:**
- Modify: `src/features/roulette/components/roulette-screen.css`
- Modify: `src/features/roulette/components/how-to-play-screen.css`
- Test: `e2e/how-to-play.spec.ts`, `e2e/roulette.spec.ts`

**Interfaces:**
- Consumes: the stylesheets and unchanged DOM from Task 2.
- Produces: no standalone projection-palette override section and no duplicate final size overrides.

- [ ] **Step 1: Identify the final computed values protected by existing palette assertions**

Use the existing E2E `toHaveCSS` assertions as the failing-contract checklist: neutral `#c3c3c3`, black text, orange `#ea5324`, green `#2faa66`, plain PLAY COUNT, white result surfaces, black borders, and no image filter.

- [ ] **Step 2: Fold roulette projection and size overrides into the primary selectors**

Give each active roulette selector its current final declaration once, including keychain display dimensions, result surface/image dimensions, logo height, prize grid width, and the 620px overrides. Replace specificity-driven `!important` only if an equivalent owning selector preserves the computed font size.

- [ ] **Step 3: Fold how-to-play projection overrides into primary selectors**

Integrate the neutral panel palette, black text/borders, orange emphasis, and mobile layout values into their owning how-to-play selectors. Remove the unused subtitle and corner pseudo-element rules only after their selectors are gone from markup.

- [ ] **Step 4: Verify every palette and visual-state assertion**

Run: `node node_modules/@playwright/test/cli.js test e2e/how-to-play.spec.ts e2e/roulette.spec.ts`

Expected: PASS, including current computed CSS assertions and the focus assertion from Task 2.

### Task 4: Compare visuals and complete project verification

**Files:**
- Modify: `docs/superpowers/plans/2026-10-05-css-maintainability-refactor.md` (mark completed plan steps only)
- Create: `/private/tmp/wedding-akkey-css-after/` screenshots and comparison report (verification artifacts only)

**Interfaces:**
- Consumes: Task 1 baseline artifacts and refactored routes from Tasks 2–3.
- Produces: evidence-backed final verification report.

- [ ] **Step 1: Re-capture all Task 1 states under identical conditions**

Use the same viewport, browser, state progression, focus, and motion settings as the baseline.

- [ ] **Step 2: Compare screenshot pixels and computed-style records**

Expected: no visual or protected computed-style differences. Investigate and correct any difference before proceeding.

- [ ] **Step 3: Run complete automated verification**

Run: `npm test && npm run lint && npm run typecheck && npm run build && node node_modules/@playwright/test/cli.js test`

Expected: all commands pass. Preserve known benign media-play stderr only if the command exits successfully.

- [ ] **Step 4: Inspect the final working tree and report scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended refactor files plus pre-existing unrelated changes remain.
