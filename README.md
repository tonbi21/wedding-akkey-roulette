# wedding-akkey-roulette

## Local setup

This project is a local TypeScript/Next.js workspace. Install dependencies with pnpm, then run the test and typecheck commands directly from the repo root.

```bash
pnpm test
pnpm lint
pnpm typecheck
```

## Asset contract

The roulette domain uses local, internal asset paths only. The application expects 50 keychain entries whose `imageSrc` values follow this contract:

- Base path: `/assets/keychains`
- File pattern: `/assets/keychains/keychain-01.svg` through `/assets/keychains/keychain-50.svg`

The keychain IDs are internal identifiers only and are not meant to be displayed in the UI.
