# Wedding Lucky Draw acceptance checklist

## Automated checks

- [x] Unit/component tests pass (`92` tests).
- [x] TypeScript typecheck passes.
- [x] Local lint passes, including no external asset URLs and no `Math.random`.
- [x] Webpack production build passes with Node.js 20+.
- [x] Playwright Chromium production E2E passes (`20/20` tests): three rounds, duplicate START protection, reload restoration, all 48 PNGs, desktop/mobile winner drop, reduced motion, reset/restart, per-round RETRY, transparent capsule background, touch controls, WebGL context-loss fallback, and the entry/cache/offline checks below.
- [x] Playwright entry E2E confirms TAP TO START begins the muted hero video and BGM together; completion enters `/roulette` and exposes `ENTER`.
- [x] Playwright entry E2E confirms the GAME START image is used after a video error, has no animation when reduced motion is requested, and stays in the mobile viewport.
- [x] Playwright entry E2E confirms service-worker cache `wedding-akkey-roulette-v12` contains `/`, `/roulette`, the hero video, both start images, and the intro BGM.
- [x] An online-warmed `/roulette` navigation returns its requested route from the service-worker cache before falling back to `/`; cold first-route offline support is not claimed.

## Capsule background

- [x] All 48 unique designs are assigned to transparent 3D capsules; original files are unchanged.
- [x] Gravity is zero; capsules drift upward/downward and retain gentle motion over time. Capsule/image size is 1.5 times the initial version, including the static fallback.
- [x] Three deterministic two-minute simulations at 320px width confirm that the 48 enlarged capsules keep moving without jamming.
- [x] Desktop and mobile screenshots show the capsule background behind the controls.
- [x] Reduced-motion mode pauses the physics; normal-motion mode resumes it.
- [x] WebGL context loss switches to static capsules without blocking START/STOP/RETRY.
- [x] Terminal context loss releases textures and geometry immediately; pointer taps move capsules even when released before a frame.
- [ ] Rehearse on the actual venue device/projector to assess frame rate and preferred capsule size.

## Online rehearsal

- [x] Load the 48 final transparent PNG designs in source-number order.
- [ ] Replace all three temporary audio files with valid approved MP3 masters.
- [ ] Verify image and audio preload reaches `ENTER` without an error state.
- [ ] Click `ENTER` once and confirm no waiting BGM plays; use the venue sound system during standby.
- [ ] Complete rounds 1, 2, and 3; confirm no winner repeats.
- [ ] Confirm the history dialog shows only winner images and no internal IDs.
- [ ] Confirm the third result plays winner audio and NEXT ends the draw without another START button.

## Offline/PWA rehearsal

- [ ] Install the PWA from the online origin in landscape mode.
- [ ] Confirm `/sw.js` is activated and the entry media, `/roulette`, keychain, and audio assets are cached.
- [ ] Confirm TAP TO START begins the muted video and intro BGM together, with no visible GAME START control until the video finishes; force a video error and confirm the GAME START image appears.
- [ ] Enable reduced motion and confirm the GAME START image does not blink; confirm both entry states remain visible at mobile width.
- [ ] Enter `/roulette` online and wait for `ENTER` before closing the PWA to warm its Next.js route assets; cold first-route offline support is not required.
- [ ] Close the warmed PWA, disable Wi-Fi or enable airplane mode, and reopen it.
- [ ] Complete all three rounds offline and confirm no further START button is shown.
- [ ] Reopen offline and confirm the completed history remains available.

## Rehearsal reset

- [x] RETRY in each round discards only that result and respins, preserving prior winners and the current round.
- [x] Repeated/double RETRY and reload during a retry do not restore cancelled results or remove earlier winners.
- [x] After the third result and `NEXT`, confirm `はじめからやり直す` clears history and returns to `ENTER`.
- [x] Cancelling reset preserves the completed results; new results persist after a confirmed reset.
- [x] A storage deletion error preserves results and allows retry (component test).
- [ ] Open `/roulette?reset=1` and confirm the reset dialog.
- [ ] Confirm the query is removed and the app returns to `ENTER` after loading.
