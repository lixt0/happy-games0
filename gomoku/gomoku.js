import {
  createBoard, place, isFive, BLACK, WHITE, EMPTY, SIZE,
  OPPOSITE, DIFFICULTY,
} from '/gomoku/ai.js';
import { render, pixelToCell, computeMetrics } from '/gomoku/render.js';

const canvas = document.getElementById('board');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const diffButtons = document.querySelectorAll('.diff-btn');
const winModal = document.getElementById('win-modal');
const winTitle = document.getElementById('win-title');
const winText = document.getElementById('win-text');
const winNewBtn = document.getElementById('win-new');

const state = {
  board: createBoard(),
  lastMove: null,
  hoverMove: null,
  currentPlayer: BLACK,  // player (Black) goes first
  difficulty: 'medium',
  gameOver: false,
  aiThinking: false,
  worker: null,
  pendingRequestId: 0,
  animatedStones: new Map(),
  resizeObserver: null,
};

function init() {
  setupCanvas();
  setupWorker();
  setupEvents();
  draw();
  setStatus('轮到你了');
}

function setupCanvas() {
  const size = () => Math.min(canvas.parentElement.clientWidth, 600);
  state.resizeFn = () => {
    state.size = size();
    draw();
  };
  state.resizeFn();
  state.resizeObserver = new ResizeObserver(state.resizeFn);
  state.resizeObserver.observe(canvas.parentElement);
}

function setupWorker() {
  state.worker = new Worker('/gomoku/ai.worker.js', { type: 'module' });
  state.worker.onmessage = (e) => {
    const { ok, move, error, requestId } = e.data;
    if (requestId !== state.pendingRequestId) return; // stale
    state.aiThinking = false;
    canvas.style.pointerEvents = 'auto';
    if (!ok) {
      setStatus('AI 出错了，请重开', true);
      return;
    }
    if (!move) {
      setStatus('平局', true);
      state.gameOver = true;
      globalThis.HappyGame?.finish('finished', { score: 0, result: 'draw' });
      draw();
      showWinModal('平局', '棋盘已满，握手言和');
      return;
    }
    applyMove(move.x, move.y, WHITE);
    if (isFive(state.board, move.x, move.y, WHITE)) {
      state.gameOver = true;
      setStatus('电脑赢了', true);
      globalThis.HappyGame?.finish('lost', { score: 0, result: 'ai_win' });
      showWinModal('电脑赢了', 'AI 五子连珠，再接再厉');
    } else if (isBoardFull()) {
      state.gameOver = true;
      setStatus('平局', true);
      globalThis.HappyGame?.finish('finished', { score: 0, result: 'draw' });
      showWinModal('平局', '棋盘已满，握手言和');
    } else {
      setStatus('轮到你了');
      state.currentPlayer = BLACK;
    }
    draw();
  };
  state.worker.onerror = () => {
    state.aiThinking = false;
    canvas.style.pointerEvents = 'auto';
    setStatus('AI 出错了，请重开', true);
  };
}

function setupEvents() {
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('keydown', onCanvasKeyDown);
  canvas.addEventListener('mousemove', onCanvasMove);
  canvas.addEventListener('mouseleave', () => {
    state.hoverMove = null;
    draw();
  });
  resetBtn.addEventListener('click', () => reset());
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => onDifficultyClick(btn.dataset.difficulty));
  });
  winNewBtn.addEventListener('click', () => { hideWinModal(); reset(); });
}

function onCanvasClick(e) {
  if (state.gameOver || state.aiThinking) return;
  if (state.currentPlayer !== BLACK) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const m = computeMetrics(state.size);
  const cell = pixelToCell(m, px, py, state.size);
  if (!cell) return;
  if (state.board[cell.y][cell.x] !== EMPTY) return;
  playCell(cell.x, cell.y);
}

