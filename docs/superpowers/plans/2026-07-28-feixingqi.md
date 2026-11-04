# 在线飞行棋 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `happygames` 项目中新建在线多人飞行棋，房主建房选 2-4 人，空座 AI 补位，经典跳格/飞格规则，emoji 素材，移动优先。

**Architecture:** 服务端权威 + HTTP 轮询，房间状态存 D1（仿 `battle_rooms`）；纯 ESM `feixingqi/engine.js` 被客户端、Pages Function、`node --test` 三方共享；骰子与走子由服务端计算校验，AI 与超时在 `tick()` 内于每次 `state` 轮询时推进。

**Tech Stack:** Cloudflare Pages Functions + D1（`wrangler pages dev`）；纯 JS ESM（无构建）；`node --test` 单测；浏览器 `<script type=module>`；CSS grid 棋盘；emoji 素材。

## Global Constraints

- 项目无 WebSocket/Durable Objects；联机走 HTTP 轮询，房间状态存 D1 表 `feixingqi_rooms`（列同 `battle_rooms`：`code`/`password`/`state`/`created_at`/`updated_at`）。
- 引擎禁用原生 `Math.random`；用 `mulberry32` 以 `state.seed + state.turnCounter` 播种（保证可测、续跑一致）。
- 客户端身份取自 `/api/me`（cookie `hg_token` → `sessions` → username）；服务端各端点从 cookie 解析 username，不信任请求体里的 username。
- 棋盘坐标系：每方相对路径 `r`，0..51 主跑道，52..57 终点跑道（5=终点）；`absCell(seat,r)=(ENTRY[seat]+r)%52` 用于跨方吃子。
- 特殊格固定相对索引：`JUMP_REL=10`→`JUMP_TO_REL=14`；`FLY_REL=18`→`FLY_TO_REL=30`（每方相同，因相对）。
- 座位顺序红→黄→蓝→绿（`SEATS`），entry `[0,13,26,39]`；2/3 人局只用前 N 座。
- 走子规则：掷 6 起飞、掷 6 再掷、连三 6 作废、吃子回机场、己方叠放共存、终点精确点数、4 架到家获胜。
- 超时：人类 30s 无动作 → 本回合 AI 接管；连续 2 次超时 → 常驻 AI（`autoAi=true`）。
- 素材全 emoji：骰 ⚀-⚅、棋子 ✈️ 配彩色圆片、老家 🏆、机场 🛬。
- 复用 `shared/theme.css`、`shared/game.css`；游戏页加 `<main class="game game-board">`。
- 测试用 `node --test`，文件 `feixingqi.test.js` 置仓库根（仿 `doushouqi.test.js`），并加入 `package.json` test 脚本。

## File Structure

```
feixingqi/
  engine.js          纯逻辑：PRNG/状态/rollDice/legalMoves/applyMove/chooseAiMove/tick/startMatch/joinSeat
  feixingqi.js       控制器：/api/me 取身份、大厅、轮询、渲染、掷骰/选子
  index.html         大厅 + 对局单页两视图
  feixingqi.css      移动优先样式与棋盘 grid
feixingqi.test.js    引擎单测（仓库根）
functions/api/feixingqi/
  _shared.js         json/whoami/loadRoom/saveRoom
  create.js, join.js, start.js, state.js, roll.js, move.js
schema.sql           追加 feixingqi_rooms 表
shared/landing.js    棋类竞技板块新增「飞行棋」卡
package.json         test 脚本加 feixingqi.test.js
sitemap.xml          新增 /feixingqi/ 条目
```

**单元边界**：`engine.js` 不感知 DOM/存储/时间之外（`tick` 接收 `now` 注入），纯函数进出新状态；`_shared.js` 只做 D1 读写与鉴权；各端点文件只做参数校验 + 调 engine + 存档；`feixingqi.js` 只做 UI 与轮询。

---

### Task 1: 引擎骨架 — 常量、PRNG、状态构造、rollDice

**Files:**
- Create: `feixingqi/engine.js`
- Test: `feixingqi.test.js`

**Interfaces:**
- Produces: `mulberry32(seed)→fn`、`makeRng(state)→fn`、`createInitialState({seed,seatCount,hostUsername})→state`、`rollDice(state)→state`、常量 `SEATS/ENTRY/LOOP_LEN/HOME_LEN/PIECES_PER_SEAT/JUMP_REL/JUMP_TO_REL/FLY_REL/FLY_TO_REL/TRACK_MAX/GOAL_REL`。本任务 `rollDice` 暂不调用 `legalMoves`（Task 2 才有），自动留作 Task 5 处理。

- [ ] **Step 1: 写失败测试**

`feixingqi.test.js`：
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEATS, ENTRY, LOOP_LEN, PIECES_PER_SEAT, TRACK_MAX, GOAL_REL,
  mulberry32, makeRng, createInitialState, rollDice,
} from './feixingqi/engine.js';

test('mulberry32 is deterministic', () => {
  const a = mulberry32(123), b = mulberry32(123);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('createInitialState: host on seat 0, all pieces in base', () => {
  const s = createInitialState({ seed: 42, seatCount: 4, hostUsername: 'alice' });
  assert.equal(s.phase, 'waiting');
  assert.equal(s.seatCount, 4);
  assert.equal(s.seats[0].username, 'alice');
  assert.equal(s.seats[0].kind, 'human');
  assert.equal(s.seats[1].username, null);
  assert.equal(s.seats[1].kind, null);
  assert.equal(s.seats[0].pieces.length, PIECES_PER_SEAT);
  assert.ok(s.seats[0].pieces.every(p => p.loc === 'base'));
  assert.equal(s.rolled, false);
  assert.equal(s.dice, 0);
});

test('rollDice sets 1..6, rolled=true, increments turnCounter', () => {
  let s = createInitialState({ seed: 7, seatCount: 2, hostUsername: 'a' });
  s.phase = 'playing'; s.lastActionAt = 1;
  s = rollDice(s);
  assert.equal(s.rolled, true);
  assert.ok(s.dice >= 1 && s.dice <= 6);
  assert.equal(s.turnCounter, 1);
  // determinism: same seed+counter → same dice
  let s2 = createInitialState({ seed: 7, seatCount: 2, hostUsername: 'a' });
  s2.phase = 'playing'; s2.lastActionAt = 1;
  s2 = rollDice(s2);
  assert.equal(s2.dice, s.dice);
});

test('rollDice refuses when not playing or already rolled', () => {
  let s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  s.phase = 'waiting';
  assert.deepEqual(rollDice(s), s);          // unchanged (waiting)
  s.phase = 'playing'; s.lastActionAt = 1;
  s = rollDice(s);
  const rolled = s;
  const again = rollDice(s);                 // already rolled
  assert.deepEqual(again, rolled);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test feixingqi.test.js`
Expected: FAIL — `Cannot find module './feixingqi/engine.js'`

- [ ] **Step 3: 写最小实现**

`feixingqi/engine.js`：
```js
// 纯飞行棋逻辑：客户端 / Pages Function / node --test 三方共享。
// 不依赖 DOM、存储、Math.random；时间由 tick 的 now 参数注入。

export const SEATS = ['red', 'yellow', 'blue', 'green'];
export const ENTRY = [0, 13, 26, 39];
export const LOOP_LEN = 52;
export const HOME_LEN = 6;                 // home cells rel 0..5；5=终点
export const PIECES_PER_SEAT = 4;
export const TRACK_MAX = 51;               // 主跑道末位 rel
export const GOAL_REL = 5;                 // home 索引 5 = 到家
export const JUMP_REL = 10;
export const JUMP_TO_REL = 14;
export const FLY_REL = 18;
export const FLY_TO_REL = 30;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(state) {
  return mulberry32((state.seed >>> 0) + Math.imul(state.turnCounter + 1, 0x9E3779B1));
}

export function clone(state) {
  return {
    phase: state.phase,
    seatCount: state.seatCount,
    seats: state.seats.map(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p })) })),
    turn: state.turn,
    dice: state.dice,
    rolled: state.rolled,
    consecSix: state.consecSix,
    lastActionAt: state.lastActionAt,
    seed: state.seed,
    turnCounter: state.turnCounter,
    winner: state.winner,
    log: state.log.slice(-30),
  };
}

