import {
  initialBoard, cloneBoard, isRed, sideOf, legalMoves, isInCheck,
  isCheckmate, hasAnyLegalMove, makeMove, pieceName,
  RED, BLACK,
} from './logic.js';
import { searchMove } from './engine.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const turnEl = document.getElementById('turn');
const roundEl = document.getElementById('round');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const undoBtn = document.getElementById('undo');
const aiNote = document.getElementById('ai-note');
const winModal = document.getElementById('win-modal');
const winTitle = document.getElementById('win-title');
const winText = document.getElementById('win-text');
const winNewBtn = document.getElementById('win-new');

function showWinModal(title, text) {
  winTitle.textContent = title;
  winText.textContent = text;
  winModal.classList.remove('hidden');
}
function hideWinModal() { winModal.classList.add('hidden'); }

const M = 30; // 边距
const CELL = 58.5; // 格距 (528-2*30)/8 ... 实际用 width 自适应
// 用 canvas 像素坐标（固定 528x584）
const CW = 528, CH = 584;
const COLW = (CW - 2 * 28) / 8;
const ROWH = (CH - 2 * 28) / 9;
const OX = 28, OY = 28;

// Retina/高分屏：backing store 按 dpr 放大，绘制仍用逻辑坐标
const dpr = window.devicePixelRatio || 1;
canvas.width = CW * dpr;
canvas.height = CH * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
function px(r, c) { return [OX + c * COLW, OY + r * ROWH]; }
function fromPx(x, y) {
  const c = Math.round((x - OX) / COLW);
  const r = Math.round((y - OY) / ROWH);
  return [r, c];
}

let board = initialBoard();
let selected = null; // [r,c]
let highlight = []; // [[r,c]...]
let turn = RED; // 红先
let round = 1;
let history = []; // {board, turn, round}
let thinking = false;
let gameOver = false;

render();
updateStatus();

resetBtn.addEventListener('click', reset);
undoBtn.addEventListener('click', undo);
winNewBtn.addEventListener('click', () => { hideWinModal(); reset(); });

function pointToClient(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = CW / rect.width;
  const sy = CH / rect.height;
  const x = (e.clientX - rect.left) * sx;
  const y = (e.clientY - rect.top) * sy;
  return [x, y];
}

canvas.addEventListener('click', (e) => {
  if (gameOver || thinking || turn !== RED) return;
  const [x, y] = pointToClient(e);
  const r = Math.round((y - OY) / ROWH);
  const c = Math.round((x - OX) / COLW);
  if (r < 0 || r > 9 || c < 0 || c > 8) return;
  handleClick(r, c);
});

// 触摸支持
canvas.addEventListener('touchend', (e) => {
  if (gameOver || thinking || turn !== RED) return;
  e.preventDefault();
  const t = e.changedTouches[0];
  if (!t) return;
  const [x, y] = pointToClient(t);
  const r = Math.round((y - OY) / ROWH);
  const c = Math.round((x - OX) / COLW);
  if (r < 0 || r > 9 || c < 0 || c > 8) return;
  handleClick(r, c);
}, { passive: false });

function handleClick(r, c) {
  const p = board[r][c];
  // 若已选中且点击高亮位置 → 走子
  if (selected && highlight.some(([rr, cc]) => rr === r && cc === c)) {
    doPlayerMove(selected, [r, c]);
    return;
  }
  // 选中己方棋子
  if (p && sideOf(p) === RED) {
    selected = [r, c];
    highlight = legalMoves(board, r, c);
    render();
    return;
  }
  // 点空或敌方 → 取消
  selected = null;
  highlight = [];
  render();
}

function doPlayerMove(from, to) {
  history.push({ board: cloneBoard(board), turn, round });
  board = makeMove(board, from, to);
  selected = null;
  highlight = [];
  afterMove(RED);
}

