import {
  ECHO_LENGTH,
  advanceGame,
  createGameState,
  stepsUntilEcho,
} from '/echo/logic.js';

const STORAGE_KEY = 'happygames.echo.bestLevel';
const LOGICAL_SIZE = 560;
const BOARD_MARGIN = 28;
const CELL_SIZE = 72;
const MOVE_DURATION = 145;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const boardFrame = document.querySelector('.board-frame');
const statusBox = document.querySelector('.turn-status');
const statusText = document.getElementById('status-text');
const levelEl = document.getElementById('level');
const sealsEl = document.getElementById('seals');
const echoesEl = document.getElementById('echoes');
const bestEl = document.getElementById('best');
const countdownEl = document.getElementById('echo-countdown');
const echoTrack = document.getElementById('echo-track');
const restartBtn = document.getElementById('restart');
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultText = document.getElementById('result-text');
const resultEmblem = document.getElementById('result-emblem');
const resultAction = document.getElementById('result-action');
const darkMode = window.matchMedia('(prefers-color-scheme: dark)');

let level = 1;
let levelSeed = Date.now();
let state = createGameState(level, levelSeed);
let bestLevel = loadBestLevel();
let animation = null;
let touchStart = null;
let modalMode = 'lost';

echoTrack.innerHTML = Array.from(
  { length: ECHO_LENGTH },
  () => '<span class="clock-tick"></span>',
).join('');

function loadBestLevel() {
  try {
    return Math.max(1, Number(localStorage.getItem(STORAGE_KEY)) || 1);
  } catch {
    return 1;
  }
}

function saveBestLevel(value) {
  bestLevel = Math.max(bestLevel, value);
  try {
    localStorage.setItem(STORAGE_KEY, String(bestLevel));
  } catch {
  }
}

function palette() {
  if (darkMode.matches) {
    return {
      paper: '#142320',
      cell: '#20312d',
      cellAlt: '#263a35',
      grid: '#506b64',
      frame: '#8aa29c',
      wall: '#697572',
      wallEdge: '#35423f',
      wallLine: '#99a5a1',
      red: '#ed6256',
      redDark: '#9e3028',
      teal: '#65c3b9',
      gold: '#e5bd53',
      goldDark: '#765020',
      path: 'rgba(229,189,83,0.62)',
    };
  }
  return {
    paper: '#e9ddc1',
    cell: '#f3e8ca',
    cellAlt: '#ecddba',
    grid: '#c2aa75',
    frame: '#526862',
    wall: '#747c79',
    wallEdge: '#46514e',
    wallLine: '#a2aba7',
    red: '#b83b2e',
    redDark: '#7e251c',
    teal: '#2c7873',
    gold: '#d0a22c',
    goldDark: '#6b3b19',
    path: 'rgba(130,91,28,0.5)',
  };
}

function cellCenter(pos) {
  return {
    x: BOARD_MARGIN + pos.x * CELL_SIZE + CELL_SIZE / 2,
    y: BOARD_MARGIN + pos.y * CELL_SIZE + CELL_SIZE / 2,
  };
}

function interpolatePosition(from, to, progress) {
  const eased = 1 - Math.pow(1 - progress, 3);
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
  };
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBoard(colors) {
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

  roundedRect(BOARD_MARGIN - 4, BOARD_MARGIN - 4, CELL_SIZE * 7 + 8, CELL_SIZE * 7 + 8, 7);
  ctx.fillStyle = colors.frame;
  ctx.fill();

  for (let y = 0; y < state.size; y++) {
    for (let x = 0; x < state.size; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? colors.cell : colors.cellAlt;
      ctx.fillRect(
        BOARD_MARGIN + x * CELL_SIZE,
        BOARD_MARGIN + y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
    }
  }

  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= state.size; i++) {
    const offset = BOARD_MARGIN + i * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(BOARD_MARGIN, offset);
    ctx.lineTo(BOARD_MARGIN + CELL_SIZE * state.size, offset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset, BOARD_MARGIN);
    ctx.lineTo(offset, BOARD_MARGIN + CELL_SIZE * state.size);
    ctx.stroke();
  }
}

