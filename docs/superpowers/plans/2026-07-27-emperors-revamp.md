# 华夏帝王 改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「华夏帝王」的名单从 30 位换成华夏大乱斗的 212 位（含别名），提示改为朝代/身份/六维能力对比，取消次数上限，第 5 次起每次独立 50% 概率揭示。

**Architecture:** 沿用项目「纯逻辑可测 + 薄控制器」分层：`emperors/data/emperors.js`（数据）→ `emperors/logic.js`（纯逻辑，不感知 DOM/随机）→ `emperors/emperors.js`（控制器，含 50% 掷骰）→ `index.html`/`emperors.css`（视图）。50% 随机在控制器内，逻辑层 `compareGuess` 通过 `reveal` 布尔参数接收是否揭示，保持确定可测。

**Tech Stack:** Vanilla JS（ES modules，无构建）、Cloudflare Pages 静态站、`node:test` + `node:assert/strict` 单测、localStorage 持久化、Ma Shan Zheng 毛笔字国风。

## Global Constraints

- 平台/部署：Cloudflare Pages 纯静态，无后端、无构建步骤。所有 JS 用原生 ES module（`import`/`export`），`<script type="module">`。
- 测试运行器：`node --test <files>`。本项目测试命令见 `package.json`：`node --test ai.test.js flappy.test.js sudoku.test.js sokoban.test.js hiking.test.js maze.test.js emperors.test.js xiangqi.test.js weiqi.test.js jump.test.js`。本计划单测用 `node --test emperors.test.js`。
- 国风/暗色：复用 `/shared/theme.css`（含 `prefers-color-scheme: dark` 覆盖）与 `/shared/game.css`；样式变量用 `--ink/--muted/--accent-red/--bg/--radius` 等，不硬编码颜色（暗色模式会失效）。
- 数据来源：`emperors/data/emperors.js` 的 `stats`/`era`/`name` 必须与 `battle/data/emperors.js` 的 `EMPERORS_DATA` 完全一致（逐字抄录），不得改动数值；只新增 `aliases` 与 `role` 派生。
- 持久化 key：`emperors_state_v2`（旧 `emperors_state_v1` 作废，不迁移）。
- 提示常量：`HINT_START_ATTEMPT = 5`；无 `MAX_ATTEMPTS`（删除）。
- 别名匹配规范化：`normalize(name) = name.trim().toLowerCase()`。
- 不引入新依赖、不改 `package.json`/`sitemap.xml`/`robots.txt`/`rss.xml`。
- 提交规范：commit message 用 `feat(emperors): ...` / `test(emperors): ...` / `refactor(emperors): ...` / `style(emperors): ...`，结尾空行加 `Co-Authored-By: Claude <noreply@anthropic.com>`。

---

## File Structure

| 文件 | 责任 | 状态 |
|------|------|------|
| `emperors/data/emperors.js` | 导出 `EMPERORS_DATA`（212 位富化名单：name/aliases/era/role/stats）+ `ROLE_RULES` 派生表。纯数据，无逻辑。 | 新建 |
| `emperors/logic.js` | 纯逻辑：常量（HINT_START_ATTEMPT/ROLES/STATS_KEYS/STAT_LABELS/NEAR_THRESHOLD/ERA_GROUPS）、normalize/findEmperor/pickEmperor/displayName/similarity/compareGuess 及内部 compare* 函数。不 import DOM、不调 Math.random。 | 重写 |
| `emperors/emperors.js` | 控制器：状态机、localStorage(v2)、datalist、makeGuess(含 shouldReveal 掷骰)、giveUp、newGame、render。 | 重写 |
| `emperors/index.html` | 玩法说明、已猜计数、放弃按钮、图例、datalist 容器。 | 修改 |
| `emperors/emperors.css` | 6 能力值提示排版、已猜计数、放弃按钮样式。 | 修改 |
| `emperors.test.js` | 纯逻辑单测（不测 DOM）。 | 重写 |
| `shared/landing.js` | `history` 板块 `emperors` 卡 description 更新。 | 修改（1 行） |

---

## Task 1: 数据层 — `emperors/data/emperors.js`

**Files:**
- Create: `emperors/data/emperors.js`
- Test: `emperors.test.js`（本任务的断言并入 Task 3 的测试文件；此处先建数据，Task 2/3 写逻辑与测试）

**Interfaces:**
- Consumes: `battle/data/emperors.js` 的 `EMPERORS_DATA`（作为抄录源，**不 import**，逐字复制 stats/era/name）
- Produces: `export const EMPERORS_DATA`（212 位）、`export const ROLE_RULES`。供 `logic.js` import。

数据结构（每位）：
```js
{ name, aliases: string[], era, role, stats: {politics,military,strategy,diplomacy,literature,charm} }
```

`role` 由大乱斗 `tags`（去掉 `'帝王'` 后）按优先级派生。`ROLE_RULES`：
```js
export const ROLE_RULES = [
  { tag: '开国', role: '开国' },
  { tag: '末代', role: '末代' },
  { tag: '中兴', role: '中兴' },
  { tag: '霸主', role: '霸主' },
];
// tags 命中首个规则即取其 role；都不命中 → '继任'
```

**主名富化清单（A 类：主名=庙号/通行名，本名→aliases 首位）：**

