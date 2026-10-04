# CSS Maintainability Refactor Design

## Goal

Refactor the application CSS so that ownership and effective values are easy to
find without changing the rendered UI or behaviour of the intro, rules, live
roulette, result, retry, completion, or winner-history flows.

## Confirmed scope

- Keep `src/app/globals.css` for document-wide defaults only: root defaults,
  box sizing, document/body sizing and background, image defaults, button font,
  focus-visible styling, and reduced-motion policy.
- Move screen-specific global selectors into four co-located global stylesheets.
  They retain their existing class names so the DOM, accessibility selectors,
  and E2E selectors remain stable.
  - `src/features/intro/components/intro-screen.css`
  - `src/features/roulette/components/roulette-screen.css`
  - `src/features/roulette/components/how-to-play-screen.css`
  - `src/features/roulette/components/history-dialog.css`
- Import these stylesheets from `src/app/layout.tsx` in a deterministic order.
  Current Next.js guidance permits global CSS in layouts; root-layout imports
  ensure styles stay available across client navigation.
- Remove confirmed-unreachable legacy UI code and its tests:
  `StartButton`, `StopButton`, and `WinnerOverlay`.

## CSS ownership and cascade plan

### Global foundation

`globals.css` will contain only declarations that genuinely apply to all
routes. The current `button:focus-visible` and the reduced-motion safeguard
remain globally available, preserving keyboard focus and animation behaviour.

### Intro screen

The intro selectors (`.intro-screen*`) and the `intro-start-blink` keyframes
move together. Their video fallback, title positioning, start/tap controls,
focus indicator, and local reduced-motion rule remain unchanged.

### Live roulette

`roulette-screen.css` owns both `.arcade-mock*` and `.arcade-live*` because
the active live screen renders both class families on the same elements. The
base arcade panel will be retained and documented as a required structural
base, not treated as an obsolete mock.

The current effective declarations from the late projection-palette block will
be folded into the affected live selectors. This includes the neutral palette,
orange emphasis, plain PLAY COUNT text, white keychain/result surfaces, sizes,
and mobile dimensions. Earlier superseded declarations will be removed rather
than overridden at the end of the file.

### Rules and prize screen

`how-to-play-screen.css` owns `.how-to-play*`, including panel screws,
responsive layout, rule list, prize placeholders, and palette. The disabled
corner pseudo-element implementation will be removed because no corner element
is rendered.

### History dialog

`history-dialog.css` owns `.history-dialog*` and `.history-button`. The latter
is retained because `HistoryDialog` conditionally renders it when
`hideTrigger` is false, even though the active roulette route currently passes
`hideTrigger`.

## Verified deletion candidates

The following have no reachable route/component use after the explicitly
approved removal of their owning components:

- Ballpit selectors and capsule rendering selectors.
- Legacy standalone roulette shell/card/header selectors.
- Winner-drop animation selector and `winner-keychain-drop` keyframes.
- Legacy overlay, roulette-status, old controls/button/result-action selectors.
- Legacy corner selectors for arcade and how-to-play panels; current component
  markup renders no corresponding elements and E2E asserts their absence.
- `StartButton.tsx`, `StopButton.tsx`, `WinnerOverlay.tsx`, and
  `WinnerOverlay.test.tsx`.

`history-button` is deliberately not in the deletion list because its component
can render it through its public props.

## Behaviour-preservation rules

- Preserve selector names used by rendered components and tests.
- Preserve source-order effects by integrating each final computed declaration
  into its owning rule before removing old overrides.
- Preserve the existing `620px` media-query thresholds and all values on both
  sides of the threshold.
- Do not introduce `!important`, change specificity unnecessarily, alter
  layout markup, or add dependencies.
- Do not modify unrelated in-progress files, including `.pnpm-store/`.

## Verification

1. Capture pre-refactor screenshots for intro, rules, ready, spinning, winner,
   completion, and history dialog at desktop; also inspect 620px/621px.
2. Re-capture the same states after refactoring and compare pixels under the
   same browser/runtime conditions.
3. Exercise focus-visible and `prefers-reduced-motion` behaviour.
4. Run the existing E2E suite, unit tests, lint, typecheck, and production
   build.

Any state that cannot be captured or compared will be called out explicitly in
the completion report.
