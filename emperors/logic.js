// 华夏帝王 — 纯逻辑（供单元测试，不含渲染与随机源）
import { EMPERORS_DATA, ROLE_RULES } from './data/emperors.js';
export { EMPERORS_DATA } from './data/emperors.js';

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

// sim 始终返回（作为进度指示，不受 reveal 门控）
// reveal=true → 附 clues；猜中不附 clues
export function compareGuess(answer, guessName, attempt, { reveal = false } = {}) {
  const guess = findEmperor(guessName);
  if (!guess) return { valid: false, error: `未识别人名：${guessName}` };
  const correct = guess.name === answer.name;
  const result = { valid: true, correct, name: guess.name };
  if (correct) return result;
  result.sim = similarity(answer, guess);
  if (!reveal) return result;
  result.clues = {
    era: compareEra(answer, guess),
    role: compareRole(answer, guess),
  };
  for (const k of STATS_KEYS) {
    result.clues[k] = compareStat(STAT_LABELS[k], answer.stats[k], guess.stats[k]);
  }
  return result;
}