| 主名 | aliases | 原 battle name |
|------|---------|----------------|
| 秦始皇 | ['嬴政','始皇帝','祖龙'] | 嬴政 |
| 汉高祖 | ['刘邦','汉高帝'] | 刘邦 |
| 汉文帝 | ['刘恒'] | 刘恒 |
| 汉武帝 | ['刘彻'] | 刘彻 |
| 汉宣帝 | ['刘询','汉中宗'] | 刘询 |
| 汉光武帝 | ['刘秀','光武帝'] | 刘秀 |
| 汉献帝 | ['刘协'] | 刘协 |
| 魏文帝 | ['曹丕'] | 曹丕 |
| 汉昭烈帝 | ['刘备'] | 刘备 |
| 吴大帝 | ['孙权'] | 孙权 |
| 晋武帝 | ['司马炎'] | 司马炎 |
| 晋元帝 | ['司马睿'] | 司马睿 |
| 隋文帝 | ['杨坚'] | 杨坚 |
| 隋炀帝 | ['杨广'] | 杨广 |
| 唐高祖 | ['李渊'] | 李渊 |
| 唐太宗 | ['李世民'] | 李世民 |
| 武则天 | ['武曌','武后'] | 武则天 |
| 唐玄宗 | ['李隆基','唐明皇'] | 李隆基 |
| 宋太祖 | ['赵匡胤'] | 赵匡胤 |
| 宋仁宗 | ['赵祯'] | 赵祯 |
| 辽太祖 | ['耶律阿保机'] | 耶律阿保机 |
| 金太祖 | ['完颜阿骨打'] | 完颜阿骨打 |
| 宋高宗 | ['赵构'] | 赵构 |
| 元世祖 | ['忽必烈'] | 忽必烈 |
| 明太祖 | ['朱元璋','洪武帝'] | 朱元璋 |
| 明成祖 | ['朱棣','永乐帝'] | 朱棣 |
| 崇祯帝 | ['朱由检','明思宗'] | 朱由检 |
| 康熙帝 | ['玄烨','清圣祖'] | 玄烨 |
| 雍正帝 | ['胤禛','清世宗'] | 胤禛 |
| 乾隆帝 | ['弘历','清高宗'] | 弘历 |
| 成吉思汗 | ['铁木真','元太祖'] | 铁木真 |

**B 类（主名=本名，庙号→aliases）：**

| 主名 | aliases | 原 battle name |
|------|---------|----------------|
| 努尔哈赤 | ['清太祖'] | 努尔哈赤 |
| 皇太极 | ['清太宗'] | 皇太极 |

**其余 179 位**：主名 = battle name，aliases = `[]`。

- [ ] **Step 1: 用脚本生成数据骨架，确保与 battle 一致**

为避免手抄 212 行数值出错，先用一次性脚本把 `battle/data/emperors.js` 转成新数据骨架（含正确 name/era/stats 与 role 派生），再把上面的 A/B 别名清单合并进去。脚本**只用于生成**，不留在仓库：

```bash
node -e "
import('./battle/data/emperors.js').then(m => {
  const RULES = [{tag:'开国',role:'开国'},{tag:'末代',role:'末代'},{tag:'中兴',role:'中兴'},{tag:'霸主',role:'霸主'}];
  const derive = tags => { for (const r of RULES) if (tags.includes(r.tag)) return r.role; return '继任'; };
  const lines = m.EMPERORS_DATA.map(e => {
    const s = e.stats;
    return \"  { name: '\"+e.name+\"', aliases: [], era: '\"+e.era+\"', role: '\"+derive(e.tags)+\"', stats: { politics:\"+s.politics+\", military:\"+s.military+\", strategy:\"+s.strategy+\", diplomacy:\"+s.diplomacy+\", literature:\"+s.literature+\", charm:\"+s.charm+\" } },\";
  });
  console.log(lines.join('\n'));
});
" > /tmp/emperors_skeleton.txt
```

打开 `/tmp/emperors_skeleton.txt` 检查：应有 212 行，每行一位；抽查 `嬴政` 的 role 应为 `开国`、`齐桓公` 应为 `霸主`、`刘彻` 应为 `继任`、`胡亥` 应为 `末代`。

- [ ] **Step 2: 创建 `emperors/data/emperors.js`，写入骨架 + 应用 A/B 别名**

```js
// 华夏帝王 — 名单数据（212 位）
// 数据来源：battle/data/emperors.js 的 EMPERORS_DATA（stats/era/name 逐字一致）。
// 本文件新增：aliases（常用别名）与 role（由 tags 派生）。

export const ROLE_RULES = [
  { tag: '开国', role: '开国' },
  { tag: '末代', role: '末代' },
  { tag: '中兴', role: '中兴' },
  { tag: '霸主', role: '霸主' },
];

export const EMPERORS_DATA = [
  // ===== 把 /tmp/emperors_skeleton.txt 的 212 行粘到这里 =====
];
```

粘贴骨架后，对 A 类 31 位 + B 类 2 位逐个改 `name` 与 `aliases`（用编辑器查找原 battle name 定位）。例：
- `嬴政` 行 → `name: '秦始皇', aliases: ['嬴政','始皇帝','祖龙'], era: '秦', role: '开国', ...`
- `努尔哈赤` 行 → `name: '努尔哈赤', aliases: ['清太祖'], ...`
- 其余行 `aliases: []` 保持不变。

- [ ] **Step 3: 校验数据完整性与一致性**

```bash
node -e "
import('./emperors/data/emperors.js').then(m => {
  const d = m.EMPERORS_DATA;
  console.log('count:', d.length);
  // 与 battle 逐一比对 stats/era/name（按 battle name 或 alias 对应）
  return import('./battle/data/emperors.js').then(b => {
    const bd = b.EMPERORS_DATA;
    const byBattleName = new Map(bd.map(e => [e.name, e]));
    let mismatch = 0;
    for (const e of d) {
      const src = byBattleName.get(e.name) || byBattleName.get(e.aliases[0]);
      if (!src) { console.log('NOT FOUND in battle:', e.name); mismatch++; continue; }
      for (const k of ['politics','military','strategy','diplomacy','literature','charm']) {
        if (e.stats[k] !== src.stats[k]) { console.log('STAT mismatch', e.name, k, e.stats[k], src.stats[k]); mismatch++; }
      }
      if (e.era !== src.era) { console.log('ERA mismatch', e.name); mismatch++; }
    }
    console.log('mismatch:', mismatch);
    // 别名全局唯一
    const keys = d.flatMap(e => [e.name, ...e.aliases].map(n => n.trim().toLowerCase()));
    console.log('dup keys:', keys.length - new Set(keys).size);
  });
});
"
```

