import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_SIZE, BUILDINGS, advanceSeason, build, canBuild, countBuildings, countyScore, createCounty } from '../magistrate/logic.js';

test('county starts with one yamen on a seven-by-seven board', () => {
  const state = createCounty();
  assert.equal(state.board.length, BOARD_SIZE);
  assert.equal(state.board[3][3], 'office');
});

test('build charges resources and occupies an empty tile', () => {
  const state = createCounty();
  assert.equal(canBuild(state, 'farm', 0, 0), true);
  const next = build(state, 'farm', 0, 0);
  assert.equal(next.board[0][0], 'farm');
  assert.equal(next.silver, state.silver - BUILDINGS.farm.cost.silver);
  assert.equal(state.board[0][0], null);
});

test('cannot build on yamen or without resources', () => {
  const state = createCounty();
  assert.equal(build(state, 'farm', 3, 3), null);
  assert.equal(canBuild({ ...state, silver: 0 }, 'farm', 0, 0), false);
});

test('season grants farm income and adds an event log', () => {
  const farmed = build(createCounty(), 'farm', 0, 0);
  const next = advanceSeason(farmed, () => .99);
  assert.ok(next.grain > farmed.grain);
  assert.equal(next.logs.length, farmed.logs.length + 1);
  assert.equal(countBuildings(next).farm, 1);
});

test('county score remains bounded', () => {
  const score = countyScore(advanceSeason(createCounty(), () => .99));
  assert.ok(score >= 0 && score <= 100);
});
