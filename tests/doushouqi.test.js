import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUE, RED, COLS, ROWS, DENS,
  allLegalMoves, applyMove, canCapture, countPieces, createEmptyBoard,
  initialBoard, isWater, legalMoves, piece, positionKey, winner,
} from '../doushouqi/logic.js';
import { difficultyDepth, searchMove } from '../doushouqi/engine.js';

function hasMove(moves, row, col) {
  return moves.some(move => move.to[0] === row && move.to[1] === col);
}

test('initialBoard: 9x7 with eight pieces per side', () => {
  const board = initialBoard();
  assert.equal(board.length, ROWS);
  assert.equal(board[0].length, COLS);
  assert.equal(countPieces(board, RED), 8);
  assert.equal(countPieces(board, BLUE), 8);
  assert.equal(board[0][0], piece(BLUE, 'L'));
  assert.equal(board[8][6], piece(RED, 'L'));
});

test('ordinary animals move orthogonally but cannot enter water or their own den', () => {
  const board = createEmptyBoard();
  board[3][0] = piece(RED, 'C');
  assert.equal(hasMove(legalMoves(board, 3, 0), 3, 1), false);

  board[3][0] = null;
  board[8][2] = piece(RED, 'C');
  assert.equal(hasMove(legalMoves(board, 8, 2), ...DENS[RED]), false);
  assert.equal(hasMove(legalMoves(board, 8, 2), 7, 2), true);
});

test('rat is the only animal that can enter and move through water', () => {
  const board = createEmptyBoard();
  board[3][0] = piece(RED, 'R');
  assert.equal(isWater(3, 1), true);
  assert.equal(hasMove(legalMoves(board, 3, 0), 3, 1), true);
  const next = applyMove(board, legalMoves(board, 3, 0).find(move => move.to[1] === 1));
  assert.equal(hasMove(legalMoves(next, 3, 1), 4, 1), true);
});

test('lion and tiger jump across clear water', () => {
  const board = createEmptyBoard();
  board[3][0] = piece(RED, 'T');
  const moves = legalMoves(board, 3, 0);
  const jump = moves.find(move => move.to[0] === 3 && move.to[1] === 3);
  assert.ok(jump);
  assert.equal(jump.jump, true);
});

test('a rat in either color blocks a lion or tiger river jump', () => {
  const board = createEmptyBoard();
  board[3][0] = piece(RED, 'L');
  board[3][2] = piece(BLUE, 'R');
  assert.equal(hasMove(legalMoves(board, 3, 0), 3, 3), false);
  board[3][2] = piece(RED, 'R');
  assert.equal(hasMove(legalMoves(board, 3, 0), 3, 3), false);
});

test('capture hierarchy and rat-elephant exception are enforced', () => {
  const board = createEmptyBoard();
  board[2][0] = piece(RED, 'D');
  board[2][1] = piece(BLUE, 'C');
  assert.equal(canCapture(board, 2, 0, 2, 1), true);
  board[2][1] = piece(BLUE, 'P');
  assert.equal(canCapture(board, 2, 0, 2, 1), false);

  board[2][0] = piece(RED, 'R');
  board[2][1] = piece(BLUE, 'E');
  assert.equal(canCapture(board, 2, 0, 2, 1), true);
  board[2][0] = piece(RED, 'E');
  board[2][1] = piece(BLUE, 'R');
  assert.equal(canCapture(board, 2, 0, 2, 1), false);
});

test('rat cannot capture across the water boundary', () => {
  const board = createEmptyBoard();
  board[3][1] = piece(RED, 'R');
  board[3][0] = piece(BLUE, 'E');
  assert.equal(canCapture(board, 3, 1, 3, 0), false);
  board[3][0] = piece(BLUE, 'R');
  assert.equal(canCapture(board, 3, 1, 3, 0), false);
});

test('an enemy piece in a defending trap can be captured by any rank', () => {
  const board = createEmptyBoard();
  board[1][2] = piece(BLUE, 'R');
  board[1][3] = piece(RED, 'E');
  assert.equal(canCapture(board, 1, 2, 1, 3), true);
});

test('entering the enemy den, eliminating all pieces, or stalemate wins', () => {
  const denBoard = createEmptyBoard();
  denBoard[DENS[BLUE][0]][DENS[BLUE][1]] = piece(RED, 'C');
  denBoard[8][0] = piece(RED, 'R');
  denBoard[0][0] = piece(BLUE, 'R');
  assert.equal(winner(denBoard), RED);

  const emptyEnemy = createEmptyBoard();
  emptyEnemy[8][0] = piece(RED, 'R');
  assert.equal(winner(emptyEnemy), RED);

  const stuck = createEmptyBoard();
  stuck[0][0] = piece(BLUE, 'R');
  stuck[0][1] = piece(RED, 'C');
  stuck[1][0] = piece(RED, 'C');
  assert.equal(winner(stuck, BLUE), RED);
});

test('positionKey includes side to move', () => {
  const board = initialBoard();
  assert.notEqual(positionKey(board, RED), positionKey(board, BLUE));
});

test('AI always returns a legal move and takes an immediate den win', () => {
  const board = createEmptyBoard();
  board[7][3] = piece(BLUE, 'C');
  board[0][0] = piece(BLUE, 'R');
  board[8][0] = piece(RED, 'R');
  const move = searchMove(board, BLUE, 2);
  assert.deepEqual(move.from, [7, 3]);
  assert.deepEqual(move.to, DENS[RED]);

  const initialMove = searchMove(initialBoard(), BLUE, 1);
  assert.ok(initialMove);
  assert.ok(allLegalMoves(initialBoard(), BLUE).some(candidate =>
    candidate.from[0] === initialMove.from[0] &&
    candidate.from[1] === initialMove.from[1] &&
    candidate.to[0] === initialMove.to[0] &&
    candidate.to[1] === initialMove.to[1]
  ));
});

test('difficulty maps to increasing search depth', () => {
  assert.equal(difficultyDepth('easy'), 1);
  assert.equal(difficultyDepth('medium'), 2);
  assert.equal(difficultyDepth('hard'), 4);
});
