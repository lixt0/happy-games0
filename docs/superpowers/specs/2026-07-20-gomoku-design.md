# 五子棋人机游戏 — Design Spec

**Date**: 2026-07-20
**Status**: Draft
**Project**: happygames

## 1. Goal

A personal playground for browser games, deployed on Cloudflare. v1 ships a single game: a 15×15 free-style Gomoku with on-device AI opponent. The codebase is structured so future games can be added by copying a folder and registering a card on the landing page.

## 2. Scope

**In scope (v1)**
- Static landing page with one game card (Gomoku)
- Gomoku game page: 15×15 board, free-style rules
- Client-side AI (alpha-beta + evaluation) in a Web Worker
- Three difficulty levels
- New-game (reset) button
- Piece drop animation, last-move marker, responsive layout
- Cloudflare Pages deployment with Functions folder reserved for future backend
- Local dev workflow via Wrangler
- Unit tests for the AI module

**Out of scope (v1)**
- Undo / hint / sound effects
- Player color choice (player is always Black, goes first)
- Renju forbidden-move rules
- Game history / persistence (refresh = new game)
- Multiplayer / online play
- User accounts / scoreboards
- Mobile app, native install
- Automated browser/E2E tests (manual checklist only)

## 3. Architecture

```
happygames/
├── index.html              # Landing page (game cards)
├── gomoku/
│   ├── index.html          # Game page (board + controls)
│   ├── gomoku.css          # Chinese-traditional board styling
│   ├── gomoku.js           # UI controller (DOM events, animation)
│   └── ai.js               # Alpha-beta engine + evaluator
├── shared/
│   └── theme.css           # Common variables (colors, fonts, spacing)
├── functions/              # Cloudflare Pages Functions (future backend)
│   └── _placeholder.js     # Empty stub showing where endpoints go
├── ai.test.js              # Node test runner tests for ai.js
├── package.json            # wrangler dev/deploy scripts (no runtime deps)
├── wrangler.toml           # Cloudflare config
└── README.md               # Local dev + deploy instructions
```

### Module boundaries

- **`ai.js`** — pure functions. Knows nothing about DOM or Workers. Exports:
  - `bestMove(board, aiColor, difficulty) -> { x, y, score }`
  - `evaluate(board, color) -> number`
  - `isFive(board, x, y, color) -> boolean`
- **`gomoku.js`** — board state, move validation, win detection, UI bindings. Imports `ai.js`. Spawns a Web Worker for AI searches.
- **`ai.worker.js`** — Web Worker entry. Receives `{ board, color, depth }`, runs `bestMove`, posts back `{ x, y, score }`.
- **`theme.css`** — CSS custom properties (colors, fonts, spacing) shared across all game pages.

Each game lives in its own folder with the same shape. Adding a new game = copy folder + add a card entry to the landing-page `games` array.

## 4. UI Design

### Landing page (`/`)

- Header: "快乐小游戏" in calligraphic font.
- Centered card grid (CSS Grid, auto-fit). One card per game.
- Card contents: small SVG preview + game name + "开始" button.
- Cards are data-driven from a `games` array declared in a small JS module; adding a game = one new entry.
- Footer: simple text link (repo / about — optional).

### Game page (`/gomoku/`)

- Top bar: "五子棋" calligraphic title on the left; difficulty selector (简单 / 中等 / 困难) on the right.
- Center: 15×15 wood-toned board on a `<canvas>` element (chosen for crisp scaling and easy hit-testing). Wood background and grid lines are drawn on the canvas; stones are drawn as filled circles with a subtle radial gradient.
- Right of board on desktop / below board on mobile: status bar + 重开 button.
- Status messages:
  - "轮到你了" (your turn)
  - "电脑思考中..." (AI thinking)
  - "你赢了" / "电脑赢了" (win, in red)
  - "平局" (draw — board full)

### Visual style

- Wood-tone board background (CSS gradient or image).
- Black and white stones with subtle radial gradient for depth.
- Red last-move marker (4px circle) on the most recent stone.
- Title in a calligraphic web font (Ma Shan Zheng from Google Fonts or fallback to serif).
- Win message in red (`#c0392b`).

### Piece drop animation

- Each newly placed stone: starts at `scale(0.3)` + `opacity: 0`, animates to `scale(1)` + `opacity: 1` over 180ms `ease-out`.
- Existing stones do not animate.
- AI moves animate the same way as player moves (board redraws the just-placed stone only).

### Last-move marker

- A small red circle at the center of the most recent stone.
- Cleared on 重开 or on page load.

### Difficulty switcher behavior

- Switching difficulty mid-game prompts: "重置当前对局？" — only if a game is in progress.
- Accept → reset and apply new difficulty.
- Decline → revert the selector to the previous difficulty, no state change.

### Responsive

- Board canvas: `min(90vw, 600px)`.
- Controls stack vertically below 480px width.
- Difficulty buttons stay horizontal; wrap if needed.

## 5. AI Module

### Algorithm: minimax + alpha-beta pruning

```
function bestMove(board, color, depth):
    return argmax over candidates of minValue(board', depth-1, α, β, opponent)

function maxValue(board, depth, α, β, color):
    if depth == 0 or terminal(board): return evaluate(board, color)
    for each candidate move (ordered):
        apply move
        v = minValue(board', depth-1, α, β, opponent)
        undo move
        if v > α: α = v, best = move
        if α >= β: break  // beta cutoff
    return best
```