function onCanvasKeyDown(e) {
  const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (arrows[e.key]) {
    e.preventDefault();
    const [dx, dy] = arrows[e.key];
    const current = state.hoverMove || { x: 7, y: 7 };
    state.hoverMove = {
      x: Math.max(0, Math.min(SIZE - 1, current.x + dx)),
      y: Math.max(0, Math.min(SIZE - 1, current.y + dy)),
    };
    draw();
    return;
  }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const cell = state.hoverMove || { x: 7, y: 7 };
  const m = computeMetrics(state.size);
  const rect = canvas.getBoundingClientRect();
  onCanvasClick({
    clientX: rect.left + m.padding + cell.x * m.cell,
    clientY: rect.top + m.padding + cell.y * m.cell,
  });
}

function playCell(x, y) {
  applyMove(x, y, BLACK);
  if (isFive(state.board, x, y, BLACK)) {
    state.gameOver = true;
    setStatus('你赢了', true);
    globalThis.HappyGame?.finish('won', { score: 1, result: 'player_win' });
    draw();
    showWinModal('你赢了', '五子连珠，恭喜获胜');
    return;
  }
  if (isBoardFull()) {
    state.gameOver = true;
    setStatus('平局', true);
    globalThis.HappyGame?.finish('finished', { score: 0, result: 'draw' });
    draw();
    showWinModal('平局', '棋盘已满，握手言和');
    return;
  }
  state.currentPlayer = WHITE;
  setStatus('电脑思考中...');
  draw();
  requestAiMove();
}

function onCanvasMove(e) {
  if (state.gameOver || state.aiThinking) return;
  if (state.currentPlayer !== BLACK) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const m = computeMetrics(state.size);
  const cell = pixelToCell(m, px, py, state.size);
  if (!cell) { state.hoverMove = null; draw(); return; }
  if (state.board[cell.y][cell.x] !== EMPTY) { state.hoverMove = null; draw(); return; }
  state.hoverMove = cell;
  draw();
}

function applyMove(x, y, color) {
  place(state.board, x, y, color);
  state.lastMove = { x, y };
  state.hoverMove = null;
  animateStone(x, y);
}

function animateStone(x, y) {
  const key = `${x},${y}`;
  const start = performance.now();
  const duration = 180;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const scale = 0.3 + 0.7 * (1 - Math.pow(1 - t, 3)); // ease-out cubic
    state.animatedStones.set(key, { scale });
    draw();
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      state.animatedStones.delete(key);
      draw();
    }
  };
  requestAnimationFrame(tick);
}

function isBoardFull() {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (state.board[y][x] === EMPTY) return false;
    }
  }
  return true;
}

function requestAiMove() {
  state.aiThinking = true;
  canvas.style.pointerEvents = 'none';
  state.pendingRequestId += 1;
  // Send a deep clone so the worker has a stable snapshot.
  const snapshot = state.board.map(row => row.slice());
  state.worker.postMessage({
    board: snapshot,
    color: WHITE,
    difficulty: state.difficulty,
    requestId: state.pendingRequestId,
  });
}

function setStatus(text, isWin = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('win', isWin);
}

function showWinModal(title, text) {
  winTitle.textContent = title;
  winText.textContent = text;
  winModal.classList.remove('hidden');
}
function hideWinModal() { winModal.classList.add('hidden'); }

function draw() {
  render(canvas.getContext('2d'), {
    board: state.board,
    lastMove: state.lastMove,
    hoverMove: state.hoverMove,
    size: state.size,
    animatedStones: state.animatedStones,
  });
}

function reset() {
  if (state.gameOver) globalThis.HappyGame?.restart({ reason: 'button_reset' });
  state.board = createBoard();
  state.lastMove = null;
  state.hoverMove = null;
  state.currentPlayer = BLACK;
  state.gameOver = false;
  state.aiThinking = false;
  state.animatedStones.clear();
  state.pendingRequestId++; // invalidate any in-flight AI response
  canvas.style.pointerEvents = 'auto';
  hideWinModal();
  setStatus('轮到你了');
  draw();
}

function onDifficultyClick(newDifficulty) {
  if (newDifficulty === state.difficulty) return;
  const inProgress = state.lastMove !== null && !state.gameOver;
  if (inProgress) {
    const ok = window.confirm('重置当前对局？');
    if (!ok) return;
  }
  state.difficulty = newDifficulty;
  diffButtons.forEach(btn => {
    const isActive = btn.dataset.difficulty === newDifficulty;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', String(isActive));
  });
  reset();
}

init();
