# 华夏帝王 改造设计

日期：2026-07-27
状态：已通过头脑风暴，待写实现计划

## 1. 目标

改造现有「华夏帝王」猜谜游戏（`emperors/`）。现状为 30 位帝王、限 10 次、第 6 次起逐项揭示朝代/即位年/在位/享年/身份的时间属性对比。

本次改造三项诉求：

1. **扩大名单** —— 改用「华夏大乱斗」(`battle/data/emperors.js`) 的帝王库（共 212 位），并为每位补充常用别名。
2. **加入别名** —— 输入本名/庙号/别称均可匹配。
3. **调整规则** —— 取消次数上限；提示改为「第 5 次起每次独立 50% 概率揭示」，命中时同时显示相似度与属性对比。

## 2. 关键决策与取舍

| 维度 | 决策 | 理由 |
|------|------|------|
| 名单来源 | 全量采用大乱斗 `EMPERORS_DATA`（212 位） | 用户明确要求；名单越大越耐玩 |
| 提示字段 | 弃用时间字段（即位年/在位/享年/庙号），改用 6 能力值 | 大乱斗数据无时间字段；不编造数据；能力值天然支持「更高/更低」方向对比 |
| 主名策略 | 有广为流传称号者主名用庙号/通行名（秦始皇/唐太宗/康熙…），本名入 aliases；无更广称号者（含努尔哈赤、皇太极及冷僻帝王）主名用大乱斗本名，aliases 可空或放庙号 | 与现状体感一致，「猜帝王」语义不丢；不强造别名。详 §4.1 A/B 两类 |
| 身份派生 | 由大乱斗 `tags` 派生：开国/末代/中兴/霸主/其余→继任 | 复用已有 tag，无需新数据；新增「霸主」覆盖春秋战国诸侯 |
| 朝代近邻 | 8 大时代群判定（同群不同朝代=近邻 near） | 比裸下标相邻更有历史感；上古/东周/秦汉/魏晋南北朝/隋唐/五代/宋辽金夏/元明清 |
| 能力值阈值 | 相等→correct；差 ≤8→near；否则 far +「答案更高/更低 N 点」 | 8 点阈值与相似度衰减刻度协调 |
| 揭示粒度 | 第 5 次起**每次独立** 50%（用 `Math.random()<0.5`） | 用户选定；有随机悬念 |
| 门控对象 | 50% 同时门控「相似度 + 属性 clues」 | 用户选定；reveal 单布尔同时控制，逻辑最简 |
| 次数 | 无上限 | 用户要求；新增「放弃，看答案」作为退出路径 |
| 持久化 | localStorage key 升 `emperors_state_v2` | 数据/规则均变，旧 `v1` 存档作废 |
| 仁君/暴君 tag | 暂不用（YAGNI） | 可作后续增强，不在本次范围 |

## 3. 架构

沿用项目「纯逻辑可测 + 薄控制器」分层，不变：

```
emperors/data/emperors.js   名单（212 位富化数据）
        │ import
emperors/logic.js           纯逻辑：findEmperor / pickEmperor / compareGuess / similarity
        │ import
emperors/emperors.js        控制器：UI 串联、localStorage、50% 随机、datalist
        │
emperors/index.html + emperors.css   视图与样式
```

- `logic.js` 不感知 DOM 与随机源（`compareGuess` 接收 `reveal` 布尔参数，由控制器决定是否揭示）。
- 50% 随机数生成在控制器内，保持逻辑层确定可测。

## 4. 数据模型

### 4.1 `emperors/data/emperors.js`

导出 `EMPERORS_DATA`：212 位，每位结构：

```js
{
  name: '秦始皇',              // 主名
  aliases: ['嬴政', '始皇帝', '祖龙'],  // 别名数组；冷僻帝王可为 []
  era: '秦',                   // 朝代/时代（沿用大乱斗）
  role: '开国',                // 身份（由 tags 派生）
  stats: { politics:95, military:88, strategy:90, diplomacy:70, literature:60, charm:92 }
}
```

**主名富化清单**（两类约定）：

- **A 类 — 主名用庙号/通行名**（大乱斗本名 → aliases 首位）。这类帝王有更广为流传的称号，主名取称号：