Expected: `count: 212`、`mismatch: 0`、`dup keys: 0`。若有 mismatch/dup，修正数据后重跑。

- [ ] **Step 4: Commit**

```bash
git add emperors/data/emperors.js
git commit -m "$(cat <<'EOF'
feat(emperors): 新建 212 位帝王名单数据（含别名/role 派生）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 逻辑层 — `emperors/logic.js`（含内部 compare 函数）

**Files:**
- Modify (rewrite): `emperors/logic.js`
- Test: `emperors.test.js`（Task 3 写完整测试；本任务先让旧测试文件可被新逻辑替换——见 Step 1）

**Interfaces:**
- Consumes: `emperors/data/emperors.js` 的 `EMPERORS_DATA`、`ROLE_RULES`
- Produces: 导出 `HINT_START_ATTEMPT`、`ROLES`、`STATS_KEYS`、`STAT_LABELS`、`NEAR_THRESHOLD`、`ERA_GROUPS`、`normalize`、`findEmperor`、`pickEmperor`、`displayName`、`similarity`、`compareGuess`。供 `emperors.js` 与 `emperors.test.js` import。

- [ ] **Step 1: 清空旧测试文件，避免旧断言阻碍新逻辑**

旧 `emperors.test.js` 断言 `EMPERORS.length === 30`、`MAX_ATTEMPTS === 10` 等，与新设计冲突。先清空为最小占位（Task 3 再写完整）：

```js
import { test } from 'node:test';

test('placeholder — 逻辑待 Task 3 补全', () => {});
```

写完后运行 `node --test emperors.test.js`，Expected: PASS（1 test）。

- [ ] **Step 2: 重写 `emperors/logic.js`**

```js
// 华夏帝王 — 纯逻辑（供单元测试，不含渲染与随机源）
import { EMPERORS_DATA, ROLE_RULES } from './data/emperors.js';

export const HINT_START_ATTEMPT = 5;
export const ROLES = ['开国', '继任', '中兴', '末代', '霸主'];
export const STATS_KEYS = ['politics', 'military', 'strategy', 'diplomacy', 'literature', 'charm'];
export const STAT_LABELS = {
  politics: '政治', military: '军事', strategy: '谋略',
  diplomacy: '外交', literature: '文学', charm: '魅力',
};
export const NEAR_THRESHOLD = 8;

// 8 大时代群：同群不同朝代算近邻
export const ERA_GROUPS = [
  ['商', '西周'],
  ['春秋', '战国', '东周'],
  ['秦', '西汉', '东汉', '新'],
  ['三国魏', '三国蜀', '三国吴', '西晋', '东晋',
   '南朝宋', '南朝齐', '南朝梁', '南朝陈', '北魏', '北齐', '北周'],
  ['隋', '唐', '武周'],
  ['五代后梁', '五代后唐', '五代后晋', '五代后汉', '五代后周'],
  ['北宋', '南宋', '辽', '金', '西夏'],
  ['元', '明', '清'],
];

function eraGroupIndex(era) {
  for (let i = 0; i < ERA_GROUPS.length; i++) {
    if (ERA_GROUPS[i].includes(era)) return i;
  }
  return -1;
}

export function normalize(name) {
  return (name || '').trim().toLowerCase();
}

// 本名 + 别名 → 条目
const byKey = Object.fromEntries(
  EMPERORS_DATA.flatMap(e => [e.name, ...e.aliases].map(n => [normalize(n), e]))
);

export function findEmperor(name) {
  if (!name) return null;
  return byKey[normalize(name)] || null;
}

export function pickEmperor(seed) {
  if (typeof seed === 'number' && !Number.isNaN(seed)) {
    return EMPERORS_DATA[Math.floor(Math.abs(seed)) % EMPERORS_DATA.length];
  }
  return EMPERORS_DATA[Math.floor(Math.random() * EMPERORS_DATA.length)];
}

export function displayName(e) {
  if (!e) return '';
  return e.aliases && e.aliases.length ? `${e.name}（${e.aliases[0]}）` : e.name;
}

// ---- 相似度 ----
const DYN_W = 0.22;
const ROLE_W = 0.10;
const STAT_W = (1 - DYN_W - ROLE_W) / STATS_KEYS.length; // 6 维均分

function dynScore(ansEra, guessEra) {
  if (ansEra === guessEra) return 100;
  const ai = eraGroupIndex(ansEra), gi = eraGroupIndex(guessEra);
  if (ai === -1 || gi === -1) return 10;
  return ai === gi ? 60 : 10;
}

function roleScore(ans, guess) {
  return ans === guess ? 100 : 20;
}

function statScore(ans, guess) {
  if (guess === ans) return 100;
  const ad = Math.abs(ans - guess);
  return Math.max(10, Math.round(100 - ad * 4));
}

export function similarity(answer, guess) {
  const dynS = dynScore(answer.era, guess.era);
  const roleS = roleScore(answer.role, guess.role);
  let score = dynS * DYN_W + roleS * ROLE_W;
  for (const k of STATS_KEYS) {
    score += statScore(answer.stats[k], guess.stats[k]) * STAT_W;
  }
  return Math.round(score);
}

// ---- 属性对比文案 ----
// { tone: 'correct'|'near'|'far', text: string }

