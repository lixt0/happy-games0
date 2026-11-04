// 科举闯关 — 纯逻辑（供单元测试，不含渲染与随机源）
import { QUESTIONS, STAGES, questionsByLevel } from './data/questions.js';
export { QUESTIONS, STAGES, questionsByLevel } from './data/questions.js';

// 配置：每级题目数、计时秒数、道具
export const PER_LEVEL = 3;
export const TIMER_BY_LEVEL = [30, 28, 26, 24, 22, 20, 18];
export const FIFTY_FIFTY = 'fifty';
export const TIME_EXTEND = 'extend';
export const TIME_EXTEND_SECONDS = 10;
export const MAX_LEVEL = STAGES.length - 1;

// 道具初始：各 1 次
export const INITIAL_TOOLS = { [FIFTY_FIFTY]: 1, [TIME_EXTEND]: 1 };

// 功名表：按通过 level 数授予
export const TITLES = [
  '白丁',       // 0 段全过
  '童生',       // 过 0 级
  '秀才',       // 过 1 级
  '举人',       // 过 2 级
  '贡士',       // 过 3 级
  '进士',       // 过 4 级
  '探花',       // 过 5 级
  '榜眼',       // 过 6 级
  '状元',       // 全通关
];

// 简易 PRNG（mulberry32）：与 emperors 一致风格，便于种子化
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates 洗牌
export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 为一级抽取题目（保证不重复，题库不足则全取）
export function pickLevelQuestions(level, count, rng = Math.random) {
  const pool = questionsByLevel(level);
  if (pool.length === 0) return [];
  const shuffled = shuffle(pool, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((q, idx) => ({
    ...q,
    seq: idx,
  }));
}

// 创建整局对局（每级 PER_LEVEL 题）
export function createExam(seed) {
  const rng = (typeof seed === 'number' && !Number.isNaN(seed)) ? mulberry32(seed) : Math.random;
  const levels = STAGES.map(s => pickLevelQuestions(s.id, PER_LEVEL, rng));
  return {
    seed: seed ?? null,
    levels,            // levels[level][idx] = {q, options, answer, ...}
    answers: levels.map(() => Array(PER_LEVEL).fill(null)),
    wrongAt: null,     // {level, idx} 或 null
    finished: false,
    toolState: { ...INITIAL_TOOLS },
  };
}

// 当前要答的题（level, idx）—— 返回 null 表示已通关
export function currentQuestion(exam) {
  if (exam.finished) return null;
  for (let lv = 0; lv < exam.levels.length; lv++) {
    const ans = exam.answers[lv];
    for (let i = 0; i < exam.levels[lv].length; i++) {
      if (ans[i] === null) {
        return { level: lv, idx: i, q: exam.levels[lv][i] };
      }
    }
  }
  return null;
}

// 已通过的题目总数
export function solvedCount(exam) {
  let n = 0;
  for (const ans of exam.answers) {
    for (const a of ans) if (a === true) n++;
  }
  return n;
}

// 已完成的题数（答过但未通过也算）
export function attemptedCount(exam) {
  let n = 0;
  for (const ans of exam.answers) {
    for (const a of ans) if (a !== null) n++;
  }
  return n;
}

// 通过的级别数（用于授予功名）
export function passedLevels(exam) {
  let n = 0;
  for (let lv = 0; lv < exam.levels.length; lv++) {
    const ans = exam.answers[lv];
    if (ans.length > 0 && ans.every(a => a === true)) n++;
  }
  return n;
}

// 当前所处级别（尚未通过的最低一级）
export function currentLevel(exam) {
  for (let lv = 0; lv < exam.levels.length; lv++) {
    const ans = exam.answers[lv];
    if (!(ans.length > 0 && ans.every(a => a === true))) return lv;
  }
  return STAGES.length; // 全通过
}

// 功名首字：依据已通过级别数
export function titleFor(passed) {
  const idx = Math.min(passed + 1, TITLES.length - 1);
  return TITLES[idx];
}

// 答题：optIdx 为玩家选择（0-3）；isTimeout=true 表示超时
// 返回 {ok:bool, correct:bool, exam, snapshot}
export function answerQuestion(exam, optIdx, { isTimeout = false } = {}) {
  if (exam.finished) return { ok: false, error: '已结束' };
  const cur = currentQuestion(exam);
  if (!cur) return { ok: false, error: '已通关' };
  const q = cur.q;
  let correct;
  if (isTimeout) {
    correct = false;
  } else if (typeof optIdx !== 'number' || optIdx < 0 || optIdx > 3) {
    return { ok: false, error: '选项非法' };
  } else {
    correct = optIdx === q.answer;
  }
  // 记录
  exam.answers[cur.level][cur.idx] = correct;
  if (!correct) {
    exam.wrongAt = { level: cur.level, idx: cur.idx, picked: isTimeout ? null : optIdx };
    exam.finished = true;
  }
  // 检查是否通关
  if (currentQuestion(exam) === null) {
    exam.finished = true;
  }
  const snapshot = {
    level: cur.level,
    idx: cur.idx,
    question: q.q,
    options: q.options,
    answer: q.answer,
    picked: isTimeout ? null : optIdx,
    correct,
    explain: q.explain,
    timeout: isTimeout,
  };
  return { ok: true, correct, exam, snapshot };
}

// 50/50 道具：返回应保留的选项下标（含正答案 + 随机一个错项）
export function useFiftyFifty(exam) {
  if (exam.toolState[FIFTY_FIFTY] <= 0) return { ok: false, error: '道具已用尽' };
  const cur = currentQuestion(exam);
  if (!cur) return { ok: false, error: '无当前题' };
  const q = cur.q;
  const wrongs = [0, 1, 2, 3].filter(i => i !== q.answer);
  const keep = [q.answer, wrongs[Math.floor(Math.random() * wrongs.length)]].sort((a, b) => a - b);
  exam.toolState[FIFTY_FIFTY]--;
  return { ok: true, keep };
}

// 加时道具：仅告知 UI 应加多少秒
export function useTimeExtend(exam) {
  if (exam.toolState[TIME_EXTEND] <= 0) return { ok: false, error: '道具已用尽' };
  exam.toolState[TIME_EXTEND]--;
  return { ok: true, seconds: TIME_EXTEND_SECONDS };
}

// 重建可序列化的对局状态（用于 localStorage）
export function serializeExam(exam) {
  return {
    seed: exam.seed,
    answers: exam.answers,
    wrongAt: exam.wrongAt,
    finished: exam.finished,
    toolState: exam.toolState,
  };
}

// 由序列化状态重建对局（用 seed 恢复同题）
export function restoreExam(saved) {
  if (!saved || typeof saved.seed !== 'number') return null;
  const exam = createExam(saved.seed);
  exam.answers = saved.answers.map(row => row.slice());
  exam.wrongAt = saved.wrongAt || null;
  exam.finished = !!saved.finished;
  exam.toolState = { ...INITIAL_TOOLS, ...(saved.toolState || {}) };
  return exam;
}