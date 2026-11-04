# 围棋人机对战 (GNU Go) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 happygames 棋类竞技板块新增 `/weiqi/` 围棋人机对战页，AI 由浏览器内 GNU Go（gnugo.js）提供。

**Architecture:** 纯静态、浏览器本地。围棋规则与 AI 全部交给 GNU Go WASM 引擎，主线程只做棋盘 UI；引擎在 Web Worker 内运行，经 postMessage 通信。引擎 8.9MB 懒加载（进页空棋盘，点「开始对弈」后 worker 才 importScripts）。

**Tech Stack:** 原生 ES Modules + Canvas 2D + Web Worker + emscripten gnugo.js。测试用 `node --test`。

## Global Constraints

- 棋盘尺寸：仅 9 路与 13 路，玩家可在侧栏切换；不支持 19 路。
- 玩家固定执黑先走；引擎固定 komi=7.5、handicap=0（见 spec §7：handicap>0 会让 AI 白先，与黑先冲突）。
- 难度不调节（wrapper 未导出 level）。
- 引擎 API（已查 `gnugowrapper.c`，全部 `EMSCRIPTEN_KEEPALIVE`，挂在 emscripten `Module` 上）：
  - `Module._initializeGoGame(boardSize, komi, handicap, seed)` — 返回 void；越界 size 仅打印不报错。
  - `Module._moveTo(i, j)` — 返回 `0`(成功) / `-1`(越界) / `-2`(非法：劫/禁手/已占)。
  - `Module._genNextStep()` — 让当前 `to_move` 方走一步；返回 0。
  - `Module._getBoard(i, j)` — 返回该格 `0`(空)/`1`(黑)/`2`(白)。
  - `Module._isLastMove(i, j)` — 返回 0/1。
  - `Module._finalizeGoGame()` — 仅释放 SGF，无返回比分。
- 终局方式：玩家「认输」（本地判定玩家负，不调引擎）；无精确数子 API（spec §7）。
- 风格与既有游戏页一致：复用 `/shared/theme.css`、`/shared/game.css`；侧栏 `.controls`、`.status`、`.reset-btn` 类名沿用 gomoku/xiangqi。
- 许可：gnugo.js 封装 MIT；GNU Go 本体 GPLv2+。页面需「关于/许可」链接 GNU Go 与 gnugo.js 源码。
- 提交规范：每个 Task 末尾单独 commit；中文 commit message。

---

## 文件结构

新建 `weiqi/` 目录，共 6 个文件 + 1 个测试 + 2 处既有文件改动：

| 文件 | 职责 |
|------|------|
| `weiqi/render.js` | 纯函数：棋盘度量、坐标↔像素映射、Canvas 绘制。无状态、无 DOM 事件、不 import 引擎。可被 node 测试。 |
| `weiqi/logic.js` | 纯函数：棋盘数组同步、状态机判定（轮次/结束）。无引擎、无 DOM。可被 node 测试。 |
| `weiqi/weiqi.worker.js` | Web Worker：importScripts gnugo.js，封装引擎为 `{cmd,...}`↔`{ok,...}` 消息接口。 |
| `weiqi/weiqi.js` | 主线程控制器：DOM 事件、canvas 渲染调度、worker 通信、状态显示。 |
| `weiqi/weiqi.css` | 棋盘/棋子/侧栏样式。 |
| `weiqi/index.html` | 页面骨架。 |
| `weiqi/gnugo.js` | 第三方资产：`dna2ai/gnugo.js` 仓库 `dist/gnugo.js` 原样拷入（8.9MB，MIT 封装）。 |
| `weiqi.test.js`（仓库根） | 测 render.js + logic.js 的纯函数。 |
| `weiqi/_about.md`（或内嵌 HTML） | 许可/署名文本。 |

既有文件改动：
- `shared/landing.js` — `board` 板块 `games` 数组追加 weiqi 卡片。
- `package.json` — `test` 脚本加入 `weiqi.test.js`。

