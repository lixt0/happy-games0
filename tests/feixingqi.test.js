import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEATS, ENTRY, LOOP_LEN, PIECES_PER_SEAT, TRACK_MAX, GOAL_REL,
  mulberry32, makeRng, createInitialState, rollDice,
  absCell, finalLanding, legalMoves,
  applyMove, endTurn, nextSeat, checkWinner,
  chooseAiMove,
  touch, startMatch, joinSeat, tick,
} from '../feixingqi/engine.js';

test('mulberry32 is deterministic', () => {
  const a = mulberry32(123), b = mulberry32(123);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('createInitialState: host on seat 0, all pieces in base', () => {
  const s = createInitialState({ seed: 42, seatCount: 4, hostUsername: 'alice' });
  assert.equal(s.phase, 'waiting');
  assert.equal(s.seatCount, 4);
  assert.equal(s.seats[0].username, 'alice');
  assert.equal(s.seats[0].kind, 'human');
  assert.equal(s.seats[1].username, null);
  assert.equal(s.seats[1].kind, null);
  assert.equal(s.seats[0].pieces.length, PIECES_PER_SEAT);
  assert.ok(s.seats[0].pieces.every(p => p.loc === 'base'));
  assert.equal(s.rolled, false);
  assert.equal(s.dice, 0);
});

test('rollDice sets 1..6, rolled=true, increments turnCounter', () => {
  let s = createInitialState({ seed: 7, seatCount: 2, hostUsername: 'a' });
  s.phase = 'playing'; s.lastActionAt = 1;
  s.seats[0].pieces[0] = { loc: 'track', r: 5 };   // legal move for any dice → no auto-pass
  s = rollDice(s);
  assert.equal(s.rolled, true);
  assert.ok(s.dice >= 1 && s.dice <= 6);
  assert.equal(s.turnCounter, 1);
  let s2 = createInitialState({ seed: 7, seatCount: 2, hostUsername: 'a' });
  s2.phase = 'playing'; s2.lastActionAt = 1;
  s2.seats[0].pieces[0] = { loc: 'track', r: 5 };
  s2 = rollDice(s2);
  assert.equal(s2.dice, s.dice);
});

test('rollDice refuses when not playing or already rolled', () => {
  let s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  s.phase = 'waiting';
  assert.deepEqual(rollDice(s), s);               // waiting → unchanged
  s.phase = 'playing'; s.lastActionAt = 1;
  s.seats[0].pieces[0] = { loc: 'track', r: 5 };  // legal move → no auto-pass on first roll
  s = rollDice(s);
  assert.equal(s.rolled, true);
  const again = rollDice(s);                       // already rolled → refuses
  assert.deepEqual(again, s);
});

test('absCell maps seat rel to absolute loop cell', () => {
  assert.equal(absCell(0, 0), 0);
  assert.equal(absCell(0, 51), 51);
  assert.equal(absCell(1, 0), 13);
  assert.equal(absCell(2, 40), (26 + 40) % 52);
});

test('legalMoves: base piece launches only on 6', () => {
  const s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  const mv6 = legalMoves(s, 0, 6);
  // 4 架都在 base，掷 6 每架都可起飞 → 4 个合法步
  assert.equal(mv6.length, 4);
  assert.ok(mv6.every(m => m.to.loc === 'track' && m.to.r === 0));
  const mv5 = legalMoves(s, 0, 5);
  assert.equal(mv5.length, 0);
});

test('legalMoves: track piece moves and home exact', () => {
  const s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  s.seats[0].pieces[0] = { loc: 'track', r: 10 };
  // dice 4 → r=14（恰为 JUMP_TO_REL 落点前=14）
  const mv = legalMoves(s, 0, 4);
  assert.equal(mv.length, 1);
  assert.deepEqual(mv[0].to, { loc: 'track', r: 14 });
  // 进 home：r=50, dice=6 → sum=56 → home r=4
  s.seats[0].pieces[0] = { loc: 'track', r: 50 };
  const mvh = legalMoves(s, 0, 6);
  assert.deepEqual(mvh[0].to, { loc: 'home', r: 4 });
  // 精确到家：r=51, dice=6 → sum=57 → done
  s.seats[0].pieces[0] = { loc: 'track', r: 51 };
  const mvd = legalMoves(s, 0, 6);
  assert.deepEqual(mvd[0].to, { loc: 'done', r: 5 });
  // 越界：r=51, dice 大于 6 不存在；用 home 越界：home r=4, dice=3 → 7>5 非法
  s.seats[0].pieces[0] = { loc: 'home', r: 4 };
  assert.equal(legalMoves(s, 0, 3).length, 0);
  s.seats[0].pieces[0] = { loc: 'home', r: 3 };
  assert.deepEqual(legalMoves(s, 0, 2)[0].to, { loc: 'done', r: 5 });
});

test('legalMoves: done piece is immovable', () => {
  const s = createInitialState({ seed: 1, seatCount: 2, hostUsername: 'a' });
  for (let i = 0; i < s.seats[0].pieces.length; i++) s.seats[0].pieces[i] = { loc: 'done', r: 5 };
  assert.equal(legalMoves(s, 0, 6).length, 0);
});

test('finalLanding resolves jump and fly chains', () => {
  assert.equal(finalLanding(0, { loc: 'track', r: 10 }).r, 14);
  assert.equal(finalLanding(0, { loc: 'track', r: 18 }).r, 30);
  assert.equal(finalLanding(0, { loc: 'track', r: 5 }).r, 5);
  assert.equal(finalLanding(0, { loc: 'home', r: 2 }).r, 2);
});

function playing(seatCount = 2, host = 'a') {
  const s = createInitialState({ seed: 3, seatCount, hostUsername: host });
  s.phase = 'playing'; s.lastActionAt = 1;
  // 两个座位都先有 username/kind（人），便于轮转测试
  for (let i = 1; i < seatCount; i++) { s.seats[i].username = 'p' + i; s.seats[i].kind = 'human'; }
  return s;
}

test('applyMove: track move lands and clears rolled', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 5 };
  s.dice = 4; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 9);
  assert.equal(s.rolled, false);
  assert.equal(s.turn, 1);            // 非 6 → 轮到下家
  assert.equal(s.consecSix, 0);
});

