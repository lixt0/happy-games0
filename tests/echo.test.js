import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_LENGTH,
  advanceEcho,
  advanceGame,
  createGameState,
  generateLevel,
  isLevelConnected,
  stepsUntilEcho,
} from '../echo/logic.js';

test('first level uses a clear fixed layout', () => {
  const level = generateLevel(1, 123);
  assert.deepEqual(level.start, { x: 3, y: 3 });
  assert.equal(level.blocked.length, 0);
  assert.deepEqual(level.seals, [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 0, y: 6 },
    { x: 6, y: 6 },
  ]);
});

test('generated levels are deterministic, connected, and have no overlaps', () => {
  const a = generateLevel(5, 24680);
  const b = generateLevel(5, 24680);
  assert.deepEqual(a, b);
  assert.equal(isLevelConnected(a.size, a.blocked, a.start), true);

  const blocked = new Set(a.blocked.map(pos => `${pos.x},${pos.y}`));
  const seals = new Set(a.seals.map(pos => `${pos.x},${pos.y}`));
  assert.equal(blocked.has(`${a.start.x},${a.start.y}`), false);
  assert.equal(seals.has(`${a.start.x},${a.start.y}`), false);
  assert.equal([...seals].some(key => blocked.has(key)), false);
  assert.equal(seals.size, a.seals.length);
});

test('blocked moves do not consume a turn', () => {
  const state = createGameState(1, 1);
  const next = advanceGame(state, 'up');
  assert.equal(next.moves, 1);

  const atEdge = { ...next, player: { x: 0, y: 0 } };
  const blocked = advanceGame(atEdge, 'up');
  assert.equal(blocked.moves, 1);
  assert.deepEqual(blocked.player, { x: 0, y: 0 });
  assert.deepEqual(blocked.events, ['blocked']);
});

test('six valid moves create an echo from the recorded path', () => {
  let state = createGameState(1, 1);
  const moves = ['right', 'right', 'right', 'down', 'left', 'left'];
  for (const move of moves) state = advanceGame(state, move);

  assert.equal(state.moves, ECHO_LENGTH);
  assert.equal(state.echoes.length, 1);
  assert.deepEqual(state.echoes[0].path[0], { x: 3, y: 3 });
  assert.deepEqual(state.echoes[0].path.at(-1), state.player);
  assert.equal(stepsUntilEcho(state), ECHO_LENGTH);
  assert.ok(state.events.includes('echo'));
});

test('echo walks to the end of its path and then reverses', () => {
  let echo = {
    id: 1,
    path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    index: 0,
    direction: 1,
  };
  echo = advanceEcho(echo);
  assert.equal(echo.index, 1);
  echo = advanceEcho(echo);
  assert.equal(echo.index, 2);
  echo = advanceEcho(echo);
  assert.equal(echo.index, 1);
  assert.equal(echo.direction, -1);
});

test('moving onto an echo causes a loss', () => {
  const state = createGameState(1, 1);
  state.seals = [{ x: 6, y: 6 }];
  state.echoes = [{
    id: 1,
    path: [{ x: 5, y: 3 }, { x: 4, y: 3 }],
    index: 0,
    direction: 1,
  }];

  const next = advanceGame(state, 'right');
  assert.equal(next.status, 'lost');
  assert.ok(next.events.includes('collision'));
});

test('crossing through an echo causes a loss', () => {
  const state = createGameState(1, 1);
  state.seals = [{ x: 6, y: 6 }];
  state.echoes = [{
    id: 1,
    path: [{ x: 4, y: 3 }, { x: 3, y: 3 }],
    index: 0,
    direction: 1,
  }];

  const next = advanceGame(state, 'right');
  assert.equal(next.status, 'lost');
  assert.ok(next.events.includes('collision'));
});

test('collecting the final seal wins the level', () => {
  const state = createGameState(1, 1);
  state.seals = [{ x: 4, y: 3 }];
  state.totalSeals = 1;

  const next = advanceGame(state, 'right');
  assert.equal(next.collected, 1);
  assert.equal(next.seals.length, 0);
  assert.equal(next.status, 'won');
  assert.deepEqual(next.events, ['seal', 'won']);
});

test('first level has a complete route that demonstrates four echoes', () => {
  let state = createGameState(1, 1);
  const route = [
    'up', 'up', 'left', 'left', 'up', 'left',
    ...Array(6).fill('right'),
    ...Array(6).fill('down'),
    ...Array(6).fill('left'),
  ];

  for (const direction of route) state = advanceGame(state, direction);
  assert.equal(state.status, 'won');
  assert.equal(state.moves, 24);
  assert.equal(state.collected, 4);
  assert.equal(state.echoes.length, 4);
});
