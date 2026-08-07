# Wedding Lucky Draw acceptance checklist

## Automated checks

- [x] Unit/component tests pass (`42` tests at the current baseline).
- [x] TypeScript typecheck passes.
- [x] Local lint passes, including no external asset URLs and no `Math.random`.
- [x] Webpack production build passes with Node.js 20+.
- [x] Playwright Chromium E2E passes: three rounds, duplicate START protection, and reload restoration.

## Online rehearsal

- [ ] Replace all 50 placeholder SVGs with the approved optimized transparent images.
- [ ] Replace all four temporary audio files with valid approved MP3 masters.
- [ ] Verify image and audio preload reaches `ENTER` without an error state.
- [ ] Click `ENTER` once and confirm waiting audio starts.
- [ ] Complete rounds 1, 2, and 3; confirm no winner repeats.
- [ ] Confirm the history dialog shows only winner images and no internal IDs.
- [ ] Confirm the final screen says `抽選終了` and winner audio plays.

## Offline/PWA rehearsal

- [ ] Install the PWA from the online origin in landscape mode.
- [ ] Confirm `/sw.js` is activated and the keychain/audio assets are cached.
- [ ] Close the PWA, disable Wi-Fi or enable airplane mode, and reopen it.
- [ ] Complete all three rounds offline and reach `COMPLETE`.
- [ ] Reopen offline and confirm the completed history remains available.

## Rehearsal reset

- [ ] Open `/?reset=1` and confirm the reset dialog.
- [ ] Confirm the query is removed and the app returns to `ENTER` after loading.
