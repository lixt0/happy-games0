import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZE,
  EMPTY,
  createEmptyBoard,
  cloneBoard,
  isValidPlacement,
  candidates,
  solve,
  countSolutions,
  generateFullBoard,
  generatePuzzle,
} from '../sudoku/logic.js';

// --- createEmptyBoard ---
test('createEmptyBoard: 9x9 of zeros', () => {
  const b = createEmptyBoard();
  assert.equal(b.length, 9);
  for (const row of b) {
    assert.equal(row.length, 9);
    for (const v of row) assert.equal(v, EMPTY);
  }
});

// --- cloneBoard ---
test('cloneBoard: deep clone (mutations isolated)', () => {
  const b = createEmptyBoard();
  b[0][1] = 4;
  const c = cloneBoard(b);
  assert.deepEqual(c, b);
  c[0][1] = 8;
  assert.equal(b[0][1], 4);
  assert.equal(c[0][1], 8);
});

// --- isValidPlacement ---
test('isValidPlacement: row conflict → false', () => {
  const b = createEmptyBoard();
  b[0][0] = 5;
  assert.equal(isValidPlacement(b, 3, 0, 5), false);
  assert.equal(isValidPlacement(b, 3, 0, 6), true);
});

test('isValidPlacement: column conflict → false', () => {
  const b = createEmptyBoard();
  b[0][0] = 7;
  assert.equal(isValidPlacement(b, 4, 0, 7), false);
  assert.equal(isValidPlacement(b, 4, 0, 1), true);
});

test('isValidPlacement: box conflict → false', () => {
  const b = createEmptyBoard();
  b[0][0] = 3;
  assert.equal(isValidPlacement(b, 1, 1, 3), false);
  assert.equal(isValidPlacement(b, 1, 1, 4), true);
});

test('isValidPlacement: empty cell with no conflict → true', () => {
  const b = createEmptyBoard();
  b[0][0] = 5;
  for (let n = 1; n <= 9; n++) {
    assert.equal(isValidPlacement(b, 4, 4, n), true);
  }
});

// --- candidates ---
test('candidates: full row, no candidates in that row', () => {
  const b = createEmptyBoard();
  for (let n = 1; n <= 9; n++) b[0][n - 1] = n;
  assert.deepEqual(candidates(b, 0, 8), new Set());
});

test('candidates: fresh empty cell returns all 1-9', () => {
  const b = createEmptyBoard();
  const cands = candidates(b, 4, 4);
  assert.equal(cands.size, 9);
});

test('candidates: non-empty cell returns empty set', () => {
  const b = createEmptyBoard();
  b[3][3] = 5;
  assert.deepEqual(candidates(b, 3, 3), new Set());
});

// --- solve ---
test('solve: known easy puzzle returns correct solution', () => {
  const puzzle = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ];
  const expected = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9],
  ];
  const sol = solve(puzzle);
  assert.ok(sol !== null, 'expected a solution');
  assert.deepEqual(sol, expected);
});

test('solve: does not mutate input', () => {
  const puzzle = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ];
  const snapshot = puzzle.map(row => row.slice());
  solve(puzzle);
  assert.deepEqual(puzzle, snapshot);
});

test('solve: invalid input (with conflicts) returns null', () => {
  const bad = createEmptyBoard();
  bad[0][0] = 5;
  bad[0][1] = 5; // duplicate in row 0
  assert.equal(solve(bad), null);
});

// --- countSolutions ---
test('countSolutions: complete valid board → 1', () => {
  const full = generateFullBoard();
  assert.equal(countSolutions(full, 2), 1);
});

test('countSolutions: empty board → > 1', () => {
  const b = createEmptyBoard();
  assert.ok(countSolutions(b, 2) > 1);
});

// --- generateFullBoard ---
test('generateFullBoard: 81 cells, all rows/cols/boxes valid', () => {
  const full = generateFullBoard();
  let count = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = full[r][c];
      assert.ok(v >= 1 && v <= 9, `cell (${r},${c}) out of range: ${v}`);
      count++;
    }
  }
  assert.equal(count, 81);
  // Every row has 1..9
  for (let r = 0; r < SIZE; r++) {
    const rowSet = new Set(full[r]);
    assert.equal(rowSet.size, 9, `row ${r} missing numbers`);
  }
  // Every column has 1..9
  for (let c = 0; c < SIZE; c++) {
    const colSet = new Set();
    for (let r = 0; r < SIZE; r++) colSet.add(full[r][c]);
    assert.equal(colSet.size, 9, `column ${c} missing numbers`);
  }
  // Every 3x3 box has 1..9
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const boxSet = new Set();
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) boxSet.add(full[r][c]);
      }
      assert.equal(boxSet.size, 9, `box (${br},${bc}) missing numbers`);
    }
  }
});

// --- generatePuzzle: skipped (uses precomputed bank at runtime; see logic.js) ---
test('generatePuzzle: returns a valid puzzle from the bank', () => {
  const { puzzle, solution } = generatePuzzle('easy');
  let givens = 0;
  for (const row of puzzle) for (const v of row) if (v !== EMPTY) givens++;
  assert.ok(givens > 0 && givens < 81, `easy givens: ${givens}`);
  assert.equal(countSolutions(puzzle, 2), 1);
  const solved = solve(puzzle);
  assert.deepEqual(solved, solution);
});
