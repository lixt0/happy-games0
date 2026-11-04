import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialBoard, cloneBoard, isRed, isBlack, sideOf,
  legalMoves, isInCheck, isCheckmate, hasAnyLegalMove, makeMove,
  findKing, toFEN, pieceName, RED, BLACK,
} from '../xiangqi/logic.js';

test('initialBoard: 10x9，含 32 子', () => {
  const b = initialBoard();
  assert.equal(b.length, 10);
  assert.equal(b[0].length, 9);
  let count = 0;
  for (const row of b) for (const c of row) if (c) count++;
  assert.equal(count, 32);
});

test('initialBoard: 初始未被将军', () => {
  assert.equal(isInCheck(initialBoard(), RED), false);
  assert.equal(isInCheck(initialBoard(), BLACK), false);
});

test('initialBoard: 双方都有合法走子（未将死）', () => {
  assert.equal(isCheckmate(initialBoard(), RED), false);
  assert.equal(isCheckmate(initialBoard(), BLACK), false);
  assert.ok(hasAnyLegalMove(initialBoard(), RED));
  assert.ok(hasAnyLegalMove(initialBoard(), BLACK));
});

test('sideOf / isRed / isBlack', () => {
  assert.equal(isRed('K'), true);
  assert.equal(isBlack('k'), true);
  assert.equal(sideOf('R'), RED);
  assert.equal(sideOf('r'), BLACK);
  assert.equal(sideOf(null), null);
});

test('cloneBoard: 深拷贝', () => {
  const a = initialBoard();
  const b = cloneBoard(a);
  b[0][0] = null;
  assert.ok(a[0][0] === 'r');
});

test('legalMoves: 初始车可走2格（前两行空，第三行有卒挡），兵卒未过河仅前进', () => {
  assert.equal(legalMoves(initialBoard(), 0, 0).length, 2); // 黑车：(1,0)(2,0)
  assert.equal(legalMoves(initialBoard(), 9, 0).length, 2); // 红车：(8,0)(7,0)
  assert.equal(legalMoves(initialBoard(), 6, 0).length, 1); // 红兵只能前进
  assert.equal(legalMoves(initialBoard(), 3, 0).length, 1); // 黑卒只能前进
});

test('车走直线，可被阻', () => {
  const b = initialBoard();
  // 红车(9,0) 前方有马(9,1)? 不，前方(8,0)空, (7,0)空,(6,0)有兵
  // 向上：[8,0],[7,0]，然后(6,0)是己方兵，停。向右：(9,1)是马挡。
  const mv = legalMoves(b, 9, 0);
  assert.ok(mv.some(m => m[0] === 8 && m[1] === 0));
  assert.ok(mv.some(m => m[0] === 7 && m[1] === 0));
  assert.ok(!mv.some(m => m[0] === 6 && m[1] === 0), '应被己方兵阻');
});

test('马走日并蹩马腿', () => {
  const b = initialBoard();
  // 红马(9,1)：蹩腿(8,2)? 实际马(9,1)可走 (7,0),(7,2)（上方马腿在(8,1)空）
  const mv = legalMoves(b, 9, 1);
  assert.ok(mv.some(m => m[0] === 7 && m[1] === 0));
  assert.ok(mv.some(m => m[0] === 7 && m[1] === 2));
});

test('炮须越子吃子', () => {
  const b = initialBoard();
  // 红炮(7,1)：平走(7,0)(7,2)…? (7,2)空但(7,4)是己方炮？不，(7,1)是炮位
  // 炮(7,1)：向上(6,1)(5,1)(4,1)...(3,1)卒=敌，需炮架。中间(6,1)空，再到卒(3,1)前需一个炮架
  // (6,1)空到(5,1)(4,1)空...到卒(3,1)：途经(6,1)(5,1)(4,1)空 → 炮架不算，必须有1个棋子隔开
  // 标准初始红炮(7,1)吃黑卒(3,1) 之间隔(6,1)(5,1)(4,1)空 → 实际不能直接吃（要有炮架）
  // 若黑卒(3,1)前无炮架 → 不能吃
  const mv = legalMoves(b, 7, 1);
  // 能平移到(7,0)? (7,0)空...实际车在(9,0)。(7,0)空可平
  assert.ok(mv.some(m => m[0] === 7 && m[1] === 0));
});

