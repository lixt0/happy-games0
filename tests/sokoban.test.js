import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLevel, move, isSolved, cloneState, isDeadlock, boxOnTarget } from '../sokoban/logic.js';

const levels = JSON.parse(readFileSync(new URL('../sokoban/levels.json', import.meta.url), 'utf8'));

test('parseLevel: parses player, boxes, targets, walls', () => {
  const state = parseLevel([
    '###',
    '#@#',
    '#$#',
    '#.#',
    '###',
  ]);
  assert.equal(state.width, 3);
  assert.equal(state.height, 5);
  assert.deepEqual(state.player, { x: 1, y: 1 });
  assert.equal(state.boxes.length, 1);
  assert.deepEqual(state.boxes[0], { x: 1, y: 2 });
  assert.equal(state.targets.length, 1);
  assert.deepEqual(state.targets[0], { x: 1, y: 3 });
  assert.equal(state.grid[0][0], 1);
  assert.equal(state.grid[1][1], 0);
});

test('parseLevel: handles * (box on target) and + (player on target)', () => {
  const state = parseLevel([
    '####',
    '#+*#',
    '####',
  ]);
  assert.deepEqual(state.player, { x: 1, y: 1 });
  assert.equal(state.boxes.length, 1);
  assert.deepEqual(state.boxes[0], { x: 2, y: 1 });
  assert.equal(state.targets.length, 2);
  assert.equal(state.grid[1][1], 2);
  assert.equal(state.grid[1][2], 2);
});

test('move: player moves to empty floor', () => {
  const state = parseLevel([
    '####',
    '#@ #',
    '####',
  ]);
  const result = move(state, 'right');
  assert.equal(result.moved, true);
  assert.equal(result.pushed, false);
  assert.deepEqual(result.state.player, { x: 2, y: 1 });
});

test('move: player cannot move into wall', () => {
  const state = parseLevel([
    '####',
    '#@ #',
    '####',
  ]);
  const result = move(state, 'left');
  assert.equal(result.moved, false);
});

test('move: player pushes box', () => {
  const state = parseLevel([
    '#####',
    '#@$ #',
    '#####',
  ]);
  const result = move(state, 'right');
  assert.equal(result.moved, true);
  assert.equal(result.pushed, true);
  assert.deepEqual(result.state.player, { x: 2, y: 1 });
  assert.deepEqual(result.state.boxes[0], { x: 3, y: 1 });
});

test('move: cannot push box into wall', () => {
  const state = parseLevel([
    '####',
    '#@$#',
    '####',
  ]);
  const result = move(state, 'right');
  assert.equal(result.moved, false);
});

test('move: cannot push box into another box', () => {
  const state = parseLevel([
    '######',
    '#@$$ #',
    '######',
  ]);
  const result = move(state, 'right');
  assert.equal(result.moved, false);
});

test('isSolved: returns true when all boxes on targets', () => {
  const state = parseLevel([
    '####',
    '#* #',
    '####',
  ]);
  assert.equal(isSolved(state), true);
});

test('isSolved: returns false when box not on target', () => {
  const state = parseLevel([
    '#####',
    '#$. #',
    '#####',
  ]);
  assert.equal(isSolved(state), false);
});

test('isSolved: multiple boxes all on targets', () => {
  const state = parseLevel([
    '#####',
    '#** #',
    '# @ #',
    '#####',
  ]);
  assert.equal(isSolved(state), true);
});

test('cloneState: produces independent copy', () => {
  const state = parseLevel([
    '####',
    '#@ #',
    '####',
  ]);
  const cloned = cloneState(state);
  cloned.player.x = 2;
  assert.equal(state.player.x, 1);
});

test('isDeadlock: detects corner deadlock', () => {
  const state = parseLevel([
    '####',
    '#$ #',
    '#  #',
    '####',
  ]);
  assert.equal(isDeadlock(state), true);
});

test('isDeadlock: no deadlock when box on target in corner', () => {
  const state = parseLevel([
    '####',
    '#* #',
    '#  #',
    '####',
  ]);
  assert.equal(isDeadlock(state), false);
});

test('boxOnTarget: returns correct value', () => {
  const state = parseLevel([
    '#####',
    '#*. #',
    '#####',
  ]);
  assert.equal(boxOnTarget(state, 1, 1), true);
  assert.equal(boxOnTarget(state, 2, 1), true);
  assert.equal(boxOnTarget(state, 3, 1), false);
});

test('all levels are parseable and have matching boxes/targets', () => {
  for (let i = 0; i < levels.length; i++) {
    const state = parseLevel(levels[i].map);
    assert.ok(state.player, `Level ${i + 1}: missing player`);
    assert.equal(
      state.boxes.length,
      state.targets.length,
      `Level ${i + 1}: boxes (${state.boxes.length}) != targets (${state.targets.length})`
    );
    assert.ok(state.boxes.length > 0, `Level ${i + 1}: no boxes`);
  }
});

test('move: all four directions work', () => {
  const state = parseLevel([
    '#####',
    '#   #',
    '# @ #',
    '#   #',
    '#####',
  ]);
  const r1 = move(state, 'up');
  assert.deepEqual(r1.state.player, { x: 2, y: 1 });
  const r2 = move(state, 'down');
  assert.deepEqual(r2.state.player, { x: 2, y: 3 });
  const r3 = move(state, 'left');
  assert.deepEqual(r3.state.player, { x: 1, y: 2 });
  const r4 = move(state, 'right');
  assert.deepEqual(r4.state.player, { x: 3, y: 2 });
});
