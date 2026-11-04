# 围棋人机对战 · GNU Go 引擎设计

日期：2026-07-24
状态：已通过头脑风暴，待写实现计划

## 1. 目标

在 happygames（Cloudflare Pages 纯静态站）的「棋类竞技」板块新增一页围棋人机对战。

- 引擎：GNU Go，经 emscripten 编译为 JS（`dna2ai/gnugo.js`，MIT 封装层）。
- 全部在浏览器本地运行，无后端、无网络依赖（首次加载引擎除外）。
- 强度约 5 级（GNU Go 水平），面向休闲玩家。

## 2. 关键决策与取舍

| 维度 | 决策 | 理由 |
|------|------|------|
| 引擎 | GNU Go via gnugo.js | MiniGo/KataGo 浏览器版均无干净 license 或不可用；gnugo.js MIT、现成构建、纯搜索无 ML 风险 |
| 规则实现 | 全部交引擎，不自实现 | 规避提子/劫/禁手/数子的规则 bug 风险 |
| 棋盘尺寸 | 9 路 + 13 路（可切换），不做 19 路 | 上手快、AI 响应快、资产更轻；19 路思考慢 |
| 玩家执子 | 玩家执黑先走（固定），handicap=0，komi=7.5 | handicap>0 会让 AI 白先，与黑先冲突 |
| 难度 | 不调节（固定 GNU Go 默认级） | wrapper 未导出 level；改 wrapper 重编超范围 |
| 引擎加载 | 懒加载：进页面空棋盘 +「开始对弈」，点击后 worker 才 importScripts | 8.9MB 不应阻塞首屏 |
| 执行位置 | 引擎跑在 Web Worker | AI 思考不卡 UI（参照 gomoku ai.worker.js） |
| 悔棋 | 不支持 | 引擎内部状态难逐手回退 |
| 同步方式 | AI 落子后 `_getBoard()` 全盘同步回主线程重绘 | 不靠增量，最稳 |

## 3. 架构

```
主线程 weiqi.js        <──postMessage──>        weiqi.worker.js  ──> gnugo.js (GNU Go wasm)
渲染 canvas / 坐标映射 / 点击落子 / 状态      importScripts('gnugo.js')
                                          Module._initializeGoGame / _moveTo / _genNextStep / _getBoard / _finalizeGoGame
```

- 主线程不直接接触引擎；所有 `_` API 调用都在 worker 内。
- 通信为请求/响应式：主线程发 `{cmd, ...}`，worker 回 `{ok, ...}`。

## 4. 文件与组件

新建 `weiqi/` 目录：

- `index.html` — 复用 `shared/theme.css` + `shared/game.css` + `weiqi.css`。含 `<canvas id="board">`、侧栏：尺寸切换（9/13）、状态、按钮（开始对弈 / 重开 / 认输）。
- `weiqi.js` — 主线程控制器。职责：渲染棋盘与棋子、坐标↔像素映射、点击落子、向 worker 发指令、读回全盘同步重绘、轮次/结束状态显示。玩家黑先；AI 执白。
- `weiqi.css` — 棋盘、棋子、侧栏样式，与站内既有游戏页风格一致。
- `gnugo.js` — 直接放入 `dna2ai/gnugo.js` 仓库 `dist/gnugo.js`（约 8.9MB 单文件，MIT 封装）。
- `weiqi.worker.js` — Worker。`importScripts('gnugo.js')` 加载引擎，封装引擎调用为消息接口。
- `weiqi.test.js` — 轻量单测：坐标↔像素映射、棋盘数组同步、状态机（轮次/结束）。

`shared/landing.js`：在 `board` 板块的 `games` 数组追加一张卡片：
```
{ id:'weiqi', name:'围棋',
  description:'人机对弈，内置 GNU Go 引擎',
  href:'/weiqi/', accent:<调色>, previewSvg:<围棋盘 svg> }
```
另在 `sitemap.xml`、`robots.txt`（若需）补 `/weiqi/`。

## 5. Worker 消息接口（设计草案）

