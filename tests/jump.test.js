import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  jumpDistance,
  chargeTick,
  makeNextBlock,
  classifyLanding,
  createGameState,
  MAX_JUMP,
  CHARGE_RATE,
  PERFECT_R,
  DIST_MIN,
  DIST_MAX,
  BLOCK_W_MIN,
  BLOCK_W_MAX,
} from '../jump/logic.js';

test('jumpDistance: proportional to power, clamped', () => {
  assert.equal(jumpDistance(0), 0);
  assert.equal(jumpDistance(1), MAX_JUMP);
  assert.equal(jumpDistance(0.5), MAX_JUMP / 2);
  assert.equal(jumpDistance(2), MAX_JUMP);
  assert.equal(jumpDistance(-1), 0);
});

test('chargeTick: increments up to 1', () => {
  assert.equal(chargeTick(0), CHARGE_RATE);
  let p = 0;
  for (let i = 0; i < 100; i++) p = chargeTick(p);
  assert.equal(p, 1);
});

test('makeNextBlock: distance and width within range', () => {
  const prev = { x: 0, w: 50 };
  const rng = () => 0;
  const b = makeNextBlock(prev, rng);
  assert.equal(b.x, prev.x + DIST_MIN);
  assert.equal(b.w, BLOCK_W_MIN);

  const rngMax = () => 1;
  const b2 = makeNextBlock(prev, rngMax);
  assert.equal(b2.x, prev.x + DIST_MAX);
  assert.equal(b2.w, BLOCK_W_MAX);
});

test('makeNextBlock: deterministic with seeded rng', () => {
  const prev = { x: 100, w: 50 };
  const a = makeNextBlock(prev, () => 0.3);
  const b = makeNextBlock(prev, () => 0.3);
  assert.deepEqual(a, b);
});

test('classifyLanding: short miss', () => {
  const cur = { x: 0, w: 50 };
  const next = { x: 120, w: 40 };
  assert.equal(classifyLanding(80, cur, next).result, 'short');
});

test('classifyLanding: long miss', () => {
  const cur = { x: 0, w: 50 };
  const next = { x: 120, w: 40 };
  assert.equal(classifyLanding(160, cur, next).result, 'long');
});

test('classifyLanding: ok landing', () => {
  const cur = { x: 0, w: 50 };
  const next = { x: 120, w: 40 };
  const r = classifyLanding(110, cur, next);
  assert.equal(r.result, 'ok');
  assert.equal(r.snap, null);
});

test('classifyLanding: perfect within radius', () => {
  const next = { x: 120, w: 40 };
  const r = classifyLanding(120 + PERFECT_R, { x: 0, w: 50 }, next);
  assert.equal(r.result, 'perfect');
  assert.equal(r.snap, 120);
});

test('classifyLanding: edge of perfect equals ok boundary', () => {
  const next = { x: 120, w: 40 };
  const r = classifyLanding(120 + PERFECT_R + 1, { x: 0, w: 50 }, next);
  assert.equal(r.result, 'ok');
});

test('createGameState: initial fields', () => {
  const gs = createGameState(() => 0.5);
  assert.equal(gs.blocks.length, 2);
  assert.equal(gs.currentIdx, 0);
  assert.equal(gs.score, 0);
  assert.equal(gs.combo, 0);
  assert.equal(gs.state, 'ready');
  assert.equal(gs.piece.x, 0);
});