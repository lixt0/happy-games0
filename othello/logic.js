export const SIZE = 8;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const OPPOSITE = { [BLACK]: WHITE, [WHITE]: BLACK };

const DIRECTIONS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1],
];

const POSITION_WEIGHT = [
  [120, -25, 20, 5, 5, 20, -25, 120],
  [-25, -45, -2, -2, -2, -2, -45, -25],
  [20, -2, 10, 2, 2, 10, -2, 20],
  [5, -2, 2, 1, 1, 2, -2, 5],
  [5, -2, 2, 1, 1, 2, -2, 5],
  [20, -2, 10, 2, 2, 10, -2, 20],
  [-25, -45, -2, -2, -2, -2, -45, -25],
  [120, -25, 20, 5, 5, 20, -25, 120],
];

export const DIFFICULTY = {
  easy: { depth: 1, limit: 8 },
  medium: { depth: 3, limit: 10 },
  hard: { depth: 4, limit: 12 },
};

export function createBoard() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
  board[3][3] = WHITE; board[3][4] = BLACK;
  board[4][3] = BLACK; board[4][4] = WHITE;
  return board;
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

export function inBounds(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

export function getFlips(board, x, y, color) {
  if (!inBounds(x, y) || board[y][x] !== EMPTY) return [];
  const enemy = OPPOSITE[color];
  const flips = [];
  for (const [dx, dy] of DIRECTIONS) {
    const line = [];
    let nx = x + dx;
    let ny = y + dy;
    while (inBounds(nx, ny) && board[ny][nx] === enemy) {
      line.push({ x: nx, y: ny });
      nx += dx; ny += dy;
    }
    if (line.length && inBounds(nx, ny) && board[ny][nx] === color) flips.push(...line);
  }
  return flips;
}

export function legalMoves(board, color) {
  const moves = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const flips = getFlips(board, x, y, color);
      if (flips.length) moves.push({ x, y, flips });
    }
  }
  return moves;
}

export function applyMove(board, x, y, color) {
  const flips = getFlips(board, x, y, color);
  if (!flips.length) return null;
  const next = cloneBoard(board);
  next[y][x] = color;
  for (const cell of flips) next[cell.y][cell.x] = color;
  return next;
}

export function countPieces(board) {
  let black = 0, white = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === BLACK) black++;
      if (cell === WHITE) white++;
    }
  }
  return { black, white, empty: SIZE * SIZE - black - white };
}

export function isGameOver(board) {
  return legalMoves(board, BLACK).length === 0 && legalMoves(board, WHITE).length === 0;
}

export function winner(board) {
  const { black, white } = countPieces(board);
  if (black === white) return EMPTY;
  return black > white ? BLACK : WHITE;
}

function evaluate(board, color) {
  const enemy = OPPOSITE[color];
  const count = countPieces(board);
  let positional = 0;
  let discs = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === color) { positional += POSITION_WEIGHT[y][x]; discs++; }
      if (board[y][x] === enemy) { positional -= POSITION_WEIGHT[y][x]; discs--; }
    }
  }
  const mobility = legalMoves(board, color).length - legalMoves(board, enemy).length;
  const discWeight = count.empty > 18 ? 1 : 8;
  return positional + mobility * 12 + discs * discWeight;
}

function orderedMoves(board, color, limit) {
  return legalMoves(board, color)
    .map(move => ({ ...move, score: POSITION_WEIGHT[move.y][move.x] + move.flips.length * 4 }))
    .sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x)
    .slice(0, limit);
}

function minimax(board, turn, rootColor, depth, alpha, beta, limit) {
  if (depth === 0 || isGameOver(board)) return evaluate(board, rootColor);
  const moves = orderedMoves(board, turn, limit);
  if (!moves.length) return minimax(board, OPPOSITE[turn], rootColor, depth - 1, alpha, beta, limit);
  const maximize = turn === rootColor;
  let best = maximize ? -Infinity : Infinity;
  for (const move of moves) {
    const score = minimax(applyMove(board, move.x, move.y, turn), OPPOSITE[turn], rootColor, depth - 1, alpha, beta, limit);
    if (maximize) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseAiMove(board, color, difficulty = DIFFICULTY.medium) {
  const moves = orderedMoves(board, color, difficulty.limit);
  if (!moves.length) return null;
  let best = null;
  for (const move of moves) {
    const next = applyMove(board, move.x, move.y, color);
    const score = minimax(next, OPPOSITE[color], color, difficulty.depth - 1, -Infinity, Infinity, difficulty.limit);
    if (!best || score > best.score || (score === best.score && (move.y < best.y || (move.y === best.y && move.x < best.x)))) {
      best = { x: move.x, y: move.y, score };
    }
  }
  return best;
}