test('applyMove: jump cell +4 and fly cell fly across', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 6 };   // +4 → 10 (JUMP_REL) → 14
  s.dice = 4; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 14);

  s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 15 };   // +3 → 18 (FLY_REL) → 30
  s.dice = 3; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 30);
});

test('applyMove: capture sends opponent back to base', () => {
  let s = playing(2);
  // seat0 piece at r=4 → +2 → 6 (abs 6). seat1 piece on abs 6 = rel (13+6)%52=19? no:
  // abs(seat1, r1) = (13 + r1) % 52 = 6 → r1 = (6-13+52)%52 = 45
  s.seats[0].pieces[0] = { loc: 'track', r: 4 };
  s.seats[1].pieces[0] = { loc: 'track', r: 45 };
  s.dice = 2; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].r, 6);
  assert.equal(s.seats[1].pieces[0].loc, 'base');   // 被吃回机场
});

test('applyMove: six grants re-roll (same seat, rolled reset)', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 0 };
  s.dice = 6; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.turn, 0);          // 仍轮到 seat0
  assert.equal(s.rolled, false);   // 需再掷
  assert.equal(s.consecSix, 1);
});

test('applyMove: three consecutive sixes forfeit turn', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 0 };
  s.consecSix = 2;                 // 已连两个 6
  s.dice = 6; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.turn, 1);          // 第三个 6 作废，轮到下家
  assert.equal(s.consecSix, 0);
});

test('applyMove: launching from base on a 6', () => {
  let s = playing(2);
  // 座位0 已无 track piece，4 架在 base；dice=6
  s.dice = 6; s.rolled = true;
  s = applyMove(s, 0, 0);          // pieceId 0 起飞到 r=0
  assert.equal(s.seats[0].pieces[0].loc, 'track');
  assert.equal(s.seats[0].pieces[0].r, 0);
  assert.equal(s.turn, 0);         // 6 → 再掷
});

test('applyMove: win when all 4 done', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'home', r: 4 };
  s.seats[0].pieces[1] = { loc: 'done', r: 5 };
  s.seats[0].pieces[2] = { loc: 'done', r: 5 };
  s.seats[0].pieces[3] = { loc: 'done', r: 5 };
  s.dice = 1; s.rolled = true;
  s = applyMove(s, 0, 0);
  assert.equal(s.seats[0].pieces[0].loc, 'done');
  assert.equal(s.phase, 'finished');
  assert.equal(s.winner, 0);
});

test('applyMove: rejects illegal piece', () => {
  let s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 5 };
  s.dice = 4; s.rolled = true;
  const before = s;
  s = applyMove(s, 0, 99);          // pieceId 不存在
  assert.deepEqual(s, before);
});

