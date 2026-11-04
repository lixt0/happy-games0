import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, move, rulesFor } from '../rule-blocks/logic.js';

test('文字规则可解析出控制、胜利与阻挡', () => {
  const rules = rulesFor(createState());
  assert.equal(rules['我'].has('你'), true);
  assert.equal(rules['旗'].has('胜'), true);
  assert.equal(rules['墙'].has('停'), true);
});
test('角色会移动但不能穿过停止物体', () => {
  let state = createState();
  state = move(state, 'right');
  assert.equal(state.items.find(item => item.type === 'object' && item.text === '我').c, 2);
  state = move(state, 'right');
  assert.equal(state.items.find(item => item.type === 'object' && item.text === '我').c, 2);
});
test('文字方块默认可推动，破坏规则后墙不再阻挡', () => {
  let state = createState(1);
  state.items.find(item => item.type === 'object' && item.text === '我').r = 4;
  state.items.find(item => item.type === 'object' && item.text === '我').c = 4;
  state = move(state, 'up');
  assert.equal(rulesFor(state)['墙'].has('停'), false);
});
