import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metrics, pixelToCell, cellToPixel, drawBoard, drawStones } from '../weiqi/render.js';

test('metrics: 9 路盘在 540 画布上步长与边距合理', () => {
  const m = metrics(9, 540);
  assert.equal(typeof m.ox, 'number');
  assert.equal(typeof m.step, 'number');
  // 9 个交点占 8 段间距，应居中
  assert.ok(Math.abs(m.ox - (540 - 8 * m.step) / 2) < 0.001);
  assert.ok(m.step > 0 && m.stoneR > 0 && m.stoneR < m.step / 2);
});

test('pixelToCell: 吸附到最近交点，越界返回 null', () => {
  const m = metrics(9, 540);
  const c = cellToPixel(4, 4, m);
  assert.deepEqual(pixelToCell(c.x, c.y, m, 9), [4, 4]);
  // 半个交点内吸附
  assert.deepEqual(pixelToCell(c.x + m.step * 0.4, c.y, m, 9), [4, 4]);
  // 明显越界
  assert.equal(pixelToCell(-50, -50, m, 9), null);
  assert.equal(pixelToCell(540, 540, m, 9), null);
});

test('drawBoard/drawStones: mock ctx 不抛错', () => {
  const noop = () => {};
  const ctx = new Proxy({}, { get: () => () => undefined });
  const m = metrics(9, 540);
  const board = Array.from({ length: 9 }, () => new Array(9).fill(0));
  board[3][3] = 1; board[3][4] = 2;
  assert.doesNotThrow(() => { drawBoard(ctx, m, 9); drawStones(ctx, board, m, 9, [3, 3]); });
});

import { emptyBoard, syncBoard, EMPTY, BLACK, WHITE } from '../weiqi/logic.js';

test('emptyBoard: 全 0', () => {
  const b = emptyBoard(9);
  assert.equal(b.length, 9);
  assert.equal(b[0].length, 9);
  assert.equal(b.every(r => r.every(c => c === 0)), true);
});

test('syncBoard: 由 getCell 回调填满', () => {
  const getCell = (i, j) => (i === 0 && j === 0) ? BLACK : (i === 1 && j === 1) ? WHITE : EMPTY;
  const b = syncBoard(getCell, 9);
  assert.equal(b[0][0], BLACK);
  assert.equal(b[1][1], WHITE);
  assert.equal(b[2][2], EMPTY);
});

test('常量: EMPTY=0 BLACK=1 WHITE=2 与 gnugo _getBoard 一致', () => {
  assert.equal(EMPTY, 0);
  assert.equal(BLACK, 1);
  assert.equal(WHITE, 2);
});
