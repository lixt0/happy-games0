import { parseLevel, move, isSolved, cloneState, boxOnTarget } from '/sokoban/logic.js';

const STORAGE_KEY = 'happygames.sokoban.solved';

let levels = [];
let state = null;
let history = [];
let currentLevel = 0;
let moveCount = 0;
let pushCount = 0;
let solvedLevels = new Set();

const boardEl = document.getElementById('board');
const levelSelectEl = document.getElementById('level-select');
const moveCountEl = document.getElementById('move-count');
const pushCountEl = document.getElementById('push-count');
const undoBtn = document.getElementById('undo-btn');
const resetBtn = document.getElementById('reset-btn');
const winModal = document.getElementById('win-modal');
const winStatsEl = document.getElementById('win-stats');
const winRetryBtn = document.getElementById('win-retry');
const winNextBtn = document.getElementById('win-next');

async function init() {
  const resp = await fetch('/sokoban/levels.json');
  levels = await resp.json();
  loadSolved();
  renderLevelSelect();
  setupEvents();
  loadLevel(0);
}

function loadSolved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      solvedLevels = new Set(arr);
    }
  } catch {
    solvedLevels = new Set();
  }
}

function saveSolved() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...solvedLevels]));
  } catch {
  }
}

function renderLevelSelect() {
  levelSelectEl.innerHTML = '';
  for (let i = 0; i < levels.length; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-btn';
    if (solvedLevels.has(i)) btn.classList.add('solved');
    if (i === currentLevel) btn.classList.add('active');
    btn.textContent = i + 1;
    btn.addEventListener('click', () => loadLevel(i));
    levelSelectEl.appendChild(btn);
  }
}

function loadLevel(idx) {
  currentLevel = idx;
  const level = levels[idx];
  state = parseLevel(level.map);
  history = [];
  moveCount = 0;
  pushCount = 0;
  updateStats();
  hideWinModal();
  renderLevelSelect();
  render();
}

function setupEvents() {
  window.addEventListener('keydown', onKeyDown);
  undoBtn.addEventListener('click', undo);
  resetBtn.addEventListener('click', () => loadLevel(currentLevel));
  winRetryBtn.addEventListener('click', () => {
    hideWinModal();
    loadLevel(currentLevel);
  });
  winNextBtn.addEventListener('click', () => {
    hideWinModal();
    if (currentLevel < levels.length - 1) {
      loadLevel(currentLevel + 1);
    } else {
      loadLevel(0);
    }
  });

  let touchStart = null;
  boardEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: false });
  boardEl.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    const threshold = 20;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  }, { passive: false });

  boardEl.addEventListener('mousedown', (e) => {
    touchStart = { x: e.clientX, y: e.clientY };
  });
  boardEl.addEventListener('mouseup', (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    const threshold = 20;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  });
  boardEl.addEventListener('mouseleave', () => { touchStart = null; });
}

function onKeyDown(e) {
  let dir = null;
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break;
    case 'ArrowRight': case 'd': case 'D': dir = 'right'; break;
    case 'ArrowUp': case 'w': case 'W': dir = 'up'; break;
    case 'ArrowDown': case 's': case 'S': dir = 'down'; break;
    case 'z': case 'Z': undo(); return;
    default: return;
  }
  e.preventDefault();
  handleMove(dir);
}

function handleMove(dir) {
  if (!state) return;
  const result = move(state, dir);
  if (!result.moved) return;

  history.push(cloneState(state));
  state = result.state;
  moveCount++;
  if (result.pushed) pushCount++;
  updateStats();
  render();

  if (isSolved(state)) {
    solvedLevels.add(currentLevel);
    saveSolved();
    renderLevelSelect();
    setTimeout(() => showWinModal(), 300);
  }
}

function undo() {
  if (history.length === 0) return;
  state = history.pop();
  moveCount = Math.max(0, moveCount - 1);
  pushCount = Math.max(0, pushCount - 1);
  updateStats();
  render();
}

function updateStats() {
  moveCountEl.textContent = moveCount;
  pushCountEl.textContent = pushCount;
  undoBtn.disabled = history.length === 0;
}

function showWinModal() {
  winStatsEl.textContent = `用了 ${moveCount} 步，推了 ${pushCount} 次`;
  winModal.classList.remove('hidden');
  if (currentLevel >= levels.length - 1) {
    winNextBtn.textContent = '回到第 1 关';
  } else {
    winNextBtn.textContent = '下一关';
  }
}

function hideWinModal() {
  winModal.classList.add('hidden');
}

function render() {
  if (!state) return;
  const { grid, width, height, player, boxes } = state;

  boardEl.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${height}, 1fr)`;
  boardEl.style.maxWidth = `${width * 52}px`;
  boardEl.style.aspectRatio = `${width} / ${height}`;
  boardEl.innerHTML = '';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      const isWall = grid[y][x] === 1;
      const isTarget = grid[y][x] === 2;
      const hasBox = boxes.some(b => b.x === x && b.y === y);
      const isPlayer = player.x === x && player.y === y;

      if (isWall) {
        cell.classList.add('cell-wall');
      } else if (hasBox) {
        cell.classList.add('cell-box');
        if (boxOnTarget(state, x, y)) {
          cell.classList.add('cell-box-on-target');
        }
      } else if (isPlayer) {
        cell.classList.add('cell-player');
      } else if (isTarget) {
        cell.classList.add('cell-target');
      } else {
        cell.classList.add('cell-floor');
      }

      boardEl.appendChild(cell);
    }
  }
}

init();
