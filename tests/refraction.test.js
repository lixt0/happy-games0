import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, createState, isSolved, rotatePiece, solveState, traceBeam } from '../refraction/logic.js';

test('光束会被镜面折射并命中目标', () => {
  let state = createState(0);
  assert.equal(isSolved(state), false);
  state = rotatePiece(state, 0);
  const trace = traceBeam(state);
  assert.equal(trace.hits.size, 1);
  assert.equal(isSolved(state), true);
});

test('锁定镜面不能旋转', () => {
  const state = createState(5);
  const next = rotatePiece(state, 1);
  assert.equal(next, state);
});

test('全部关卡预设解法可通关', () => {
  for (let index = 0; index < LEVELS.length; index += 1) assert.equal(isSolved(solveState(index)), true, LEVELS[index].name);
});

test('分光器会产生多段光线', () => {
  const trace = traceBeam(solveState(7));
  assert.ok(trace.segments.length > 10);
  assert.equal(trace.hits.size, trace.targetCount);
});
