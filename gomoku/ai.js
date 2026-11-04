// Gomoku AI — pure functions, no DOM.
// Conventions: BLACK = 1 (player), WHITE = 2 (AI).
// Board is a 2D array [y][x] where EMPTY = 0.

export const SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export const OPPOSITE = { [BLACK]: WHITE, [WHITE]: BLACK };

export function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

export function inBounds(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

export function place(board, x, y, color) {
  board[y][x] = color;
}

export function unplace(board, x, y) {
  board[y][x] = EMPTY;
}

// Pattern scores (from spec)
const SCORE = {
  FIVE: 100000,
  OPEN_FOUR: 10000,
  CLOSED_FOUR: 1000,
  OPEN_THREE: 1000,
  CLOSED_THREE: 100,
  OPEN_TWO: 100,
  CLOSED_TWO: 10,
  ONE: 1,
};

const DIRS = [
  [1, 0],   // horizontal
  [0, 1],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

// Walk a line through (x,y) in direction (dx,dy), counting the run of `color`
// stones and noting whether each end is blocked.
function analyzeLine(board, x, y, dx, dy, color) {
  // Count consecutive `color` stones starting at (x,y), including (x,y).
  let count = 1;
  let leftBlocked = false;
  let rightBlocked = false;

  let nx = x + dx, ny = y + dy;
  while (inBounds(nx, ny) && board[ny][nx] === color) {
    count++; nx += dx; ny += dy;
  }
  if (!inBounds(nx, ny) || board[ny][nx] === OPPOSITE[color]) {
    rightBlocked = true;
  }

  nx = x - dx; ny = y - dy;
  while (inBounds(nx, ny) && board[ny][nx] === color) {
    count++; nx -= dx; ny -= dy;
  }
  if (!inBounds(nx, ny) || board[ny][nx] === OPPOSITE[color]) {
    leftBlocked = true;
  }

  return { count, leftBlocked, rightBlocked };
}

// Score a single line's contribution. The cell (x,y) itself is `color`.
function lineScore(count, leftBlocked, rightBlocked) {
  if (count >= 5) return SCORE.FIVE;
  const bothOpen = !leftBlocked && !rightBlocked;
  const oneOpen = !leftBlocked || !rightBlocked;

  switch (count) {
    case 4:
      if (bothOpen) return SCORE.OPEN_FOUR;
      if (oneOpen) return SCORE.CLOSED_FOUR;
      return 0;
    case 3:
      if (bothOpen) return SCORE.OPEN_THREE;
      if (oneOpen) return SCORE.CLOSED_THREE;
      return 0;
    case 2:
      if (bothOpen) return SCORE.OPEN_TWO;
      if (oneOpen) return SCORE.CLOSED_TWO;
      return 0;
    case 1:
      if (bothOpen) return SCORE.ONE;
      return 0;
    default:
      return 0;
  }
}

// Compute total pattern score for `color` on the whole board.
// To avoid double-counting a run of N stones, only count the cell that is
// the "leftmost" or "bottom" endpoint of the run for each direction.
// We do this by checking that the previous cell in the line is empty or
// opposite (i.e., a boundary for the run).
function scoreForColor(board, color) {
  let total = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== color) continue;
      for (const [dx, dy] of DIRS) {
        const px = x - dx, py = y - dy;
        const prev = inBounds(px, py) ? board[py][px] : OPPOSITE[color];
        // Only count this stone if it's the start of a run in this direction.
        if (prev === color) continue;
        const { count, leftBlocked, rightBlocked } = analyzeLine(board, x, y, dx, dy, color);
        total += lineScore(count, leftBlocked, rightBlocked);
      }
    }
  }
  return total;
}

// Total evaluation for `color`: my score minus opponent's score times defense weight.
export function evaluate(board, color, defenseWeight = 1.0) {
  const me = scoreForColor(board, color);
  const opp = scoreForColor(board, OPPOSITE[color]);
  return me - opp * defenseWeight;
}

