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

The app registers `/sw.js`, precaches the app shell, local icons, all 50
keychain images, and the three audio paths. Static same-origin requests are
cached at runtime as well. No production asset is loaded from an external URL.

For the release rehearsal, open the app online, wait for `ENTER`, close it,
disable Wi-Fi, reopen the installed PWA, and complete all three rounds. The
browser Application panel should show the service worker as activated and the
three audio files as cached.

## Resetting rehearsal data

Reset is intentionally hidden from the normal UI. Open `/?reset=1` and confirm
the dialog to clear the persisted winners and return to the initial state. The
query parameter is removed from the address bar afterward.

## Asset contract

The roulette domain uses local, internal asset paths only. The application expects 50 keychain entries whose `imageSrc` values follow this contract:

- Base path: `/assets/keychains`
- File pattern: `/assets/keychains/keychain-01.svg` through `/assets/keychains/keychain-50.svg`

The keychain IDs are internal identifiers only and are not meant to be displayed in the UI.

The checked-in SVGs are local development placeholders. Before the wedding
release, replace them with the approved 50 optimized transparent images while
preserving the paths above. The roulette sound uses the local 90-second drum
roll asset so it can play once without an audible loop seam.

See [docs/acceptance-checklist.md](docs/acceptance-checklist.md) for the final
offline and rehearsal checklist.
