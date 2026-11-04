// 纯飞行棋逻辑：客户端 / Pages Function / node --test 三方共享。
// 不依赖 DOM、存储、Math.random；时间由 tick 的 now 参数注入。

export const SEATS = ['red', 'yellow', 'blue', 'green'];
export const ENTRY = [0, 13, 26, 39];
export const LOOP_LEN = 52;
export const HOME_LEN = 6;                 // home cells rel 0..5；5=终点
export const PIECES_PER_SEAT = 4;
export const TRACK_MAX = 51;               // 主跑道末位 rel
export const GOAL_REL = 5;                 // home 索引 5 = 到家
export const JUMP_REL = 10;
export const JUMP_TO_REL = 14;
export const FLY_REL = 18;
export const FLY_TO_REL = 30;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(state) {
  return mulberry32((state.seed >>> 0) + Math.imul(state.turnCounter + 1, 0x9E3779B1));
}

export function clone(state) {
  return {
    phase: state.phase,
    seatCount: state.seatCount,
    seats: state.seats.map(s => ({ ...s, pieces: s.pieces.map(p => ({ ...p })) })),
    turn: state.turn,
    dice: state.dice,
    rolled: state.rolled,
    consecSix: state.consecSix,
    lastActionAt: state.lastActionAt,
    seed: state.seed,
    turnCounter: state.turnCounter,
    winner: state.winner,
    log: state.log.slice(-30),
  };
}

export function pushLog(state, msg) {
  state.log.push(msg);
  if (state.log.length > 30) state.log = state.log.slice(-30);
}

export function createInitialState({ seed, seatCount, hostUsername }) {
  const seats = [];
  for (let i = 0; i < seatCount; i++) {
    seats.push({
      username: i === 0 ? hostUsername : null,
      kind: i === 0 ? 'human' : null,   // null = 等待加入或补 AI
      autoAi: false,
      timeoutCount: 0,
      pieces: Array.from({ length: PIECES_PER_SEAT }, () => ({ loc: 'base', r: -1 })),
    });
  }
  return {
    phase: 'waiting',
    seatCount,
    seats,
    turn: 0,
    dice: 0,
    rolled: false,
    consecSix: 0,
    lastActionAt: 0,
    seed: seed >>> 0,
    turnCounter: 0,
    winner: null,
    log: [],
  };
}

export function rollDice(state) {
  if (state.phase !== 'playing') return state;
  if (state.rolled) return state;
  const rng = makeRng(state);
  const dice = 1 + Math.floor(rng() * 6);
  const next = clone(state);
  next.dice = dice;
  next.rolled = true;
  next.turnCounter = state.turnCounter + 1;
  if (legalMoves(next, next.turn, dice).length === 0) {
    const allInBase = next.seats[next.turn].pieces.every(piece => piece.loc === 'base');
    pushLog(next, allInBase
      ? `🎲${SEATS[next.turn]}掷${dice}，未掷到 6，暂不能起飞`
      : `🎲${SEATS[next.turn]}掷${dice}，没有合法走法`);
    endTurn(next, false);
  }
  return next;
}

export function absCell(seat, rel) {
  return (ENTRY[seat] + rel) % LOOP_LEN;
}

// 计算跳格/飞格后的最终落点（特格触发前的 to → 触发后最终格）
export function finalLanding(seat, to) {
  if (to.loc !== 'track') return to;
  let r = to.r;
  let guard = 0;
  while (guard++ < 4) {
    if (r === JUMP_REL) r = JUMP_TO_REL;
    else if (r === FLY_REL) r = FLY_TO_REL;
    else break;
  }
  return { loc: 'track', r };
}

export function legalMoves(state, seat, dice) {
  if (dice === 0) return [];
  const out = [];
  const pieces = state.seats[seat].pieces;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.loc === 'done') continue;
    if (p.loc === 'base') {
      if (dice === 6) out.push({ pieceId: i, to: { loc: 'track', r: 0 } });
      continue;
    }
    if (p.loc === 'track') {
      const sum = p.r + dice;
      if (sum <= TRACK_MAX) out.push({ pieceId: i, to: { loc: 'track', r: sum } });
      else if (sum <= TRACK_MAX + HOME_LEN) {
        const h = sum - (TRACK_MAX + 1);     // 52→0 … 57→5
        if (h === GOAL_REL) out.push({ pieceId: i, to: { loc: 'done', r: GOAL_REL } });
        else out.push({ pieceId: i, to: { loc: 'home', r: h } });
      }
      continue;
    }
    if (p.loc === 'home') {
      const h = p.r + dice;
      if (h === GOAL_REL) out.push({ pieceId: i, to: { loc: 'done', r: GOAL_REL } });
      else if (h < GOAL_REL) out.push({ pieceId: i, to: { loc: 'home', r: h } });
      continue;
    }
  }
  return out;
}

function captureAt(state, seat, rel) {
  const target = absCell(seat, rel);
  for (let s = 0; s < state.seatCount; s++) {
    if (s === seat) continue;
    for (const p of state.seats[s].pieces) {
      if (p.loc === 'track' && absCell(s, p.r) === target) {
        p.loc = 'base'; p.r = -1;
        pushLog(state, `🛬${SEATS[s]}被吃回机场`);
      }
    }
  }
}

export function checkWinner(state) {
  for (let s = 0; s < state.seatCount; s++) {
    if (state.seats[s].pieces.every(p => p.loc === 'done')) return s;
  }
  return null;
}

export function nextSeat(state) {
  state.turn = (state.turn + 1) % state.seatCount;
}

