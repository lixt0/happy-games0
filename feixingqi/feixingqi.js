import { SEATS, ENTRY, legalMoves, absCell, JUMP_REL, FLY_REL } from './engine.js';

const POLL_GAME = 1500, POLL_LOBBY = 2000;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DICE_GLYPH = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const SEAT_COLOR = ['#d64545', '#e0b020', '#3a78c2', '#3fae6e'];   // 红黄蓝绿

let me = null;       // { username }
let code = null;
let state = null;
let mySeat = -1;
let pollTimer = null;

function show(id) {
  document.querySelectorAll('.fx-screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}
function showError(msg) { const el = $('lobby-error'); el.textContent = msg; el.classList.toggle('hidden', !msg); }

async function api(path, body) {
  const res = await fetch(`/api/feixingqi/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function init() {
  const r = await fetch('/api/me').then(r => r.json()).catch(() => ({}));
  if (!r.username) { location.href = '/login.html'; return; }
  me = r;
  bindRules();
  bindLobby();
  show('screen-lobby');
}

function bindRules() {
  const modal = $('rules-modal');
  const close = () => modal.classList.add('hidden');
  $('btn-rules').onclick = () => modal.classList.remove('hidden');
  $('btn-close-rules').onclick = close;
  modal.querySelector('[data-close-rules]').onclick = close;
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
}

// ---------- 大厅交互 ----------

function bindLobby() {
  $('btn-create').onclick = async () => {
    const password = $('create-pass').value.trim();
    const seatCount = parseInt($('create-seats').value, 10);
    if (!password) return showError('请设密码');
    const r = await api('create', { password, seatCount });
    if (r.error) return showError(r.error);
    code = r.code;
    enterRoom();
  };
  $('btn-join').onclick = async () => {
    code = $('join-code').value.trim();
    const password = $('join-pass').value.trim();
    if (!code || !password) return showError('请填房间号与密码');
    const r = await api('join', { code, password });
    if (r.error) return showError(r.error);
    enterRoom();
  };
}

async function enterRoom() {
  showError('');
  show('screen-room');
  $('room-code').textContent = code;
  await pollRoom();
  startPolling(POLL_LOBBY, pollRoom);
}

function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }
function startPolling(ms, fn) {
  stopPolling();
  const token = pollTimer = setTimeout(loop, ms);
  // Only reschedule if no other timer took over (e.g. lobby→game transition calls
  // startPolling again, replacing pollTimer; the old loop must then stop).
  async function loop() { await fn(); if (pollTimer === token) pollTimer = setTimeout(loop, ms); }
}

async function pollRoom() {
  const r = await api(`state?code=${encodeURIComponent(code)}`);
  if (r.error) { showError(r.error); stopPolling(); return; }
  state = r;
  mySeat = state.seats.findIndex(s => s.username === (me && me.username));
  renderRoom();
  if (state.phase !== 'waiting') { stopPolling(); enterGame(); }
}

function renderRoom() {
  $('room-phase').textContent = state.phase === 'waiting' ? '等待加入…' : '已开始';
  $('seat-list').innerHTML = state.seats.map((s, i) => `
    <div class="fx-seat" style="--c:${SEAT_COLOR[i]}">
      <span class="fx-seat-color">${SEATS[i]}</span>
      <span class="fx-seat-name">${esc(s.username || (s.kind === 'ai' ? 'AI' : '空位'))}</span>
    </div>`).join('');
  const host = mySeat === 0 && state.phase === 'waiting';
  $('btn-start').classList.toggle('hidden', !host);
  $('btn-start').onclick = host ? (async () => { const r = await api('start', { code }); if (r.error) showError(r.error); }) : null;
}

// ---------- 对局轮询与渲染 ----------

async function enterGame() {
  show('screen-game');
  $('btn-roll').onclick = doRoll;
  $('win-back').onclick = () => { stopPolling(); location.reload(); };
  await pollGame();
  startPolling(POLL_GAME, pollGame);
}

async function pollGame() {
  const r = await api(`state?code=${encodeURIComponent(code)}`);
  if (r.error) return;
  state = r;
  mySeat = state.seats.findIndex(s => s.username === (me && me.username));
  renderGame();
  if (state.phase === 'finished') { stopPolling(); showWin(); }
}

function renderGame() {
  renderBoard();
  const cur = state.seats[state.turn];
  const myTurn = state.turn === mySeat && cur && cur.kind === 'human' && !cur.autoAi;
  $('turn-indicator').innerHTML = `<span style="color:${SEAT_COLOR[state.turn]}">${SEATS[state.turn]}</span> 行棋` +
    (myTurn ? '（你的回合）' : '');
  const canRoll = myTurn && !state.rolled;
  const btn = $('btn-roll');
  btn.disabled = !canRoll;
  btn.textContent = state.rolled ? (DICE_GLYPH[state.dice] || String(state.dice)) : '🎲';
  $('event-log').innerHTML = state.log.slice(-8).map(l => `<div>${esc(l)}</div>`).join('');
}

function showWin() {
  $('win-title').textContent = '对局结束';
  $('win-text').textContent = state.winner === mySeat ? '你获胜了！🎉' : `${SEATS[state.winner]} 获胜`;
  $('win-modal').classList.remove('hidden');
}

// ---------- 棋盘渲染（CSS grid + emoji 圆片） ----------

function renderBoard() {
  const board = $('board');
  // 15x15 grid: 4 角机场 + 外圈跑道 + 十字终点跑道 + 中心
  board.style.setProperty('--cells', 15);
  const cells = new Array(15 * 15);
  for (let i = 0; i < 15 * 15; i++) cells[i] = '';

  // 跑道绝对格 0..51 → 计算其 (row,col)
  for (let abs = 0; abs < 52; abs++) {
    const { row, col } = trackCoord(abs);
    const idx = row * 15 + col;
    cells[idx] = `<div class="fx-cell fx-track" data-abs="${abs}"></div>`;
  }
  // 特格上色（按归属座位的颜色）
  for (let seat = 0; seat < 4; seat++) {
    for (const rel of [JUMP_REL, FLY_REL]) {
      const abs = absCell(seat, rel);
      const { row, col } = trackCoord(abs);
      cells[row * 15 + col] = `<div class="fx-cell fx-track fx-special" data-abs="${abs}" style="--c:${SEAT_COLOR[seat]}" data-kind="${rel === JUMP_REL ? 'jump' : 'fly'}"></div>`;
    }
  }
  // 机场（base 停机格）底色
  for (let seat = 0; seat < 4; seat++) {
    for (let i = 0; i < 4; i++) {
      const { row, col } = baseCoord(seat, i);
      cells[row * 15 + col] = `<div class="fx-cell fx-base" style="--c:${SEAT_COLOR[seat]}"></div>`;
    }
  }
  // 终点跑道（home）底色
  for (let seat = 0; seat < 4; seat++) {
    for (let r = 0; r < 5; r++) {
      const { row, col } = homeCoord(seat, r);
      cells[row * 15 + col] = `<div class="fx-cell fx-home" style="--c:${SEAT_COLOR[seat]}"></div>`;
    }
    const g = goalCoord(seat);
    cells[g.row * 15 + g.col] = `<div class="fx-cell fx-goal" style="--c:${SEAT_COLOR[seat]}">🏆</div>`;
  }

  // 棋子（叠加到对应格）
  const piecesByCell = new Map();   // idx -> html string
  for (let seat = 0; seat < state.seatCount; seat++) {
    const pieces = state.seats[seat].pieces;
    for (let pi = 0; pi < pieces.length; pi++) {
      const p = pieces[pi];
      const pos = pieceCoord(seat, p, pi);
      if (!pos) continue;
      const idx = pos.row * 15 + pos.col;
      const html = `<div class="fx-piece" style="--c:${SEAT_COLOR[seat]}" data-seat="${seat}" data-piece="${pi}">✈️</div>`;
      piecesByCell.set(idx, (piecesByCell.get(idx) || '') + html);
    }
  }
  // 组装：每个格子的容器 + 叠加棋子
  const out = [];
  for (let i = 0; i < 225; i++) {
    const base = cells[i] || '<div class="fx-cell"></div>';
    out.push(`<div class="fx-slot">${base}${piecesByCell.get(i) || ''}</div>`);
  }
  board.innerHTML = out.join('');

  // 高亮我的可动子
  if (state.turn === mySeat && state.rolled) {
    legalMoves(state, mySeat, state.dice).forEach(m => {
      const p = state.seats[mySeat].pieces[m.pieceId];
      const pos = pieceCoord(mySeat, p, m.pieceId);
      if (pos) {
        const slot = board.children[pos.row * 15 + pos.col];
        slot.classList.add('fx-movable');
      }
    });
  }
  board.querySelectorAll('.fx-piece').forEach(el => {
    el.onclick = () => doMove(parseInt(el.dataset.seat, 10), parseInt(el.dataset.piece, 10));
  });
}

// 绝对格 0..51 → 15x15 坐标（外圈顺时针环绕十字，abs 0 = 红方起飞点 = 左侧中行最左格 (7,0)）。
// 约定：行 0..14（上到下），列 0..14（左到右）。十字臂宽 3，长 6；跑道为十字外轮廓 52 格。
// 4 个「腋窝」拐角处为对角邻接（视觉上无缺口，复刻经典飞行棋棋盘拐角）。
const TRACK_TABLE = [
  [7, 0],                                                                  // 0  红起飞点（左）
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],                          // 1-6  左臂上边
  [5, 6],                                                                  // 7   腋窝（对角接 6,5）
  [4, 6], [3, 6], [2, 6], [1, 6],                                          // 8-11 上臂左边
  [0, 6],                                                                  // 12  上臂左上角
  [0, 7],                                                                  // 13  黄起飞点（上）
  [0, 8],                                                                  // 14
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],                                  // 15-19 上臂右边
  [6, 9],                                                                  // 20  腋窝（对角接 5,8）
  [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],                             // 21-25 右臂上边
  [7, 14],                                                                 // 26  蓝起飞点（右）
  [8, 14],                                                                 // 27
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],                              // 28-32 右臂下边
  [9, 8],                                                                  // 33  腋窝（对角接 8,9）
  [10, 8], [11, 8], [12, 8], [13, 8],                                      // 34-37 下臂右边
  [14, 8],                                                                 // 38
  [14, 7],                                                                 // 39  绿起飞点（下）
  [14, 6],                                                                 // 40
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],                             // 41-45 下臂左边
  [8, 5],                                                                  // 46  腋窝（对角接 9,6）
  [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],                                  // 47-51 左臂下边
];

function trackCoord(abs) {
  const a = ((abs % 52) + 52) % 52;
  const t = TRACK_TABLE[a];
  return { row: t[0], col: t[1] };
}

// 4 个机场（角），每个 4 个 2×2 停机位。座位→角：红=左上, 黄=右上, 蓝=右下, 绿=左下。
const BASE_TABLE = [
  [[1, 1], [1, 2], [2, 1], [2, 2]],         // red   左上
  [[1, 12], [1, 13], [2, 12], [2, 13]],      // yellow 右上
  [[12, 12], [12, 13], [13, 12], [13, 13]],  // blue   右下
  [[12, 1], [12, 2], [13, 1], [13, 2]],      // green  左下
];

function baseCoord(seat, i) {
  const t = BASE_TABLE[seat][i];
  return { row: t[0], col: t[1] };
}

// 终点跑道：每座 5 个 home 接近格 + 1 个 goal(=done)。沿该座十字臂中线指向中心 (7,7)。
// home r=0..4 接近格；r=5 → done → 渲染在 goalCoord。
const HOME_TABLE = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],   // red   左→中（行 7）
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],   // yellow 上→中（列 7）
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],// blue  右→中（行 7）
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],// green 下→中（列 7）
];
const GOAL_TABLE = [[7, 6], [6, 7], [7, 8], [8, 7]];   // done 渲染格（中心 🏆 周围 4 格）

function homeCoord(seat, r) {
  const t = HOME_TABLE[seat][r];
  return { row: t[0], col: t[1] };
}
function goalCoord(seat) {
  const t = GOAL_TABLE[seat];
  return { row: t[0], col: t[1] };
}

// 棋子位置 → 网格坐标。base 棋子按其在该座 4 架中的索引 pi 落到 2×2 停机位
//（引擎中 base 的 r=-1，无法区分，故用索引）；track/home/done 按 r 与 loc。
function pieceCoord(seat, p, pi) {
  if (p.loc === 'base') {
    return baseCoord(seat, pi & 3);
  }
  if (p.loc === 'track') {
    return trackCoord(absCell(seat, p.r));
  }
  if (p.loc === 'home') {
    return homeCoord(seat, p.r);
  }
  if (p.loc === 'done') {
    return goalCoord(seat);
  }
  return null;
}

// ---------- 掷骰与选子动作 ----------

async function doRoll() {
  const r = await api('roll', { code });
  if (r.error) return;
  await pollGame();   // 立即刷新
}

async function doMove(seat, pieceId) {
  if (seat !== mySeat) return;
  if (!state.rolled) return;
  const r = await api('move', { code, pieceId });
  if (r.error) return;
  await pollGame();
}

init();