function compareEra(ans, guess) {
  if (ans.era === guess.era) return { tone: 'correct', text: `同为 ${ans.era}` };
  const ai = eraGroupIndex(ans.era), gi = eraGroupIndex(guess.era);
  if (ai !== -1 && gi !== -1 && ai === gi) {
    return { tone: 'near', text: `猜 ${guess.era}，答 ${ans.era} — 同时代` };
  }
  const order = gi < ai ? '更早' : '更晚';
  return { tone: 'far', text: `猜 ${guess.era}，答 ${ans.era} — 你猜的时代${order}` };
}

function compareRole(ans, guess) {
  if (ans.role === guess.role) return { tone: 'correct', text: `同为${ans.role}之君` };
  return { tone: 'far', text: `猜${guess.role}之君，答${ans.role}之君` };
}

function compareStat(label, ansVal, guessVal) {
  if (guessVal === ansVal) return { tone: 'correct', text: `一致：${label} ${ansVal}` };
  const diff = Math.abs(ansVal - guessVal);
  if (diff <= NEAR_THRESHOLD) return { tone: 'near', text: `猜 ${guessVal}，答 ${ansVal} — 接近` };
  const dir = ansVal > guessVal ? '更高' : '更低';
  return { tone: 'far', text: `猜 ${guessVal}，答 ${ansVal} — 答案${dir} ${diff} 点` };
}

// reveal=false → 只回 {valid, correct, name}（无 sim/clues）
// reveal=true  → 附 sim；未中且 reveal → 附 clues；猜中不附 clues
export function compareGuess(answer, guessName, attempt, { reveal = false } = {}) {
  const guess = findEmperor(guessName);
  if (!guess) return { valid: false, error: `未识别人名：${guessName}` };
  const correct = guess.name === answer.name;
  const result = { valid: true, correct, name: guess.name };
  if (correct) return result;
  if (!reveal) return result;
  result.sim = similarity(answer, guess);
  result.clues = {
    era: compareEra(answer, guess),
    role: compareRole(answer, guess),
  };
  for (const k of STATS_KEYS) {
    result.clues[k] = compareStat(STAT_LABELS[k], answer.stats[k], guess.stats[k]);
  }
  return result;
}
```

- [ ] **Step 3: 烟囱测试（smoke test）逻辑可加载**

```bash
node -e "
import('./emperors/logic.js').then(m => {
  const a = m.findEmperor('唐太宗');
  console.log('find:', a && a.name, a && a.era, a && a.role);
  console.log('alias 刘彻 ->', m.findEmperor('刘彻').name);
  const r0 = m.compareGuess(a, '秦始皇', 1);
  console.log('reveal=false:', JSON.stringify(r0));
  const r1 = m.compareGuess(a, '秦始皇', 6, { reveal: true });
  console.log('reveal=true keys:', Object.keys(r1), 'clueKeys:', Object.keys(r1.clues || {}));
  console.log('sim self:', m.similarity(a, a));
});
"
```

Expected: `find: 唐太宗 唐 中兴`、`alias 刘彻 -> 汉武帝`、`reveal=false` 只有 `valid,correct,name` 三键、`reveal=true` 含 `sim` 与 `clues`（8 键：era/role/6 维）、`sim self: 100`。

- [ ] **Step 4: Commit**

```bash
git add emperors/logic.js emperors.test.js
git commit -m "$(cat <<'EOF'
refactor(emperors): 重写逻辑层（能力值提示/ERA 分群/compareGuess reveal）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 逻辑层完整测试 — `emperors.test.js`

**Files:**
- Modify (rewrite): `emperors.test.js`

**Interfaces:**
- Consumes: `emperors/logic.js` 全部导出、`emperors/data/emperors.js` 的 `EMPERORS_DATA`/`ROLE_RULES`、`battle/data/emperors.js`（仅用于 role 派生校验对比）

- [ ] **Step 1: 写完整测试文件**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPERORS_DATA, ROLE_RULES,
} from './emperors/data/emperors.js';
import { EMPERORS_DATA as BATTLE_DATA } from './battle/data/emperors.js';
import {
  HINT_START_ATTEMPT, ROLES, STATS_KEYS, STAT_LABELS, NEAR_THRESHOLD, ERA_GROUPS,
  normalize, findEmperor, pickEmperor, displayName, similarity, compareGuess,
} from './emperors/logic.js';

const STAT_KEYS = STATS_KEYS;

test('名单完整性：212 位，字段齐全', () => {
  assert.equal(EMPERORS_DATA.length, 212);
  for (const e of EMPERORS_DATA) {
    assert.ok(typeof e.name === 'string' && e.name.length > 0);
    assert.ok(typeof e.era === 'string' && e.era.length > 0);
    assert.ok(ROLES.includes(e.role), `非法 role: ${e.name}=${e.role}`);
    assert.ok(Array.isArray(e.aliases));
    for (const k of STAT_KEYS) {
      assert.ok(Number.isInteger(e.stats[k]) && e.stats[k] >= 0 && e.stats[k] <= 100, `${e.name}.${k} 非法`);
    }
  }
});

test('stats/era/name 与 battle 数据一致', () => {
  const byBattle = new Map(BATTLE_DATA.map(e => [e.name, e]));
  for (const e of EMPERORS_DATA) {
    const src = byBattle.get(e.name) || byBattle.get(e.aliases[0]);
    assert.ok(src, `battle 找不到 ${e.name}`);
    assert.equal(e.era, src.era);
    for (const k of STAT_KEYS) assert.equal(e.stats[k], src.stats[k]);
  }
});

test('姓名 + 别名 全局唯一（规范化后）', () => {
  const keys = EMPERORS_DATA.flatMap(e => [e.name, ...e.aliases].map(n => normalize(n)));
  assert.equal(new Set(keys).size, keys.length);
});