function afterMove(movedSide) {
  const other = movedSide === RED ? BLACK : RED;
  // 更新回合
  if (movedSide === BLACK) round++;
  turn = other;
  render();
  // 检查胜负
  if (isCheckmate(board, other)) {
    gameOver = true;
    const winner = movedSide === RED ? '红' : '黑';
    setStatus(`${winner}方胜！将死`, 'win');
    showWinModal(`${winner}方胜`, '将死对方将帅，对局结束');
    return;
  }
  if (!hasAnyLegalMove(board, other)) {
    gameOver = true;
    const winner = movedSide === RED ? '红' : '黑';
    setStatus(`${other === RED ? '红' : '黑'}方无棋可走，${winner}方胜`, 'win');
    showWinModal(`${winner}方胜`, '对方无棋可走，对局结束');
    return;
  }
  updateStatus();
  if (!gameOver && turn === BLACK) aiTurn();
}

function updateStatus() {
  turnEl.textContent = turn === RED ? '红' : '黑';
  roundEl.textContent = round;
  if (gameOver) return;
  if (isInCheck(board, turn)) {
    setStatus(`${turn === RED ? '红' : '黑'}方被将军，请应将`, 'check');
  } else {
    setStatus(turn === RED ? '轮到你（红）走子' : 'AI（黑）思考中…', turn === BLACK ? 'thinking' : '');
  }
}

function setStatus(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className = 'status' + (cls ? ' ' + cls : '');
}

// AI 走子兜底：若引擎返回非法走法（理论上不会），挑一个吃高价值子的合法走法顶上。
const PIECE_VALUE = { K: 10000, R: 900, C: 450, N: 400, B: 200, A: 200, P: 100 };
function fallbackBlackMove() {
  const cand = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p || sideOf(p) !== BLACK) continue;
      for (const [rr, cc] of legalMoves(board, r, c)) {
        const cap = board[rr][cc];
        cand.push({ from: [r, c], to: [rr, cc], v: cap ? PIECE_VALUE[cap.toUpperCase()] || 100 : 0 });
      }
    }
  }
  if (!cand.length) return null;
  cand.sort((a, b) => b.v - a.v);
  return cand[0];
}

function aiTurn() {
  thinking = true;
  setStatus('AI（黑）思考中…', 'thinking');
  aiNote.textContent = '正在计算走法…';
  aiNote.classList.remove('fallback');
  undoBtn.disabled = true;
  // 异步一拍，让「思考中」状态先渲染，再进行同步搜索。
  setTimeout(() => {
    let from, to, piece, usedFallback = false;
    try {
      const m = searchMove(board, BLACK, 4);
      const legal = m && legalMoves(board, m.from[0], m.from[1])
        .some(([rr, cc]) => rr === m.to[0] && cc === m.to[1]);
      if (legal) { from = m.from; to = m.to; piece = m.piece; }
    } catch (e) {
      console.error('AI engine error', e);
    }
    if (!from) {
      const fb = fallbackBlackMove();
      if (!fb) {
        aiNote.textContent = 'AI 无棋可走';
        thinking = false;
        undoBtn.disabled = false;
        return;
      }
      from = fb.from; to = fb.to; piece = board[from[0]][from[1]];
      usedFallback = true;
    }
    history.push({ board: cloneBoard(board), turn, round });
    board = makeMove(board, from, to);
    aiNote.classList.toggle('fallback', usedFallback);
    aiNote.textContent = usedFallback
      ? `AI：${pieceName(piece)} ${moveStr(from, to)}（兜底）`
      : `AI：${pieceName(piece)} ${moveStr(from, to)}`;
    thinking = false;
    undoBtn.disabled = false;
    afterMove(BLACK);
  }, 30);
}

function moveStr(from, to) {
  const cols = 'abcdefghi';
  return `${cols[from[1]]}${from[0]}→${cols[to[1]]}${to[0]}`;
}

function reset() {
  board = initialBoard();
  selected = null;
  highlight = [];
  turn = RED;
  round = 1;
  history = [];
  thinking = false;
  gameOver = false;
  aiNote.textContent = '';
  aiNote.classList.remove('fallback');
  hideWinModal();
  setStatus('轮到你了，请走子');
  render();
}