test('chooseAiMove prefers capture', () => {
  const s = playing(2);
  // piece0 在 r=4，掷2 到 r=6 能吃 seat1；piece1 在 r=0 掷2 到 r=2 不能吃
  s.seats[0].pieces[0] = { loc: 'track', r: 4 };
  s.seats[0].pieces[1] = { loc: 'track', r: 0 };
  s.seats[1].pieces[0] = { loc: 'track', r: 45 };   // abs 6（被 piece0 吃）
  s.dice = 2;
  assert.equal(chooseAiMove(s, 0, 2), 0);
});

test('chooseAiMove prefers reaching done', () => {
  const s = playing(2);
  s.seats[0].pieces[0] = { loc: 'home', r: 4 };   // 掷1 到家
  s.seats[0].pieces[1] = { loc: 'track', r: 5 };   // 掷1 到 r=6
  s.dice = 1;
  assert.equal(chooseAiMove(s, 0, 1), 0);
});

test('chooseAiMove prefers a flight square over ordinary progress', () => {
  const s = playing(2);
  s.seats[0].pieces[0] = { loc: 'track', r: 15 }; // +3 lands on fly square, then flies to 30
  s.seats[0].pieces[1] = { loc: 'track', r: 22 }; // +3 ordinarily reaches 25
  s.dice = 3;
  assert.equal(chooseAiMove(s, 0, 3), 0);
});

test('chooseAiMove returns -1 when no legal move', () => {
  const s = playing(2);
  s.dice = 5;   // 全在 base，非 6
  assert.equal(chooseAiMove(s, 0, 5), -1);
});

test('rollDice auto-passes when no legal move', () => {
  let s = playing(2);                 // 全在 base
  s = rollDice(s);                    // 非 6 则无可走 → 跳过到下家
  assert.equal(s.rolled, false);
  assert.equal(s.turn, 1);
});

test('startMatch fills empty seats with AI and sets playing', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  // 仅 seat0 有人；其余空
  s = startMatch(s, 1000);
  assert.equal(s.phase, 'playing');
  assert.equal(s.seats[0].kind, 'human');
  assert.equal(s.seats[1].kind, 'ai');
  assert.equal(s.seats[2].kind, 'ai');
  assert.equal(s.seats[3].kind, 'ai');
  assert.equal(s.turn, 0);
  assert.equal(s.lastActionAt, 1000);
});

test('joinSeat assigns first free seat', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  const r = joinSeat(s, 'bob');
  s = r.state;
  assert.equal(r.seat, 1);
  assert.equal(s.seats[1].username, 'bob');
  assert.equal(s.seats[1].kind, 'human');
});

test('tick runs AI turns until a human is to move', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  s = startMatch(s, 1000);
  // seat0 是人类、当前轮；tick 不应替它走
  const after = tick(s, 1000);
  assert.equal(after.turn, 0);
  assert.equal(after.rolled, false);   // 等人类掷
});

test('tick: AI seat plays its turn when it is AI turn', () => {
  let s = createInitialState({ seed: 9, seatCount: 4, hostUsername: 'a' });
  s = startMatch(s, 1000);
  // 强制把 seat0 也变 AI，让 tick 推进
  s.seats[0].kind = 'ai';
  const after = tick(s, 1000);
  // AI 推进直到当前轮为人类——但全是 AI，会一直推到 finished 或循环 guard
  assert.ok(after.turnCounter > s.turnCounter);
});

test('tick: stale human strikes once per tick (no cascade to completion)', () => {
  let s = createInitialState({ seed: 9, seatCount: 2, hostUsername: 'a' });
  s = startMatch(s, 1000);
  s.seats[1].username = 'b'; s.seats[1].kind = 'human';
  const after = tick(s, 31000);
  assert.ok(after.seats[0].timeoutCount >= 1, 'seat0 marked stale');
  assert.equal(after.seats[0].autoAi, false, 'one strike does not autoAi');
  assert.notEqual(after.phase, 'finished', 'single tick must not run game to completion');
});

test('tick: second stale strike on same seat → autoAi', () => {
  let s = createInitialState({ seed: 9, seatCount: 2, hostUsername: 'a' });
  s = startMatch(s, 1000);
  s.seats[1].username = 'b'; s.seats[1].kind = 'human';
  let after = tick(s, 31000);                // strike 1
  assert.equal(after.seats[0].autoAi, false);
  after.turn = 0; after.rolled = false; after.dice = 0; after.lastActionAt = 31000;
  after = tick(after, 62000);               // 31s idle → strike 2
  assert.equal(after.seats[0].autoAi, true);
});

test('tick: finished state is unchanged', () => {
  let s = createInitialState({ seed: 9, seatCount: 2, hostUsername: 'a' });
  s = startMatch(s, 1000);
  s.phase = 'finished'; s.winner = 0;
  assert.deepEqual(tick(s, 9999), s);
});
