import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, ATTRIBUTE_BUDGET, ATTRIBUTE_MAX, advanceLife, chooseLifeAction, chooseNpcAction, createLife, isValidPoints, lifeScore, simulateLife, simulateLifeSteps } from '../life/logic.js';

const points = { mind: 4, charm: 4, vitality: 4, family: 4, fortune: 4 };

test('life requires exactly the configured attribute budget', () => {
  assert.equal(ATTRIBUTE_BUDGET, 20);
  assert.equal(ATTRIBUTE_MAX, 10);
  assert.equal(isValidPoints(points), true);
  assert.equal(isValidPoints({ ...points, mind: 5 }), false);
  assert.equal(isValidPoints({ ...points, mind: 11, charm: 1 }), false);
});

test('life starts at birth with stats derived from attributes', () => {
  const state = createLife(points, 7);
  assert.equal(state.age, 0);
  assert.equal(state.finished, false);
  assert.ok(state.maxAge > 70);
  assert.equal(state.logs.length, 1);
});

test('a life action advances time, appends a log, and does not mutate input', () => {
  const state = createLife(points, 8);
  const next = advanceLife(state, 'learn');
  assert.equal(state.age, 0);
  assert.ok(next.age > state.age);
  assert.equal(next.logs.length, 2);
  assert.ok(next.stats.skill > state.stats.skill);
});

test('AI characters make deterministic valid plans', () => {
  const state = createLife(points, 9);
  const move = chooseNpcAction(state, { id: 'rival', name: '同侪', weights: { work: 7, learn: 6, explore: 4, connect: -1, rest: -2 } });
  assert.ok(ACTIONS.some(action => action.id === move.id));
  assert.equal(move.id, 'learn');
});

test('AI simulates a complete life from attributes without player actions', () => {
  const first = simulateLife(createLife(points, 22));
  const second = simulateLife(createLife(points, 22));
  assert.equal(first.finished, true);
  assert.ok(first.age >= 68);
  assert.equal(first.age, second.age);
  assert.equal(first.logs.length, second.logs.length);
  assert.ok(ACTIONS.some(action => action.id === chooseLifeAction(createLife(points, 22)).id));
  const steps = simulateLifeSteps(createLife(points, 22));
  assert.equal(steps[0].age, 0);
  assert.equal(steps.at(-1).finished, true);
  assert.equal(steps.at(-1).logs.at(-1).stage, '落幕');
});

test('life score is a bounded positive summary', () => {
  let state = createLife(points, 11);
  for (let i = 0; i < 4; i++) state = advanceLife(state, 'connect');
  assert.ok(lifeScore(state) > 0 && lifeScore(state) <= 100);
});