function undo() {
  if (thinking) return;
  // 悔到玩家上次走子前：pop 掉 AI 一步 + 玩家一步
  let pop = history.pop();
  if (pop && pop.turn === BLACK) {
    // 上一步是玩家后 AI 走的状态前，再 pop 一次
    pop = history.pop();
  }
  if (!pop) {
    // 只有玩家刚走过，AI 未走时的边界
    return;
  }
  board = pop.board;
  turn = pop.turn;
  round = pop.round;
  selected = null;
  highlight = [];
  gameOver = false;
  aiNote.textContent = '';
  aiNote.classList.remove('fallback');
  render();
  updateStatus();
}

// === 渲染 ===
function render() {
  ctx.clearRect(0, 0, CW, CH);
  drawBoard();
  drawPieces();
  if (selected) drawSelected();
  drawHighlights();
}

function drawBoard() {
  ctx.strokeStyle = '#5a4028';
  ctx.lineWidth = 1.4;
  // 外框
  ctx.strokeRect(OX, OY, 8 * COLW, 9 * ROWH);
  // 横线
  for (let r = 1; r < 9; r++) {
    ctx.beginPath();
    ctx.moveTo(OX, OY + r * ROWH);
    ctx.lineTo(OX + 8 * COLW, OY + r * ROWH);
    ctx.stroke();
  }
  // 竖线（楚河汉界处断开）
  for (let c = 1; c < 8; c++) {
    // 上半 r0-4
    ctx.beginPath();
    ctx.moveTo(OX + c * COLW, OY);
    ctx.lineTo(OX + c * COLW, OY + 4 * ROWH);
    ctx.stroke();
    // 下半 r5-9
    ctx.beginPath();
    ctx.moveTo(OX + c * COLW, OY + 5 * ROWH);
    ctx.lineTo(OX + c * COLW, OY + 9 * ROWH);
    ctx.stroke();
  }
  // 九宫斜线（黑上红下）
  ctx.beginPath();
  ctx.moveTo(OX + 3 * COLW, OY); ctx.lineTo(OX + 5 * COLW, OY + 2 * ROWH);
  ctx.moveTo(OX + 5 * COLW, OY); ctx.lineTo(OX + 3 * COLW, OY + 2 * ROWH);
  ctx.moveTo(OX + 3 * COLW, OY + 7 * ROWH); ctx.lineTo(OX + 5 * COLW, OY + 9 * ROWH);
  ctx.moveTo(OX + 5 * COLW, OY + 7 * ROWH); ctx.lineTo(OX + 3 * COLW, OY + 9 * ROWH);
  ctx.stroke();
  // 楚河汉界
  ctx.fillStyle = '#5a4028';
  ctx.font = 'bold 22px "Kaiti SC", "STKaiti", "KaiTi", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('楚 河', OX + 2 * COLW, OY + 4.5 * ROWH);
  ctx.fillText('汉 界', OX + 6 * COLW, OY + 4.5 * ROWH);
}

function drawPieces() {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      drawPiece(r, c, p);
    }
  }
}

function drawPiece(r, c, p) {
  const [x, y] = px(r, c);
  const R = 23;
  const red = isRed(p);
  // 棋子底色
  ctx.beginPath();
  ctx.arc(x, y, R, 0, 2 * Math.PI);
  ctx.fillStyle = '#f9e8c8';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = red ? '#c0392b' : '#1a1a1a';
  ctx.stroke();
  // 字
  ctx.fillStyle = red ? '#c0392b' : '#1a1a1a';
  ctx.font = 'bold 24px "Kaiti SC", "STKaiti", "KaiTi", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pieceName(p), x, y + 1);
}

function drawSelected() {
  const [r, c] = selected;
  const [x, y] = px(r, c);
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, 2 * Math.PI);
  ctx.strokeStyle = '#e67e22';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawHighlights() {
  for (const [r, c] of highlight) {
    const [x, y] = px(r, c);
    const target = board[r][c];
    if (target) {
      // 吃子标记：红圈
      ctx.beginPath();
      ctx.arc(x, y, 26, 0, 2 * Math.PI);
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // 空位：小绿点
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(106,170,100,0.75)';
      ctx.fill();
    }
  }
}