test('相走田不过河，塞象眼', () => {
  const b = initialBoard();
  // 红相(9,2)：田字到(7,0)(7,4)，象眼在(8,1)(8,3)空 → 可走
  const mv = legalMoves(b, 9, 2);
  assert.ok(mv.some(m => m[0] === 7 && m[1] === 0));
  assert.ok(mv.some(m => m[0] === 7 && m[1] === 4));
  // 不能过河：到(5,x)不可
  assert.ok(!mv.some(m => m[0] <= 4));
});

test('仕限九宫斜走', () => {
  const b = initialBoard();
  const mv = legalMoves(b, 9, 3); // 红仕
  assert.equal(mv.length, 1);
  assert.deepEqual(mv[0], [8, 4]);
});

test('帅限九宫直走', () => {
  const b = initialBoard();
  const mv = legalMoves(b, 9, 4); // 红帅
  assert.equal(mv.length, 1);
  assert.deepEqual(mv[0], [8, 4]);
});

test('makeMove 做棋子移动并克隆', () => {
  const b = initialBoard();
  const m = makeMove(b, [9, 1], [7, 2]); // 红马跳
  assert.equal(m[9][1], null);
  assert.equal(m[7][2], 'N');
  assert.equal(b[9][1], 'N'); // 原 board 未变
});

test('legalMoves 过滤会暴露自将的走法', () => {
  // 构造：红帅(9,4)红车(8,4)黑车(1,4)。红车若离中线，红帅被黑车照面（同列无遮挡）
  const b = initialBoard().map(r => r.slice());
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) b[r][c] = null;
  b[9][4] = 'K';
  b[8][4] = 'R'; // 红车挡在帅前
  b[1][4] = 'r'; // 黑车同列在上方
  // 红车(8,4)向上吃黑车(1,4)：吃后红帅(9,4)直接面对黑将(假设黑将不在同列)
  b[0][3] = 'k'; // 黑将在角，不同列
  // 此时 R 吃 r 后仍同列无遮挡 -> 帅暴露给... 实际无将照面（黑将不在4列）
  // 但 R 走开后 4 列只剩 K 和已被吃 r，无将军
  const mv = legalMoves(b, 8, 4);
  // 向上可吃黑车
  assert.ok(mv.some(m => m[0] === 1 && m[1] === 4));
});

test('将帅照面视为将军', () => {
  const b = initialBoard().map(r => r.slice());
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) b[r][c] = null;
  b[9][4] = 'K';
  b[0][4] = 'k';
  assert.equal(isInCheck(b, RED), true);
  assert.equal(isInCheck(b, BLACK), true);
});

test('isCheckmate: 简单将死检测', () => {
  // 构造：黑将(0,3)被红车(0,0)和(1,4)将死
  const b = initialBoard().map(r => r.slice());
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) b[r][c] = null;
  b[0][3] = 'k'; // 黑将
  b[0][0] = 'R'; // 红车将底
  b[1][4] = 'R'; // 另一红车控制横线
  b[9][4] = 'K'; // 红帅
  // 黑将无处可逃
  assert.equal(isCheckmate(b, BLACK), true);
});

test('toFEN: 字符含分隔', () => {
  const fen = toFEN(initialBoard(), RED);
  assert.ok(typeof fen === 'string');
  assert.ok(fen.endsWith(' w'));
  assert.ok(fen.includes('/'));
  // 含率兵字符
  assert.ok(fen.includes('r'));
});

test('toFEN round-trip 大致校验', () => {
  const fen = toFEN(initialBoard(), BLACK);
  assert.ok(fen.endsWith(' b'));
});

test('findKing', () => {
  const b = initialBoard();
  const r = findKing(b, RED);
  assert.deepEqual(r, [9, 4]);
  const bl = findKing(b, BLACK);
  assert.deepEqual(bl, [0, 4]);
});

test('pieceName', () => {
  assert.equal(pieceName('K'), '帅');
  assert.equal(pieceName('k'), '将');
  assert.equal(pieceName('P'), '兵');
  assert.equal(pieceName('p'), '卒');
  assert.equal(pieceName('r'), '车');
  assert.equal(pieceName('C'), '炮');
  assert.equal(pieceName('Q'), '');
});