test('ERA 群覆盖：每位 era 必落在某群', () => {
  const all = new Set(ERA_GROUPS.flat());
  for (const e of EMPERORS_DATA) assert.ok(all.has(e.era), `era 未分组: ${e.era}`);
});

test('role 派生符合 ROLE_RULES', () => {
  const byBattle = new Map(BATTLE_DATA.map(e => [e.name, e]));
  function expectedRole(tags) {
    for (const r of ROLE_RULES) if (tags.includes(r.tag)) return r.role;
    return '继任';
  }
  for (const e of EMPERORS_DATA) {
    const src = byBattle.get(e.name) || byBattle.get(e.aliases[0]);
    assert.equal(e.role, expectedRole(src.tags), `${e.name} role 派生错`);
  }
});

test('findEmperor：本名/别名/空格/大小写/未知/空', () => {
  assert.equal(findEmperor('唐太宗').name, '唐太宗');
  assert.equal(findEmperor('李世民').name, '唐太宗');
  assert.equal(findEmperor('刘彻').name, '汉武帝');
  assert.equal(findEmperor('康熙帝').name, '康熙帝');
  assert.equal(findEmperor('努尔哈赤').name, '努尔哈赤');
  assert.equal(findEmperor('清太祖').name, '努尔哈赤'); // 别名回查 B 类
  assert.equal(findEmperor(' 李世民 ').name, '唐太宗');
  assert.equal(findEmperor(''), null);
  assert.equal(findEmperor(null), null);
  assert.equal(findEmperor('不存在的人'), null);
});

test('pickEmperor：同种子确定性 + 覆盖全表', () => {
  assert.equal(pickEmperor(7).name, pickEmperor(7).name);
  assert.equal(pickEmperor(7 + EMPERORS_DATA.length).name, pickEmperor(7).name);
  const names = new Set();
  for (let i = 0; i < EMPERORS_DATA.length; i++) names.add(pickEmperor(i).name);
  assert.equal(names.size, EMPERORS_DATA.length);
});

test('compareGuess：reveal=false 无 sim/clues', () => {
  const a = findEmperor('汉武帝');
  const r = compareGuess(a, '秦始皇', 1);
  assert.equal(r.valid, true);
  assert.equal(r.correct, false);
  assert.equal(r.sim, undefined);
  assert.equal(r.clues, undefined);
});

test('compareGuess：reveal=true 未中 → 有 sim + 8 条 clues', () => {
  const a = findEmperor('汉武帝');
  const r = compareGuess(a, '秦始皇', 6, { reveal: true });
  assert.equal(r.correct, false);
  assert.ok(typeof r.sim === 'number');
  assert.ok(r.clues);
  const keys = ['era', 'role', ...STAT_KEYS];
  for (const k of keys) {
    const c = r.clues[k];
    assert.ok(c, `缺 clue ${k}`);
    assert.ok(['correct', 'near', 'far'].includes(c.tone), `${k} tone 非法`);
    assert.ok(typeof c.text === 'string' && c.text.length > 0, `${k} 无文案`);
  }
});

test('compareGuess：猜中不附 clues（即便 reveal=true）', () => {
  const a = findEmperor('汉武帝');
  const r = compareGuess(a, '汉武帝', 6, { reveal: true });
  assert.equal(r.correct, true);
  assert.equal(r.clues, undefined);
});

test('compareGuess：未知人名 → valid=false', () => {
  const r = compareGuess(findEmperor('汉武帝'), '不存在', 1, { reveal: true });
  assert.equal(r.valid, false);
});

test('clue·朝代：同 → correct；同群 → near（含「同时代」）；不同群 → far（含「更早/更晚」）', () => {
  const same = compareGuess(findEmperor('汉武帝'), '汉文帝', 6, { reveal: true });
  assert.equal(same.clues.era.tone, 'correct');
  // 西汉 vs 东汉 同群 → near
  const near = compareGuess(findEmperor('汉光武帝'), '汉武帝', 6, { reveal: true });
  assert.equal(near.clues.era.tone, 'near');
  assert.match(near.clues.era.text, /同时代/);
  // 秦 vs 清 不同群 → far
  const far = compareGuess(findEmperor('清高宗'), '秦始皇', 6, { reveal: true });
  assert.equal(far.clues.era.tone, 'far');
  assert.match(far.clues.era.text, /更早|更晚/);
});

test('clue·身份：同 → correct；异 → far', () => {
  const a = findEmperor('汉武帝'); // 继任
  const sameRole = EMPERORS_DATA.find(e => e.role === '继任' && e.name !== a.name);
  const r = compareGuess(a, sameRole.name, 6, { reveal: true });
  assert.equal(r.clues.role.tone, 'correct');
  const diff = compareGuess(a, '秦始皇', 6, { reveal: true }); // 开国
  assert.equal(diff.clues.role.tone, 'far');
});

test('clue·能力值：相等 correct；差≤8 near；差>8 far（含「更高/更低」+ 点数）', () => {
  const a = findEmperor('汉武帝');
  // 找一个某维相等、一个差≤8、一个差>8 的对象
  const r = compareGuess(a, '秦始皇', 6, { reveal: true });
  for (const k of STAT_KEYS) {
    const c = r.clues[k];
    const diff = Math.abs(a.stats[k] - findEmperor('秦始皇').stats[k]);
    if (diff === 0) assert.equal(c.tone, 'correct', `${k} 应 correct`);
    else if (diff <= NEAR_THRESHOLD) assert.equal(c.tone, 'near', `${k} 应 near`);
    else { assert.equal(c.tone, 'far', `${k} 应 far`); assert.match(c.text, /更高|更低/); assert.match(c.text, /\d+ 点/); }
  }
});

