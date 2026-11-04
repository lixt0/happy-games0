import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_WIDTH,
  EDGE_PADDING,
  MAX_SPEED,
  START_WIDTH,
  advanceMover,
  calculatePlacement,
  createGameState,
  makeMover,
  placeActive,
  speedForLevel,
} from '../stack/logic.js';

test('createGameState creates a centered base and a ready mover', () => {
  const state = createGameState();
  assert.equal(state.blocks[0].x, ARENA_WIDTH / 2);
  assert.equal(state.blocks[0].width, START_WIDTH);
  assert.equal(state.active.width, START_WIDTH);
  assert.equal(state.score, 0);
  assert.equal(state.state, 'ready');
});

test('calculatePlacement snaps close placements to perfect', () => {
  const support = { x: 210, width: 180 };
  const result = calculatePlacement({ x: 214, width: 180 }, support);
  assert.equal(result.result, 'perfect');
  assert.deepEqual(result.block, support);
  assert.equal(result.fragment, null);
});

test('calculatePlacement trims an overhang on the right', () => {
  const result = calculatePlacement(
    { x: 240, width: 180 },
    { x: 210, width: 180 },
  );
  assert.equal(result.result, 'placed');
  assert.deepEqual(result.block, { x: 225, width: 150 });
  assert.deepEqual(result.fragment, { x: 315, width: 30 });
});

test('calculatePlacement trims an overhang on the left', () => {
  const result = calculatePlacement(
    { x: 175, width: 180 },
    { x: 210, width: 180 },
  );
  assert.equal(result.result, 'placed');
  assert.deepEqual(result.block, { x: 192.5, width: 145 });
  assert.deepEqual(result.fragment, { x: 102.5, width: 35 });
});

test('calculatePlacement reports a complete miss', () => {
  const moving = { x: 40, width: 40 };
  const result = calculatePlacement(moving, { x: 210, width: 100 });
  assert.equal(result.result, 'miss');
  assert.equal(result.block, null);
  assert.deepEqual(result.fragment, moving);
});

test('advanceMover bounces at both arena edges', () => {
  const right = advanceMover({ x: 370, width: 60, direction: 1, speed: 8 });
  assert.equal(right.direction, -1);
  assert.ok(right.x <= ARENA_WIDTH - EDGE_PADDING - 30);

  const left = advanceMover({ x: 50, width: 60, direction: -1, speed: 8 });
  assert.equal(left.direction, 1);
  assert.ok(left.x >= EDGE_PADDING + 30);
});

test('speedForLevel increases but stays capped', () => {
  assert.ok(speedForLevel(8) > speedForLevel(1));
  assert.equal(speedForLevel(1000), MAX_SPEED);
});

test('makeMover alternates starting sides', () => {
  const odd = makeMover(100, 1);
  const even = makeMover(100, 2);
  assert.equal(odd.direction, 1);
  assert.equal(even.direction, -1);
  assert.ok(odd.x < even.x);
});

test('placeActive adds a perfect layer and combo', () => {
  let state = { ...createGameState(), state: 'playing' };
  state = { ...state, active: { ...state.active, x: ARENA_WIDTH / 2 } };
  const result = placeActive(state);
  assert.equal(result.placement.result, 'perfect');
  assert.equal(result.state.blocks.length, 2);
  assert.equal(result.state.score, 1);
  assert.equal(result.state.combo, 1);
  assert.equal(result.state.active.width, START_WIDTH);
});

test('placeActive shrinks a layer and resets combo', () => {
  let state = { ...createGameState(), state: 'playing', combo: 3 };
  state = { ...state, active: { ...state.active, x: ARENA_WIDTH / 2 + 20 } };
  const result = placeActive(state);
  assert.equal(result.placement.result, 'placed');
  assert.equal(result.state.score, 1);
  assert.equal(result.state.combo, 0);
  assert.equal(result.state.active.width, START_WIDTH - 20);
});

test('placeActive ends the game after a miss', () => {
  let state = { ...createGameState(), state: 'playing', combo: 2 };
  state = { ...state, active: { ...state.active, x: -20 } };
  const result = placeActive(state);
  assert.equal(result.placement.result, 'miss');
  assert.equal(result.state.state, 'gameover');
  assert.equal(result.state.score, 0);
  assert.equal(result.state.combo, 0);
});

test('placeActive ignores input outside playing state', () => {
  const state = createGameState();
  const result = placeActive(state);
  assert.equal(result.state, state);
  assert.equal(result.placement, null);
});