| 主名 | aliases（含本名） |
|------|------|
| 秦始皇 | 嬴政、始皇帝、祖龙 |
| 汉高祖 | 刘邦、汉高帝 |
| 汉文帝 | 刘恒 |
| 汉武帝 | 刘彻 |
| 汉宣帝 | 刘询、汉中宗 |
| 汉光武帝 | 刘秀、光武帝 |
| 汉献帝 | 刘协 |
| 魏文帝 | 曹丕 |
| 汉昭烈帝 | 刘备 |
| 吴大帝 | 孙权 |
| 晋武帝 | 司马炎 |
| 晋元帝 | 司马睿 |
| 隋文帝 | 杨坚 |
| 隋炀帝 | 杨广 |
| 唐高祖 | 李渊 |
| 唐太宗 | 李世民 |
| 武则天 | 武曌、武后 |
| 唐玄宗 | 李隆基、唐明皇 |
| 宋太祖 | 赵匡胤 |
| 宋仁宗 | 赵祯 |
| 辽太祖 | 耶律阿保机 |
| 金太祖 | 完颜阿骨打 |
| 宋高宗 | 赵构 |
| 元世祖 | 忽必烈 |
| 明太祖 | 朱元璋、洪武帝 |
| 明成祖 | 朱棣、永乐帝 |
| 崇祯帝 | 朱由检、明思宗 |
| 康熙帝 | 玄烨、清圣祖 |
| 雍正帝 | 胤禛、清世宗 |
| 乾隆帝 | 弘历、清高宗 |
| 成吉思汗 | 铁木真、元太祖 |

- **B 类 — 主名用本名**（大乱斗本名即最通行称呼，庙号 → aliases）。无更广称号，主名取本名：

| 主名 | aliases（含庙号） |
|------|------|
| 努尔哈赤 | 清太祖 |
| 皇太极 | 清太宗 |

其余约 179 位帝王：主名沿用大乱斗 `name`，`aliases` 为 `[]`（无广泛通行别名则不强造）。

**身份派生规则**（按 tags 优先级，命中即定）：

| tags 含 | role |
|---------|------|
| 开国 | 开国 |
| 末代 | 末代 |
| 中兴 | 中兴 |
| 霸主 | 霸主 |
| （以上皆无） | 继任 |

`ROLES = ['开国', '继任', '中兴', '末代', '霸主']`。

### 4.2 朝代大时代群（ERA 群）

```js
const ERA_GROUPS = [
  ['商', '西周'],                    // 上古
  ['春秋', '战国', '东周'],          // 东周
  ['秦', '西汉', '东汉', '新'],      // 秦汉
  ['三国魏', '三国蜀', '三国吴', '西晋', '东晋',
   '南朝宋', '南朝齐', '南朝梁', '南朝陈',
   '北魏', '北齐', '北周'],          // 魏晋南北朝
  ['隋', '唐', '武周'],              // 隋唐
  ['五代后梁', '五代后唐', '五代后晋', '五代后汉', '五代后周'],  // 五代
  ['北宋', '南宋', '辽', '金', '西夏'],  // 宋辽金夏
  ['元', '明', '清'],                // 元明清
];
```

同 era 必同群（correct）；不同 era 同群 → near（文案「同时代」）；不同群 → far + 方向（「你猜的时代更早/更晚」，按群下标判定）。

## 5. 核心逻辑（`logic.js`）

### 5.1 常量与导出

```js
export const HINT_START_ATTEMPT = 5;     // 第 5 次起可能揭示
export const ROLES = ['开国','继任','中兴','末代','霸主'];
export const STATS_KEYS = ['politics','military','strategy','diplomacy','literature','charm'];
export const STAT_LABELS = { politics:'政治', military:'军事', strategy:'谋略',
                             diplomacy:'外交', literature:'文学', charm:'魅力' };
export const NEAR_THRESHOLD = 8;         // 能力值近邻阈值
```

`MAX_ATTEMPTS` **删除**（无上限）。

### 5.2 函数签名

```js
export function normalize(name)              // trim + toLowerCase
export function findEmperor(name)            // 本名/别名匹配，返回条目或 null
export function pickEmperor(seed?)            // 同种子确定性；默认 Math.random
export function displayName(e)               // '秦始皇（嬴政）' 或纯名
export function similarity(answer, guess)    // 0-100 整数

// reveal: 是否揭示属性。false → 只回 {valid, correct, name}（无 sim、无 clues）
export function compareGuess(answer, guessName, attempt, { reveal } = { reveal: false })
```

### 5.3 揭示规则

`compareGuess` 行为：