test('similarity：自身=100；0-100 整数；同朝近能力 > 跨朝远者', () => {
  for (const e of EMPERORS_DATA.slice(0, 10)) assert.equal(similarity(e, e), 100);
  for (let i = 0; i < 50; i++) {
    const a = pickEmperor(i), b = pickEmperor(i + 7);
    if (a.name === b.name) continue;
    const s = similarity(a, b);
    assert.ok(Number.isInteger(s) && s >= 0 && s < 100, `s=${s}`);
  }
  const sameDyn = similarity(findEmperor('唐太宗'), findEmperor('唐玄宗'));
  const far = similarity(findEmperor('秦始皇'), findEmperor('清高宗'));
  assert.ok(sameDyn > far, `${sameDyn} 应 > ${far}`);
});

test('常量', () => {
  assert.equal(HINT_START_ATTEMPT, 5);
  assert.deepEqual(ROLES, ['开国', '继任', '中兴', '末代', '霸主']);
  assert.equal(NEAR_THRESHOLD, 8);
  assert.deepEqual(STAT_KEYS, ['politics', 'military', 'strategy', 'diplomacy', 'literature', 'charm']);
});

test('displayName：有别名「名（别名0）」；无别名纯名', () => {
  assert.equal(displayName(findEmperor('唐太宗')), '唐太宗（李世民）');
  assert.equal(displayName(findEmperor('秦始皇')), '秦始皇（嬴政）');
  const noAlias = EMPERORS_DATA.find(e => e.aliases.length === 0);
  assert.equal(displayName(noAlias), noAlias.name);
});
```

- [ ] **Step 2: 运行测试，全部通过**

Run: `node --test emperors.test.js`
Expected: 全部 PASS（约 14 个 test）。若有失败，修正 `logic.js` 或 `data/emperors.js` 后重跑，**不改测试预期来迁就实现**。

- [ ] **Step 3: 跑全量测试，确保未破坏其他游戏**

Run: `npm test`
Expected: 所有测试 PASS（含 emperors）。若其他测试因 import 路径受影响，检查是否误改了公共文件。

- [ ] **Step 4: Commit**

```bash
git add emperors.test.js
git commit -m "$(cat <<'EOF'
test(emperors): 完整逻辑单测（名单/ERA/role/能力值对比/similarity）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 控制器 — `emperors/emperors.js`

**Files:**
- Modify (rewrite): `emperors/emperors.js`

**Interfaces:**
- Consumes: `emperors/logic.js` 的 `EMPERORS_DATA`（经 data）、`HINT_START_ATTEMPT`、`pickEmperor`、`findEmperor`、`compareGuess`、`displayName`、`STATS_KEYS`、`STAT_LABELS`
- Produces: 页面行为（无导出，`<script type="module">` 直接执行）。依赖 `index.html` 的 DOM id：`count`/`history`/`result`/`guess-input`/`guess-btn`/`giveup`/`emperor-list`。

- [ ] **Step 1: 重写控制器**

```js
// 华夏帝王控制器：UI 与流程串联
import {
  EMPERORS_DATA, HINT_START_ATTEMPT, STATS_KEYS, STAT_LABELS,
  pickEmperor, findEmperor, compareGuess, displayName,
} from './logic.js';

const SAVED_KEY = 'emperors_state_v2';

const countEl = document.getElementById('count');
const historyEl = document.getElementById('history');
const resultEl = document.getElementById('result');
const inputEl = document.getElementById('guess-input');
const btnEl = document.getElementById('guess-btn');
const giveupBtnEl = document.getElementById('giveup');
const datalistEl = document.getElementById('emperor-list');

function buildDatalist() {
  const names = EMPERORS_DATA.flatMap(e => [e.name, ...(e.aliases || [])]);
  datalistEl.innerHTML = names.map(n => `<option value="${n}">`).join('');
}
buildDatalist();

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    if (s && s.answerName && !s.finished) return s;
  } catch {}
  return null;
}

function saveState(state) {
  try {
    if (state) localStorage.setItem(SAVED_KEY, JSON.stringify(state));
    else localStorage.removeItem(SAVED_KEY);
  } catch {}
}

// 第 5 次起每次独立 50% 概率揭示
function shouldReveal(attempt) {
  return attempt >= HINT_START_ATTEMPT && Math.random() < 0.5;
}

let state;
{
  const saved = loadState();
  if (saved) {
    state = saved;
  } else {
    const answer = pickEmperor();
    state = { answerName: answer.name, guesses: [], finished: false, won: false };
    saveState(state);
  }
}

render();

function renderClue(label, clue) {
  return `<div class="clue clue-${clue.tone}">
    <span class="clue-label">${label}</span>
    <span class="clue-text">${clue.text}</span>
  </div>`;
}

function guessRowHTML(g) {
  const cls = g.correct ? 'correct' : 'wrong';
  let html = `<div class="guess-row ${cls}">`;
  html += `<div class="guess-head"><span class="guess-no">#${g.attempt}</span><span class="guess-name">${g.name}</span>`;
  if (g.sim != null) html += `<span class="guess-sim">相似度 ${g.sim}%</span>`;
  html += `</div>`;
  if (g.correct) {
    html += `<div class="guess-result ok">猜中了！</div>`;
  } else if (g.clues) {
    html += `<div class="clues">`;
    html += renderClue('朝代', g.clues.era);
    html += renderClue('身份', g.clues.role);
    for (const k of STATS_KEYS) html += renderClue(STAT_LABELS[k], g.clues[k]);
    html += `</div>`;
  } else {
    html += `<div class="guess-result">还未揭示，请继续猜</div>`;
  }
  html += `</div>`;
  return html;
}

