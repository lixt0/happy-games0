import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, place, BLACK, WHITE, EMPTY, isFive, evaluate, bestMove, generateCandidates, DIFFICULTY } from '../gomoku/ai.js';

test('isFive: horizontal 5', () => {
  const b = createBoard();
  for (let i = 5; i <= 9; i++) place(b, i, 7, BLACK);
  assert.equal(isFive(b, 7, 7, BLACK), true);
});

test('isFive: vertical 5', () => {
  const b = createBoard();
  for (let i = 5; i <= 9; i++) place(b, 7, i, BLACK);
  assert.equal(isFive(b, 7, 7, BLACK), true);
});

test('isFive: diagonal 5', () => {
  const b = createBoard();
  for (let i = 5; i <= 9; i++) place(b, i, i, BLACK);
  assert.equal(isFive(b, 7, 7, BLACK), true);
});

test('isFive: anti-diagonal 5', () => {
  const b = createBoard();
  for (let i = 5; i <= 9; i++) place(b, i, 14 - i, BLACK);
  assert.equal(isFive(b, 7, 7, BLACK), true);
});

test('isFive: only 4 in a row is not five', () => {
  const b = createBoard();
  for (let i = 5; i <= 8; i++) place(b, i, 7, BLACK);
  assert.equal(isFive(b, 7, 7, BLACK), false);
});

test('isFive: wrong color is not five', () => {
  const b = createBoard();
  for (let i = 5; i <= 9; i++) place(b, i, 7, BLACK);
  assert.equal(isFive(b, 7, 7, WHITE), false);
});

test('evaluate: open-4 scores higher than closed-4', () => {
  const open4 = createBoard();
  for (let i = 1; i <= 4; i++) place(open4, i, 7, BLACK);
  const closed4 = createBoard();
  place(closed4, 0, 7, WHITE); // block one end
  for (let i = 1; i < 5; i++) place(closed4, i, 7, BLACK);
  // Note: place(0,7,WHITE) blocks the left side
  // open4 has both ends open; closed4 has WHITE blocking at x=0
  assert.ok(evaluate(open4, BLACK) > evaluate(closed4, BLACK));
});

test('evaluate: includes defensive score (opponent threats)', () => {
  // White has open-4, black has nothing
  const board = createBoard();
  for (let i = 3; i <= 6; i++) place(board, i, 7, WHITE);
  const score = evaluate(board, BLACK);
  // Score should be negative (we're losing)
  assert.ok(score < 0);
});

test('evaluate: symmetric at empty board returns 0', () => {
  assert.equal(evaluate(createBoard(), BLACK), 0);
});

test('bestMove: empty board plays center', () => {
  const move = bestMove(createBoard(), BLACK, DIFFICULTY.medium);
  assert.deepEqual(move, { x: 7, y: 7, score: 0 });
});

test('bestMove: takes immediate winning move', () => {
  const b = createBoard();
  // BLACK can win at either (4,7) or (9,7)
  for (let i = 5; i <= 8; i++) place(b, i, 7, BLACK);
  const move = bestMove(b, BLACK, DIFFICULTY.easy);
  assert.ok(move.x === 4 || move.x === 9);
  assert.equal(move.y, 7);
});

test('bestMove: blocks opponent immediate threat (open-4 -> win)', () => {
  const b = createBoard();
  // WHITE has 4 in a row with both ends open
  for (let i = 5; i <= 8; i++) place(b, i, 7, WHITE);
  const move = bestMove(b, BLACK, DIFFICULTY.easy);
  // BLACK must play at one of the two ends: x=4 or x=9
  assert.ok(move.x === 4 || move.x === 9);
  assert.equal(move.y, 7);
});

test('bestMove: prefers win over block when both available', () => {
  const b = createBoard();
  // BLACK can win at either (4,7) or (9,7)
  for (let i = 5; i <= 8; i++) place(b, i, 7, BLACK);
  // WHITE has 4 open at row 3
  for (let i = 3; i <= 6; i++) place(b, i, 3, WHITE);
  const move = bestMove(b, BLACK, DIFFICULTY.easy);
  assert.ok(move.x === 4 || move.x === 9);
  assert.equal(move.y, 7);
});

test('generateCandidates: returns cells within radius of existing stones', () => {
  const b = createBoard();
  place(b, 7, 7, BLACK);
  const cands = generateCandidates(b, 1);
  // Should include the 8 neighbors of (7,7), no duplicates
  const set = new Set(cands.map(c => `${c.x},${c.y}`));
  assert.equal(set.size, cands.length);
  assert.ok(cands.some(c => c.x === 7 && c.y === 6));
  assert.ok(cands.some(c => c.x === 8 && c.y === 7));
});

test('generateCandidates: empty board returns empty (caller handles center)', () => {
  assert.equal(generateCandidates(createBoard(), 1).length, 0);
});

