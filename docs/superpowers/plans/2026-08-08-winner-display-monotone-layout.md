# 当選表示・モノトーンレイアウト Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop後に当選画像と現行Winner演出を表示し、モノトーンの中央配置レイアウトと履歴モーダルを実現する。

**Architecture:** STOP時にReducerが当選IDを`currentKeychainId`と`winnerIds`へ保存し、winner状態を描画する。WinnerOverlayは既存実装を再利用し、履歴だけを固定オーバーレイの中央モーダルへ変更する。配色とレイアウトは`globals.css`に集約する。

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Next.js 16

## Global Constraints

- WinnerOverlayの現行confetti/flash/shake/sparkle演出は変更しない。
- Winner演出は1〜3ラウンドの各winner状態で1回ずつ表示する。
- アクキー画像とボタンは縦方向中央に配置する。
- サイト配色は黒・白・グレーのモノトーンに限定する。
- ユーザーが差し替えた`public/audio/*.mp3`は変更・ステージしない。

---

### Task 1: Restore winner image and three-round winner state

**Files:**
- Modify: `src/features/roulette/state/gameReducer.ts`
- Modify: `src/features/roulette/state/gameReducer.test.ts`
- Modify: `src/features/roulette/components/RouletteScreen.tsx`
- Modify: `src/features/roulette/components/RouletteScreen.test.tsx`

**Interfaces:**
- STOP returns `phase: "winner"`, `currentKeychainId: action.winnerId`, `pendingWinnerId: null`, and appends the winner once.
- winner rendering includes the selected `RouletteImage` and existing `WinnerOverlay`.

- [ ] **Step 1: Write the failing tests**

Update the reducer STOP assertion:

```ts
expect(nextState.currentKeychainId).toBe("keychain-02");
expect(nextState.winnerIds).toEqual(["keychain-02"]);
```

Update the screen test:

```ts
expect(screen.getByRole("img", { name: "Current roulette image" })).toBeInTheDocument();
expect(screen.getByTestId("winner-overlay")).toBeInTheDocument();
```

Add a three-round flow test that clicks STOP, NEXT, STOP, NEXT, STOP and expects the WinnerOverlay after each STOP.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/state/gameReducer.test.ts src/features/roulette/components/RouletteScreen.test.tsx`

Expected: FAIL because STOP currently clears the current image and winner rendering is disabled.

- [ ] **Step 3: Write the minimal implementation**

Set `currentKeychainId` to `action.winnerId` in STOP and render `RouletteImage` and `WinnerOverlay` while phase is winner. Keep existing WinnerOverlay source unchanged.

- [ ] **Step 4: Run focused tests**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/state/gameReducer.test.ts src/features/roulette/components/RouletteScreen.test.tsx`

Expected: PASS.

### Task 2: Convert history to a centered modal

**Files:**
- Modify: `src/features/roulette/components/HistoryDialog.tsx`
- Modify: `src/features/roulette/components/RouletteScreen.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- HistoryDialog keeps `open`, `onOpen`, `onClose`, and `winners` props.
- Open history renders a backdrop and centered `role="dialog"` with `aria-modal="true"`.

- [ ] **Step 1: Write the failing modal test**

Extend the history test:

```ts
const dialog = screen.getByRole("dialog");
expect(dialog).toHaveAttribute("aria-modal", "true");
expect(dialog).toHaveClass("history-dialog");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/components/RouletteScreen.test.tsx`

Expected: FAIL because the current section is not marked modal and is laid out inside the card.

- [ ] **Step 3: Write the minimal implementation**

Wrap the dialog in a fixed backdrop, close on backdrop click and Escape, stop propagation inside the dialog, and add `aria-modal="true"`. Keep winner images and existing history copy.

- [ ] **Step 4: Run the focused test**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/components/RouletteScreen.test.tsx`

Expected: PASS.

### Task 3: Apply the monotone centered layout

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- `.roulette-shell`, `.roulette-card`, `.roulette-stage`, and `.roulette-controls` produce a single centered vertical flow at all viewport sizes.
- Buttons and winner overlay use only grayscale colors while preserving WinnerOverlay animation rules.

- [ ] **Step 1: Write the failing style assertions**

Add a screen-level assertion that the stage and controls use their existing semantic classes; use the CSS diff as the visual contract because the test environment does not compute responsive layout reliably.

- [ ] **Step 2: Run the focused test to establish the baseline**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/components/RouletteScreen.test.tsx`

Expected: PASS before CSS changes; the visual contract is then verified by diff inspection and production build.

- [ ] **Step 3: Write the minimal CSS implementation**

Replace purple/yellow/red values with grayscale values, remove the landscape two-column media layout, set the card to a single column, keep the stage centered, and make controls a centered vertical stack below it. Add fixed centered modal backdrop styles.

- [ ] **Step 4: Run static checks**

Run: `node scripts/lint.mjs` and `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`.

Expected: both exit successfully.

### Task 4: Full verification and commit

**Files:**
- Verify: all modified files above

- [ ] **Step 1: Run the full test suite**

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass.

- [ ] **Step 2: Build production output**

Run: `node node_modules/next/dist/bin/next build --webpack`.

Expected: build exits successfully.

- [ ] **Step 3: Inspect and commit**

Run: `git diff --check`; stage only source/tests/docs changes and commit without staging the four user MP3 files.
