import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPERORS_DATA, ROLE_RULES,
} from '../emperors/data/emperors.js';
import { EMPERORS_DATA as BATTLE_DATA } from '../battle/data/emperors.js';
import {
  HINT_START_ATTEMPT, ROLES, STATS_KEYS, STAT_LABELS, NEAR_THRESHOLD, ERA_GROUPS,
  normalize, findEmperor, pickEmperor, displayName, similarity, compareGuess,
} from '../emperors/logic.js';

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

test('compareGuess：reveal=false 有 sim 无 clues', () => {
  const a = findEmperor('汉武帝');
  const r = compareGuess(a, '秦始皇', 1);
  assert.equal(r.valid, true);
  assert.equal(r.correct, false);
  assert.ok(typeof r.sim === 'number');  // sim 始终返回
  assert.equal(r.clues, undefined);       // clues 受 reveal 门控
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
