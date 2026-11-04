import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGameState,
  flap,
  update,
  checkCollision,
  GRAVITY,
  FLAP_VEL,
  PIPE_GAP,
  BIRD_SIZE,
  BIRD_X,
} from '../flappy/logic.js';

const H = 600;

test('createGameState: initial state', () => {
  const gs = createGameState(H);
  assert.equal(gs.bird.y, H / 2);
  assert.equal(gs.bird.vel, 0);
  assert.equal(gs.score, 0);
  assert.equal(gs.state, 'ready');
  assert.equal(gs.pipes.length, 0);
});

test('flap: changes state from ready to playing', () => {
  const gs = createGameState(H);
  const next = flap(gs);
  assert.equal(next.state, 'playing');
  assert.equal(next.bird.vel, FLAP_VEL);
});

test('flap: resets on gameover', () => {
  const gs = { ...createGameState(H), state: 'gameover', score: 5, best: 10 };
  const next = flap(gs);
  assert.equal(next.state, 'ready');
  assert.equal(next.score, 0);
});

test('update: bird falls with gravity', () => {
  let gs = { ...createGameState(H), state: 'playing' };
  const { gs: next } = update(gs);
  assert.equal(next.bird.vel, GRAVITY);
  assert.ok(next.bird.y > gs.bird.y);
});

test('update: bird goes up after flap', () => {
  let gs = flap(createGameState(H));
  const startY = gs.bird.y;
  const { gs: next } = update(gs);
  assert.ok(next.bird.y < startY);
});

test('update: gameover when hitting ground', () => {
  let gs = { ...createGameState(H), state: 'playing', bird: { y: H - 80 - BIRD_SIZE + 1, vel: 10 } };
  const { gs: next, events } = update(gs);
  assert.equal(next.state, 'gameover');
  assert.ok(events.some(e => e.type === 'gameover'));
});

test('update: gameover when hitting ceiling', () => {
  let gs = { ...createGameState(H), state: 'playing', bird: { y: -10, vel: -5 } };
  const { gs: next, events } = update(gs);
  assert.equal(next.state, 'gameover');
  assert.ok(events.some(e => e.type === 'gameover' && e.reason === 'boundary'));
});

test('update: score increases when passing pipe', () => {
  let gs = {
    ...createGameState(H),
    state: 'playing',
    pipes: [{ x: BIRD_X - 60, topH: 200, scored: false }],
  };
  const { gs: next, events } = update(gs);
  assert.equal(next.score, 1);
  assert.ok(events.some(e => e.type === 'score'));
});

test('update: pipe removed when off screen', () => {
  let gs = {
    ...createGameState(H),
    state: 'playing',
    pipes: [{ x: -100, topH: 200, scored: true }],
  };
  const { gs: next } = update(gs);
  assert.equal(next.pipes.length, 0);
});

test('checkCollision: no collision in open space', () => {
  const bird = { y: 300 };
  const pipes = [{ x: 200, topH: 100 }];
  assert.equal(checkCollision(bird, pipes, H), null);
});

test('checkCollision: hits ground', () => {
  const bird = { y: H - 80 };
  assert.equal(checkCollision(bird, [], H), 'boundary');
});

test('checkCollision: hits ceiling', () => {
  const bird = { y: -5 };
  assert.equal(checkCollision(bird, [], H), 'boundary');
});

test('checkCollision: hits pipe top', () => {
  const bird = { y: 50 };
  const pipes = [{ x: BIRD_X, topH: 200 }];
  assert.equal(checkCollision(bird, pipes, H), 'pipe');
});

test('checkCollision: hits pipe bottom', () => {
  const bird = { y: 350 };
  const pipes = [{ x: BIRD_X, topH: 100 }];
  assert.equal(checkCollision(bird, pipes, H), 'pipe');
});

test('checkCollision: passes through gap', () => {
  const bird = { y: 250 };
  const pipes = [{ x: BIRD_X, topH: 200 }];
  assert.equal(checkCollision(bird, pipes, H), null);
});

test('update: deterministic with seeded rng', () => {
  const rng = () => 0.5;
  let gs1 = { ...createGameState(H), state: 'playing', frame: 89 };
  let gs2 = { ...createGameState(H), state: 'playing', frame: 89 };
  const { gs: next1 } = update(gs1, rng);
  const { gs: next2 } = update(gs2, rng);
  assert.equal(next1.pipes.length, next2.pipes.length);
  if (next1.pipes.length > 0) {
    assert.equal(next1.pipes[0].topH, next2.pipes[0].topH);
  }
});
