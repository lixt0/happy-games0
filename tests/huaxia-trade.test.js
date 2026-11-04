import test from 'node:test';
import assert from 'node:assert/strict';
import { SPACES, buy, createGame, finishAction, marketPrice, playAiTurn, propertyValue, roll, totalWealth, upgrade } from '../huaxia-trade/logic.js';

test('华夏商旅地图包含核心城市', () => {
  const names = SPACES.map(space => space.name);
  for (const city of ['洛阳', '汴京', '金陵', '赣州', '长沙', '成都', '广州', '大都']) assert.ok(names.includes(city));
});

test('掷骰会移动并在经过长安时发放红利', () => {
  let state = createGame(2, () => .5);
  state.players[0].position = SPACES.length - 2;
  state = roll(state, () => .5);
  assert.equal(state.dice, 4);
  assert.equal(state.players[0].money, 1700);
  assert.equal(state.phase, 'await-action');
});

test('城市可以购买、升级并计算资产', () => {
  let state = createGame(2, () => .5);
  state = roll(state, () => 0); // 洛阳
  const city = state.pending;
  state = buy(state, () => .5);
  assert.equal(state.properties[city].owner, 0);
  assert.equal(state.properties[city].cost, 180); // rng .5 时市场价 = 基准价
  assert.equal(propertyValue(state, 0), 180);
  state.turn = 0; state.phase = 'await-action'; state.pending = city;
  state = upgrade(state, () => .5);
  assert.equal(state.properties[city].level, 1);
  assert.ok(totalWealth(state, 0) > state.players[0].money);
});

test('经过他人城市需要缴纳商税', () => {
  let state = createGame(2, () => .5);
  state = roll(state, () => 0); state = buy(state, () => .5);
  state.turn = 1; state.phase = 'await-roll';
  state.players[1].position = 0;
  state = roll(state, () => 0); // lands on 洛阳
  const before = state.players[1].money;
  state = finishAction(state, () => .5);
  assert.equal(state.players[1].money, before - 35);
  assert.equal(state.players[0].money, 1500 - 180 + 35);
});

test('AI 回合可以完整执行并回到下一位', () => {
  const state = createGame(2, () => .5);
  state.turn = 1;
  const next = playAiTurn(state, () => .2);
  assert.equal(next.turn, 0);
  assert.equal(next.phase, 'await-roll');
  assert.ok(next.log.length >= 2);
});

test('开局物价在基准价附近随机波动', () => {
  const base = SPACES.find(space => space.id === 'luoyang');
  const low = createGame(2, () => 0);
  const mid = createGame(2, () => .5);
  const high = createGame(2, () => 1);
  assert.equal(low.market.luoyang.cost, Math.round(base.cost * .5));
  assert.equal(mid.market.luoyang.cost, base.cost);
  assert.equal(high.market.luoyang.cost, Math.round(base.cost * 1.5));
  assert.equal(low.market.luoyang.toll, Math.round(base.toll * .5));
  // 非城市地点没有报价
  assert.equal(marketPrice(mid, 'chang-an'), null);
});

test('每轮结算后物价随之浮动', () => {
  let state = createGame(2, () => .5);
  const before = state.market.luoyang.cost;
  state = roll(state, () => .5);
  state = finishAction(state, () => .5); // 第一轮结束（turn 0→1），不跨轮
  assert.equal(state.round, 1);
  assert.equal(state.market.luoyang.cost, before);
  state = roll(state, () => .5);
  state = finishAction(state, () => 1); // 第二轮开始（turn 1→0）→ 物价 ×1.25
  assert.equal(state.round, 2);
  assert.equal(state.market.luoyang.cost, Math.round(before * 1.25));
  assert.equal(state.market.luoyang.toll, Math.round(35 * 1.25));
});

test('买入按当前市场价结算', () => {
  let state = createGame(2, () => 0); // 物价 ×0.5
  state = roll(state, () => 0); // 洛阳
  const before = state.players[0].money;
  state = buy(state, () => .5);
  const price = before - state.players[0].money;
  assert.equal(price, Math.round(180 * .5));
  assert.equal(state.properties.luoyang.cost, price);
  assert.equal(propertyValue(state, 0), price);
});
