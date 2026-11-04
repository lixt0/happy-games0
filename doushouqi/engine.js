import {
  BLUE, RED, DENS, TYPES,
  allLegalMoves, applyMove, countPieces, effectiveRank,
  isDen, pieceSide, pieceType, otherSide, positionKey, trapOwner, winner,
} from './logic.js';

const PIECE_VALUES = Object.freeze({
  R: 240,
  C: 260,
  D: 330,
  W: 400,
  P: 490,
  T: 670,
  L: 730,
  E: 790,
});

function distanceToEnemyDen(row, col, side) {
  const [denRow, denCol] = DENS[otherSide(side)];
  return Math.abs(row - denRow) + Math.abs(col - denCol);
}

export function evaluateBoard(board, perspective) {
  let score = 0;
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const value = board[row][col];
      if (!value) continue;
      const side = pieceSide(value);
      const type = pieceType(value);
      const sign = side === perspective ? 1 : -1;
      const distance = distanceToEnemyDen(row, col, side);
      let valueScore = PIECE_VALUES[type] + (14 - distance) * 11;

      const owner = trapOwner(row, col);
      if (owner && owner !== side) valueScore -= 180;
      if (distance === 1) valueScore += 120;
      if (isDen(row, col, otherSide(side))) valueScore += 100000;
      score += sign * valueScore;
    }
  }

  const ownMobility = allLegalMoves(board, perspective).length;
  const enemyMobility = allLegalMoves(board, otherSide(perspective)).length;
  score += (ownMobility - enemyMobility) * 4;
  return score;
}

function movePriority(board, move, side) {
  const [fromRow, fromCol] = move.from;
  const [toRow, toCol] = move.to;
  const moving = board[fromRow][fromCol];
  let score = 0;
  if (isDen(toRow, toCol, otherSide(side))) score += 100000;
  if (move.capture) {
    score += 5000 + PIECE_VALUES[pieceType(move.capture)] - PIECE_VALUES[pieceType(moving)] * 0.08;
    if (effectiveRank(board, toRow, toCol) === 0) score += 300;
  }
  score += (distanceToEnemyDen(fromRow, fromCol, side) - distanceToEnemyDen(toRow, toCol, side)) * 30;
  if (move.jump) score += 45;
  return score;
}

function orderedMoves(board, side) {
  return allLegalMoves(board, side)
    .map(move => ({ move, priority: movePriority(board, move, side) }))
    .sort((a, b) => b.priority - a.priority)
    .map(entry => entry.move);
}

function search(board, sideToMove, depth, alpha, beta, perspective, cache) {
  const victor = winner(board);
  if (victor) return victor === perspective ? 1000000 + depth : -1000000 - depth;

  const moves = orderedMoves(board, sideToMove);
  if (moves.length === 0) return sideToMove === perspective ? -1000000 - depth : 1000000 + depth;
  if (depth === 0) return evaluateBoard(board, perspective);

  const key = `${positionKey(board, sideToMove)}|${depth}`;
  if (cache.has(key)) return cache.get(key);

  const maximizing = sideToMove === perspective;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = applyMove(board, move);
    const value = search(next, otherSide(sideToMove), depth - 1, alpha, beta, perspective, cache);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  cache.set(key, best);
  return best;
}

export function searchMove(board, side = BLUE, depth = 3) {
  const moves = orderedMoves(board, side);
  if (!moves.length) return null;

  const cache = new Map();
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const move of moves) {
    const next = applyMove(board, move);
    const score = search(next, otherSide(side), Math.max(0, depth - 1), alpha, Infinity, side, cache);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestScore);
  }
  return { ...bestMove, score: bestScore };
}

export function difficultyDepth(difficulty) {
  if (difficulty === 'easy') return 1;
  if (difficulty === 'hard') return 4;
  return 2;
}

export function materialBalance(board, perspective = BLUE) {
  let own = 0;
  let enemy = 0;
  for (const row of board) {
    for (const value of row) {
      if (!value) continue;
      const amount = PIECE_VALUES[pieceType(value)];
      if (pieceSide(value) === perspective) own += amount;
      else enemy += amount;
    }
  }
  return own - enemy + (countPieces(board, perspective) - countPieces(board, otherSide(perspective))) * 10;
}

export { PIECE_VALUES, RED, BLUE, TYPES };