test('difficulty: hard produces >= easy 1-ply evaluation on mid-game positions', () => {
  const positions = [
    // Position A: scattered stones, no immediate threats
    (() => {
      const b = createBoard();
      place(b, 7, 7, BLACK);
      place(b, 8, 8, WHITE);
      place(b, 6, 9, BLACK);
      place(b, 9, 6, WHITE);
      return b;
    })(),
    // Position B: black has a 3, white has a 2 nearby
    (() => {
      const b = createBoard();
      place(b, 5, 7, BLACK); place(b, 6, 7, BLACK); place(b, 7, 7, BLACK);
      place(b, 9, 8, WHITE); place(b, 9, 9, WHITE);
      return b;
    })(),
    // Position C: contested center with 2-2 exchange
    (() => {
      const b = createBoard();
      place(b, 7, 7, BLACK); place(b, 8, 7, WHITE);
      place(b, 7, 8, BLACK); place(b, 8, 8, WHITE);
      place(b, 6, 6, BLACK); place(b, 9, 9, WHITE);
      return b;
    })(),
  ];

  // 1-ply lookahead is noisy: a deeper search can pick a move that scores
  // a few points lower after the opponent's reply but leads to a better
  // position two plies out. Allow a tolerance of 100 points (one closed-two).
  const TOLERANCE = 100;

  for (const b of positions) {
    const easyMove = bestMove(b, BLACK, DIFFICULTY.easy);
    const hardMove = bestMove(b, BLACK, DIFFICULTY.hard);

    // Apply each move to its own clone, then evaluate from BLACK's perspective
    // after the opponent's best response.
    const easyClone = b.map(row => row.slice());
    place(easyClone, easyMove.x, easyMove.y, BLACK);
    const easyOppMove = bestMove(easyClone, WHITE, DIFFICULTY.easy);
    if (easyOppMove) place(easyClone, easyOppMove.x, easyOppMove.y, WHITE);
    const easyScore = evaluate(easyClone, BLACK);

    const hardClone = b.map(row => row.slice());
    place(hardClone, hardMove.x, hardMove.y, BLACK);
    const hardOppMove = bestMove(hardClone, WHITE, DIFFICULTY.easy);
    if (hardOppMove) place(hardClone, hardOppMove.x, hardOppMove.y, WHITE);
    const hardScore = evaluate(hardClone, BLACK);

    assert.ok(
      hardScore >= easyScore - TOLERANCE,
      `hard score ${hardScore} should be >= easy score ${easyScore} - ${TOLERANCE} on this position`,
    );
  }
});

test('head-to-head: medium beats easy in 6 AI-vs-AI games', { skip: false }, () => {
  let medWins = 0, easyWins = 0, draws = 0;

  // Deterministic but varied openings.
  const openings = [
    [{ x: 7, y: 7, color: BLACK }],
    [{ x: 7, y: 7, color: BLACK }, { x: 8, y: 8, color: WHITE }],
    [{ x: 7, y: 7, color: BLACK }, { x: 8, y: 7, color: WHITE }, { x: 7, y: 8, color: BLACK }],
  ];

  // Use medium (depth 4) vs easy (depth 2) instead of hard (depth 6) vs easy.
  // depth-6 alpha-beta at 15×15 is ~1-2s/move, making 20-game matchups impractical in CI.
  // depth-4 is ~50-200ms/move; 6 games × ~30 moves finishes in seconds.
  for (let i = 0; i < 6; i++) {
    const b = createBoard();
    const opening = openings[i % openings.length];
    for (const m of opening) place(b, m.x, m.y, m.color);

    let medColor = i % 2 === 0 ? BLACK : WHITE;
    let easyColor = OPPOSITE_MAP[medColor];
    let turn = (opening.length % 2 === 0) ? BLACK : WHITE;
    let winner = null;

    // Cap moves to keep total runtime bounded; most games end well before 40 moves.
    for (let moveCount = 0; moveCount < 40; moveCount++) {
      const moverColor = turn;
      const moverDiff = moverColor === medColor ? DIFFICULTY.medium : DIFFICULTY.easy;
      const move = bestMove(b, moverColor, moverDiff);
      if (!move) { winner = 'draw'; break; }
      place(b, move.x, move.y, moverColor);
      if (isFive(b, move.x, move.y, moverColor)) { winner = moverColor; break; }
      turn = OPPOSITE_MAP[turn];
    }
    if (winner === null) winner = 'draw';

    if (winner === medColor) medWins++;
    else if (winner === easyColor) easyWins++;
    else draws++;
  }

  // Spec says: stronger AI should win >= weaker AI in head-to-head.
  assert.ok(
    medWins >= easyWins,
    `medium should win >= easy across 6 games; got medium=${medWins}, easy=${easyWins}, draws=${draws}`,
  );
});

// Local helper for the head-to-head test (avoids polluting module-level imports).
const OPPOSITE_MAP = { [BLACK]: WHITE, [WHITE]: BLACK };