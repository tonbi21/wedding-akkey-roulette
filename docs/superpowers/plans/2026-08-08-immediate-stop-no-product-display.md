# 即時停止・商品非表示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop押下でルーレットを即時停止し、商品・当選演出を表示せずNEXTへ進める。

**Architecture:** STOPアクションが当選IDを保存しつつ直接winner状態へ遷移する。spinning用Intervalは状態変更時のcleanupで解除され、減速専用タイマーと減速音は削除する。winner状態では商品画像とWinnerOverlayを描画せず、既存のNEXT操作だけを残す。

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Next.js 16

## Global Constraints

- Stop後の商品画像・当選演出は表示しない。
- Stop後はNEXTボタンで次ラウンドへ進める。
- winnerIdsは重複防止のため内部保存する。
- ユーザーが差し替えた`public/audio/*.mp3`は変更・ステージしない。

---

### Task 1: Simplify the state transition

**Files:**
- Modify: `src/features/roulette/state/gameReducer.ts`
- Modify: `src/features/roulette/state/gameReducer.test.ts`
- Modify: `src/features/roulette/gameTypes.ts`

**Interfaces:**
- `gameReducer(state, { type: "STOP", winnerId })` returns `phase: "winner"`, clears `pendingWinnerId`, and appends `winnerId` once.

- [ ] **Step 1: Write the failing test**

Update the STOP test to expect direct `winner` state and one stored winner:

```ts
const nextState = gameReducer(createState({ phase: "spinning", assetsReady: true }), {
  type: "STOP",
  winnerId: "keychain-02"
});

expect(nextState.phase).toBe("winner");
expect(nextState.pendingWinnerId).toBeNull();
expect(nextState.winnerIds).toEqual(["keychain-02"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/state/gameReducer.test.ts`

Expected: FAIL because STOP currently enters `decelerating` and does not append the winner.

- [ ] **Step 3: Write minimal implementation**

Change STOP to return `phase: "winner"`, `currentKeychainId: null`, `pendingWinnerId: null`, and append `action.winnerId` if it is not already present. Remove unreachable decelerating/reveal transitions and their phase/action types.

- [ ] **Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/state/gameReducer.test.ts`

Expected: PASS.

### Task 2: Remove deceleration animation and stop audio immediately

**Files:**
- Modify: `src/features/roulette/hooks/useRouletteAnimation.ts`
- Modify: `src/features/roulette/lib/timing.ts`
- Modify: `src/features/roulette/lib/timing.test.ts`
- Modify: `src/features/roulette/components/RouletteScreen.tsx`
- Modify: `src/features/roulette/components/RouletteScreen.test.tsx`

**Interfaces:**
- `useRouletteAnimation` retains only the spinning Interval and its cleanup.
- `handleStop` calls `activeAudioController.stopAll()` and does not call `startDeceleration()`.

- [ ] **Step 1: Write the failing screen test**

Render a spinning screen with a mock audio controller, click STOP, and assert the screen enters winner state, NEXT is visible, and `stopAll` is called while `startDeceleration` is not called.

```ts
const audioController = {
  unlock: vi.fn(async () => undefined),
  startWaiting: vi.fn(async () => undefined),
  stopWaiting: vi.fn(async () => undefined),
  startRoulette: vi.fn(async () => undefined),
  startDeceleration: vi.fn(async () => undefined),
  playWinner: vi.fn(async () => undefined),
  stopAll: vi.fn()
};

render(<RouletteScreen initialState={state({ phase: "spinning" })} audioController={audioController} />);
fireEvent.click(screen.getByRole("button", { name: "STOP" }));

expect(screen.getByRole("button", { name: "NEXT" })).toBeInTheDocument();
expect(audioController.stopAll).toHaveBeenCalled();
expect(audioController.startDeceleration).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/components/RouletteScreen.test.tsx`

Expected: FAIL because STOP currently starts deceleration and the reducer leaves the screen outside winner.

- [ ] **Step 3: Write minimal implementation**

Remove the deceleration effect and `DECELERATION_STEPS_MS` usage. In `handleStop`, dispatch STOP and call `stopAll`. Render `RouletteImage` and `WinnerOverlay` only when appropriate so winner state contains no product or winner overlay.

- [ ] **Step 4: Run focused tests**

Run: `node node_modules/vitest/vitest.mjs run src/features/roulette/components/RouletteScreen.test.tsx src/features/roulette/lib/timing.test.ts`

Expected: PASS.

### Task 3: Full verification and commit

**Files:**
- Verify: all modified files above

- [ ] **Step 1: Run the full test suite**

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass.

- [ ] **Step 2: Run static checks**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` and `node scripts/lint.mjs`.

Expected: both exit successfully.

- [ ] **Step 3: Inspect the diff and commit code**

Run: `git diff --check` and commit only source/tests/docs related to this feature; leave the four user audio files unstaged.