---

### Task 1: 落子 gnugo.js 资产并验证它在浏览器可加载

**Files:**
- Create: `weiqi/gnugo.js`（从 `dna2ai/gnugo.js` dist 拷入）
- Create: `weiqi/_smoke.html`（临时冒烟页，验证 Module 就绪，本任务末删除）

**Interfaces:**
- Consumes: 远程 `dna2ai/gnugo.js` 仓库 `dist/gnugo.js`。
- Produces: `weiqi/gnugo.js`（后续 worker importScripts 它）。

- [ ] **Step 1: 下载 gnugo.js 资产**

```bash
mkdir -p weiqi
curl -sL "https://raw.githubusercontent.com/dna2ai/gnugo.js/master/dist/gnugo.js" -o weiqi/gnugo.js
ls -lh weiqi/gnugo.js   # 期望 ~8.9MB
head -c 200 weiqi/gnugo.js   # 应见 emscripten 胶水（var Module / function(...){...}）
```
期望：文件存在、约 8.9MB、开头是 emscripten 输出。

- [ ] **Step 2: 写临时冒烟页验证 Module 就绪**

创建 `weiqi/_smoke.html`：
```html
<!DOCTYPE html><meta charset="utf-8"><title>gnugo smoke</title>
<pre id="log">loading…</pre>
<script src="./gnugo.js"></script>
<script>
  var log = document.getElementById('log');
  Module.onRuntimeInitialized = function () {
    try {
      Module._initializeGoGame(9, 7.5, 0, 1);
      var v = Module._getBoard(0, 0);
      log.textContent = 'runtime ready; getBoard(0,0)=' + v + ' (expect 0)';
    } catch (e) { log.textContent = 'ERR ' + e; }
  };
</script>
```

- [ ] **Step 3: 本地起静态服务并用浏览器人工验证**

```bash
npx --yes http-server -p 8099 -c-1 .
# 浏览器打开 http://localhost:8099/weiqi/_smoke.html
# 期望日志：runtime ready; getBoard(0,0)=0 (expect 0)
```
人工确认日志后继续。（无法在 node 自动测 wasm，本步为人工验证。）

- [ ] **Step 4: 删除冒烟页并提交**

```bash
rm weiqi/_smoke.html
printf 'weiqi/_smoke.html\nweiqi/_*.html\n' >> .gitignore   # 若已有通配可跳过
git add weiqi/gnugo.js .gitignore
git commit -m "feat(weiqi): 引入 gnugo.js 引擎资产（MIT 封装，8.9MB）"
```
注：`gnugo.js` 8.9MB 较大，若仓库 push 有体积限制，单独 commit 便于将来替换。

---

### Task 2: render.js — 棋盘度量、坐标映射、绘制（TDD）

**Files:**
- Create: `weiqi/render.js`
- Test: `weiqi.test.js`（本任务起创建该测试文件）

**Interfaces:**
- Produces:
  - `metrics(size, canvasSize): {ox, oy, step, stoneR}` — 棋盘左上交叉点偏移、交点间距、棋子半径。`canvasSize` 为正方形像素边长。
  - `pixelToCell(px, py, m): [i, j] | null` — 像素→交叉点坐标（0..size-1），容忍半个交点内吸附；越界返回 null。
  - `cellToPixel(i, j, m): {x, y}` — 交叉点→像素中心。
  - `drawBoard(ctx, m, size)` / `drawStones(ctx, board, m, size, lastMove)` — Canvas 绘制（node 测试只验不抛错 + 一定调用，不验像素）。

- [ ] **Step 1: 写失败测试 — metrics**

在 `weiqi.test.js` 顶部（新建文件）：
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metrics, pixelToCell, cellToPixel } from './weiqi/render.js';