function answerSummaryHTML() {
  const a = findEmperor(state.answerName);
  const statsLine = STATS_KEYS.map(k => `${STAT_LABELS[k]} ${a.stats[k]}`).join(' · ');
  return `<p class="emp-meta">答案是 <span class="emp-answer">${displayName(a)}</span>（${a.era} · ${a.role}）</p>
    <p class="emp-meta">${statsLine}</p>`;
}

function render() {
  countEl.textContent = state.guesses.length;
  historyEl.innerHTML = state.guesses.map(guessRowHTML).join('');
  if (state.finished) {
    resultEl.classList.remove('hidden');
    resultEl.classList.toggle('win', state.won);
    resultEl.classList.toggle('lose', !state.won);
    resultEl.innerHTML = `
      <p class="emp-title">${state.won ? '🎉 猜中了！' : '已放弃'}</p>
      ${answerSummaryHTML()}
      <button type="button" id="again" class="reset-btn">再来一局</button>
    `;
    document.getElementById('again').addEventListener('click', newGame);
    inputEl.disabled = true;
    btnEl.disabled = true;
    giveupBtnEl.disabled = true;
  } else {
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';
    inputEl.disabled = false;
    btnEl.disabled = false;
    giveupBtnEl.disabled = false;
  }
}

function makeGuess() {
  if (state.finished) return;
  const name = inputEl.value.trim();
  if (!name) return;
  const guess = findEmperor(name);
  if (!guess) {
    resultEl.classList.remove('hidden');
    resultEl.classList.remove('win', 'lose');
    resultEl.innerHTML = `<p class="emp-title" style="color:var(--accent-red)">未识别人名</p>
      <p class="emp-meta">「${name}」不在帝王名单中。请从下拉选取或输入规范名。</p>`;
    return;
  }
  const attempt = state.guesses.length + 1;
  const reveal = shouldReveal(attempt);
  const result = compareGuess(findEmperor(state.answerName), guess.name, attempt, { reveal });
  if (!result.valid) return;
  const entry = { attempt, name: result.name, correct: result.correct };
  if (result.sim != null) entry.sim = result.sim;
  if (result.clues) entry.clues = result.clues;
  state.guesses.push(entry);
  if (result.correct) { state.finished = true; state.won = true; }
  saveState(state);
  inputEl.value = '';
  render();
}

function giveUp() {
  if (state.finished) return;
  state.finished = true;
  state.won = false;
  saveState(state);
  render();
}

function newGame() {
  const answer = pickEmperor();
  state = { answerName: answer.name, guesses: [], finished: false, won: false };
  saveState(state);
  inputEl.value = '';
  render();
}

btnEl.addEventListener('click', makeGuess);
giveupBtnEl.addEventListener('click', giveUp);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); makeGuess(); }
});
```

- [ ] **Step 2: 烟囱测试（需先有 Task 5 的 HTML，否则跳过手动验证，仅确保语法可加载）**

```bash
node --check emperors/emperors.js 2>&1 || echo "（含 document 引用，node --check 仅校验语法）"
```

`node --check` 对含 `document` 的模块会因语法以外的引用报错没关系；此处只看是否有语法错误（如 SyntaxError）。若需运行时验证，等 Task 5 HTML 就绪后在浏览器/wrangler dev 手测。

- [ ] **Step 3: Commit**

```bash
git add emperors/emperors.js
git commit -m "$(cat <<'EOF'
feat(emperors): 控制器重写（不限次数/50%揭示/放弃按钮/v2 持久化）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 视图层 — `index.html` + `emperors.css`

**Files:**
- Modify: `emperors/index.html`
- Modify: `emperors/emperors.css`

**Interfaces:**
- Consumes: 控制器期望的 DOM id（见 Task 4 Produces）
- Produces: 完整可玩游戏页面

- [ ] **Step 1: 修改 `emperors/index.html` 的说明区与控制区**

把现有 `<section class="emp-intro">…</section>` 整段替换为：

```html
    <section class="emp-intro">
      <p>系统已随机选定一位中国古代帝王（商至清，200 余位）。<b>不限次数</b>，猜中为止。</p>
      <p>支持别名输入：<b>李世民 = 唐太宗</b>、<b>刘彻 = 汉武帝</b>、<b>康熙帝 = 清圣祖</b> 等。</p>
      <p>前 4 次只告知对/错；<b>第 5 次起，每次有 50% 概率</b>揭示朝代、身份与六维能力（政治/军事/谋略/外交/文学/魅力）的对比，并给出相似度。</p>
    </section>
```

把现有 `<div class="emp-remaining">…</div>` 整段替换为：

```html
      <div class="emp-remaining">
        已猜：<b id="count">0</b> 次
      </div>
```

把现有 `<div class="emp-input">…</div>` 内的按钮行改为含「放弃」按钮（在「猜测」按钮后追加）：

```html
      <div class="emp-input">
        <input id="guess-input" type="text" list="emperor-list" placeholder="输入帝王名（如 秦始皇）" autocomplete="off" />
        <datalist id="emperor-list"></datalist>
        <button type="button" id="guess-btn" class="reset-btn">猜测</button>
        <button type="button" id="giveup" class="giveup-btn">放弃，看答案</button>
      </div>
```

把现有 `.emp-legend` 内的说明行更新为能力值语义（保留三色图例，文案微调）：

```html
      <div class="emp-legend">
        <div class="legend-title">提示说明</div>
        <div class="legend-row">
          <span class="clue clue-correct">绿</span> 完全一致
          <span class="clue clue-near">黄</span> 接近（同时代 / 能力差 ≤ 8）
          <span class="clue clue-far">灰</span> 相差较远
        </div>
        <div class="legend-row small">能力值若答案<b>更高/更低</b>会显式标出点数差距；朝代会说明你猜的时代更早/更晚。</div>
      </div>
```