- 未识别人名 → `{ valid:false, error }`。
- `reveal === false`（前 4 次，或第 5 次起掷骰未中）：返回 `{ valid:true, correct, name }`，**不含** `sim`、**不含** `clues`。
- `reveal === true`（第 5 次起掷骰命中）：返回 `{ valid:true, correct, name, sim, clues }`。猜中（`correct===true`）时仍不附 clues（无需）。

**控制器侧掷骰**：

```js
function shouldReveal(attempt) {
  return attempt >= HINT_START_ATTEMPT && Math.random() < 0.5;
}
```

每次 `makeGuess` 调用一次，传给 `compareGuess`。

### 5.4 相似度（0-100）

权重（合计 1.00）：朝代 0.22、身份 0.10、6 维各 0.1133（≈0.68，合计 1.00）。实现时以 `dynW=0.22, roleW=0.10, statW=(1-0.22-0.10)/6` 派生，避免手算误差。

- 朝代分：同 era=100；同群不同 era=60；不同群=10。
- 身份分：相同=100，否则 20。
- 能力值分：相等=100；否则 `max(10, round(100 - diff*4))`（diff=|答-猜|）。

加权求和后 `Math.round`。自身=100。

### 5.5 属性对比文案

每条 clue：`{ tone:'correct'|'near'|'far', text:string }`。

- **朝代** `compareEra(ans, guess)`：
  - 同 → `correct`，`同为 ${era}`
  - 同群 → `near`，`猜 ${g}，答 ${a} — 同时代`
  - 不同群 → `far`，`猜 ${g}，答 ${a} — 你猜的时代${更早|更晚}`（按群下标）
- **身份** `compareRole`：同 → `correct`，`同为${role}之君`；异 → `far`，`猜${g}之君，答${a}之君`
- **能力值** `compareStat(label, ans, guess)`：
  - 相等 → `correct`，`一致：${label} ${ans}`
  - 差 ≤8 → `near`，`猜 ${guess}，答 ${ans} — 接近`
  - 否则 → `far`，`猜 ${guess}，答 ${ans} — 答案${更高|更低} ${diff} 点`

## 6. 控制器（`emperors.js`）

### 6.1 状态

```js
const SAVED_KEY = 'emperors_state_v2';
state = {
  answerName: string,
  guesses: [],          // { attempt, name, correct, sim?, clues? }
  finished: false,
  won: false,
}
```

- `loadState`：仅校验 `answerName` 存在且 `!finished` 即可恢复（无次数上限，去掉旧的 `guesses.length < MAX_ATTEMPTS` 判断）。
- 旧 `emperors_state_v1` 不迁移（数据变，作废）。

### 6.2 流程

- `makeGuess`：
  1. 取输入、`findEmperor`，未识别 → 提示「未识别人名」。
  2. `attempt = guesses.length + 1`。
  3. `reveal = shouldReveal(attempt)`。
  4. `compareGuess(answer, name, attempt, { reveal })`。
  5. 推入 `guesses`；`correct` → `finished=true, won=true`。
  6. 保存、清空输入、重绘。
- `giveUp`（新）：`finished=true, won=false`，保存并重绘（揭示答案）。
- `newGame`：重抽答案、清 guesses。
- 不再有「机会用尽」分支；`setRemaining` 改为显示「已猜 N 次」。

### 6.3 渲染

- `guessRowHTML`：
  - 头部：`#attempt` + 名字 +（有 `sim` 时）`相似度 N%` 徽章。
  - `correct` → 「猜中了！」
  - 有 `clues` → 朝代 / 身份 / 6 能力值条目（共 8 条）。
  - 否则 → 「还未揭示，请继续猜」（第 5 次起未命中时亦显示此条）。
- 结果弹窗：猜中显示「🎉 猜中了！」；放弃显示「已放弃」；均展示答案 `displayName` + 朝代 + 身份 + 6 能力值概览。
- datalist：本名 + 全部别名。

## 7. 视图（`index.html` + `emperors.css`）

### index.html

- `<title>华夏帝王</title>` 不变。
- 玩法说明改为：
  - 「系统已随机选定一位中国古代帝王（商至清，200 余位）。**不限次数**，猜中为止。」
  - 「支持别名输入：李世民 = 唐太宗、刘彻 = 汉武帝、康熙帝 = 清圣祖 等。」
  - 「前 4 次只告知对/错；**第 5 次起，每次有 50% 概率**揭示朝代、身份与六维能力（政治/军事/谋略/外交/文学/魅力）的对比，并给出相似度。」
