import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUESTIONS, STAGES, PER_LEVEL, TIMER_BY_LEVEL,
  createExam, currentQuestion, answerQuestion,
  useFiftyFifty, useTimeExtend, passedLevels, titleFor,
  serializeExam, restoreExam, shuffle, pickLevelQuestions,
  FIFTY_FIFTY, TIME_EXTEND, TIME_EXTEND_SECONDS,
} from '../keju/logic.js';

test('题库：每级至少 50 题、选项 4 个、answer 合法', () => {
  for (let lv = 0; lv < STAGES.length; lv++) {
    const arr = QUESTIONS.filter(q => q.level === lv);
    assert.ok(arr.length >= 50, `level ${lv} 只有 ${arr.length} 题`);
    for (const q of arr) {
      assert.equal(q.options.length, 4);
      assert.ok(q.answer >= 0 && q.answer <= 3);
      assert.ok(typeof q.q === 'string' && q.q.length > 0);
      assert.ok(typeof q.explain === 'string');
    }
  }
});

test('题库：无重复题目', () => {
  const seen = new Set();
  for (const q of QUESTIONS) {
    assert.ok(!seen.has(q.q), `重复题：${q.q}`);
    seen.add(q.q);
  }
});

test('配置：PER_LEVEL=3，TIMER 递减', () => {
  assert.equal(PER_LEVEL, 3);
  assert.equal(TIMER_BY_LEVEL.length, STAGES.length);
  for (let i = 1; i < TIMER_BY_LEVEL.length; i++) {
    assert.ok(TIMER_BY_LEVEL[i] <= TIMER_BY_LEVEL[i - 1]);
  }
});

test('createExam：每级 3 题，初始状态', () => {
  const e = createExam(1);
  assert.equal(e.levels.length, STAGES.length);
  for (const lv of e.levels) assert.equal(lv.length, PER_LEVEL);
  assert.equal(e.finished, false);
  assert.equal(e.wrongAt, null);
  assert.equal(e.toolState[FIFTY_FIFTY], 1);
  assert.equal(e.toolState[TIME_EXTEND], 1);
});

test('createExam：同 seed 可复现', () => {
  const a = createExam(42);
  const b = createExam(42);
  for (let i = 0; i < a.levels.length; i++) {
    for (let j = 0; j < a.levels[i].length; j++) {
      assert.equal(a.levels[i][j].q, b.levels[i][j].q);
    }
  }
});

test('currentQuestion：开局返回第一题', () => {
  const e = createExam(7);
  const cur = currentQuestion(e);
  assert.equal(cur.level, 0);
  assert.equal(cur.idx, 0);
});

test('answerQuestion：答对推进，答错止步', () => {
  const e = createExam(100);
  let cur = currentQuestion(e);
  const r = answerQuestion(e, cur.q.answer);
  assert.equal(r.ok, true);
  assert.equal(r.correct, true);
  cur = currentQuestion(e);
  assert.equal(cur.idx, 1);
});

test('answerQuestion：答错场终止', () => {
  const e = createExam(100);
  const cur = currentQuestion(e);
  const wrong = (cur.q.answer + 1) % 4;
  const r = answerQuestion(e, wrong);
  assert.equal(r.correct, false);
  assert.equal(e.finished, true);
  assert.ok(e.wrongAt);
});

test('answerQuestion：超时按错算', () => {
  const e = createExam(100);
  const r = answerQuestion(e, null, { isTimeout: true });
  assert.equal(r.correct, false);
  assert.equal(r.snapshot.timeout, true);
  assert.equal(e.finished, true);
});

test('一关全对→进入下一关', () => {
  const e = createExam(250);
  for (let i = 0; i < PER_LEVEL; i++) {
    const cur = currentQuestion(e);
    answerQuestion(e, cur.q.answer);
  }
  const cur = currentQuestion(e);
  assert.equal(cur.level, 1);
  assert.equal(cur.idx, 0);
});

test('全通关：通过所有题后 currentQuestion 返回 null', () => {
  const e = createExam(999);
  const total = STAGES.length * PER_LEVEL;
  for (let i = 0; i < total; i++) {
    const cur = currentQuestion(e);
    assert.ok(cur, `第 ${i} 题应存在`);
    answerQuestion(e, cur.q.answer);
  }
  assert.equal(currentQuestion(e), null);
  assert.equal(e.finished, true);
  assert.equal(passedLevels(e), STAGES.length);
  assert.equal(titleFor(passedLevels(e)), '状元');
});

test('titleFor：通过 0-7 级递进', () => {
  assert.equal(titleFor(0), '童生');
  assert.equal(titleFor(1), '秀才');
  assert.equal(titleFor(2), '举人');
  assert.equal(titleFor(3), '贡士');
  assert.equal(titleFor(4), '进士');
  assert.equal(titleFor(5), '探花');
  assert.equal(titleFor(6), '榜眼');
  assert.equal(titleFor(7), '状元');
});

test('useFiftyFifty：保留答案 + 一个错项', () => {
  const e = createExam(50);
  const r = useFiftyFifty(e);
  assert.equal(r.ok, true);
  assert.equal(r.keep.length, 2);
  const cur = currentQuestion(e);
  assert.ok(r.keep.includes(cur.q.answer));
  assert.equal(e.toolState[FIFTY_FIFTY], 0);
  const r2 = useFiftyFifty(e);
  assert.equal(r2.ok, false);
});

test('useTimeExtend：扣减一次后不可再用', () => {
  const e = createExam(50);
  const r = useTimeExtend(e);
  assert.equal(r.ok, true);
  assert.equal(r.seconds, TIME_EXTEND_SECONDS);
  assert.equal(e.toolState[TIME_EXTEND], 0);
  const r2 = useTimeExtend(e);
  assert.equal(r2.ok, false);
});

test('serialize/restore：可恢复对局', () => {
  const e = createExam(321);
  const cur = currentQuestion(e);
  answerQuestion(e, cur.q.answer);
  useFiftyFifty(e);
  const s = serializeExam(e);
  const r = restoreExam(s);
  assert.ok(r);
  assert.equal(r.seed, 321);
  assert.equal(r.answers[0][0], true);
  assert.equal(r.toolState[FIFTY_FIFTY], 0);
});

test('restoreExam：非法输入返回 null', () => {
  assert.equal(restoreExam(null), null);
  assert.equal(restoreExam({}), null);
  assert.equal(restoreExam({ seed: 'abc' }), null);
});

test('pickLevelQuestions：数量上限正确，不超 pool', () => {
  const arr = pickLevelQuestions(0, 100, () => 0.3);
  assert.equal(arr.length, QUESTIONS.filter(q => q.level === 0).length);
  const small = pickLevelQuestions(1, 2, () => 0.7);
  assert.equal(small.length, 2);
});

test('shuffle：保持元素集合、长度', () => {
  const a = [1, 2, 3, 4, 5];
  const b = shuffle(a, () => 0.4);
  assert.equal(b.length, a.length);
  for (const x of a) assert.ok(b.includes(x));
  assert.deepEqual(a, [1, 2, 3, 4, 5]);
});