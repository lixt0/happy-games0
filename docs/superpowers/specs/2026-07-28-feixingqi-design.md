# 在线飞行棋 设计

日期：2026-07-28
状态：已通过头脑风暴，待写实现计划

## 1. 目标

新建一款在线多人飞行棋（Ludo / 中国飞行棋），加入「棋类竞技」板块。

核心诉求：

1. **在线联机** —— 房主建房并选 2/3/4 人；通过房间号 + 密码邀请加入（复刻 `battle` 的联机模式）。
2. **空座 AI 补位** —— 空座位由 AI 机器人占据，可立即开局；单人也能开 4 人房自娱。
3. **经典飞行棋规则** —— 含跳格 +4、飞格跨板飞行等标志性机制。
4. **素材全部 emoji** —— 不引入任何图片资源文件。
5. **移动优先** —— 手机端可单手操作，触控目标足够大。

## 2. 关键决策与取舍

| 维度 | 决策 | 理由 |
|------|------|------|
| 联机架构 | 服务端权威 + HTTP 轮询，房间状态存 D1（仿 `battle_rooms`） | 项目无 WebSocket/Durable Objects；回合制游戏轮询完全够用；与现有 `battle` 模式一致、零新增基建 |
| 骰子/走子权威 | 全部服务端计算与校验；客户端仅渲染与提交意图 | 骰子是核心 RNG，客户端权威有作弊空间；服务端权威防作弊 |
| 逻辑分层 | 纯 ESM `engine.js` 被客户端、Pages Function、`node --test` 三方共享 | 单一事实源、零重复、全可测；仿 `gomoku/ai.js` 跨运行时共享模式 |
| 空座处理 | AI 机器人补位（房主 `start` 时把空座填成 AI） | 用户选定；冷启动也能开局；需要 AI 引擎，但本就要做 |
| 规则深度 | 经典飞行棋：跳格 +4、飞格跨板、吃子、掷 6 起飞、再掷、连三 6 作废、精确点数到家 | 用户选定；保留飞行棋身份特征 |
| 超时/掉线 | 人类座位 30s 无动作 → 本回合 AI 接管；持续挂机 → 常驻 AI（可「夺回」） | 用户选定；服务端 `tick` 在每次 `state` 轮询时推进，AI 与超时都在服务端 |
| 胜负 | 仅决第一名，4 架全部进老家即获胜、牌局结束 | 简化；YAGNI 不做完整 1-4 名排名赛 |
| 叠放 | 己方棋子可共存同格，不做连带移动 | 简化；规则一致性优先于复杂战术 |
| 棋子视觉 | ✈️ emoji 置于彩色圆片（红/黄/蓝/绿） | 经典飞行棋四色身份；纯 emoji + CSS 无图片 |
| 骰子视觉 | ⚀⚁⚂⚃⚄⚅ 按点数显示 | 原生 Unicode，免素材 |
| 座位顺序 | 固定红→黄→蓝→绿顺时针；2/3 人局只用前 N 座 | 简化分配逻辑，配色稳定 |
| 确定性 RNG | 工作流禁原生 `Math.random`；PRNG 以 `state.seed + 回合计数` 播种 | 保证可测、断点续跑一致 |

## 3. 架构

沿用项目「纯逻辑可测 + 薄控制器」分层：

```
feixingqi/engine.js          纯逻辑：rollDice/legalMoves/applyMove/absCell/tick/chooseAiMove
        │ import（客户端 <script type=module>、Pages Function esbuild、node --test 三方共享）
feixingqi/feixingqi.js        控制器：轮询、渲染、用户操作（掷骰/选子）
feixingqi/index.html + feixingqi.css    视图与样式（大厅 + 对局单页两视图）
        │
functions/api/feixingqi/*.js  服务端：create/join/start/state/roll/move（import engine.js）
```

- `engine.js` 不感知 DOM 与存储；纯函数，状态进、新状态出。
- 骰子随机源在 `engine.js` 内，以 `state.seed + 回合计数` 确定性生成（不调 `Math.random`）。
- 服务端 `tick` 在 `state` 端点响应前推进 AI 与超时，保证人类玩家轮询时看到的是最新合法局面。

**风险项（实现期验证）**：wrangler esbuild 跨目录 import（`functions/api/feixingqi/*.js` → `../../feixingqi/engine.js`）。预期可行；若打包报错，退路是把服务端所需最小校验逻辑内联进 function 文件（API 与状态契约不变）。spec 列为实现期第一步验证项。

