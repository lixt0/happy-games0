import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA, UPGRADES, clampPlayer, createRun, enemyProfile, levelUp, moveVector, upgradeChoices } from '../survivor/logic.js';

test('run starts with a usable survivor build', () => {
  const run = createRun();
  assert.equal(run.hp, run.maxHp);
  assert.ok(run.damage > 0 && run.fireDelay > 0);
});

test('movement is normalized for diagonal travel', () => {
  const vector = moveVector({ up: true, right: true });
  assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - 1) < .0001);
});

test('waves grow while enemy spawn time drops', () => {
  const early = enemyProfile(0);
  const late = enemyProfile(80);
  assert.ok(late.hp > early.hp && late.speed > early.speed && late.spawnEvery < early.spawnEvery);
});

test('experience can award multiple levels', () => {
  const result = levelUp({ ...createRun(), xp: 40 });
  assert.ok(result.levels > 1 && result.state.level > 2);
});

test('upgrades are three distinct choices and modify runs', () => {
  const choices = upgradeChoices(() => .2);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map(choice => choice.id)).size, 3);
  const powered = UPGRADES.find(upgrade => upgrade.id === 'power').apply(createRun());
  assert.ok(powered.damage > createRun().damage);
});

test('players are contained by the arena', () => {
  const player = clampPlayer({ x: -8, y: ARENA.height + 20 });
  assert.equal(player.x, 16);
  assert.equal(player.y, ARENA.height - 16);
});
