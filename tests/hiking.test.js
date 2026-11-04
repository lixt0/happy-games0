import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  routes, backpacks, allItems, getFoodDefs, getToolDefs, getItem, getBackpack,
  createGameState, getCurrentCheckpoint, getNextCheckpoint,
  advanceCheckpoint, isComplete, getProgress,
  processDay, consumeFood, useMedkit, getSceneryImages,
} from '../hiking/logic.js';

function gearMap(...ids) {
  const m = {};
  for (const id of ids) m[id] = 1;
  return m;
}

function gearMapWithQty(entries) {
  const m = {};
  for (const [id, qty] of entries) m[id] = qty;
  return m;
}

test('routes: 3 routes with required fields', () => {
  assert.equal(routes.length, 3);
  const ids = routes.map(r => r.id);
  assert.ok(ids.includes('aotai'));
  assert.ok(ids.includes('gongga'));
  assert.ok(ids.includes('wusun'));
  for (const r of routes) {
    assert.ok(r.checkpoints.length >= 5);
    assert.ok(typeof r.baseCost === 'number');
  }
});

test('backpacks: 3 sizes with increasing capacity', () => {
  assert.equal(backpacks.length, 3);
  assert.ok(backpacks[0].maxWeight < backpacks[1].maxWeight);
  assert.ok(backpacks[1].maxWeight < backpacks[2].maxWeight);
  assert.ok(backpacks[0].energyMult < backpacks[2].energyMult);
});

test('allItems: contains tools, tent, and food', () => {
  const ids = allItems.map(i => i.id);
  assert.ok(ids.includes('tent'));
  assert.ok(ids.includes('trekking_poles'));
  assert.ok(ids.includes('compressed_biscuit'));
  assert.ok(allItems.length >= 15);
});

test('getBackpack: returns correct backpack', () => {
  const b = getBackpack('medium');
  assert.ok(b);
  assert.equal(b.maxWeight, 7000);
  assert.equal(getBackpack('nope'), undefined);
});

test('getItem: returns any item', () => {
  assert.equal(getItem('tent').name, '帐篷');
  assert.equal(getItem('compressed_biscuit').name, '压缩饼干');
  assert.equal(getItem('none'), undefined);
});

test('getFoodDefs: returns food array', () => {
  const f = getFoodDefs();
  assert.ok(f.length >= 3);
  assert.ok(f.some(i => i.id === 'compressed_biscuit'));
});

test('getToolDefs: includes tent', () => {
  const t = getToolDefs();
  assert.ok(t.some(i => i.id === 'tent'));
  assert.ok(t.some(i => i.id === 'trekking_poles'));
});

test('createGameState: valid state with backpack and items', () => {
  const s = createGameState('aotai', 'medium', gearMap('tent', 'trekking_poles', 'rain_jacket', 'hiking_boots', 'compressed_biscuit', 'energy_bar'));
  assert.ok(s);
  assert.equal(s.backpackId, 'medium');
  assert.equal(s.energyMult, 1.2);
  assert.equal(s.energy, 100);
  assert.equal(s.health, 100);
  assert.ok(s.hasTent);
  assert.ok(s.toolIds.includes('trekking_poles'));
  assert.ok(s.toolIds.includes('tent'));
  assert.ok(s.foodInventory.includes('compressed_biscuit'));
  assert.ok(s.foodInventory.includes('energy_bar'));
});

test('createGameState: null for invalid route', () => {
  assert.equal(createGameState('nope', 'small', {}), null);
});

test('createGameState: null for invalid backpack', () => {
  assert.equal(createGameState('aotai', 'nope', {}), null);
});

test('createGameState: null when overweight', () => {
  assert.equal(createGameState('aotai', 'small', gearMapWithQty([['tent', 1], ['rope', 1], ['crampons', 1], ['oxygen', 1], ['hiking_boots', 1], ['rain_jacket', 1], ['self_heating_rice', 3]])), null);
});

test('consumeFood: restores energy', () => {
  const s = createGameState('aotai', 'small', gearMapWithQty([['tent', 1], ['compressed_biscuit', 2], ['energy_bar', 1]]));
  s.energy = 50;
  const restored = consumeFood(s, 'compressed_biscuit');
  assert.equal(restored, 18);
  assert.equal(s.energy, 68);
  assert.equal(s.foodInventory.length, 2);
});

test('consumeFood: unknown food returns 0', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'compressed_biscuit'));
  assert.equal(consumeFood(s, 'nonexistent'), 0);
});

test('consumeFood: caps at 100', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'compressed_biscuit'));
  s.energy = 95;
  consumeFood(s, 'compressed_biscuit');
  assert.equal(s.energy, 100);
});

test('useMedkit: restores health and consumes medkit', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'first_aid', 'compressed_biscuit'));
  s.health = 50;
  const healed = useMedkit(s);
  assert.equal(healed, 30);
  assert.equal(s.health, 80);
  assert.ok(!s.toolIds.includes('first_aid'));
});

test('useMedkit: returns 0 when no medkit', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'compressed_biscuit'));
  assert.equal(useMedkit(s), 0);
});

test('useMedkit: caps at 100', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'first_aid', 'compressed_biscuit'));
  s.health = 85;
  useMedkit(s);
  assert.equal(s.health, 100);
});