## 4. 棋盘与规则

### 4.1 棋盘模型

- 外圈主跑道 **52 格**（每边 13 格 ×4），顺时针环绕。
- 4 角**机场**（base），每座 4 个停机位，每方 4 架飞机起步于此。
- 每方**起飞点** = 该方机场外的第一格；座位 entry 索引 `[0, 13, 26, 39]`（红/黄/蓝/绿）。
- 每方**终点跑道** 6 格，从主跑道分支通向中心**老家** 🏆；第 6 格即终点。
- 每方在主跑道上有两个同色特殊格：**跳格**（落地跳 +4）、**飞格**（落地飞越到对侧同名飞格）。可链式触发。

### 4.2 坐标系

- 引擎用**相对路径** `r`：本方视角 0..51 为跑道，52..57 为终点跑道，58 = 老家（完成）。
- `absCell(seat, r)` 把 `(seat, r∈0..51)` 映射为绝对格号 `(entry[seat] + r) % 52`，用于跨方吃子判定。
- 终点跑道为各方私有，不发生跨方碰撞，引擎用 `(seat, r)` 直接比较。

### 4.3 走子规则

1. 掷 6 才能从机场起飞一架到起飞点；未起飞且非 6 则跳过本回合。
2. 掷 6 再掷一次；**连续三个 6 → 本回合作废**，不移动，轮到下家。
3. 落到对手所在格 → **吃子**，对手回机场。落到己方棋子格 → 叠放共存（不连带移动）。
4. 落到己方同色跳格/飞格 → 自动跳跃/飞行，链式触发后再判吃子。
5. 进终点跑道需**精确点数**到家；越界则该子不可动。
6. 4 架全部进老家 → 该方获胜，牌局结束（仅决第一名）。

## 5. 状态模型

房间状态 `state`（存 D1 `feixingqi_rooms.state` JSON）：

```js
{
  phase: 'waiting'|'playing'|'finished',  // waiting=大厅等人加入；start 后直转 playing
  seatCount: 2|3|4,
  seats: [
    {
      username: 'alice' | null,      // null = 该座本就空，等加入或补 AI
      kind: 'human'|'ai',
      autoAi: false,                 // 人类挂机常驻转 AI 标志
      pieces: [{ loc:'base'|'track'|'home'|'done', r:int }],
      // 4 架；loc=base r 略；track r∈0..51；home r∈52..57；done r=58
    }, ...  // 长度 = seatCount
  ],
  turn: 0,              // 当前轮座位号
  dice: 0,              // 当前骰点（0=未掷）
  rolled: false,        // 当前玩家已掷未走
  consecSix: 0,         // 连续 6 计数
  lastActionAt: 0,      // 上次人类操作/轮切换时间戳（超时判定）
  seed: 12345,          // 确定性 PRNG 种子（建房时生成）
  turnCounter: 0,       // 已发生的「掷骰」次数，参与 PRNG 播种
  winner: null,         // 座位号或 null
  log: [],              // 最近事件（UI 滚动条），如 "🎲红掷6 ✈️红起飞 🛬黄被吃"
}
```

## 6. 服务端 API

Pages Function 端点（`functions/api/feixingqi/`），鉴权依赖 `_middleware` 的 `hg_token` → `sessions` → `username`。响应统一 JSON。

| 方法路径 | 入参 | 作用 |
|---|---|---|
| `POST create` | {password, seatCount} | 生成 4 位 code，房主占座位 0，kind=human，phase=waiting |
| `POST join` | {code, password, username} | 分配下一空人类座位；满则 409 |
| `POST start` | {code, username} | 仅房主；空座补 AI（kind=ai, username=null），phase 直转 playing，掷第一骰，turn=0 |
| `GET state?code=` | — | 跑 `tick(state)` 后返回完整状态（剔除 password） |
| `POST roll` | {code, username} | 当前人类轮且 rolled=false 时掷骰；写回 dice/rolled/turnCounter |
| `POST move` | {code, username, pieceId} | 选子走步；服务端用 `legalMoves` 校验后 `applyMove`，处理连掷/轮转/胜负 |

### 6.1 `tick(state)` 服务端懒执行

每次 `state` GET 响应前调用，确保 AI 与超时在服务端推进（人类客户端只轮询）：