function drawBlocked(colors) {
  for (const blocked of state.blocked) {
    const center = cellCenter(blocked);
    const size = CELL_SIZE - 22;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    roundedRect(center.x - size / 2, center.y - size / 2, size, size, 7);
    ctx.fillStyle = colors.wall;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = colors.wallEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = colors.wallLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center.x - 14, center.y - 14);
    ctx.lineTo(center.x + 14, center.y + 14);
    ctx.moveTo(center.x + 14, center.y - 14);
    ctx.lineTo(center.x - 14, center.y + 14);
    ctx.stroke();
    ctx.restore();
  }
}

function tracePath(path, color, dashed = false) {
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = dashed ? 2 : 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dashed ? [5, 7] : [2, 7]);
  ctx.beginPath();
  const first = cellCenter(path[0]);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < path.length; i++) {
    const point = cellCenter(path[i]);
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPaths(colors) {
  for (const echo of state.echoes) {
    tracePath(echo.path, darkMode.matches ? 'rgba(85,181,170,0.4)' : 'rgba(44,120,115,0.32)');
  }
  tracePath(state.currentPath, colors.path, true);
}

function drawSeals(colors, time) {
  for (const seal of state.seals) {
    const center = cellCenter(seal);
    const pulse = 1 + Math.sin(time / 320 + seal.x + seal.y) * 0.045;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = darkMode.matches ? 'rgba(225,184,63,0.45)' : 'rgba(120,75,20,0.25)';
    ctx.shadowBlur = 10;
    roundedRect(-20, -20, 40, 40, 7);
    ctx.fillStyle = colors.gold;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = colors.goldDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    roundedRect(-14, -14, 28, 28, 4);
    ctx.strokeStyle = 'rgba(255,250,220,0.62)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = colors.goldDark;
    ctx.font = '24px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('印', 0, 1);
    ctx.restore();
  }
}

function drawEchoAt(pos, colors, time, alpha = 1) {
  const center = cellCenter(pos);
  const float = Math.sin(time / 260 + pos.x) * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(center.x, center.y + float);
  ctx.shadowColor = colors.teal;
  ctx.shadowBlur = 14;
  ctx.fillStyle = colors.teal;
  ctx.beginPath();
  ctx.arc(0, -10, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-15, 18);
  ctx.quadraticCurveTo(-13, -1, 0, -2);
  ctx.quadraticCurveTo(13, -1, 15, 18);
  ctx.quadraticCurveTo(8, 14, 4, 19);
  ctx.quadraticCurveTo(0, 14, -4, 19);
  ctx.quadraticCurveTo(-9, 14, -15, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = darkMode.matches ? '#17312e' : '#f0e3c6';
  ctx.beginPath();
  ctx.arc(-4, -11, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -11, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerAt(pos, colors, time) {
  const center = cellCenter(pos);
  const pulse = 1 + Math.sin(time / 230) * 0.035;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = colors.red;
  ctx.shadowBlur = 13;
  ctx.fillStyle = colors.red;
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff1d4';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff1d4';
  ctx.font = '25px "Kaiti SC", "STKaiti", "KaiTi", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('行', 0, 1);
  ctx.restore();
}

function drawActors(colors, time, progress) {
  const previous = animation?.previous;
  let playerPosition = state.player;
  if (previous && progress < 1) {
    playerPosition = interpolatePosition(previous.player, state.player, progress);
  }

  state.echoes.forEach((echo, index) => {
    let echoPosition = echo.path[echo.index];
    let alpha = 0.78;
    const oldEcho = previous?.echoes[index];
    if (oldEcho && progress < 1) {
      echoPosition = interpolatePosition(
        oldEcho.path[oldEcho.index],
        echoPosition,
        progress,
      );
    } else if (!oldEcho && previous && progress < 1) {
      alpha = 0.78 * progress;
    }
    drawEchoAt(echoPosition, colors, time, alpha);
  });

  drawPlayerAt(playerPosition, colors, time);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = LOGICAL_SIZE * dpr;
  canvas.height = LOGICAL_SIZE * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render(time = 0) {
  let progress = 1;
  if (animation) {
    progress = Math.min(1, (time - animation.startedAt) / MOVE_DURATION);
  }

  const colors = palette();
  ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  drawBoard(colors);
  drawPaths(colors);
  drawBlocked(colors);
  drawSeals(colors, time);
  drawActors(colors, time, progress);

  if (animation && progress >= 1) {
    animation = null;
    finishTurn();
  }
  requestAnimationFrame(render);
}

function setStatus(message, alert = false) {
  statusText.textContent = message;
  statusBox.classList.toggle('is-alert', alert);
}

function updateUI() {
  levelEl.textContent = state.level;
  sealsEl.textContent = `${state.collected}/${state.totalSeals}`;
  echoesEl.textContent = state.echoes.length;
  bestEl.textContent = bestLevel;

  const remaining = stepsUntilEcho(state);
  countdownEl.textContent = `${remaining} 步`;
  const used = ECHO_LENGTH - remaining;
  [...echoTrack.children].forEach((tick, index) => {
    tick.classList.toggle('is-used', index < used);
  });
}

function bumpBoard() {
  boardFrame.classList.remove('is-bumping');
  void boardFrame.offsetWidth;
  boardFrame.classList.add('is-bumping');
}

function move(direction) {
  if (animation || state.status !== 'playing') return;
  const previous = state;
  const next = advanceGame(state, direction);

  if (next.events?.includes('blocked')) {
    state = next;
    setStatus('石柱挡路，此路不通', true);
    bumpBoard();
    return;
  }
  if (next === previous) return;

  state = next;
  animation = { previous, startedAt: performance.now() };
  updateUI();
}

function finishTurn() {
  if (state.status === 'lost') {
    setStatus('回声追上了你', true);
    window.setTimeout(() => showResult('lost'), 120);
    return;
  }
  if (state.status === 'won') {
    saveBestLevel(state.level + 1);
    updateUI();
    setStatus('四方印齐，旧影已破');
    window.setTimeout(() => showResult('won'), 120);
    return;
  }
  if (state.events.includes('echo')) {
    setStatus(`第 ${state.echoes.length} 道回声已经苏醒`, true);
  } else if (state.events.includes('seal')) {
    setStatus(`印章到手，还剩 ${state.seals.length} 枚`);
  } else {
    setStatus(`再走 ${stepsUntilEcho(state)} 步，回声成形`);
  }
}

function showResult(mode) {
  modalMode = mode;
  const won = mode === 'won';
  resultEmblem.classList.toggle('is-lost', !won);
  resultTitle.textContent = won ? '破影过关' : '旧影相逢';
  resultText.textContent = won
    ? `你用 ${state.moves} 步收齐 ${state.totalSeals} 枚印章。`
    : `坚持了 ${state.moves} 步，收集 ${state.collected} 枚印章。`;
  resultAction.textContent = won ? '下一关' : '再试一次';
  resultModal.classList.remove('hidden');
  resultAction.focus();
}

function hideResult() {
  resultModal.classList.add('hidden');
}

function startLevel(nextLevel, seed = Date.now()) {
  level = nextLevel;
  levelSeed = seed;
  state = createGameState(level, levelSeed);
  animation = null;
  hideResult();
  setStatus(level === 1 ? '寻找散落在四方的印章' : `第 ${level} 关，旧路渐窄`);
  updateUI();
  canvas.focus({ preventScroll: true });
}

document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('click', () => move(button.dataset.direction));
});

restartBtn.addEventListener('click', () => startLevel(level, levelSeed));

resultAction.addEventListener('click', () => {
  if (modalMode === 'won') startLevel(level + 1);
  else startLevel(level, levelSeed);
});

window.addEventListener('keydown', event => {
  const keys = {
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowDown: 'down', s: 'down', S: 'down',
    ArrowLeft: 'left', a: 'left', A: 'left',
  };
  const direction = keys[event.key];
  if (!direction) return;
  event.preventDefault();
  move(direction);
});

canvas.addEventListener('touchstart', event => {
  if (event.touches.length !== 1) return;
  event.preventDefault();
  touchStart = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
  };
}, { passive: false });

canvas.addEventListener('touchend', event => {
  if (!touchStart) return;
  event.preventDefault();
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? 'right' : 'left')
    : (dy > 0 ? 'down' : 'up'));
}, { passive: false });

darkMode.addEventListener('change', () => updateUI());
window.addEventListener('resize', resizeCanvas);

resizeCanvas();
updateUI();
requestAnimationFrame(render);