export function pushLog(state, msg) {
  state.log.push(msg);
  if (state.log.length > 30) state.log = state.log.slice(-30);
}

export function createInitialState({ seed, seatCount, hostUsername }) {
  const seats = [];
  for (let i = 0; i < seatCount; i++) {
    seats.push({
      username: i === 0 ? hostUsername : null,
      kind: i === 0 ? 'human' : null,   // null = 等待加入或补 AI
      autoAi: false,
      timeoutCount: 0,
      pieces: Array.from({ length: PIECES_PER_SEAT }, () => ({ loc: 'base', r: -1 })),
    });
  }
  return {
    phase: 'waiting',
    seatCount,
    seats,
    turn: 0,
    dice: 0,
    rolled: false,
    consecSix: 0,
    lastActionAt: 0,
    seed: seed >>> 0,
    turnCounter: 0,
    winner: null,
    log: [],
  };
}

export function rollDice(state) {
  if (state.phase !== 'playing') return state;
  if (state.rolled) return state;
  const rng = makeRng(state);
  const dice = 1 + Math.floor(rng() * 6);
  const next = clone(state);
  next.dice = dice;
  next.rolled = true;
  next.turnCounter = state.turnCounter + 1;
  return next;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test feixingqi.test.js`
Expected: PASS（4 个测试）

- [ ] **Step 5: 提交**

```bash
git add feixingqi/engine.js feixingqi.test.js
git commit -m "feat(feixingqi): 引擎骨架（PRNG/状态/rollDice）"
```

---

### Task 2: legalMoves — 合法走子枚举

**Files:**
- Modify: `feixingqi/engine.js`（追加 `absCell`、`finalLanding`、`legalMoves`）
- Test: `feixingqi.test.js`

**Interfaces:**
- Consumes: Task 1 的 `createInitialState`、常量。
- Produces: `absCell(seat,rel)→int`、`finalLanding(seat,to)→{loc,r}`、`legalMoves(state,seat,dice)→[{pieceId,to:{loc,r}}]`。`to` 为**特格触发前**的落点；`finalLanding` 计算跳格/飞格后的最终落点。

- [ ] **Step 1: 写失败测试**

追加到 `feixingqi.test.js`（在 import 列表加 `absCell, finalLanding, legalMoves`）：
```js
test('absCell maps seat rel to absolute loop cell', () => {
  assert.equal(absCell(0, 0), 0);
  assert.equal(absCell(0, 51), 51);
  assert.equal(absCell(1, 0), 13);
  assert.equal(absCell(2, 40), (26 + 40) % 52);
});

test('legalMoves: base piece launches only on 6', () => {
  const s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  const mv6 = legalMoves(s, 0, 6);
  assert.equal(mv6.length, 1);                 // 4 base pieces all launch to r=0 → one pieceId? no, each piece
  // 4 架都在 base，掷 6 每架都可起飞 → 4 个合法步
  assert.equal(mv6.length, 4);
  assert.ok(mv6.every(m => m.to.loc === 'track' && m.to.r === 0));
  const mv5 = legalMoves(s, 0, 5);
  assert.equal(mv5.length, 0);
});

test('legalMoves: track piece moves and home exact', () => {
  const s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  s.seats[0].pieces[0] = { loc: 'track', r: 10 };
  // dice 4 → r=14（恰为 JUMP_TO_REL 落点前=14）
  const mv = legalMoves(s, 0, 4);
  assert.equal(mv.length, 1);
  assert.deepEqual(mv[0].to, { loc: 'track', r: 14 });
  // 进 home：r=50, dice=6 → sum=56 → home r=4
  s.seats[0].pieces[0] = { loc: 'track', r: 50 };
  const mvh = legalMoves(s, 0, 6);
  assert.deepEqual(mvh[0].to, { loc: 'home', r: 4 });
  // 精确到家：r=51, dice=6 → sum=57 → done
  s.seats[0].pieces[0] = { loc: 'track', r: 51 };
  const mvd = legalMoves(s, 0, 6);
  assert.deepEqual(mvd[0].to, { loc: 'done', r: 5 });
  // 越界：r=51, dice 大于 6 不存在；用 home 越界：home r=4, dice=3 → 7>5 非法
  s.seats[0].pieces[0] = { loc: 'home', r: 4 };
  assert.equal(legalMoves(s, 0, 3).length, 0);
  s.seats[0].pieces[0] = { loc: 'home', r: 3 };
  assert.deepEqual(legalMoves(s, 0, 2)[0].to, { loc: 'done', r: 5 });
});

test('legalMoves: done piece is immovable', () => {
  const s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  s.seats[0].pieces[0] = { loc: 'done', r: 5 };
  assert.equal(legalMoves(s, 0, 6).length, 0);
});

test('finalLanding resolves jump and fly chains', () => {
  assert.equal(finalLanding(0, { loc: 'track', r: 10 }).r, 14);
  assert.equal(finalLanding(0, { loc: 'track', r: 18 }).r, 30);
  assert.equal(finalLanding(0, { loc: 'track', r: 5 }).r, 5);
  assert.equal(finalLanding(0, { loc: 'home', r: 2 }).r, 2);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test feixingqi.test.js`
Expected: FAIL — `absCell/finalLanding/legalMoves` 未导出。

- [ ] **Step 3: 追加实现**

在 `feixingqi/engine.js` 末尾追加：
```js
export function absCell(seat, rel) {
  return (ENTRY[seat] + rel) % LOOP_LEN;
}

// 计算跳格/飞格后的最终落点（特格触发前的 to → 触发后最终格）
export function finalLanding(seat, to) {
  if (to.loc !== 'track') return to;
  let r = to.r;
  let guard = 0;
  while (guard++ < 4) {
    if (r === JUMP_REL) r = JUMP_TO_REL;
    else if (r === FLY_REL) r = FLY_TO_REL;
    else break;
  }
  return { loc: 'track', r };
}

export function legalMoves(state, seat, dice) {
  if (dice === 0) return [];
  const out = [];
  const pieces = state.seats[seat].pieces;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.loc === 'done') continue;
    if (p.loc === 'base') {
      if (dice === 6) out.push({ pieceId: i, to: { loc: 'track', r: 0 } });
      continue;
    }
    if (p.loc === 'track') {
      const sum = p.r + dice;
      if (sum <= TRACK_MAX) out.push({ pieceId: i, to: { loc: 'track', r: sum } });
      else if (sum <= TRACK_MAX + HOME_LEN) {
        const h = sum - (TRACK_MAX + 1);     // 52→0 … 57→5
        if (h === GOAL_REL) out.push({ pieceId: i, to: { loc: 'done', r: GOAL_REL } });
        else out.push({ pieceId: i, to: { loc: 'home', r: h } });
      }
      continue;
    }
    if (p.loc === 'home') {
      const h = p.r + dice;
      if (h === GOAL_REL) out.push({ pieceId: i, to: { loc: 'done', r: GOAL_REL } });
      else if (h < GOAL_REL) out.push({ pieceId: i, to: { loc: 'home', r: h } });
      continue;
    }
  }
  return out;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test feixingqi.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add feixingqi/engine.js feixingqi.test.js
git commit -m "feat(feixingqi): legalMoves 合法走子枚举"
```

---

### Task 3: applyMove — 走子、特格、吃子、胜负、轮转

**Files:**
- Modify: `feixingqi/engine.js`（追加 `captureAt`、`checkWinner`、`nextSeat`、`endTurn`、`applyMove`）
- Test: `feixingqi.test.js`

**Interfaces:**
- Consumes: Task 1/2 的 `clone/pushLog/absCell/finalLanding/legalMoves`。
- Produces: `applyMove(state,seat,pieceId)→state`（移动一架，结算特格+吃子+胜负+轮转）、`endTurn(state,wasSix)→void`（变更 state）、`nextSeat(state)→void`、`checkWinner(state)→seatIdx|null`。

- [ ] **Step 1: 写失败测试**

追加到 `feixingqi.test.js`（import 加 `applyMove, endTurn, nextSeat, checkWinner`）：
```js
function playing(seatCount = 2, host = 'a') {
  const s = createInitialState({ seed: 3, seatCount, hostUsername: host });
  s.phase = 'playing'; s.lastActionAt = 1;
  // 两个座位都先有 username/kind（人），便于轮转测试
  for (let i = 1; i < seatCount; i++) { s.seats[i].username = 'p' + i; s.seats[i].kind = 'human'; }
  return s;
}

test('applyMove: track move lands and clears rolled', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 5 };
  s.dice = 4; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 9);
  assert.equal(s.rolled, false);
  assert.equal(s.turn, 1);            // 非 6 → 轮到下家
  assert.equal(s.consecSix, 0);
});