test('metrics: 9 路盘在 540 画布上步长与边距合理', () => {
  const m = metrics(9, 540);
  assert.equal(typeof m.ox, 'number');
  assert.equal(typeof m.step, 'number');
  // 9 个交点占 8 段间距，应居中
  assert.ok(Math.abs(m.ox - (540 - 8 * m.step) / 2) < 0.001);
  assert.ok(m.step > 0 && m.stoneR > 0 && m.stoneR < m.step / 2);
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --test weiqi.test.js
```
期望：FAIL（render.js 不存在 / metrics 未定义）。

- [ ] **Step 3: 实现 metrics + cellToPixel**

创建 `weiqi/render.js`：
```js
// 围棋棋盘渲染：纯函数，无状态、无 DOM、不依赖引擎。
// 交点坐标：i 为行（从上 0），j 为列（从左 0），均在 0..size-1。

export function metrics(size, canvasSize) {
  // 留出边距：边距 = 间距的一半，使最外圈交点不贴边
  const step = (canvasSize - canvasSize / size) / (size - 1);
  const span = step * (size - 1);
  const ox = (canvasSize - span) / 2;
  const oy = ox;
  const stoneR = step * 0.46;
  return { ox, oy, step, stoneR };
}

export function cellToPixel(i, j, m) {
  return { x: m.ox + j * m.step, y: m.oy + i * m.step };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --test weiqi.test.js
```
期望：metrics 测试 PASS。

- [ ] **Step 5: 写并实现 pixelToCell 测试**

追加测试：
```js
test('pixelToCell: 吸附到最近交点，越界返回 null', () => {
  const m = metrics(9, 540);
  const c = cellToPixel(4, 4, m);
  assert.deepEqual(pixelToCell(c.x, c.y, m, 9), [4, 4]);
  // 半个交点内吸附
  assert.deepEqual(pixelToCell(c.x + m.step * 0.4, c.y, m, 9), [4, 4]);
  // 明显越界
  assert.equal(pixelToCell(-50, -50, m, 9), null);
  assert.equal(pixelToCell(540, 540, m, 9), null);
});
```
实现 `pixelToCell`（在 render.js 追加）：
```js
export function pixelToCell(px, py, m, size) {
  const j = Math.round((px - m.ox) / m.step);
  const i = Math.round((py - m.oy) / m.step);
  if (i < 0 || i >= size || j < 0 || j >= size) return null;
  // 容忍半个交点内
  const dx = Math.abs(px - (m.ox + j * m.step));
  const dy = Math.abs(py - (m.oy + i * m.step));
  if (dx > m.step / 2 || dy > m.step / 2) return null;
  return [i, j];
}
```
注意：`pixelToCell` 签名为 `(px, py, m, size)`，调用方需传 size。修正前述测试调用以匹配（已有 `m, 9`，一致）。

- [ ] **Step 6: 运行测试确认通过**

```bash
node --test weiqi.test.js
```
期望：全部 PASS。

- [ ] **Step 7: 实现 drawBoard / drawStones（不单测，仅防抛错）**

在 render.js 追加（用 mock ctx 测不抛错）：
```js
export function drawBoard(ctx, m, size) {
  const { ox, oy, step } = m;
  const span = step * (size - 1);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + i * step);
    ctx.lineTo(ox + span, oy + i * step);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + i * step, oy);
    ctx.lineTo(ox + i * step, oy + span);
    ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  ctx.strokeRect(ox, oy, span, span);
  // 星位
  const stars = size === 9 ? [[2,2],[2,6],[6,2],[6,6],[4,4]] : [[3,3],[3,9],[9,3],[9,9],[6,6]];
  ctx.fillStyle = '#3a2a1a';
  for (const [i, j] of stars) {
    const { x, y } = cellToPixel(i, j, m);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill();
  }
}

export function drawStones(ctx, board, m, size, lastMove) {
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const v = board[i][j];
      if (!v) continue;
      const { x, y } = cellToPixel(i, j, m);
      ctx.beginPath(); ctx.arc(x, y, m.stoneR, 0, 2 * Math.PI);
      ctx.fillStyle = v === 1 ? '#111' : '#f5f1e6';
      ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = v === 1 ? '#000' : '#9a8e72';
      ctx.stroke();
    }
  }
  if (lastMove) {
    const { x, y } = cellToPixel(lastMove[0], lastMove[1], m);
    ctx.beginPath(); ctx.arc(x, y, m.stoneR * 0.32, 0, 2 * Math.PI);
    ctx.fillStyle = lastMove[0] === 0 ? '#f5f1e6' : '#111'; // 标在最近一子的色块上
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#c0392b';
    ctx.stroke();
  }
}
```
追加防抛错测试：
```js
test('drawBoard/drawStones: mock ctx 不抛错', () => {
  const noop = () => {};
  const ctx = new Proxy({}, { get: () => () => undefined });
  const m = metrics(9, 540);
  const board = Array.from({ length: 9 }, () => new Array(9).fill(0));
  board[3][3] = 1; board[3][4] = 2;
  assert.doesNotThrow(() => { drawBoard(ctx, m, 9); drawStones(ctx, board, m, 9, [3, 3]); });
});
```
（在 import 行补 `drawBoard, drawStones`。）

- [ ] **Step 8: 运行测试确认通过**

```bash
node --test weiqi.test.js
```
期望：全部 PASS。

- [ ] **Step 9: 提交**

```bash
git add weiqi/render.js weiqi.test.js
git commit -m "feat(weiqi): render.js 棋盘度量/坐标映射/绘制 + 单测"
```

---

### Task 3: logic.js — 棋盘同步与状态机（TDD）

**Files:**
- Create: `weiqi/logic.js`
- Modify: `weiqi.test.js`（追加测试）

**Interfaces:**
- Produces:
  - `emptyBoard(size): number[size][size]` — 全 0。
  - `syncBoard(getCell, size): number[][]` — 调用 `getCell(i,j)`（返回 0/1/2）填满棋盘。worker 用它把 `_getBoard` 拍成二维数组。
  - `EMPTY=0, BLACK=1, WHITE=2`。
  - `applyMove(state, ai)` — 见 Task 5 主线程使用；本任务只做纯同步与常量。

- [ ] **Step 1: 写失败测试 — syncBoard 与 emptyBoard**

在 `weiqi.test.js` 追加：
```js
import { emptyBoard, syncBoard, EMPTY, BLACK, WHITE } from './weiqi/logic.js';

