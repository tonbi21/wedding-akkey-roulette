# wedding-akkey-roulette

## Local setup

This is a Next.js PWA for a wedding lucky draw. Use Node.js 20.9 or newer for Next.js 16.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The production checks are:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm e2e
```

`pnpm e2e` starts a local Next.js server and runs Chromium. Set
`WEDDING_ROULETTE_NODE` to the absolute path of a Node 20+ binary when the
default `node` is older.

## PWA and offline operation

The app registers `/sw.js`, precaches the app shell, local icons, all 48
keychain images, and the three audio paths. Static same-origin requests are
cached at runtime as well. No production asset is loaded from an external URL.

For the release rehearsal, open the app online, wait for `ENTER`, close it,
disable Wi-Fi, reopen the installed PWA, and complete all three rounds. The
browser Application panel should show the service worker as activated and the
three audio files as cached.

## Resetting rehearsal data

After STOP in any round, press `RETRY` to discard only that round's result
and immediately spin again. Earlier results remain unchanged; the discarded
design becomes eligible again. `NEXT` accepts the result and advances as before.
The cancelled result is also removed from saved history, including if the page
is reloaded during the retry. A save failure keeps the result and allows retrying.

After the third result, press `NEXT`, then `はじめからやり直す`. Confirm the
dialog to clear the saved winners and return to `ENTER`; all 48 designs become
eligible again. Cancel leaves the results intact. If saved history cannot be
cleared, an error is shown and the results remain available for another attempt.

For a reset before completing all three rounds, open `/?reset=1` and confirm
the same dialog. The query parameter is removed from the address bar afterward.

## Transparent capsule background

`Ballpit` renders 48 transparent 3D capsules, each containing a different final
keychain image. The background adapts the supplied React Bits Ballpit's sphere
collisions and wall bounce, with glass-shell rendering and an image inside each
ball. Gravity is `0`: capsules drift gently in both directions rather than falling,
and retain a small minimum speed so they keep floating without pointer input.
Capsules and their artwork are enlarged to `1.5` times the initial size, including
the static fallback. These values are in `src/features/roulette/ballpit/settings.ts`.
The simulation has extra depth so all 48 enlarged capsules can pass each other
instead of jamming on narrow portrait screens.
It is independent of the random draw and never removes already-won
designs from the decorative background. Pointer motion and taps nudge capsules without
blocking buttons, touch scrolling or the history dialog.

Three.js loads locally on the client; no remote textures or environment maps are
needed. In-memory textures are resized to 256px wide and device pixel ratio is
capped at 1.5 to reduce GPU memory use. Original PNG files remain unchanged.
Animation pauses for reduced-motion preferences or a hidden tab. If WebGL is
unavailable or loses its context, the 48 static CSS capsules remain as a fallback
and the WebGL resources are disposed immediately on terminal context loss.
The existing roulette, RETRY and full reset controls are unchanged.

See [React Bits attribution and license](docs/react-bits-license.md).

## Asset contract

The roulette domain uses local, internal asset paths only. The application uses 48 keychain entries whose `imageSrc` values follow this contract:

- Base path: `/assets/keychains`
- File pattern: `/assets/keychains/keychain-01.png` through `/assets/keychains/keychain-48.png`
- Source mapping: `アセット 1.png` → `keychain-01.png`, through `アセット 48.png` → `keychain-48.png`.

The keychain IDs are internal identifiers only and are not meant to be displayed in the UI.

The PNGs are the 48 supplied final transparent designs, copied without image
conversion. STOP selects randomly from designs that have not already won.
The final-image release uses a new history storage key (`wedding-akkey-roulette:v2`)
so placeholder rehearsal results are not reused; the old stored data is left intact.
The roulette sound uses the local 90-second drum
roll asset so it can play once without an audible loop seam.

See [docs/acceptance-checklist.md](docs/acceptance-checklist.md) for the final
offline and rehearsal checklist.
