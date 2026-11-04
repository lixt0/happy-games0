import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BLACK, WHITE, EMPTY, DIFFICULTY, applyMove, chooseAiMove, countPieces, createBoard, getFlips, isGameOver, legalMoves } from '../othello/logic.js';

test('initial board has the standard four center pieces', () => {
  const board = createBoard();
  assert.deepEqual(countPieces(board), { black: 2, white: 2, empty: 60 });
  assert.equal(board[3][3], WHITE);
  assert.equal(board[3][4], BLACK);
});

test('initial board gives four legal moves to each color', () => {
  const board = createBoard();
  assert.equal(legalMoves(board, BLACK).length, 4);
  assert.equal(legalMoves(board, WHITE).length, 4);
});

test('getFlips finds and applyMove flips enclosed pieces without mutating input', () => {
  const board = createBoard();
  const flips = getFlips(board, 3, 2, BLACK);
  assert.deepEqual(flips, [{ x: 3, y: 3 }]);
  const next = applyMove(board, 3, 2, BLACK);
  assert.equal(board[3][3], WHITE);
  assert.equal(next[3][3], BLACK);
  assert.equal(next[2][3], BLACK);
});

test('illegal move returns null', () => {
  assert.equal(applyMove(createBoard(), 0, 0, BLACK), null);
});

test('AI chooses a legal move at every supported difficulty', () => {
  const board = createBoard();
  const legal = new Set(legalMoves(board, WHITE).map(move => `${move.x},${move.y}`));
  for (const level of Object.values(DIFFICULTY)) {
    const move = chooseAiMove(board, WHITE, level);
    assert.ok(legal.has(`${move.x},${move.y}`));
  }
});

test('game ends when the board is full', () => {
  const board = Array.from({ length: 8 }, () => Array(8).fill(BLACK));
  assert.equal(isGameOver(board), true);
  assert.equal(legalMoves(board, BLACK).length, 0);
  assert.equal(legalMoves(board, WHITE).length, 0);
});