test('processDay: tent log shows no health loss from night', () => {
  const s = createGameState('aotai', 'medium', gearMap('tent', 'trekking_poles', 'rain_jacket', 'hiking_boots', 'headlamp', 'compressed_biscuit', 'energy_bar'));
  const result = processDay(s);
  const nightLog = result.logs.find(l => l.title === '帐篷休息');
  assert.ok(nightLog, 'tent rest log should exist');
  assert.equal(nightLog.healthLoss, 0);
});

test('processDay: no tent causes health loss', () => {
  const s = createGameState('aotai', 'small', gearMap('compressed_biscuit'));
  processDay(s);
  assert.ok(s.health < 100, 'health should decrease without tent');
});

test('processDay: large backpack increases base energy cost', () => {
  // tent(2500) + compressed_biscuit(400) = 2900 ≤ small 4000
  const gear = gearMap('tent', 'compressed_biscuit');
  let smallSum = 0, largeSum = 0;
  const n = 2500;
  for (let i = 0; i < n; i++) {
    smallSum += processDay(createGameState('aotai', 'small', gear)).energyLoss;
    largeSum += processDay(createGameState('aotai', 'large', gear)).energyLoss;
  }
  assert.ok(largeSum > smallSum, `large(${(largeSum/n).toFixed(1)}) > small(${(smallSum/n).toFixed(1)})`);
});

test('processDay: kills ungeared player', () => {
  let survived = 0;
  for (let t = 0; t < 30; t++) {
    const s = createGameState('aotai', 'small', {});
    const route = routes.find(r => r.id === 'aotai');
    for (let i = 0; i < route.checkpoints.length - 1; i++) {
      if (s.dead) break;
      processDay(s);
      if (!s.dead) advanceCheckpoint(s);
    }
    if (!s.dead) survived++;
  }
  assert.ok(survived <= 3, `ungeared: ${survived}/30 survived`);
});

test('processDay: well-geared has chance on aotai', () => {
  let survived = 0;
  for (let t = 0; t < 30; t++) {
    const s = createGameState('aotai', 'medium', gearMap('tent', 'trekking_poles', 'rain_jacket', 'hiking_boots', 'headlamp', 'compressed_biscuit', 'energy_bar'));
    const route = routes.find(r => r.id === 'aotai');
    let ateToday = false;
    for (let i = 0; i < route.checkpoints.length - 1; i++) {
      if (s.dead) break;
      processDay(s);
      if (s.dead) break;
      if (s.energy < 35 && s.foodInventory.length > 0 && !ateToday) {
        consumeFood(s, s.foodInventory[0]);
        ateToday = true;
      }
      if (!s.dead) advanceCheckpoint(s);
      ateToday = false;
    }
    if (!s.dead) survived++;
  }
  assert.ok(survived >= 2, `geared aotai: only ${survived}/30`);
  assert.ok(survived < 30, `geared aotai: ${survived}/30 all survived`);
});

test('wusun: similar challenge to gongga with good gear', () => {
  let survived = 0;
  for (let t = 0; t < 30; t++) {
    const s = createGameState('wusun', 'medium', gearMap('tent', 'trekking_poles', 'rain_jacket', 'hiking_boots', 'headlamp', 'compressed_biscuit', 'energy_bar'));
    const route = routes.find(r => r.id === 'wusun');
    let ateToday = false;
    for (let i = 0; i < route.checkpoints.length - 1; i++) {
      if (s.dead) break;
      processDay(s);
      if (s.dead) break;
      if (s.energy < 30 && s.foodInventory.length > 0 && !ateToday) {
        consumeFood(s, s.foodInventory[0]);
        ateToday = true;
      }
      if (!s.dead) advanceCheckpoint(s);
      ateToday = false;
    }
    if (!s.dead) survived++;
  }
  assert.ok(survived >= 1, `wusun: ${survived}/30 (at least some)`);
  assert.ok(survived < 30, `wusun: ${survived}/30 (not all)`);
});

test('advanceCheckpoint: blocked when dead', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'compressed_biscuit'));
  s.dead = true;
  assert.equal(advanceCheckpoint(s), null);
});

test('full loop: completes route when lucky', () => {
  const s = createGameState('aotai', 'medium', gearMap('tent', 'trekking_poles', 'rain_jacket', 'hiking_boots', 'headlamp', 'compressed_biscuit', 'energy_bar', 'beef_jerky'));
  const route = routes.find(r => r.id === 'aotai');
  for (let i = 0; i < route.checkpoints.length - 1; i++) {
    if (s.dead) break;
    processDay(s);
    if (s.dead) break;
    while (s.energy < 50 && s.foodInventory.length > 0) {
      consumeFood(s, s.foodInventory[0]);
    }
    if (!s.dead) advanceCheckpoint(s);
  }
  assert.ok(s.dead || isComplete(s));
});

test('getSceneryImages: returns Unsplash URLs', () => {
  const imgs = getSceneryImages();
  assert.ok(imgs.length >= 1);
  assert.ok(imgs.length <= 3);
  for (const url of imgs) assert.ok(url.startsWith('https://images.unsplash.com/'));
});

test('processDay: dead state skipped', () => {
  const s = createGameState('aotai', 'small', gearMap('tent', 'compressed_biscuit'));
  s.dead = true;
  const result = processDay(s);
  assert.equal(result.logs.length, 0);
});
