// Sudoku — pure game logic, no DOM.
// Board is board[row][col] where row and col are 0..8.
// Values 1..9 are filled, 0 (EMPTY) is empty.
// Three 3x3 boxes per row and per column.

export const SIZE = 9;
export const BOX_SIZE = 3;
export const EMPTY = 0;
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function createEmptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

// True if `num` already appears anywhere in (row, col)'s row, column, or 3x3 box.
// Assumes the cell at (row, col) is empty.
function hasConflict(board, row, col, num) {
  for (let c = 0; c < SIZE; c++) {
    if (board[row][c] === num) return true;
  }
  for (let r = 0; r < SIZE; r++) {
    if (board[r][col] === num) return true;
  }
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
    for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
      if (board[r][c] === num) return true;
    }
  }
  return false;
}

export function isValidPlacement(board, row, col, num) {
  return !hasConflict(board, row, col, num);
}

export function candidates(board, row, col) {
  if (board[row][col] !== EMPTY) return new Set();
  const out = new Set();
  for (const num of NUMBERS) {
    if (!hasConflict(board, row, col, num)) out.add(num);
  }
  return out;
}

// Find the empty cell with the fewest candidates (> 0).
// Returns { row, col, cands } or null if the board is full.
function findMRVCell(board) {
  let best = null;
  let bestSize = SIZE + 1;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== EMPTY) continue;
      const cands = candidates(board, r, c);
      if (cands.size === 0) return { row: r, col: c, cands }; // dead end
      if (cands.size < bestSize) {
        bestSize = cands.size;
        best = { row: r, col: c, cands };
        if (bestSize === 1) return best;
      }
    }
  }
  return best;
}

// Backtracking solver with MRV. Mutates `board` in place; caller passes a clone.
// Returns true if solved.
function solveInPlace(board) {
  const cell = findMRVCell(board);
  if (cell === null) return true; // board is full → solved
  const { row, col, cands } = cell;
  for (const num of cands) {
    board[row][col] = num;
    if (solveInPlace(board)) return true;
    board[row][col] = EMPTY;
  }
  return false;
}

export function solve(board) {
  // Fast pre-check: if the input already has conflicts in any row, column,
  // or box, no solution exists. This is O(81) and avoids exponential blowup
  // on adversarial inputs (e.g., two 5s in the same row).
  if (hasAnyConflict(board)) return null;
  const work = cloneBoard(board);
  if (solveInPlace(work)) return work;
  return null;
}

// Returns true if `board` already has any row/column/box with duplicate digits.
function hasAnyConflict(board) {
  for (let i = 0; i < SIZE; i++) {
    const seenRow = new Set();
    const seenCol = new Set();
    for (let j = 0; j < SIZE; j++) {
      const r = board[i][j];
      const c = board[j][i];
      if (r !== EMPTY) {
        if (seenRow.has(r)) return true;
        seenRow.add(r);
      }
      if (c !== EMPTY) {
        if (seenCol.has(c)) return true;
        seenCol.add(c);
      }
    }
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const seen = new Set();
      for (let r = br * 3; r < br * 3 + 3; r++) {
        for (let c = bc * 3; c < bc * 3 + 3; c++) {
          const v = board[r][c];
          if (v !== EMPTY) {
            if (seen.has(v)) return true;
            seen.add(v);
          }
        }
      }
    }
  }
  return false;
}

// Count distinct solutions, stopping early once count exceeds maxCount.
// Mutates `board` in place; caller passes a clone.
function countSolutionsInPlace(board, maxCount) {
  let count = 0;
  function recurse() {
    if (count > maxCount) return;
    const cell = findMRVCell(board);
    if (cell === null) {
      count++;
      return;
    }
    const { row, col, cands } = cell;
    if (cands.size === 0) return;
    for (const num of cands) {
      board[row][col] = num;
      recurse();
      board[row][col] = EMPTY;
      if (count > maxCount) return;
    }
  }
  recurse();
  return Math.min(count, maxCount);
}

export function countSolutions(board, maxCount = 2) {
  const work = cloneBoard(board);
  return countSolutionsInPlace(work, maxCount);
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateFullBoard(rng = Math.random) {
  const board = createEmptyBoard();

  function fill() {
    const cell = findMRVCell(board);
    if (cell === null) return true; // full
    const { row, col, cands } = cell;
    if (cands.size === 0) return false;
    const nums = Array.from(cands);
    shuffleInPlace(nums, rng);
    for (const num of nums) {
      board[row][col] = num;
      if (fill()) return true;
      board[row][col] = EMPTY;
    }
    return false;
  }

  fill();
  return board;
}

const DIFFICULTY_TARGETS = {
  easy: 45,
  medium: 35,
  hard: 28,
};

const GENERATION_TIME_CAP_MS = 200;

export function generatePuzzle(difficulty, rng = Math.random) {
  const target = DIFFICULTY_TARGETS[difficulty];
  if (target === undefined) throw new Error(`unknown difficulty: ${difficulty}`);

  const solution = generateFullBoard(rng);
  const puzzle = cloneBoard(solution);

  const positions = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push({ r, c });
    }
  }
  shuffleInPlace(positions, rng);

  const startTime = Date.now();
  let givens = SIZE * SIZE;
  for (const { r, c } of positions) {
    if (givens <= target) break;
    if (Date.now() - startTime > GENERATION_TIME_CAP_MS) break;

    const saved = puzzle[r][c];
    puzzle[r][c] = EMPTY;
    if (countSolutionsInPlace(puzzle, 2) === 1) {
      givens--;
    } else {
      puzzle[r][c] = saved;
    }
  }

  return { puzzle, solution };
}