- 输入区下方「已猜 `<b id="count">0</b>` 次」取代「剩余机会」。
- 新增按钮 `<button id="giveup">放弃，看答案</button>`（与「猜测」并排或下排）。
- 图例：绿=一致、黄=接近（同代/能力差≤8）、灰=较远；能力值若答案更高/更低会显式标出点数差距。

### emperors.css

- 复用现有 `.guess-row / .clue / .clue-correct|near|far` 体系。
- 新增：6 条能力值提示的紧凑排版（标签列宽对齐朝代/身份，沿用 `flex 0 0 64px`）。
- `.emp-count`（已猜计数）样式类，替代 `.emp-remaining` 的次数语义。
- `.giveup-btn` 次要按钮样式（描边、非主红）。

## 8. 首页与板块卡（`shared/landing.js`）

`history` 板块 `emperors` 卡片描述更新：

```
description: '猜一位古代帝王，200 余位，不限次数，第 5 次起 50% 概率揭示属性对比'
```

（现状为「猜一位古代帝王，10 次机会，第 6 次起揭示属性对比」。）

`previewSvg` 不变。无新页面，`sitemap.xml` / `robots.txt` / `rss.xml` 不动。

## 9. 测试（`emperors.test.js`）

纯逻辑单测（不测 DOM），与项目惯例一致。覆盖：

1. **名单完整性**：每位含 `name/era/role/stats(6 维)`；`role ∈ ROLES`；`aliases` 为数组（可空）。
2. **姓名 + 别名全局唯一**（规范化后无重复）。
3. **ERA 群覆盖**：每位 `era` 必落在某个 ERA_GROUPS 内（无遗漏朝代）。
4. **role 派生**：抽查若干位（含开国/末代/中兴/霸主/继任）符合 tags 派生规则。
5. **findEmperor**：本名、别名、带空格、大小写、未知、空值。
6. **pickEmperor**：同种子确定性；`seed` 与 `seed + length` 同结果；遍历覆盖全表。
7. **compareGuess 签名**：
   - `reveal:false`（默认）→ 无 `sim`、无 `clues`。
   - `reveal:true` 且未中 → 有 `sim`、有 `clues`（含 8 条）。
   - `reveal:true` 且猜中 → `correct:true`、无 `clues`。
   - 未知人名 → `valid:false`。
8. **clues tone 与文案**：
   - 朝代同 → correct；同群不同 era → near（文案含「同时代」）；不同群 → far（文案含「更早」或「更晚」）。
   - 身份同 → correct；异 → far。
   - 能力值相等 → correct；差 ≤8 → near；差 >8 → far（文案含「更高」或「更低」+ 点数）。
9. **similarity**：自身=100；0-100 整数；同朝代+近能力 > 跨朝远者。
10. **HINT_START_ATTEMPT = 5**。
11. **displayName**：有别名 `名（别名0）`；无别名纯名。

`package.json` 测试脚本已含 `emperors.test.js`，无需改。

## 10. 文件改动清单

| 文件 | 改动 |
|------|------|
| `emperors/data/emperors.js` | **新建**，212 位富化名单 |
| `emperors/logic.js` | 重写：导入新数据、ERA 分群、role 派生、能力值版 compareGuess/similarity、`HINT_START_ATTEMPT=5`、去 `MAX_ATTEMPTS`、`compareGuess(..., {reveal})` |
| `emperors/emperors.js` | 控制器：去次数上限、加「放弃」按钮、50% 揭示掷骰、datalist、key 升 v2、结果弹窗文案 |
| `emperors/index.html` | 玩法说明、已猜计数、放弃按钮、图例 |
| `emperors/emperors.css` | 6 能力值提示排版、已猜计数、放弃按钮样式 |
| `emperors.test.js` | 重写：新名单、新签名、ERA 分群、能力值对比、`HINT_START_ATTEMPT=5`、无次数上限 |
| `shared/landing.js` | 帝王卡 description 更新 |

无新页面、无后端、无构建步骤。`package.json` / `sitemap.xml` / `robots.txt` / `rss.xml` 不动。

## 11. 非目标（YAGNI）

- 不补全时间字段（即位年/在位/享年/庙号）。
- 不使用仁君/暴君/暴政 tag 做提示（留待后续）。
- 不做难度分级、不做历史排行榜、不做分享卡片。
- 不迁移旧 `v1` 存档。