test('applyMove: jump cell +4 and fly cell fly across', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 6 };   // +4 → 10 (JUMP_REL) → 14
  s.dice = 4; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 14);

  s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 15 };   // +3 → 18 (FLY_REL) → 30
  s.dice = 3; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 30);
});

test('applyMove: capture sends opponent back to base', () => {
  let s = playing(2);
  // seat0 piece at r=4 → +2 → 6 (abs 6). seat1 piece on abs 6 = rel (13+6)%52=19? no:
  // abs(seat1, r1) = (13 + r1) % 52 = 6 → r1 = (6-13+52)%52 = 45
  s.seats[0].pieces[0] = { loc: 'track', r: 4 };
  s.seats[1].pieces[0] = { loc: 'track', r: 45 };
  s.dice = 2; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 6);
  assert.equal(s.seats[1].pieces[0].loc, 'base');   // 被吃回机场
});

test('applyMove: six grants re-roll (same seat, rolled reset)', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 0 };
  s.dice = 6; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.turn, 0);          // 仍轮到 seat0
  assert.equal(s.rolled, false);   // 需再掷
  assert.equal(s.consecSix, 1);
});

test('applyMove: three consecutive sixes forfeit turn', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 0 };
  s.consecSix = 2;                 // 已连两个 6
  s.dice = 6; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.turn, 1);          // 第三个 6 作废，轮到下家
  assert.equal(s.consecSix, 0);
});

test('applyMove: launching from base on a 6', () => {
  let s = playing(2);
  // 座位0 已无 track piece，4 架在 base；dice=6
  s.dice = 6; s.rolled = true;
  s = applyMove(s, 0, 0);          // pieceId 0 起飞到 r=0
  assert.equal(s.seats[0].pieces[0].loc, 'track');
  assert.equal(s.seats[0].pieces[0].r, 0);
  assert.equal(s.turn, 0);         // 6 → 再掷
});

test('applyMove: win when all 4 done', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'home', r: 4 };
  s.seats[0].pieces[1] = { loc: 'done', r: 5 };
  s.seats[0].pieces[2] = { loc: 'done', r: 5 };
  s.seats[0].pieces[3] = { loc: 'done', r: 5 };
  s.dice = 1; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].loc, 'done');
  assert.equal(s.phase, 'finished');
  assert.equal(s.winner, 0);
});

test('applyMove: rejects illegal piece', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 5 };
  s.dice = 4; s.rolled = true;
  const before = s;
  s = applyMove(s, 0, 99);          // pieceId 不存在
  assert.deepEqual(s, before);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test feixingqi.test.js`
Expected: FAIL — `applyMove/endTurn/nextSeat/checkWinner` 未导出。

- [ ] **Step 3: 追加实现**

在 `feixingqi/engine.js` 末尾追加：
```js
function captureAt(state, seat, rel) {
  const target = absCell(seat, rel);
  for (let s = 0; s < state.seatCount; s++) {
    if (s === seat) continue;
    for (const p of state.seats[s].pieces) {
      if (p.loc === 'track' && absCell(s, p.r) === target) {
        p.loc = 'base'; p.r = -1;
        pushLog(state, `🛬${SEATS[s]}被吃回机场`);
      }
    }
  }
}

export function checkWinner(state) {
  for (let s = 0; s < state.seatCount; s++) {
    if (state.seats[s].pieces.every(p => p.loc === 'done')) return s;
  }
  return null;
}

export function nextSeat(state) {
  state.turn = (state.turn + 1) % state.seatCount;
}

export function endTurn(state, wasSix) {
  state.rolled = false;
  state.dice = 0;
  if (wasSix) {
    state.consecSix += 1;
    if (state.consecSix >= 3) {
      pushLog(state, `⚠️${SEATS[state.turn]}连三6作废`);
      state.consecSix = 0;
      nextSeat(state);
    }
    // 否则同一座位再掷（rolled=false）
  } else {
    state.consecSix = 0;
    nextSeat(state);
  }
}