export function endTurn(state, wasSix) {
  state.rolled = false;
  state.dice = 0;
  if (wasSix) {
    state.consecSix += 1;
    if (state.consecSix >= 3) {
      pushLog(state, `⚠️${SEATS[state.turn]}连三6作废`);
      state.consecSix = 0;
      nextSeat(state);
    }
    // 否则同一座位再掷（rolled=false）
  } else {
    state.consecSix = 0;
    nextSeat(state);
  }
}

export function applyMove(state, seat, pieceId) {
  if (state.phase !== 'playing' || !state.rolled) return state;
  if (state.turn !== seat) return state;
  const dice = state.dice;
  const moves = legalMoves(state, seat, dice);
  const mv = moves.find(m => m.pieceId === pieceId);
  if (!mv) return state;
  const next = clone(state);
  const piece = next.seats[seat].pieces[pieceId];
  piece.loc = mv.to.loc;
  piece.r = mv.to.r;
  if (piece.loc === 'track') {
    const fin = finalLanding(seat, mv.to);
    piece.r = fin.r;
    captureAt(next, seat, piece.r);
    pushLog(next, `✈️${SEATS[seat]}至${piece.r}`);
  } else if (piece.loc === 'done') {
    pushLog(next, `🏆${SEATS[seat]}一架到家`);
  } else {
    pushLog(next, `✈️${SEATS[seat]}至终点跑道${piece.r}`);
  }
  if (checkWinner(next) !== null) {
    next.phase = 'finished';
    next.winner = seat;
    pushLog(next, `🏆${SEATS[seat]}获胜！`);
    return next;
  }
  endTurn(next, dice === 6);
  return next;
}

export function chooseAiMove(state, seat, dice) {
  const moves = legalMoves(state, seat, dice);
  if (!moves.length) return -1;
  const scored = moves.map(m => {
    let score = 0;
    if (m.to.loc === 'done') score += 1000;
    if (m.to.loc === 'home') score += 100 + m.to.r * 10;
    if (m.to.loc === 'track') {
      const fin = finalLanding(seat, m.to);
      score += fin.r * 3;                          // 越靠近终点跑道越优
      if (m.to.r === JUMP_REL) score += 140;
      if (m.to.r === FLY_REL) score += 240;
      const target = absCell(seat, fin.r);
      let captures = 0;
      for (let s2 = 0; s2 < state.seatCount; s2++) {
        if (s2 === seat) continue;
        for (const op of state.seats[s2].pieces) {
          if (op.loc === 'track' && absCell(s2, op.r) === target) captures += 1;
        }
      }
      score += captures * 700;

      // Do not leave a piece where an opponent can capture it next roll.
      let threats = 0;
      for (let s2 = 0; s2 < state.seatCount; s2++) {
        if (s2 === seat) continue;
        for (const op of state.seats[s2].pieces) {
          if (op.loc !== 'track') continue;
          const distance = (target - absCell(s2, op.r) + LOOP_LEN) % LOOP_LEN;
          if (distance >= 1 && distance <= 6) threats += 1;
        }
      }
      score -= threats * 45;
    }
    return { pid: m.pieceId, score };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.pid - b.pid));
  return scored[0].pid;
}

export function touch(state, now) {
  const seat = state.seats[state.turn];
  if (state.phase === 'playing' && seat.kind === 'human' && !seat.autoAi) {
    state.lastActionAt = now;
  }
}

export function startMatch(state, now) {
  const next = clone(state);
  for (let i = 0; i < next.seatCount; i++) {
    const s = next.seats[i];
    if (!s.username) { s.username = null; s.kind = 'ai'; }
    else s.kind = 'human';
    s.autoAi = false; s.timeoutCount = 0;
  }
  next.phase = 'playing';
  next.turn = 0;
  next.rolled = false; next.dice = 0; next.consecSix = 0;
  next.lastActionAt = now;
  next.winner = null;
  pushLog(next, '🏁对局开始');
  return next;
}

export function joinSeat(state, username) {
  const next = clone(state);
  const free = next.seats.findIndex(s => s.username === null);
  if (free < 0) return { state: next, seat: -1 };
  next.seats[free].username = username;
  next.seats[free].kind = 'human';
  return { state: next, seat: free };
}

export function tick(state, now) {
  if (state.phase !== 'playing') return state;
  let s = clone(state);
  let guard = 0;
  while (s.phase === 'playing' && guard++ < 200) {
    const seat = s.seats[s.turn];
    const isAi = seat.kind === 'ai' || seat.autoAi;
    if (!isAi) {
      if (s.lastActionAt === 0) { s.lastActionAt = now; break; }
      if (now - s.lastActionAt < 30000) break;        // human still has time, wait
      // stale: auto-play exactly one turn for this seat
      seat.timeoutCount = (seat.timeoutCount || 0) + 1;
      if (seat.timeoutCount >= 2) {
        seat.autoAi = true;
        pushLog(s, `🤖${SEATS[s.turn]}超时转AI`);
      }
    }
    if (!s.rolled) s = rollDice(s);
    if (s.phase === 'playing' && s.rolled) {
      const moves = legalMoves(s, s.turn, s.dice);
      if (moves.length) {
        const pid = chooseAiMove(s, s.turn, s.dice);
        s = applyMove(s, s.turn, pid);
      }
    }
    // after the action, if the new current seat is a non-AI human, give it a fresh 30s timer and stop;
    // if it's AI, continue the loop so consecutive AI turns all play in one tick
    if (s.phase === 'playing') {
      const cur = s.seats[s.turn];
      const curAi = cur.kind === 'ai' || cur.autoAi;
      if (!curAi) { s.lastActionAt = now; break; }
    }
  }
  return s;
}