`minValue` is symmetric (max/min swap, color swap).

### Move ordering

1. If a winning move exists, return it immediately (no deeper search).
2. For each empty cell within `candidateRadius` squares of any existing stone:
   - Compute a single-move contribution score: `evaluateSingleMove(board, x, y, color) - evaluateSingleMove(board, x, y, opponent)`.
   - Sort candidates by this score descending.
3. Iterate in sorted order.
4. For an empty board, AI plays the center (7, 7) immediately.

### Evaluation function

For each of 4 directions (horizontal, vertical, diag-down-right, diag-up-right), for each stone, count consecutive same-color runs and classify:

| Pattern | Score |
|---|---|
| 连5 (5-in-a-row) | ±100000 |
| 活4 (open-4, both ends open) | ±10000 |
| 冲4 (closed-4, one end blocked) | ±1000 |
| 活3 (open-3) | ±1000 |
| 眠3 (closed-3) | ±100 |
| 活2 (open-2) | ±100 |
| 眠2 (closed-2) | ±10 |
| 活1 | ±1 |

`evaluate(board, color)` returns `myScore - opponentScore * defenseWeight`.

### Difficulty mapping

| 难度 | depth | candidateRadius | defenseWeight |
|---|---|---|---|
| 简单 | 2 | 1 | 0.6 |
| 中等 | 4 | 2 | 1.0 |
| 困难 | 6 | 2 | 1.2 |

### Web Worker

- AI runs in a dedicated Web Worker (`ai.worker.js`).
- Main thread posts `{ board, color, difficulty }` and awaits `postMessage` reply.
- UI never blocks while AI is searching.

## 6. Deployment

### `wrangler.toml`

```toml
name = "happygames"
compatibility_date = "2025-01-01"
pages_build_output_dir = "."
```

### `package.json`

```json
{
  "scripts": {
    "dev": "wrangler pages dev .",
    "deploy": "wrangler pages deploy .",
    "test": "node --test ai.test.js"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
```

No runtime dependencies.

### Routing

- Cloudflare Pages serves static HTML directly. No SSR.
- `/` → `index.html` (landing)
- `/gomoku/` → `gomoku/index.html`
- `functions/` is auto-routed by Pages; currently empty.

### Local dev

- `npm install` → install Wrangler (only dev dep).
- `npm run dev` → `wrangler pages dev .` opens local server with Functions support.
- No build step. Direct file:// open works for quick iteration but `wrangler pages dev` is canonical (matches prod).

### Deploy

- `npm run deploy` → uploads to Cloudflare Pages.
- First run creates the `happygames` Pages project; subsequent runs are one-shot publishes.
- Free tier; static site usage is well within limits.

## 7. Error Handling

| Scenario | Handling |
|---|---|
| User clicks occupied cell | Ignored silently |
| User clicks during AI thinking | Board has `pointer-events: none` while worker is searching |
| User clicks outside board bounds | Click ignored (canvas hit-test returns null) |
| Worker fails or times out | Status bar: "AI 出错了，请重开" + 重开 button enabled |
| AI search exceeds 3 seconds | Worker returns best-so-far; status stays "思考中..." until return |
| `wrangler` not installed | README documents `npm install` first |

No try/catch around win detection (pure synchronous, deterministic).

## 8. Testing

### Unit tests (Node built-in test runner, `node --test ai.test.js`)

- `isFive`: detects 5 in a row across all 4 directions
- `evaluate`: open-4 > closed-4 > open-3 > closed-3 > ... (pattern ordering)
- `evaluate`: blocking an opponent's open-4 yields a higher score than not blocking
- `bestMove`: takes immediate winning move when available
- `bestMove`: empty board plays center (7, 7)
- `bestMove`: blocks opponent's immediate threat (open-3 about to become open-4)
- Difficulty: at a fixed board state, "hard" depth-6 produces a move that scores at least as well against the same opponent's next move as "easy" depth-2 (measured by `evaluate(board, aiColor)` after both play one ply). This is checked on at least 3 representative mid-game positions.
- Head-to-head: across 20 games starting from random opening moves, "hard" wins ≥ "easy" wins in the AI-vs-AI matchup.

### Manual checklist (run once before each deploy)

1. Landing page loads at `/`; one card visible (Gomoku).
2. Click card → navigates to `/gomoku/`; board renders.
3. Player (Black) drops a stone; AI (White) responds within 3 seconds.
4. Win detection: arrange 5-in-a-row; "你赢了" message displays.
5. Reset: click 重开 → board clears, status resets to "轮到你了".
6. Difficulty switcher: change mid-game → confirm dialog appears.
7. Responsive: shrink browser to 360px width; board fits, controls usable.
8. Animation: each stone fades in; no jank on rapid clicks (clicks during animation are blocked by `pointer-events: none`).

## 9. Extensibility Notes

- Adding a new game: create a sibling folder `newgame/` containing `index.html`, `newgame.css`, `newgame.js` (UI/state), and `ai.js` (engine — same shape as Gomoku's). Then add one entry to the `games` array on the landing page. No changes to shared code required.
- Backend endpoints: drop a file under `functions/api/...` (Pages auto-routes). No changes to game code needed.
- The shared `theme.css` is the only piece of cross-game code beyond the landing page; new games import it.

## 10. Open Questions

None at design-approval time.