test('emptyBoard: 全 0', () => {
  const b = emptyBoard(9);
  assert.equal(b.length, 9);
  assert.equal(b[0].length, 9);
  assert.equal(b.every(r => r.every(c => c === 0)), true);
});

test('syncBoard: 由 getCell 回调填满', () => {
  const getCell = (i, j) => (i === 0 && j === 0) ? BLACK : (i === 1 && j === 1) ? WHITE : EMPTY;
  const b = syncBoard(getCell, 9);
  assert.equal(b[0][0], BLACK);
  assert.equal(b[1][1], WHITE);
  assert.equal(b[2][2], EMPTY);
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --test weiqi.test.js
```
期望：FAIL（logic.js 未定义）。

- [ ] **Step 3: 实现 logic.js**

```js
// 围棋状态/同步纯函数。无引擎、无 DOM。
export const EMPTY = 0, BLACK = 1, WHITE = 2;

export function emptyBoard(size) {
  return Array.from({ length: size }, () => new Array(size).fill(EMPTY));
}

export function syncBoard(getCell, size) {
  const b = emptyBoard(size);
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++)
      b[i][j] = getCell(i, j);
  return b;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
node --test weiqi.test.js
```
期望：全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add weiqi/logic.js weiqi.test.js
git commit -m "feat(weiqi): logic.js 棋盘同步/常量 + 单测"
```

---

### Task 4: weiqi.worker.js — 引擎消息封装

**Files:**
- Create: `weiqi/weiqi.worker.js`

**Interfaces:**
- Consumes: `weiqi/gnugo.js`（via `importScripts`）、`Module._*` API。
- Produces（worker→main 协议）：
  - `{ok:true, cmd:'init'}` — 引擎加载并初始化完成。
  - `{ok:true, cmd:'play', code:0, board, last}` — 人类落子成功，附全盘快照与最近一手。
  - `{ok:true, cmd:'play', code:-2}` — 非法落子。
  - `{ok:true, cmd:'genmove', pass:false, board, last}` — AI 落子成功。
  - `{ok:false, cmd, error}` — 任何异常。
- Consumes（main→worker）：
  - `{cmd:'init', size, seed}`
  - `{cmd:'play', i, j}`
  - `{cmd:'genmove'}`
- 本任务无单测（wasm 无法在 node 跑）；以代码审阅 + Task 7 人工对弈验证。worker 内逻辑尽量薄。

- [ ] **Step 1: 实现 worker**

创建 `weiqi/weiqi.worker.js`：
```js
// GNU Go worker：加载 gnugo.js，封装为消息接口。
// 主线程发 {cmd, ...}，worker 回 {ok, cmd, ...}。
let size = 0;
let Module = null;

function ready() {
  return Module && Module._initializeGoGame;
}

function snapshot() {
  const board = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) row.push(Module._getBoard(i, j));
    board.push(row);
  }
  let last = null;
  for (let i = 0; i < size && !last; i++)
    for (let j = 0; j < size && !last; j++)
      if (Module._isLastMove(i, j)) last = [i, j];
  return { board, last };
}

self.onmessage = (e) => {
  const { cmd } = e.data;
  try {
    if (cmd === 'init') {
      const { size: s, seed } = e.data;
      importScripts('./gnugo.js');   // 同步加载，8.9MB（worker 内可接受）
      Module = self.Module;
      Module.onRuntimeInitialized = () => {
        size = s;
        Module._initializeGoGame(s, 7.5, 0, seed | 0);
        self.postMessage({ ok: true, cmd: 'init', ...snapshot() });
      };
      return;
    }
    if (!ready()) { self.postMessage({ ok: false, cmd, error: 'engine not ready' }); return; }
    if (cmd === 'play') {
      const { i, j } = e.data;
      const code = Module._moveTo(i, j);
      if (code !== 0) { self.postMessage({ ok: true, cmd: 'play', code }); return; }
      self.postMessage({ ok: true, cmd: 'play', code: 0, ...snapshot() });
      return;
    }
    if (cmd === 'genmove') {
      Module._genNextStep();
      self.postMessage({ ok: true, cmd: 'genmove', pass: false, ...snapshot() });
      return;
    }
    self.postMessage({ ok: false, cmd, error: 'unknown cmd ' + cmd });
  } catch (err) {
    self.postMessage({ ok: false, cmd, error: String(err) });
  }
};
```

- [ ] **Step 2: 语法检查**

```bash
node --check weiqi/weiqi.worker.js && echo OK
```
期望：OK。

- [ ] **Step 3: 提交**

```bash
git add weiqi/weiqi.worker.js
git commit -m "feat(weiqi): weiqi.worker.js 封装 gnugo 引擎消息接口"
```

---

### Task 5: weiqi.css + index.html + 主线程控制器 weiqi.js

**Files:**
- Create: `weiqi/weiqi.css`
- Create: `weiqi/index.html`
- Create: `weiqi/weiqi.js`

**Interfaces:**
- Consumes: render.js（`metrics/pixelToCell/drawBoard/drawStones`）、logic.js（`emptyBoard/EMPTY/BLACK/WHITE`）、weiqi.worker.js（postMessage 协议）。
- 主线程状态机：`phase` ∈ `'idle'(未加载) | 'loading' | 'playing' | 'ai-thinking' | 'over'`；`turn` ∈ `'player' | 'ai'`。

- [ ] **Step 1: 写 weiqi.css**

```css
.weiqi-body { grid-template-columns: 1fr 240px; }
#board { background: #e8c989; border-radius: 6px; touch-action: none; }
.size-row, .ctrl-row { display: flex; gap: 8px; }
.size-btn, .ctrl-btn {
  flex: 1; padding: 8px 12px; border: 1px solid var(--border, #ccc);
  background: var(--panel, #fff); border-radius: 6px; cursor: pointer; font-size: 14px;
}
.size-btn.active { background: var(--ink, #222); color: #fff; border-color: var(--ink); }
.ctrl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.about { font-size: 11px; color: var(--muted); line-height: 1.6; }
.about a { color: var(--muted); text-decoration: underline; }
```

- [ ] **Step 2: 写 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>围棋 · 快乐小游戏</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/shared/theme.css">
  <link rel="stylesheet" href="/shared/game.css">
  <link rel="stylesheet" href="/weiqi/weiqi.css">
</head>
<body>
  <main class="game">
    <header class="game-header">
      <h1>围棋</h1>
      <a class="back" href="/board/">← 返回棋类竞技</a>
    </header>
    <section class="game-body weiqi-body">
      <div class="board-wrap">
        <canvas id="board" width="540" height="540" aria-label="围棋棋盘"></canvas>
      </div>
      <aside class="controls">
        <div class="difficulty">
          <div class="label">棋盘</div>
          <div class="size-row" role="radiogroup" aria-label="棋盘尺寸">
            <button type="button" data-size="9" class="size-btn active" aria-checked="true">9 路</button>
            <button type="button" data-size="13" class="size-btn">13 路</button>
          </div>
        </div>
        <div class="status" id="status" aria-live="polite">点击「开始对弈」加载引擎</div>
        <div class="ctrl-row">
          <button type="button" id="start" class="ctrl-btn">开始对弈</button>
          <button type="button" id="reset" class="ctrl-btn" disabled>重开</button>
        </div>
        <div class="ctrl-row">
          <button type="button" id="resign" class="ctrl-btn" disabled>认输</button>
        </div>
        <div class="about" id="about">
          引擎：GNU Go（经 emscripten）。<a href="https://www.gnu.org/software/gnugo/" target="_blank" rel="noopener">GNU Go</a> ·
          <a href="https://github.com/dna2ai/gnugo.js" target="_blank" rel="noopener">gnugo.js</a><br>
          你执黑先走，贴目 7.5。规则与 AI 在浏览器本地计算。
        </div>
      </aside>
    </section>
  </main>
  <script type="module" src="/weiqi/weiqi.js"></script>
</body>
</html>
```

- [ ] **Step 3: 写 weiqi.js（主线程控制器）**

```js
import { metrics, pixelToCell, drawBoard, drawStones } from './render.js';
import { emptyBoard, EMPTY, BLACK, WHITE } from './logic.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start');
const resetBtn = document.getElementById('reset');
const resignBtn = document.getElementById('resign');
const sizeBtns = document.querySelectorAll('.size-btn');

const state = {
  size: 9, board: emptyBoard(9), phase: 'idle', turn: 'player',
  worker: null, lastMove: null,
};

const CANVAS = 540;

function setStatus(t) { statusEl.textContent = t; }
function m() { return metrics(state.size, CANVAS); }
function draw() {
  ctx.clearRect(0, 0, CANVAS, CANVAS);
  drawBoard(ctx, m(), state.size);
  drawStones(ctx, state.board, m(), state.size, state.lastMove);
}
draw();

function ensureWorker() {
  if (state.worker) return state.worker;
  state.worker = new Worker('/weiqi/weiqi.worker.js', { type: 'classic' });
  state.worker.onmessage = onMsg;
  return state.worker;
}

function onMsg(e) {
  const d = e.data;
  if (!d.ok) { setStatus('引擎错误：' + (d.error || '?')); return; }
  if (d.cmd === 'init') {
    state.board = d.board; state.lastMove = d.last; state.phase = 'playing'; state.turn = 'player';
    setStatus('轮到你（黑）'); draw();
    startBtn.disabled = true; resetBtn.disabled = false; resignBtn.disabled = false;
    return;
  }
  if (d.cmd === 'play') {
    if (d.code === 0) {
      state.board = d.board; state.lastMove = d.last;
      state.turn = 'ai'; state.phase = 'ai-thinking'; setStatus('AI（白）思考中…'); draw();
      ensureWorker().postMessage({ cmd: 'genmove' });
    } else if (d.code === -2) {
      setStatus('此处不能落子（劫/禁手/已占），请另选'); state.turn = 'player';
    } else { setStatus('落子越界'); state.turn = 'player'; }
    return;
  }
  if (d.cmd === 'genmove') {
    state.board = d.board; state.lastMove = d.last;
    state.turn = 'player'; state.phase = 'playing'; setStatus('轮到你（黑）'); draw();
    return;
  }
}

function clickBoard(e) {
  if (state.phase !== 'playing' || state.turn !== 'player') return;
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
  const px = (e.clientX - rect.left) * sx, py = (e.clientY - rect.top) * sy;
  const cell = pixelToCell(px, py, m(), state.size);
  if (!cell) return;
  state.turn = 'ai';   // 防止重复点击，等 onMsg 纠正
  ensureWorker().postMessage({ cmd: 'play', i: cell[0], j: cell[1] });
}
canvas.addEventListener('click', clickBoard);

function start() {
  state.phase = 'loading'; setStatus('正在加载引擎…（约 9MB）');
  startBtn.disabled = true;
  ensureWorker().postMessage({ cmd: 'init', size: state.size, seed: (Date.now() & 0xffff) });
}
startBtn.addEventListener('click', start);

function reset() {
  state.board = emptyBoard(state.size); state.lastMove = null;
  state.phase = 'idle'; state.turn = 'player';
  startBtn.disabled = false; resetBtn.disabled = true; resignBtn.disabled = true;
  setStatus('点击「开始对弈」加载引擎'); draw();
}
resetBtn.addEventListener('click', reset);

function resign() {
  if (state.phase !== 'playing' && state.phase !== 'ai-thinking') return;
  state.phase = 'over';
  setStatus('你认输，AI（白）胜'); setStatus('你认输，AI（白）胜');
  resignBtn.disabled = true;
}
resignBtn.addEventListener('click', resign);

sizeBtns.forEach(b => b.addEventListener('click', () => {
  if (state.phase !== 'idle') { setStatus('请先重开再切换尺寸'); return; }
  sizeBtns.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
  b.classList.add('active'); b.setAttribute('aria-checked', 'true');
  state.size = +b.dataset.size; state.board = emptyBoard(state.size); draw();
}));
```

- [ ] **Step 4: 语法检查**

```bash
node --check weiqi/weiqi.js && node --check weiqi/weiqi.worker.js && echo OK
```
期望：OK。

- [ ] **Step 5: 提交**

```bash
git add weiqi/weiqi.css weiqi/index.html weiqi/weiqi.js
git commit -m "feat(weiqi): 主页面 + 主线程控制器（懒加载引擎、人机对弈）"
```

---

### Task 6: 在 landing.js 注册卡片 + package.json 测试 + sitemap

**Files:**
- Modify: `shared/landing.js`（board 板块 games 数组追加 weiqi）
- Modify: `package.json`（test 脚本加 weiqi.test.js）
- Modify: `sitemap.xml`（若存在，补 /weiqi/）

**Interfaces:**
- Produces: `/board/` 与首页出现围棋卡片；`npm test` 含 weiqi。

- [ ] **Step 1: 在 landing.js board.games 追加卡片**

在 `shared/landing.js` 的 `xiangqi` 卡片对象之后（board.games 数组内）追加：
```js
      {
        id: 'weiqi', name: '围棋',
        description: '人机对弈，内置 GNU Go 引擎',
        href: '/weiqi/', accent: '#1a1a1a',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8c989"/><g stroke="#3a2a1a" stroke-width="0.6">${Array.from({length:7},(_,i)=>`<line x1="${20+i*13.33}" y1="20" x2="${20+i*13.33}" y2="100"/>`).join('')}${Array.from({length:7},(_,i)=>`<line x1="20" y1="${20+i*13.33}" x2="100" y2="${20+i*13.33}"/>`).join('')}</g><circle cx="33.3" cy="33.3" r="6" fill="#111"/><circle cx="60" cy="60" r="6" fill="#f5f1e6" stroke="#9a8e72" stroke-width="0.6"/><circle cx="86.7" cy="86.7" r="6" fill="#111"/></svg>`,
      },
```

- [ ] **Step 2: package.json test 脚本加 weiqi.test.js**

把 `"test"` 行改为：
```json
"test": "node --test ai.test.js flappy.test.js sudoku.test.js sokoban.test.js hiking.test.js maze.test.js emperors.test.js xiangqi.test.js weiqi.test.js"
```

- [ ] **Step 3: sitemap 补 /weiqi/**

```bash
grep -q '/weiqi/' sitemap.xml || sed -i 's#</urlset>#  <url><loc>/weiqi/</loc></url>\n</urlset>#' sitemap.xml
grep -c '/weiqi/' sitemap.xml   # 期望 >=1
```

- [ ] **Step 4: 运行测试套件**

```bash
npm test 2>&1 | tail -8
```
期望：全部 PASS（含新增 weiqi.test.js）。

- [ ] **Step 5: 提交**

```bash
git add shared/landing.js package.json sitemap.xml
git commit -m "feat(weiqi): 注册首页/板块卡片、纳入测试、补 sitemap"
```

---

### Task 7: 人工对弈验证 + 部署

**Files:** 无（验证 + 部署）

- [ ] **Step 1: 本地对弈人工验证**

```bash
npx --yes http-server -p 8099 -c-1 .
# 浏览器 http://localhost:8099/weiqi/
```
逐项确认：
1. 进页显示空 9 路盘，状态「点击开始对弈加载引擎」。
2. 点「开始对弈」→ 显示「加载引擎」→ 数秒后「轮到你（黑）」，能落子。
3. 落黑子后 AI（白）应手，棋盘同步、提子正确。
4. 在劫/禁手处落子应提示「此处不能落子」且不改变盘面。
5. 切到 13 路（先重开再切）能正常对弈。
6. 点「认输」→ 显示「你认输，AI 胜」。
7. 「重开」恢复初始空盘。

- [ ] **Step 2: 部署**

```bash
npm run deploy 2>&1 | tail -10
```
期望：Deployment complete + 预览 URL。

- [ ] **Step 3: 提交（若有遗留改动）并结束**

```bash
git status --porcelain   # 期望干净（或仅 .gitignore 冒烟产物）
```

---

## Self-Review 已完成

- **Spec 覆盖**：架构（§3）→ Task1/4/5；文件组件（§4）→ 各 Task 文件清单吻合；Worker 接口（§5）→ Task4；数据流（§6）→ Task5 主线程 onMsg；§7 全部实测结论已纳入 Global Constraints 与 worker 实现；许可（§9）→ Task5 about 块；测试（§10）→ Task2/3 单测 + Task7 人工。
- **占位符扫描**：无 TBD/TODO；每个 code step 含完整代码。
- **类型一致性**：`pixelToCell(px,py,m,size)`、`metrics(size,canvasSize)`、`syncBoard(getCell,size)`、worker 协议 `{ok,cmd,...}` 在各 Task 间一致；`EMPTY/BLACK/WHITE=0/1/2` 与 `_getBoard` 返回值一致。
