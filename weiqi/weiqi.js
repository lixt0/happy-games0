import { metrics, pixelToCell, drawBoard, drawStones } from './render.js';
import { emptyBoard, EMPTY, BLACK, WHITE } from './logic.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start');
const resetBtn = document.getElementById('reset');
const resignBtn = document.getElementById('resign');
const sizeBtns = document.querySelectorAll('.size-btn');
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

const state = {
  size: 9, board: emptyBoard(9), phase: 'idle', turn: 'player',
  worker: null, lastMove: null,
};

const CANVAS = 540;

// Retina/高分屏：backing store 按 dpr 放大，绘制仍用逻辑坐标
const dpr = window.devicePixelRatio || 1;
canvas.width = CANVAS * dpr;
canvas.height = CANVAS * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

function setStatus(t) { statusEl.textContent = t; }
function m() { return metrics(state.size, CANVAS); }
function draw() {
  ctx.clearRect(0, 0, CANVAS, CANVAS);
  drawBoard(ctx, m(), state.size);
  drawStones(ctx, state.board, m(), state.size, state.lastMove);
}
draw();

new ResizeObserver(() => draw()).observe(canvas.parentElement);

function ensureWorker() {
  if (state.worker) return state.worker;
  state.worker = new Worker('/weiqi/weiqi.worker.js', { type: 'classic' });
  state.worker.onmessage = onMsg;
  return state.worker;
}

function onMsg(e) {
  const d = e.data;
  if (!d.ok) {
    setStatus('引擎错误：' + (d.error || '?'));
    state.phase = 'over'; state.turn = 'player';
    resignBtn.disabled = true;
    if (d.log) console.error('引擎诊断日志：\n' + d.log);
    if (d.moves) console.error('走法序列：' + d.moves);
    showWinModal('引擎错误', d.error || '未知错误');
    return;
  }
  if (d.cmd === 'init') {
    state.board = d.board; state.lastMove = d.last; state.phase = 'playing'; state.turn = 'player';
    setStatus('轮到你（黑）'); draw();
    startBtn.disabled = true; resetBtn.disabled = false; resignBtn.disabled = false;
    return;
  }
  if (d.cmd === 'play') {
    if (state.phase === 'over') return;   // 对局已结束（如认输），丢弃迟到的回包
    if (d.code === 0) {
      state.board = d.board; state.lastMove = d.last;
      state.turn = 'ai'; state.phase = 'ai-thinking'; setStatus('AI（白）思考中…'); draw();
      ensureWorker().postMessage({ cmd: 'genmove' });
    } else if (d.code === -2) {
      setStatus('此处不能落子（劫/禁手/已占），请另选'); state.turn = 'player';
    } else { setStatus('落子越界'); state.turn = 'player'; }
    return;
  }
  if (d.cmd === 'genmove') {
    if (state.phase === 'over') return;   // 认输/已结束：丢弃 AI 迟到的回包，不复活对局
    state.board = d.board; state.lastMove = d.last;
    state.turn = 'player'; state.phase = 'playing'; setStatus('轮到你（黑）'); draw();
    return;
  }
}

function clickBoard(e) {
  if (state.phase !== 'playing' || state.turn !== 'player') return;
  const rect = canvas.getBoundingClientRect();
  const sx = CANVAS / rect.width, sy = CANVAS / rect.height;
  const px = (e.clientX - rect.left) * sx, py = (e.clientY - rect.top) * sy;
  const cell = pixelToCell(px, py, m(), state.size);
  if (!cell) return;
  state.turn = 'ai';   // 防止重复点击，等 onMsg 纠正
  ensureWorker().postMessage({ cmd: 'play', i: cell[0], j: cell[1] });
}
canvas.addEventListener('click', clickBoard);

function start() {
  state.phase = 'loading'; setStatus('正在加载引擎…（约 9MB）');
  startBtn.disabled = true;
  ensureWorker().postMessage({ cmd: 'init', size: state.size, seed: (Date.now() & 0xffff) });
}
startBtn.addEventListener('click', start);
winNewBtn.addEventListener('click', () => { hideWinModal(); reset(); });

function reset() {
  state.board = emptyBoard(state.size); state.lastMove = null;
  state.phase = 'idle'; state.turn = 'player';
  startBtn.disabled = false; resetBtn.disabled = true; resignBtn.disabled = true;
  hideWinModal();
  setStatus('点击「开始对弈」加载引擎'); draw();
}
resetBtn.addEventListener('click', reset);

function resign() {
  if (state.phase !== 'playing' && state.phase !== 'ai-thinking') return;
  state.phase = 'over';
  state.turn = 'player';
  setStatus('你认输，AI（白）胜');
  resignBtn.disabled = true;
  showWinModal('AI（白）胜', '你认输，再来一局？');
}
resignBtn.addEventListener('click', resign);

sizeBtns.forEach(b => b.addEventListener('click', () => {
  if (state.phase !== 'idle') { setStatus('请先重开再切换尺寸'); return; }
  sizeBtns.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-checked', 'false'); });
  b.classList.add('active'); b.setAttribute('aria-checked', 'true');
  state.size = +b.dataset.size; state.board = emptyBoard(state.size); draw();
}));