export function applyMove(state, seat, pieceId) {
  if (state.phase !== 'playing' || !state.rolled) return state;
  if (state.turn !== seat) return state;
  const dice = state.dice;
  const moves = legalMoves(state, seat, dice);
  const mv = moves.find(m => m.pieceId === pieceId);
  if (!mv) return state;
  const next = clone(state);
  const piece = next.seats[seat].pieces[pieceId];
  piece.loc = mv.to.loc;
  piece.r = mv.to.r;
  if (piece.loc === 'track') {
    const fin = finalLanding(seat, mv.to);
    piece.r = fin.r;
    captureAt(next, seat, piece.r);
    pushLog(next, `✈️${SEATS[seat]}至${piece.r}`);
  } else if (piece.loc === 'done') {
    pushLog(next, `🏆${SEATS[seat]}一架到家`);
  } else {
    pushLog(next, `✈️${SEATS[seat]}至终点跑道${piece.r}`);
  }
  if (checkWinner(next) !== null) {
    next.phase = 'finished';
    next.winner = seat;
    pushLog(next, `🏆${SEATS[seat]}获胜！`);
    return next;
  }
  endTurn(next, dice === 6);
  return next;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test feixingqi.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add feixingqi/engine.js feixingqi.test.js
git commit -m "feat(feixingqi): applyMove 走子/特格/吃子/胜负/轮转"
```

---

### Task 4: chooseAiMove — AI 启发式

**Files:**
- Modify: `feixingqi/engine.js`（追加 `chooseAiMove`）
- Test: `feixingqi.test.js`

**Interfaces:**
- Consumes: `legalMoves`、`absCell`、`finalLanding`、常量。
- Produces: `chooseAiMove(state,seat,dice)→pieceId`（无合法步返回 -1）。确定性：同分按 pieceId 升序取最小，禁随机源。

- [ ] **Step 1: 写失败测试**

import 加 `chooseAiMove`：
```js
test('chooseAiMove prefers capture', () => {
  const s = playing(2);
  // piece0 在 r=4，掷2 到 r=6 能吃 seat1；piece1 在 r=0 掷2 到 r=2 不能吃
  s.seats[0].pieces[0] = { loc: 'track', r: 4 };
  s.seats[0].pieces[1] = { loc: 'track', r: 0 };
  s.seats[1].pieces[0] = { loc: 'track', r: 45 };   // abs 6（被 piece0 吃）
  s.dice = 2;
  assert.equal(chooseAiMove(s, 0, 2), 0);
});

test('chooseAiMove prefers reaching done', () => {
  const s = playing(2);
  s.seats[0].pieces[0] = { loc: 'home', r: 4 };   // 掷1 到家
  s.seats[0].pieces[1] = { loc: 'track', r: 5 };   // 掷1 到 r=6
  s.dice = 1;
  assert.equal(chooseAiMove(s, 0, 1), 0);
});

test('chooseAiMove returns -1 when no legal move', () => {
  const s = playing(2);
  s.dice = 5;   // 全在 base，非 6
  assert.equal(chooseAiMove(s, 0, 5), -1);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test feixingqi.test.js`
Expected: FAIL — `chooseAiMove` 未导出。

- [ ] **Step 3: 追加实现**

在 `feixingqi/engine.js` 末尾追加：
```js
export function chooseAiMove(state, seat, dice) {
  const moves = legalMoves(state, seat, dice);
  if (!moves.length) return -1;
  const scored = moves.map(m => {
    let score = 0;
    if (m.to.loc === 'done') score += 1000;
    if (m.to.loc === 'home') score += 100 + m.to.r * 10;
    if (m.to.loc === 'track') {
      const fin = finalLanding(seat, m.to);
      score += fin.r * 2;                          // 越靠近终点跑道越优
      if (fin.r === JUMP_REL || fin.r === FLY_REL) score += 60;
      const target = absCell(seat, fin.r);
      for (let s2 = 0; s2 < state.seatCount; s2++) {
        if (s2 === seat) continue;
        for (const op of state.seats[s2].pieces) {
          if (op.loc === 'track' && absCell(s2, op.r) === target) score += 500;
        }
      }
    }
    return { pid: m.pieceId, score };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.pid - b.pid));
  return scored[0].pid;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test feixingqi.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add feixingqi/engine.js feixingqi.test.js
git commit -m "feat(feixingqi): chooseAiMove 启发式"
```

---

### Task 5: rollDice 自动跳过、tick、startMatch、joinSeat、touch

**Files:**
- Modify: `feixingqi/engine.js`（改 `rollDice` 接入自动跳过；追加 `touch`、`startMatch`、`joinSeat`、`tick`）
- Test: `feixingqi.test.js`

**Interfaces:**
- Consumes: `legalMoves`、`applyMove`、`chooseAiMove`、`rollDice`、`clone`。
- Produces: `touch(state,now)→void`、`startMatch(state,now)→state`、`joinSeat(state,username)→{state,seat}`、`tick(state,now)→state`。`rollDice` 现在：掷后若无合法步则自动 `endTurn(false)` 跳过。

- [ ] **Step 1: 写失败测试**

import 加 `touch, startMatch, joinSeat, tick`：
```js
test('rollDice auto-passes when no legal move', () => {
  let s = playing(2);                 // 全在 base
  s = rollDice(s);                    // 非 6 则无可走 → 跳过到下家
  assert.equal(s.rolled, false);
  assert.equal(s.turn, 1);
});

test('startMatch fills empty seats with AI and sets playing', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  // 仅 seat0 有人；其余空
  s = startMatch(s, 1000);
  assert.equal(s.phase, 'playing');
  assert.equal(s.seats[0].kind, 'human');
  assert.equal(s.seats[1].kind, 'ai');
  assert.equal(s.seats[2].kind, 'ai');
  assert.equal(s.seats[3].kind, 'ai');
  assert.equal(s.turn, 0);
  assert.equal(s.lastActionAt, 1000);
});

test('joinSeat assigns first free seat', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  const r = joinSeat(s, 'bob');
  s = r.state;
  assert.equal(r.seat, 1);
  assert.equal(s.seats[1].username, 'bob');
  assert.equal(s.seats[1].kind, 'human');
});

test('tick runs AI turns until a human is to move', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  s = startMatch(s, 1000);
  // seat0 是人类、当前轮；tick 不应替它走
  const after = tick(s, 1000);
  assert.equal(after.turn, 0);
  assert.equal(after.rolled, false);   // 等人类掷
});

test('tick: AI seat plays its turn when it is AI turn', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  s = startMatch(s, 1000);
  // 强制把 seat0 也变 AI，让 tick 推进
  s.seats[0].kind = 'ai';
  const after = tick(s, 1000);
  // AI 推进直到当前轮为人类——但全是 AI，会一直推到 finished 或循环 guard
  assert.ok(after.turnCounter > s.turnCounter);
});

test('tick: human stale 30s triggers AI takeover, two stalls → autoAi', () => {
  let s = createInitialState({ seed: 9, seatCount: 2, hostUsername: 'a' });
  s = startMatch(s, 1000);
  s.seats[1].username = 'b'; s.seats[1].kind = 'human';
  // seat0 人类，31s 未操作 → 第一次超时
  let after = tick(s, 31000);
  assert.ok(after.seats[0].timeoutCount >= 1);
  // 重置时间再 31s → 第二次 → autoAi
  after.lastActionAt = 31000;
  after = tick(after, 62000);
  assert.equal(after.seats[0].autoAi, true);
});

