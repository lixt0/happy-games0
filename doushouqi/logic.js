export const ROWS = 9;
export const COLS = 7;
export const RED = 'r';
export const BLUE = 'b';

export const TYPES = Object.freeze({
  R: { name: '鼠', rank: 1 },
  C: { name: '猫', rank: 2 },
  D: { name: '狗', rank: 3 },
  W: { name: '狼', rank: 4 },
  P: { name: '豹', rank: 5 },
  T: { name: '虎', rank: 6 },
  L: { name: '狮', rank: 7 },
  E: { name: '象', rank: 8 },
});

export const DENS = Object.freeze({
  [BLUE]: [0, 3],
  [RED]: [8, 3],
});

export const TRAPS = Object.freeze({
  [BLUE]: [[0, 2], [0, 4], [1, 3]],
  [RED]: [[8, 2], [8, 4], [7, 3]],
});

const DIRECTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function piece(side, type) {
  return `${side}${type}`;
}

export function pieceSide(value) {
  return value ? value[0] : null;
}

export function pieceType(value) {
  return value ? value[1] : null;
}

export function otherSide(side) {
  return side === RED ? BLUE : RED;
}

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function initialBoard() {
  const board = createEmptyBoard();
  const setup = [
    [0, 0, BLUE, 'L'], [0, 6, BLUE, 'T'],
    [1, 1, BLUE, 'D'], [1, 5, BLUE, 'C'],
    [2, 0, BLUE, 'R'], [2, 2, BLUE, 'P'], [2, 4, BLUE, 'W'], [2, 6, BLUE, 'E'],
    [6, 0, RED, 'E'], [6, 2, RED, 'W'], [6, 4, RED, 'P'], [6, 6, RED, 'R'],
    [7, 1, RED, 'C'], [7, 5, RED, 'D'],
    [8, 0, RED, 'T'], [8, 6, RED, 'L'],
  ];
  for (const [row, col, side, type] of setup) board[row][col] = piece(side, type);
  return board;
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

export function inBoard(row, col) {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

export function isWater(row, col) {
  return row >= 3 && row <= 5 && (col === 1 || col === 2 || col === 4 || col === 5);
}

export function isDen(row, col, owner) {
  const den = DENS[owner];
  return row === den[0] && col === den[1];
}

export function trapOwner(row, col) {
  for (const side of [BLUE, RED]) {
    if (TRAPS[side].some(([r, c]) => r === row && c === col)) return side;
  }
  return null;
}

export function effectiveRank(board, row, col) {
  const value = board[row][col];
  if (!value) return -1;
  const side = pieceSide(value);
  const owner = trapOwner(row, col);
  if (owner && owner !== side) return 0;
  return TYPES[pieceType(value)].rank;
}

export function canCapture(board, fromRow, fromCol, toRow, toCol) {
  const attacker = board[fromRow][fromCol];
  const target = board[toRow][toCol];
  if (!attacker || !target || pieceSide(attacker) === pieceSide(target)) return false;

  const targetRank = effectiveRank(board, toRow, toCol);
  if (targetRank === 0) return true;

  const attackerType = pieceType(attacker);
  const targetType = pieceType(target);

  // Water-to-land and land-to-water captures are disallowed for rats.
  if (attackerType === 'R' && isWater(fromRow, fromCol) !== isWater(toRow, toCol)) return false;
  if (attackerType === 'R' && targetType === 'E') return !isWater(fromRow, fromCol);
  if (attackerType === 'E' && targetType === 'R') return false;

  return TYPES[attackerType].rank >= targetRank;
}

function jumpAcrossWater(board, row, col, dr, dc) {
  let nextRow = row + dr;
  let nextCol = col + dc;
  if (!isWater(nextRow, nextCol)) return null;

  while (inBoard(nextRow, nextCol) && isWater(nextRow, nextCol)) {
    const blocker = board[nextRow][nextCol];
    if (blocker && pieceType(blocker) === 'R') return null;
    nextRow += dr;
    nextCol += dc;
  }
  return inBoard(nextRow, nextCol) ? [nextRow, nextCol] : null;
}

export function legalMoves(board, row, col) {
  const value = board[row]?.[col];
  if (!value) return [];
  const side = pieceSide(value);
  const type = pieceType(value);
  const moves = [];

  for (const [dr, dc] of DIRECTIONS) {
    let toRow = row + dr;
    let toCol = col + dc;
    let jump = false;
    if (!inBoard(toRow, toCol)) continue;

    if ((type === 'L' || type === 'T') && isWater(toRow, toCol)) {
      const landing = jumpAcrossWater(board, row, col, dr, dc);
      if (!landing) continue;
      [toRow, toCol] = landing;
      jump = true;
    } else if (isWater(toRow, toCol) && type !== 'R') {
      continue;
    }

    if (isDen(toRow, toCol, side)) continue;
    const target = board[toRow][toCol];
    if (target && pieceSide(target) === side) continue;
    if (target && !canCapture(board, row, col, toRow, toCol)) continue;

    moves.push({ from: [row, col], to: [toRow, toCol], capture: target || null, jump });
  }
  return moves;
}

export function allLegalMoves(board, side) {
  const moves = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (pieceSide(board[row][col]) === side) moves.push(...legalMoves(board, row, col));
    }
  }
  return moves;
}

export function applyMove(board, move) {
  const next = cloneBoard(board);
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  next[toRow][toCol] = next[fromRow][fromCol];
  next[fromRow][fromCol] = null;
  return next;
}

export function countPieces(board, side) {
  let count = 0;
  for (const row of board) {
    for (const value of row) if (pieceSide(value) === side) count++;
  }
  return count;
}

export function winner(board, sideToMove = null) {
  const blueDen = board[DENS[BLUE][0]][DENS[BLUE][1]];
  const redDen = board[DENS[RED][0]][DENS[RED][1]];
  if (pieceSide(blueDen) === RED) return RED;
  if (pieceSide(redDen) === BLUE) return BLUE;

  if (countPieces(board, RED) === 0) return BLUE;
  if (countPieces(board, BLUE) === 0) return RED;
  if (sideToMove && allLegalMoves(board, sideToMove).length === 0) return otherSide(sideToMove);
  return null;
}

export function positionKey(board, sideToMove) {
  return `${board.map(row => row.map(value => value || '--').join('')).join('/')}|${sideToMove}`;
}

export function animalName(value) {
  return value ? TYPES[pieceType(value)].name : '';
}

export function sameSquare(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}