- 若 `phase !== 'playing'` 直接返回。
- 若当前座 `kind === 'ai'`：跑完其整回合（掷骰 → `chooseAiMove` 选子 → `applyMove` → 处理连掷），直至轮到人类或回合结束；写回状态。
- 若当前座人类但 `now - lastActionAt > 30000`：本回合转 AI 接管（置临时 `autoAi` 标志），按 AI 路径执行一次回合；**连续 2 次**超时转 AI → 置 `autoAi=true` 常驻转 AI。
- 胜负判定后 `phase='finished'`、`winner=seat`。

## 7. AI 与超时

`chooseAiMove(state, seat, dice)`：

1. `legalMoves(state, seat, dice)` 枚举所有可动子及其落点。
2. 启发式打分择优（同分取靠前）：到家 > 吃子 > 落飞格/跳格推进 > 起飞（6 时）> 最靠近终点的子前进 > 其余。
3. 确定性 PRNG（`seed + turnCounter`）在并列时打破平局，保证可测与续跑一致。

超时：见 §6.1。人类挂机 30s → AI 接管本回合；连续 2 次超时 → 常驻 AI（`autoAi=true`）。玩家回来可点「夺回」按钮，仅在自己回合且当前未累计超时转 AI 时恢复手动。

## 8. 素材与 UI（移动优先）

**素材全部 emoji，无图片文件**：骰子 ⚀-⚅；棋子 ✈️ 置于彩色圆片（红/黄/蓝/绿）；老家中心 🏆；机场角 🛬；事件日志 emoji 前缀（🎲✈️🛬🏆）。

**单页两视图**（`index.html`）：

- **大厅**：房间号 + 密码分享、座位列表（人类/AI/空）、房主「开始游戏」键（≥1 人即可，空座补 AI）。
- **对局**：方形棋盘 + 底部操作栏 + 事件日志。

**移动适配**：

- viewport meta；棋盘正方形 `min(94vw, 58vh)`，CSS grid 布局，纵向为主、无横向滚动。
- 我的回合掷骰后，合法可动棋子高亮脉冲；点棋子 → 唯一合法步自动走，多合法步则高亮目标格点选。触摸目标 ≥40px。
- 底部拇指可达操作栏：大骰子键 / 当前轮指示 / 可折叠事件日志。
- 复用 `shared/theme.css`、`shared/game.css` 变量，支持暗色模式。

## 9. 轮询流程

- 大厅（phase=waiting）：每 2s 轮询；显示座位与房主开始键。
- 对局（phase=playing）：每 1.5s 轮询；渲染棋盘/棋子/骰子/当前轮/日志；我的回合且 rolled=true 时高亮合法子。
- AI 回合与超时均在服务端 `tick` 内推进，客户端下次轮询即见最新局面。
- 结束（phase=finished）：停止轮询，显示胜者与「再来一局/返回大厅」。

## 10. 测试

`feixingqi.test.js`（`node --test`，加入 `package.json` test 脚本）覆盖 `engine.js` 纯逻辑：

- 掷骰合法步枚举（含起飞需 6、越界不可动）。
- 吃子（跨方 `absCell` 碰撞）。
- 跳格 +4、飞格跨板、链式触发后再判吃子。
- 终点跑道精确到家、越界不可动。
- 连三 6 作废、掷 6 再掷、轮转顺序。
- 4 架到家 → 胜负判定、phase 转 finished。
- `chooseAiMove` 启发式 sanity（优先吃子/到家）。
- `tick`：AI 座自动跑完回合、人类超时转 AI、胜负后不再推进。

## 11. 落地清单

```
feixingqi/
  index.html, feixingqi.css, feixingqi.js, engine.js
feixingqi.test.js
functions/api/feixingqi/{create,join,start,state,roll,move}.js
schema.sql          # 追加 feixingqi_rooms 表
shared/landing.js   # 棋类竞技板块新增「飞行棋」卡
package.json        # test 脚本加 feixingqi.test.js
sitemap.xml         # 新增 /feixingqi/ 条目（如其他游戏一致）
```

## 12. 不做（YAGNI）

- 完整 1-4 名排名赛（仅第一名）。
- 棋子叠放连带移动。
- WebSocket / Durable Objects 实时推送（轮询足够）。
- 棋局回放、排行榜、聊天。
- 自定义规则房（跳格/飞格开关等）。