- [ ] **Step 2: 修改 `emperors/emperors.css`**

在文件末尾（`.hidden` 规则之前或之后均可）追加：

```css
/* 放弃按钮：次要描边样式 */
.giveup-btn {
  flex: 0 0 auto;
  padding: 11px 18px;
  border: 1.5px solid rgba(110,90,64,0.4);
  background: transparent;
  color: var(--muted);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.15s;
}
.giveup-btn:hover { border-color: var(--accent-red); color: var(--accent-red); }
.giveup-btn:active { transform: translateY(1px); }
.giveup-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.giveup-btn:focus-visible { outline: 2px solid var(--accent-red); outline-offset: 2px; }

/* 输入区在窄屏换行时按钮间距 */
@media (max-width: 480px) {
  .emp-input { flex-wrap: wrap; }
  .emp-input .reset-btn { flex: 1; }
}
```

现有 `.clue-label` 的 `flex: 0 0 64px` 已能对齐 8 条提示（朝代/身份/6 能力值），无需新增能力值专属样式。

- [ ] **Step 3: 启动本地服务手测**

```bash
npm run dev
```

在浏览器打开 `http://localhost:8788/emperors/`，验证：
1. 玩法说明为「200 余位 / 不限次数 / 第 5 次起 50% 概率」。
2. 输入「李世民」能猜（命中唐太宗算对）。
3. 前 4 次猜测只显示「还未揭示，请继续猜」。
4. 第 5 次起，多次猜测后某次会出现「相似度 + 朝代/身份/6 能力值」8 条提示（50% 随机，可能需多试几次）。
5. 点「放弃，看答案」→ 显示答案与能力值概览，输入框禁用。
6. 「再来一局」可重开；刷新页面能恢复未完成局。
7. 暗色模式（系统切换）下卡片/提示配色正常。

若有问题，回到对应 Task 修正后重测。

- [ ] **Step 4: Commit**

```bash
git add emperors/index.html emperors/emperors.css
git commit -m "$(cat <<'EOF'
feat(emperors): 视图层改造（玩法说明/已猜计数/放弃按钮/图例）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 首页板块卡描述 — `shared/landing.js`

**Files:**
- Modify: `shared/landing.js`（`emperors` 卡的 `description` 字段，约第 116 行）

**Interfaces:**
- Consumes: 无
- Produces: 首页/历史板块卡片文案与新规则一致

- [ ] **Step 1: 更新 description**

在 `shared/landing.js` 的 `history` 板块 `emperors` 卡片中，把：

```js
        description: '猜一位古代帝王，10 次机会，第 6 次起揭示属性对比',
```

改为：

```js
        description: '猜一位古代帝王，200 余位，不限次数，第 5 次起 50% 概率揭示属性对比',
```

`previewSvg` 不动。

- [ ] **Step 2: 验证首页渲染无报错**

```bash
node --check shared/landing.js && echo "syntax ok"
```

启动 `npm run dev`，打开首页与 `/history/`，确认帝王卡描述已更新、无控制台报错。

- [ ] **Step 3: 跑全量测试最终确认**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 4: Commit**

```bash
git add shared/landing.js
git commit -m "$(cat <<'EOF'
feat(emperors): 更新首页/板块卡描述（200 余位/不限次数/50% 揭示）

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage（逐条对照 spec §1-§11）：**
- §4.1 名单 + 别名 + role 派生 → Task 1（数据，含 A/B 清单与脚本校验）✓
- §4.2 ERA 群 → Task 2 `ERA_GROUPS` + Task 3 测试「ERA 群覆盖」✓
- §5.1 常量（HINT_START_ATTEMPT=5、去 MAX_ATTEMPTS、ROLES、STATS_KEYS、STAT_LABELS、NEAR_THRESHOLD）→ Task 2 ✓
- §5.2 函数签名 → Task 2 ✓
- §5.3 揭示规则（reveal 门控 sim+clues，猜中无 clues，未知 valid:false）→ Task 2 `compareGuess` + Task 3 四个 compareGuess 测试 ✓
- §5.4 相似度（权重派生、自身=100）→ Task 2 + Task 3 similarity 测试 ✓
- §5.5 三类 compare 文案 → Task 2 + Task 3 三个 clue 测试 ✓
- §6 控制器（v2、shouldReveal、giveUp、newGame、已猜计数、datalist）→ Task 4 ✓
- §7 视图（玩法说明、count、giveup 按钮、图例、css）→ Task 5 ✓
- §8 首页卡描述 → Task 6 ✓
- §9 测试 11 项 → Task 3 全覆盖 ✓
- §11 非目标（不补时间字段、不迁移 v1）→ 计划未涉及，符合 ✓

**2. Placeholder scan：** 无 TBD/TODO/"add error handling"/"similar to Task N"。数据生成用脚本+清单，非占位。每个代码步骤含完整代码。✓

**3. Type/命名一致性：**
- `compareGuess(answer, guessName, attempt, { reveal })` — Task 2 定义、Task 3 测试、Task 4 调用，签名一致 ✓
- `EMPERORS_DATA`（data 层）vs 旧 `EMPERORS`（logic 层）— Task 2 重写 logic 时 `import { EMPERORS_DATA }`，不再导出 `EMPERORS`；Task 3/4 均用 `EMPERORS_DATA` ✓
- DOM id：Task 4 期望 `count/history/result/guess-input/guess-btn/giveup/emperor-list`，Task 5 HTML 提供这些 id ✓
- `STATS_KEYS`/`STAT_LABELS` — Task 2 导出、Task 4 import 用于渲染、Task 3 import 用于断言 ✓
- `displayName` 签名不变 ✓