export function isFive(board, x, y, color) {
  if (board[y][x] !== color) return false;
  for (const [dx, dy] of DIRS) {
    const { count } = analyzeLine(board, x, y, dx, dy, color);
    if (count >= 5) return true;
  }
  return false;
}

export const DIFFICULTY = {
  easy:   { depth: 2, candidateRadius: 1, defenseWeight: 0.6 },
  medium: { depth: 4, candidateRadius: 2, defenseWeight: 1.0 },
  hard:   { depth: 6, candidateRadius: 2, defenseWeight: 1.2 },
};

// Generate candidate moves: empty cells within `radius` of any existing stone.
export function generateCandidates(board, radius) {
  const seen = new Set();
  const out = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === EMPTY) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (!inBounds(nx, ny)) continue;
          if (board[ny][nx] !== EMPTY) continue;
          const key = nx * SIZE + ny;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ x: nx, y: ny });
        }
      }
    }
  }
  return out;
}

// Estimate the value of placing `color` at (x,y), without committing.
function singleMoveValue(board, x, y, color, defenseWeight) {
  board[y][x] = color;
  const v = evaluate(board, color, defenseWeight);
  board[y][x] = EMPTY;
  return v;
}

function orderMoves(board, candidates, color, defenseWeight) {
  return candidates
    .map(m => ({ ...m, _h: singleMoveValue(board, m.x, m.y, color, defenseWeight) }))
    .sort((a, b) => b._h - a._h);
}

function minimax(board, depth, alpha, beta, maximizing, color, defenseWeight) {
  // Terminal: no candidates means board full → draw, score 0.
  const cands = generateCandidates(board, 1);
  if (depth === 0 || cands.length === 0) {
    return evaluate(board, color, defenseWeight);
  }
  const ordered = orderMoves(board, cands, maximizing ? color : OPPOSITE[color], defenseWeight);

  if (maximizing) {
    let value = -Infinity;
    for (const m of ordered) {
      place(board, m.x, m.y, color);
      const v = minimax(board, depth - 1, alpha, beta, false, color, defenseWeight);
      unplace(board, m.x, m.y);
      if (v > value) value = v;
      if (value > alpha) alpha = value;
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    const opp = OPPOSITE[color];
    for (const m of ordered) {
      place(board, m.x, m.y, opp);
      const v = minimax(board, depth - 1, alpha, beta, true, color, defenseWeight);
      unplace(board, m.x, m.y);
      if (v < value) value = v;
      if (value < beta) beta = value;
      if (alpha >= beta) break;
    }
    return value;
  }
}

export function bestMove(board, color, difficulty) {
  const { depth, candidateRadius, defenseWeight } = difficulty;

  // Empty board shortcut.
  let hasAny = false;
  for (let y = 0; y < SIZE && !hasAny; y++) {
    for (let x = 0; x < SIZE && !hasAny; x++) {
      if (board[y][x] !== EMPTY) hasAny = true;
    }
  }
  if (!hasAny) return { x: 7, y: 7, score: 0 };

  const candidates = generateCandidates(board, candidateRadius);
  if (candidates.length === 0) return null; // board full

  // Immediate winning move check.
  for (const m of candidates) {
    place(board, m.x, m.y, color);
    const win = isFive(board, m.x, m.y, color);
    unplace(board, m.x, m.y);
    if (win) return { x: m.x, y: m.y, score: Infinity };
  }

  // Block opponent's immediate winning move.
  const opp = OPPOSITE[color];
  for (const m of candidates) {
    place(board, m.x, m.y, opp);
    const oppWin = isFive(board, m.x, m.y, opp);
    unplace(board, m.x, m.y);
    if (oppWin) return { x: m.x, y: m.y, score: Infinity };
  }

  const ordered = orderMoves(board, candidates, color, defenseWeight);
  let best = null;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const m of ordered) {
    place(board, m.x, m.y, color);
    const v = minimax(board, depth - 1, alpha, beta, false, color, defenseWeight);
    unplace(board, m.x, m.y);
    if (best === null || v > best.score) {
      best = { x: m.x, y: m.y, score: v };
    }
    if (v > alpha) alpha = v;
  }

  return best;
}