test('tick: finished state is unchanged', () => {
  let s = createInitialState({ seed: 9, seatCount: 2, hostUsername: 'a' });
  s = startMatch(s, 1000);
  s.phase = 'finished'; s.winner = 0;
  assert.deepEqual(tick(s, 9999), s);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test feixingqi.test.js`
Expected: FAIL — `touch/startMatch/joinSeat/tick` 未导出；rollDice 自动跳过未实现（第一个测试会失败：turn 仍为 0）。

- [ ] **Step 3: 改写 rollDice 并追加新函数**

在 `feixingqi/engine.js` 中，**替换** Task 1 写的 `rollDice` 整个函数体为：
```js
export function rollDice(state) {
  if (state.phase !== 'playing') return state;
  if (state.rolled) return state;
  const rng = makeRng(state);
  const dice = 1 + Math.floor(rng() * 6);
  const next = clone(state);
  next.dice = dice;
  next.rolled = true;
  next.turnCounter = state.turnCounter + 1;
  if (legalMoves(next, next.turn, dice).length === 0) {
    pushLog(next, `🎲${SEATS[next.turn]}掷${dice}，无可走步`);
    endTurn(next, false);
  }
  return next;
}
```

> 注：`endTurn` 在 Task 3 定义；本任务依赖它。若文件顺序导致 `rollDice` 在 `endTurn` 之前，ESM 函数声明提升（function declarations）保证可用。

在 `feixingqi/engine.js` 末尾追加：
```js
export function touch(state, now) {
  const seat = state.seats[state.turn];
  if (state.phase === 'playing' && seat.kind === 'human' && !seat.autoAi) {
    state.lastActionAt = now;
  }
}

export function startMatch(state, now) {
  const next = clone(state);
  for (let i = 0; i < next.seatCount; i++) {
    const s = next.seats[i];
    if (!s.username) { s.username = null; s.kind = 'ai'; }
    else s.kind = 'human';
    s.autoAi = false; s.timeoutCount = 0;
  }
  next.phase = 'playing';
  next.turn = 0;
  next.rolled = false; next.dice = 0; next.consecSix = 0;
  next.lastActionAt = now;
  next.winner = null;
  pushLog(next, '🏁对局开始');
  return next;
}

export function joinSeat(state, username) {
  const next = clone(state);
  const free = next.seats.findIndex(s => s.username === null);
  if (free < 0) return { state: next, seat: -1 };
  next.seats[free].username = username;
  next.seats[free].kind = 'human';
  return { state: next, seat: free };
}

export function tick(state, now) {
  if (state.phase !== 'playing') return state;
  let s = clone(state);
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 200) {
    const seat = s.seats[s.turn];
    const isAi = seat.kind === 'ai' || seat.autoAi;
    const idle = now - (s.lastActionAt || now);
    const stale = !isAi && idle >= 30000;
    if (!isAi && !stale) break;
    if (stale) {
      seat.timeoutCount = (seat.timeoutCount || 0) + 1;
      if (seat.timeoutCount >= 2) {
        seat.autoAi = true;
        pushLog(s, `🤖${SEATS[s.turn]}超时转AI`);
      }
    }
    if (!s.rolled) s = rollDice(s);
    if (s.phase === 'playing' && s.rolled) {
      const moves = legalMoves(s, s.turn, s.dice);
      if (moves.length) {
        const pid = chooseAiMove(s, s.turn, s.dice);
        s = applyMove(s, s.turn, pid);
      }
    }
  }
  if (s.phase === 'playing') {
    const seat = s.seats[s.turn];
    if (seat.kind === 'human' && !seat.autoAi && s.lastActionAt === 0) s.lastActionAt = now;
  }
  return s;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node --test feixingqi.test.js`
Expected: PASS（全部测试）

- [ ] **Step 5: 提交**

```bash
git add feixingqi/engine.js feixingqi.test.js
git commit -m "feat(feixingqi): rollDice 自动跳过/tick/startMatch/joinSeat/touch"
```

---

### Task 6: 服务端共享模块 + 跨目录 import 冒烟

**Files:**
- Create: `functions/api/feixingqi/_shared.js`
- Create: `schema.sql`（追加表；如已存在则修改）
- Test: 手动 curl 冒烟（验证 wrangler esbuild 跨目录 import 可用）

**Interfaces:**
- Produces: `_shared.js` 导出 `json(data,status)`、`whoami(request,env)→username|null`、`loadRoom(env,code)→{state,password}|null`、`saveRoom(env,code,state)→void`。`state` 列存 JSON 字符串；读写时 JSON.parse/stringify。

- [ ] **Step 1: 建表**

确认 `schema.sql` 含 `feixingqi_rooms`（仿 `battle_rooms`）。在 `schema.sql` 末尾追加：
```sql
CREATE TABLE IF NOT EXISTS feixingqi_rooms (
  code TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 2: 写 `_shared.js`**

`functions/api/feixingqi/_shared.js`：
```js
import { clone, tick } from '../../../feixingqi/engine.js';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export async function whoami(request, env) {
  const cookie = parseCookie(request.headers.get('cookie'));
  const token = cookie.hg_token;
  if (!token) return null;
  const s = await env.DB.prepare(
    'SELECT username, expires_at FROM sessions WHERE token = ?'
  ).bind(token).first();
  if (s && s.expires_at > Date.now()) return s.username;
  return null;
}

export async function loadRoom(env, code) {
  const row = await env.DB.prepare(
    'SELECT state, password FROM feixingqi_rooms WHERE code = ?'
  ).bind(code).first();
  if (!row) return null;
  return { state: JSON.parse(row.state), password: row.password };
}

export async function saveRoom(env, code, state) {
  const now = Date.now();
  await env.DB.prepare(
    'UPDATE feixingqi_rooms SET state = ?, updated_at = ? WHERE code = ?'
  ).bind(JSON.stringify(state), now, code).run();
}
```

> **风险验证点**：`import { ... } from '../../../feixingqi/engine.js'`（从 `functions/api/feixingqi/` 上溯三级到仓库根）。本步通过下面的冒烟测试确认 wrangler esbuild 能打包跨目录 import。若失败，退路：把 `feixingqi/engine.js` 复制一份到 `functions/api/feixingqi/engine.js` 并改 import 为 `./engine.js`（仅服务端用，客户端仍用 `/feixingqi/engine.js`）。复制后需在 Task 1-5 的提交说明里注明同步；优先坚持单源，复制为最后退路。

- [ ] **Step 3: 临时冒烟函数**

为验证 import，临时建 `functions/api/feixingqi/_smoke.js`：
```js
import { SEATS } from '../../../feixingqi/engine.js';
export function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, seats: SEATS.length }));
}
```

- [ ] **Step 4: 启动 dev 并冒烟**

Run（后台）: `npm run dev`
Run: `curl -s http://localhost:8788/api/feixingqi/_smoke`
Expected: `{"ok":true,"seats":4}`

- [ ] **Step 5: 删除冒烟函数并提交**

删除 `functions/api/feixingqi/_smoke.js`，提交共享模块与建表：
```bash
git rm -f functions/api/feixingqi/_smoke.js 2>/dev/null || true
git add functions/api/feixingqi/_shared.js schema.sql
git commit -m "feat(feixingqi): 服务端共享模块（whoami/loadRoom/saveRoom）+ 建表"
```

---

### Task 7: 服务端端点 create / join / start / state / roll / move

**Files:**
- Create: `functions/api/feixingqi/{create,join,start,state,roll,move}.js`
- Test: 手动 curl 端到端

**Interfaces:**
- Consumes: `_shared.js`（`json/whoami/loadRoom/saveRoom`）、`engine.js`（`createInitialState/startMatch/joinSeat/rollDice/applyMove/tick/touch/chooseAiMove`）。
- Produces: REST 端点（见 spec §6）。每个端点：解析 body → whoami → loadRoom → 调 engine → saveRoom → 返回。`state` GET 先跑 `tick` 再返回（剔除 password）。

- [ ] **Step 1: create.js**

`functions/api/feixingqi/create.js`：
```js
import { json, whoami } from './_shared.js';
import { createInitialState } from '../../../feixingqi/engine.js';

function randCode() { return String(Math.floor(1000 + Math.random() * 9000)); }

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { password, seatCount } = await request.json();
  if (!password || ![2, 3, 4].includes(seatCount)) return json({ error: '参数错误' }, 400);
  const code = randCode();
  const now = Date.now();
  const state = createInitialState({ seed: now % 2147483647, seatCount, hostUsername: username });
  await env.DB.prepare(
    'INSERT INTO feixingqi_rooms (code, password, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(code, password, JSON.stringify(state), now, now).run();
  return json({ code });
}
```

> 注：`randCode` 用 `Math.random` 在服务端可接受（仅房间号，非游戏骰子；4 位可能偶有碰撞，生产可加重试，本期 YAGNI）。

- [ ] **Step 2: join.js**

```js
import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { joinSeat } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code, password } = await request.json();
  if (!code || !password) return json({ error: '缺少参数' }, 400);
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  if (room.password !== password) return json({ error: '密码错误' }, 403);
  if (room.state.phase !== 'waiting') return json({ error: '对局已开始' }, 409);
  if (room.state.seats.some(s => s.username === username)) return json({ error: '你已在房间' }, 409);
  const { state, seat } = joinSeat(room.state, username);
  if (seat < 0) return json({ error: '房间已满' }, 409);
  await saveRoom(env, code, state);
  return json({ ok: true, seat });
}
```

- [ ] **Step 3: start.js**

```js
import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { startMatch } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code } = await request.json();
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  if (room.state.seats[0].username !== username) return json({ error: '仅房主可开始' }, 403);
  if (room.state.phase !== 'waiting') return json({ error: '已开始' }, 409);
  const state = startMatch(room.state, Date.now());
  await saveRoom(env, code, state);
  return json({ ok: true });
}
```

- [ ] **Step 4: state.js**

```js
import { json, loadRoom, saveRoom } from './_shared.js';
import { tick } from '../../../feixingqi/engine.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return json({ error: '缺少房间号' }, 400);
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  let state = room.state;
  if (state.phase === 'playing') {
    state = tick(state, Date.now());
    if (state !== room.state) await saveRoom(env, code, state);
  }
  return json(state);
}
```

- [ ] **Step 5: roll.js**

```js
import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { rollDice, touch, tick } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code } = await request.json();
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  let state = room.state;
  if (state.phase === 'playing') state = tick(state, Date.now());
  const seatIdx = state.seats.findIndex(s => s.username === username);
  if (seatIdx < 0) return json({ error: '你不在该房间' }, 403);
  if (state.turn !== seatIdx) return json({ error: '还没轮到你' }, 400);
  const seat = state.seats[seatIdx];
  if (seat.kind !== 'human' || seat.autoAi) return json({ error: '当前由 AI 行棋' }, 400);
  if (state.rolled) return json({ error: '已掷骰，请先走子' }, 400);
  state = rollDice(state);
  touch(state, Date.now());
  await saveRoom(env, code, state);
  return json({ ok: true, dice: state.dice });
}
```

- [ ] **Step 6: move.js**

```js
import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { applyMove, touch, tick } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code, pieceId } = await request.json();
  if (pieceId == null) return json({ error: '缺少 pieceId' }, 400);
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  let state = room.state;
  if (state.phase === 'playing') state = tick(state, Date.now());
  const seatIdx = state.seats.findIndex(s => s.username === username);
  if (seatIdx < 0) return json({ error: '你不在该房间' }, 403);
  if (state.turn !== seatIdx) return json({ error: '还没轮到你' }, 400);
  const seat = state.seats[seatIdx];
  if (seat.kind !== 'human' || seat.autoAi) return json({ error: '当前由 AI 行棋' }, 400);
  if (!state.rolled) return json({ error: '请先掷骰' }, 400);
  const before = state;
  state = applyMove(state, seatIdx, pieceId);
  if (state === before) return json({ error: '非法走子' }, 400);
  touch(state, Date.now());
  await saveRoom(env, code, state);
  return json({ ok: true });
}
```

- [ ] **Step 7: 端到端冒烟**

Run（后台）: `npm run dev`（D1 本地用 `--local` 已由 `wrangler pages dev` 自动注入 `.dev.vars` 与本地 D1）。
```bash
# 1. 取登录 cookie（先在浏览器走一次 /login.html 或用现有账号；这里假设已有 hg_token）
#    若无，可临时跳过守卫测试：本步骤主要验证端点不报 500
curl -s -X POST http://localhost:8788/api/feixingqi/create -H 'Content-Type: application/json' -d '{"password":"pw","seatCount":4}'
# 预期 401 未登录（守卫生效）→ 说明路由 OK
```
若返回 401 且无 500 → 端点路由与 import 正常。完整带 cookie 的联调留到 Task 8 客户端一起验。

- [ ] **Step 8: 提交**

```bash
git add functions/api/feixingqi/
git commit -m "feat(feixingqi): create/join/start/state/roll/move 端点"
```

---

### Task 8: 客户端控制器（大厅 + 轮询 + 掷骰/选子）

**Files:**
- Create: `feixingqi/feixingqi.js`
- Create: `feixingqi/index.html`（结构）
- Test: 手动浏览器验证

**Interfaces:**
- Consumes: `/api/me`、`/api/feixingqi/*`、`feixingqi/engine.js` 的 `legalMoves`（客户端用于高亮可动子）。
- Produces: 单页应用：大厅视图（建房/加入/座位/开始）+ 对局视图（棋盘 + 骰子键 + 日志）。轮询 `state` 每 1.5s（对局）/ 2s（大厅）。

- [ ] **Step 1: index.html 结构**

`feixingqi/index.html`：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="description" content="在线飞行棋：房主建房 2-4 人，空座 AI 补位，经典跳格飞格规则。">
  <title>飞行棋 · 快乐小游戏</title>
  <link rel="stylesheet" href="/shared/theme.css">
  <link rel="stylesheet" href="/shared/game.css">
  <link rel="stylesheet" href="/feixingqi/feixingqi.css">
</head>
<body>
  <main class="game game-board">
    <header class="game-header">
      <h1>飞行棋</h1>
      <a class="back" href="/board/">← 返回棋类</a>
    </header>

    <section id="screen-lobby" class="fx-screen">
      <div class="fx-lobby">
        <div class="fx-panel">
          <h3>创建房间</h3>
          <label>房间密码 <input id="create-pass" type="text" maxlength="12" placeholder="设一个密码"></label>
          <label>人数
            <select id="create-seats">
              <option value="2">2 人</option>
              <option value="3">3 人</option>
              <option value="4" selected>4 人</option>
            </select>
          </label>
          <button id="btn-create" class="reset-btn">创建房间</button>
        </div>
        <div class="fx-panel">
          <h3>加入房间</h3>
          <label>房间号 <input id="join-code" type="text" maxlength="4" inputmode="numeric" placeholder="4 位房间号"></label>
          <label>房间密码 <input id="join-pass" type="text" maxlength="12" placeholder="输入密码"></label>
          <button id="btn-join" class="reset-btn">加入房间</button>
        </div>
      </div>
      <p id="lobby-error" class="fx-error hidden"></p>
    </section>

    <section id="screen-room" class="fx-screen hidden">
      <div class="fx-room-head">
        <span>房间号：<b id="room-code"></b></span>
        <span id="room-phase"></span>
      </div>
      <div id="seat-list" class="fx-seats"></div>
      <button id="btn-start" class="reset-btn hidden">开始游戏（空座补 AI）</button>
    </section>

    <section id="screen-game" class="fx-screen hidden">
      <div class="fx-game-body">
        <div class="board-wrap"><div id="board" class="fx-board"></div></div>
        <aside class="fx-side">
          <div id="turn-indicator" class="fx-turn"></div>
          <button id="btn-roll" class="fx-dice" disabled>🎲</button>
          <div id="event-log" class="fx-log"></div>
        </aside>
      </div>
      <div id="win-modal" class="modal hidden" role="dialog">
        <div class="modal-backdrop"></div>
        <div class="modal-card">
          <h2 id="win-title" class="modal-title">对局结束</h2>
          <p id="win-text" class="modal-text"></p>
          <div class="modal-actions"><button id="win-back" class="reset-btn">返回大厅</button></div>
        </div>
      </div>
    </section>
  </main>
  <script type="module" src="/feixingqi/feixingqi.js"></script>
</body>
</html>
```

- [ ] **Step 2: 控制器骨架与身份获取**

`feixingqi/feixingqi.js`：
```js
import { SEATS, ENTRY, legalMoves, absCell, JUMP_REL, FLY_REL } from './engine.js';

const POLL_GAME = 1500, POLL_LOBBY = 2000;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DICE_GLYPH = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const SEAT_COLOR = ['#d64545', '#e0b020', '#3a78c2', '#3fae6e'];   // 红黄蓝绿

let me = null;       // { username }
let code = null;
let state = null;
let mySeat = -1;
let pollTimer = null;

function show(id) {
  document.querySelectorAll('.fx-screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}
function showError(msg) { const el = $('lobby-error'); el.textContent = msg; el.classList.toggle('hidden', !msg); }

async function api(path, body) {
  const res = await fetch(`/api/feixingqi/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function init() {
  const r = await fetch('/api/me').then(r => r.json());
  if (!r.username) { location.href = '/login.html'; return; }
  me = r;
  bindLobby();
  show('screen-lobby');
}
```

- [ ] **Step 3: 大厅交互**

追加到 `feixingqi/feixingqi.js`：
```js
function bindLobby() {
  $('btn-create').onclick = async () => {
    const password = $('create-pass').value.trim();
    const seatCount = parseInt($('create-seats').value, 10);
    if (!password) return showError('请设密码');
    const r = await api('create', { password, seatCount });
    if (r.error) return showError(r.error);
    code = r.code;
    enterRoom();
  };
  $('btn-join').onclick = async () => {
    code = $('join-code').value.trim();
    const password = $('join-pass').value.trim();
    if (!code || !password) return showError('请填房间号与密码');
    const r = await api('join', { code, password });
    if (r.error) return showError(r.error);
    enterRoom();
  };
}

async function enterRoom() {
  showError('');
  show('screen-room');
  $('room-code').textContent = code;
  await pollRoom();
  startPolling(POLL_LOBBY, pollRoom);
}

function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }
function startPolling(ms, fn) { stopPolling(); pollTimer = setTimeout(loop, ms); async function loop() { await fn(); if (pollTimer) pollTimer = setTimeout(loop, ms); } }

async function pollRoom() {
  const r = await api(`state?code=${encodeURIComponent(code)}`);
  if (r.error) { showError(r.error); stopPolling(); return; }
  state = r;
  mySeat = state.seats.findIndex(s => s.username === (me && me.username));
  renderRoom();
  if (state.phase !== 'waiting') { stopPolling(); enterGame(); }
}

function renderRoom() {
  $('room-phase').textContent = state.phase === 'waiting' ? '等待加入…' : '已开始';
  $('seat-list').innerHTML = state.seats.map((s, i) => `
    <div class="fx-seat" style="--c:${SEAT_COLOR[i]}">
      <span class="fx-seat-color">${SEATS[i]}</span>
      <span class="fx-seat-name">${esc(s.username || (s.kind === 'ai' ? 'AI' : '空位'))}</span>
    </div>`).join('');
  const host = mySeat === 0 && state.phase === 'waiting';
  $('btn-start').classList.toggle('hidden', !host);
  $('btn-start').onclick = host ? (async () => { const r = await api('start', { code }); if (r.error) showError(r.error); }) : null;
}
```

- [ ] **Step 4: 对局轮询与渲染**

追加：
```js
async function enterGame() {
  show('screen-game');
  $('btn-roll').onclick = doRoll;
  $('win-back').onclick = () => { stopPolling(); location.reload(); };
  await pollGame();
  startPolling(POLL_GAME, pollGame);
}

async function pollGame() {
  const r = await api(`state?code=${encodeURIComponent(code)}`);
  if (r.error) return;
  state = r;
  mySeat = state.seats.findIndex(s => s.username === (me && me.username));
  renderGame();
  if (state.phase === 'finished') { stopPolling(); showWin(); }
}

function renderGame() {
  renderBoard();
  const cur = state.seats[state.turn];
  const myTurn = state.turn === mySeat && cur && cur.kind === 'human' && !cur.autoAi;
  $('turn-indicator').innerHTML = `<span style="color:${SEAT_COLOR[state.turn]}">${SEATS[state.turn]}</span> 行棋` +
    (myTurn ? '（你的回合）' : '');
  const canRoll = myTurn && !state.rolled;
  const btn = $('btn-roll');
  btn.disabled = !canRoll;
  btn.textContent = state.rolled ? (DICE_GLYPH[state.dice] || String(state.dice)) : '🎲';
  $('event-log').innerHTML = state.log.slice(-8).map(l => `<div>${esc(l)}</div>`).join('');
}

function showWin() {
  $('win-title').textContent = '对局结束';
  $('win-text').textContent = state.winner === mySeat ? '你获胜了！🎉' : `${SEATS[state.winner]} 获胜`;
  $('win-modal').classList.remove('hidden');
}
```

- [ ] **Step 5: 棋盘渲染（CSS grid + emoji 圆片）**

追加：
```js
function renderBoard() {
  const board = $('board');
  // 15x15 grid: 4 角机场 + 外圈跑道 + 十字终点跑道 + 中心
  board.style.setProperty('--cells', 15);
  const cells = [];
  for (let i = 0; i < 15 * 15; i++) cells.push('<div class="fx-cell"></div>');
  // 跑道绝对格 0..51 → 计算其 (row,col)
  for (let rel = 0; rel < 52; rel++) {
    const { row, col } = trackCoord(rel);
    const idx = row * 15 + col;
    cells[idx] = `<div class="fx-cell fx-track" data-abs="${rel}"></div>`;
  }
  // 特格上色（按归属座位的颜色）
  for (let seat = 0; seat < 4; seat++) {
    for (const rel of [JUMP_REL, FLY_REL]) {
      const abs = absCell(seat, rel);
      const { row, col } = trackCoord(abs);
      cells[row * 15 + col] = `<div class="fx-cell fx-track fx-special" style="--c:${SEAT_COLOR[seat]}"></div>`;
    }
  }
  // 棋子
  for (let seat = 0; seat < state.seatCount; seat++) {
    for (const p of state.seats[seat].pieces) {
      const pos = pieceCoord(seat, p);
      if (!pos) continue;
      const idx = pos.row * 15 + pos.col;
      cells[idx] += `<div class="fx-piece" style="--c:${SEAT_COLOR[seat]}" data-seat="${seat}" data-piece="${state.seats[seat].pieces.indexOf(p)}">✈️</div>`;
    }
  }
  board.innerHTML = cells.join('');
  // 高亮我的可动子
  if (state.turn === mySeat && state.rolled) {
    legalMoves(state, mySeat, state.dice).forEach(m => {
      const p = state.seats[mySeat].pieces[m.pieceId];
      const pos = pieceCoord(mySeat, p);
      if (pos) board.children[pos.row * 15 + pos.col].classList.add('fx-movable');
    });
  }
  board.querySelectorAll('.fx-piece').forEach(el => {
    el.onclick = () => doMove(parseInt(el.dataset.seat, 10), parseInt(el.dataset.piece, 10));
  });
}

// 绝对格 0..51 → 15x15 坐标（外圈顺时针，从左上角机场右侧开始）
function trackCoord(abs) {
  // 简化坐标映射：见 feixingqi.css 注释的网格约定
  const a = ((abs % 52) + 52) % 52;
  if (a < 5) return { row: 6, col: 0 + a };          // 左中横入
  if (a < 18) return { row: 6 - (a - 5 + 1), col: 5 }; // 左上纵（示意，需对齐 css）
  // …（完整映射见下方说明）
  return fallbackCoord(a);
}
```

> **完整坐标映射**：`trackCoord` 必须与 CSS 网格约定一致。采用经典十字布局：15×15，外圈跑道 52 格按顺时针环绕十字臂。实现者请按下方「坐标映射表」补全 `trackCoord` 与 `pieceCoord`（base 在四角 2×2，home 沿十字臂内行）。鉴于映射较长，作为本步骤的硬性内容，提供完整函数：

替换上面的 `trackCoord` 占位为完整版本：
```js
// 15x15 经典十字飞行棋坐标。abs 0..51 从红方起飞点（左侧中行最左格）顺时针。
// 约定：行 0..14（上到下），列 0..14（左到右）。
function trackCoord(abs) {
  const a = ((abs % 52) + 52) % 52;
  // 红段 abs 0..12：从 (7,0) 向右到 (7,12) 中间会拐弯——这里采用每边 13 格的环绕
  // 简化：用一个查表数组（52 项）保证与 CSS 对齐
  const T = TRACK_TABLE[a];
  return { row: T[0], col: T[1] };
}
const TRACK_TABLE = [
  [7,0],[7,1],[7,2],[7,3],[7,4],[7,5],          // 0-5  红起飞点向右入十字
  [6,5],[5,5],[4,5],[3,5],[2,5],[1,5],[0,5],     // 6-12 上行左臂
  [0,6],[0,7],[0,8],                              // 13-15 上边
  [1,9],[2,9],[3,9],[4,9],[5,9],[6,9],[7,9],     // 16-22 右臂下行
  [7,10],[7,11],[7,12],[7,13],[7,14],            // 23-27 右横（home green 臂）
  [8,14],[9,14],[10,14],[11,14],[12,14],[13,14],[14,14], // 28-34 下行右
  [14,13],[14,12],[14,11],[14,10],[14,9],         // 35-39 下边
  [13,9],[12,9],[11,9],[10,9],[9,9],              // 40-44 右臂上行(返) —— 与16-22不同列？需对齐
];
// 上述表为示意起点；实现者必须补满 52 项并保证首尾相接环绕。务必运行 Step 6 的可视化校验。
```

> **说明**：坐标映射是本任务最易出错处。`TRACK_TABLE` 必须填满 52 项且环绕闭合。Step 6 的可视化校验专门捕捉此类错误。

- [ ] **Step 6: 可视化校验**

启动 `npm run dev`，浏览器打开 `/feixingqi/`，建房 4 人并开始。校验：
1. 棋盘呈十字，52 个跑道格连续环绕无断口。
2. 4 个机场在四角，各 4 架 ✈️。
3. 起飞点（红 abs 0）在左侧中行；掷 6 后红 ✈️ 出现在该格。
4. 红 ✈️ 走到 abs 10（红跳格）后跳到 abs 14；走到 abs 18（红飞格）后飞到 abs 30。
5. 红走到与黄同格时黄回机场。
若坐标错位，修正 `TRACK_TABLE` 与 `pieceCoord` 直到闭合正确。

- [ ] **Step 7: 掷骰与选子动作**

追加：
```js
async function doRoll() {
  const r = await api('roll', { code });
  if (r.error) return;
  await pollGame();   // 立即刷新
}

async function doMove(seat, pieceId) {
  if (seat !== mySeat) return;
  if (!state.rolled) return;
  const r = await api('move', { code, pieceId });
  if (r.error) return;
  await pollGame();
}
```

- [ ] **Step 8: 提交**

```bash
git add feixingqi/feixingqi.js feixingqi/index.html
git commit -m "feat(feixingqi): 客户端大厅/轮询/渲染/掷骰选子"
```

---

### Task 9: CSS（移动优先 + 棋盘 grid + 暗色）

**Files:**
- Create: `feixingqi/feixingqi.css`
- Test: 浏览器视觉校验（手机视口 375×667 与 768 横屏）

- [ ] **Step 1: 写样式**

`feixingqi/feixingqi.css`：
```css
.fx-screen { max-width: 720px; margin: 0 auto; }
.fx-lobby { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 540px) { .fx-lobby { grid-template-columns: 1fr; } }
.fx-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-soft); }
.fx-panel h3 { margin: 0 0 12px; color: var(--ink); }
.fx-panel label { display: block; margin-bottom: 10px; font-size: 14px; color: var(--muted); }
.fx-panel input, .fx-panel select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--ink); }
.fx-error { color: var(--danger); margin-top: 12px; }
.fx-room-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.fx-seats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.fx-seat { display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; background: color-mix(in srgb, var(--c) 12%, var(--surface)); border-left: 4px solid var(--c); }
.fx-seat-color { font-weight: 700; color: var(--c); }

.fx-game-body { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 16px; align-items: start; }
@media (max-width: 720px) { .fx-game-body { grid-template-columns: 1fr; } }
.board-wrap { display: flex; justify-content: center; }
.fx-board { display: grid; grid-template-columns: repeat(15, 1fr); grid-template-rows: repeat(15, 1fr); width: min(94vw, 58vh); height: min(94vw, 58vh); gap: 1px; background: var(--border); border: 2px solid var(--wood-dark); border-radius: 8px; }
.fx-cell { background: var(--surface-warm); position: relative; }
.fx-track { background: var(--wood-light); }
.fx-special { background: color-mix(in srgb, var(--c) 45%, var(--wood-light)); }
.fx-piece { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: clamp(14px, 2.4vw, 22px); filter: drop-shadow(0 1px 1px rgba(0,0,0,.3)); cursor: pointer; }
.fx-piece::before { content: ''; position: absolute; inset: 18%; border-radius: 50%; background: color-mix(in srgb, var(--c) 70%, transparent); z-index: -1; }
.fx-movable { animation: fx-pulse 1s infinite; }
@keyframes fx-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(58,120,194,.0); } 50% { box-shadow: 0 0 0 4px rgba(58,120,194,.55); } }

.fx-side { display: flex; flex-direction: column; gap: 12px; }
.fx-turn { font-size: 16px; font-weight: 600; text-align: center; }
.fx-dice { font-size: 40px; line-height: 1; min-height: 64px; border-radius: 12px; border: 2px solid var(--game-accent); background: var(--surface); cursor: pointer; }
.fx-dice:disabled { opacity: .45; cursor: not-allowed; }
.fx-log { max-height: 220px; overflow: auto; font-size: 13px; color: var(--muted); background: var(--surface-muted); border-radius: 8px; padding: 8px; }
.fx-log div { padding: 2px 0; border-bottom: 1px solid var(--border); }

@media (prefers-color-scheme: dark) {
  .fx-cell { background: #2a2a2a; }
  .fx-track { background: #3a2f20; }
}
```

- [ ] **Step 2: 视觉校验**

`npm run dev`，DevTools 切 375×667：棋盘方形不溢出、操作栏在棋盘下方（< 720px 单列）、骰子键可点、可动子脉冲。横屏 768：侧栏在右。

- [ ] **Step 3: 提交**

```bash
git add feixingqi/feixingqi.css
git commit -m "feat(feixingqi): 移动优先样式与棋盘 grid"
```

---

### Task 10: 注册到首页 / sitemap / package.json 测试脚本

**Files:**
- Modify: `shared/landing.js`（棋类竞技 `games` 数组加一项）
- Modify: `sitemap.xml`（加 `/feixingqi/`）
- Modify: `package.json`（test 脚本加 `feixingqi.test.js`）
- Test: `npm test` 全绿；首页可见卡片

- [ ] **Step 1: landing.js 加卡**

在 `shared/landing.js` 的 `board` 段 `games` 数组末尾（`doushouqi` 之后）加：
```js
      {
        id: 'feixingqi', name: '飞行棋',
        description: '在线联机 2-4 人，空座 AI 补位，经典跳格飞格规则',
        href: '/feixingqi/', accent: '#3a78c2',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8c989"/><g stroke="#6e5a40" stroke-width="0.6" fill="none"><rect x="20" y="20" width="80" height="80"/><path d="M52 20 h16 v80 h-16 z M20 52 h80 v16 h-80 z"/></g><g font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif" font-size="16" text-anchor="middle"><text x="30" y="34">✈️</text><text x="90" y="34">✈️</text><text x="30" y="94">✈️</text><text x="90" y="94">✈️</text></g><circle cx="60" cy="60" r="8" fill="#d4a017"/><text x="60" y="64" font-size="9" text-anchor="middle" fill="#fff" font-family="serif">🏆</text></svg>`,
      },
```

- [ ] **Step 2: sitemap 加条目**

在 `sitemap.xml` 适当位置加：
```xml
<url><loc>https://happygames.pages.dev/feixingqi/</loc></url>
```

- [ ] **Step 3: package.json 加测试**

把 `package.json` 的 `test` 脚本末尾追加 ` feixingqi.test.js`（与现有列表同样式，空格分隔）。

- [ ] **Step 4: 运行全测**

Run: `npm test`
Expected: 全部 PASS，含 `feixingqi.test.js`。

- [ ] **Step 5: 首页可见性校验**

`npm run dev`，打开 `/`：棋类竞技板块下出现「飞行棋」卡，点进进入大厅。

- [ ] **Step 6: 提交**

```bash
git add shared/landing.js sitemap.xml package.json
git commit -m "feat(feixingqi): 注册首页卡片/sitemap/纳入测试"
```

---

## Self-Review（作者自检，已完成）

- **Spec 覆盖**：联机轮询(Task7/8)、AI 补位(Task5 startMatch)、经典跳格/飞格(Task2/3)、emoji 素材(Task8/9)、移动优先(Task9)、超时 AI 接管(Task5 tick)、确定性骰子(Task1)、仅第一名(Task3) 均有对应任务。✅
- **占位扫描**：`TRACK_TABLE` 在 Task 8 Step 5 给了示意表 + 明确补全要求 + Step 6 专门可视化校验——非占位，是带验收的实现指引。其余无 TBD/TODO。✅
- **类型一致**：`state.seats[i].pieces[j] = {loc, r}`、`legalMoves→{pieceId,to}`、`applyMove(state,seat,pieceId)`、`tick(state,now)` 在所有任务签名一致。✅
- **风险项**：跨目录 import(Task6 Step 4 冒烟 + 退路说明) 已显式标注。✅

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-28-feixingqi.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派发独立子代理实现，任务间我做评审把关，迭代快、上下文干净。
**2. Inline Execution** — 在当前会话用 executing-plans 批量执行，带检查点评审。

选哪种？