主线程 → worker：
- `{cmd:'init', size, seed}` → 初始化新局（内部固定 komi=7.5, handicap=0）。
- `{cmd:'play', i, j}` → 人类落子（i 行 j 列）。返回 `{ok, code}`，code 见 §7（0/-1/-2）。
- `{cmd:'genmove'}` → 让 AI 落子。返回 `{ok, i, j, pass?}`。
- `{cmd:'resign'}` → 人类认输（本地处理，不调引擎）。

worker → 主线程（每次 `play`/`genmove` 成功后附带）：
- `{board: number[size][size]}` — `_getBoard` 全盘快照（0 空 / 1 黑 / 2 白）。
- `{last:[i,j]}` — 最近一手坐标。

## 6. 数据流

1. 进页面 → 空棋盘 + 侧栏「开始对弈」按钮（引擎未加载）。
2. 点击「开始对弈」→ 显示「加载引擎…」→ worker `importScripts('gnugo.js')` → `init` → 进入对局，玩家黑先。
3. 玩家点击交叉点 → `play(i,j)` → 引擎判定：
   - 合法（code=0）：落子 → AI 思考 `genmove` → 返回 AI 落子 → 全盘同步重绘。
   - 非法（code=-2，劫/禁手/已占）：UI 提示，不改状态，重下。
4. 重复至玩家点「认输」（玩家负，结束）或双方虚手（弱终局，仅提示结束）。

## 7. 引擎 wrapper API 实测结论（已查 `gnugowrapper.c`）

- **无 level 入参**：`initializeGoGame(boardSize, komi, handicap, seed)` 不接受 level，内部固定 GNU Go 默认等级（约 level 3，即 5 级强度）。`set_level` 未导出。**结论：本次不做难度调节**（难度 UI 删除，避免误导）。若后续要难度，需改 `gnugowrapper.c` 加 `EMSCRIPTEN_KEEPALIVE setLevel(int)` 并重新 emscripten 编译——超出本期范围。
- **handicap 与黑先冲突**：`handicap>0` 时 wrapper 自动在黑方布让子并把 `to_move=WHITE`，即让子方执黑但白先走——与「玩家执黑先走」冲突。**结论：本期固定 `handicap=0`**，玩家黑先，komi 7.5。
- **moveTo 返回码明确**：`0`=成功，`-1`=越界，`-2`=非法（劫/禁手/已占）。UI 据此精确提示。
- **无 pass/score/resign 导出**：`_finalizeGoGame` 仅释放 SGF，不返回比分；无 `_pass`、无 `_score`、无 `_resign`。**结论：终局方式仅两种**——
  - 玩家点「认输」→ 本地判定玩家负，直接结束（不调引擎）。
  - 双方连续虚手 → 本期**无法从引擎取得精确比分**；按 `_getBoard` 盘面做粗略数子（仅活子数估算）或仅提示「对局结束（双方虚手）」，不宣称精确胜负。优先实现「认输」结束；「虚手」作为可选、弱终局。
- **genmove 的执子方**：`_genNextStep` 内部翻转 `computer_player` 后对 `to_move` 生成，逐手交替。按 test.html 模式：人类 `_moveTo` 后调 `_genNextStep` 即可让 AI 接走，引擎自动维护轮次。
- **Module 就绪**：emscripten `Module.onRuntimeInitialized` 回调就绪后才能调 `_initializeGoGame`；worker 须等就绪再响应 init。
- **8.9MB 单文件**：`dist/gnugo.js` 单文件（emscripten SINGLE_FILE，wasm 内嵌 base64）。无配套 `.wasm`。

## 8. 加载与性能

- `gnugo.js` 8.9MB 体积大 → 懒加载：首屏空棋盘，点击「开始对弈」后 worker 才加载，显示加载进度。
- AI 思考在 worker，主线程不阻塞。9 路思考快；13 路可能数秒（worker 内可接受）。

## 9. 许可与署名

- GNU Go 本体 GPLv2+，封装 `dna2ai/gnugo.js` 为 MIT。
- 页面加「关于/许可」说明，链接 GNU Go 源码与 gnugo.js 仓库（GPL 分发需提供对应源码入口，链接满足）。

## 10. 测试

- `weiqi.test.js`（node --test）：坐标↔像素映射、棋盘数组同步、状态机（轮次/结束判定）。
- 引擎行为不纳入单测（wasm 无法在 node 跑），靠手动对弈验证：合法落子、提子、劫、AI 应手、虚手结束。
