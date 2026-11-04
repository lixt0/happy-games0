import {
  BLUE, RED, COLS, ROWS, DENS, TRAPS, TYPES,
  allLegalMoves, animalName, applyMove, cloneBoard, countPieces,
  initialBoard, isDen, isWater, legalMoves, otherSide,
  pieceSide, pieceType, positionKey, sameSquare, trapOwner, winner,
} from './logic.js';
import { difficultyDepth, searchMove } from './engine.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const turnEl = document.getElementById('turn');
const roundEl = document.getElementById('round');
const capturedEl = document.getElementById('captured');
const statusEl = document.getElementById('status');
const aiNoteEl = document.getElementById('ai-note');
const undoBtn = document.getElementById('undo');
const resetBtn = document.getElementById('reset');
const difficultyBtns = [...document.querySelectorAll('[data-difficulty]')];
const winModal = document.getElementById('win-modal');
const winTitle = document.getElementById('win-title');
const winText = document.getElementById('win-text');
const winNewBtn = document.getElementById('win-new');

// Retina/高分屏：backing store 按 dpr 放大，绘制仍用逻辑坐标
const DPR = window.devicePixelRatio || 1;
const W = 504, H = 648;
canvas.width = W * DPR;
canvas.height = H * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
const CELL = W / COLS;
const SIDE_LABEL = { [RED]: '红', [BLUE]: '蓝' };
const ANIMAL_ICONS = Object.freeze({
  R: '🐭',
  C: '🐱',
  D: '🐶',
  W: '🐺',
  P: '🐆',
  T: '🐯',
  L: '🦁',
  E: '🐘',
});

let board;
let selected;
let highlights;
let lastMove;
let turn;
let round;
let difficulty = 'medium';
let history;
let repetitions;
let thinking;
let gameOver;
let generation = 0;

resetGame();

canvas.addEventListener('pointerup', event => {
  if (thinking || gameOver || turn !== RED) return;
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((event.clientX - rect.left) / rect.width * COLS);
  const row = Math.floor((event.clientY - rect.top) / rect.height * ROWS);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
  handleSquare(row, col);
});

resetBtn.addEventListener('click', resetGame);
undoBtn.addEventListener('click', undoMove);
winNewBtn.addEventListener('click', resetGame);
winModal.querySelector('.modal-backdrop').addEventListener('click', () => winModal.classList.add('hidden'));

difficultyBtns.forEach(button => {
  button.addEventListener('click', () => {
    difficulty = button.dataset.difficulty;
    difficultyBtns.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-checked', String(active));
    });
    resetGame();
  });
});

function resetGame() {
  generation++;
  board = initialBoard();
  selected = null;
  highlights = [];
  lastMove = null;
  turn = RED;
  round = 1;
  history = [];
  repetitions = new Map([[positionKey(board, turn), 1]]);
  thinking = false;
  gameOver = false;
  undoBtn.disabled = true;
  aiNoteEl.textContent = '你执红方，电脑执蓝方';
  winModal.classList.add('hidden');
  setStatus('轮到你了，请选择红方棋子');
  render();
  updateStats();
}

function snapshot() {
  return {
    board: cloneBoard(board),
    turn,
    round,
    lastMove: lastMove ? { ...lastMove, from: [...lastMove.from], to: [...lastMove.to] } : null,
    repetitions: new Map(repetitions),
  };
}

function restore(state) {
  board = cloneBoard(state.board);
  turn = state.turn;
  round = state.round;
  lastMove = state.lastMove;
  repetitions = new Map(state.repetitions);
  selected = null;
  highlights = [];
  thinking = false;
  gameOver = false;
  winModal.classList.add('hidden');
  aiNoteEl.textContent = '已退回你上次走子前';
  setStatus('轮到你了，请选择红方棋子');
  undoBtn.disabled = history.length === 0;
  render();
  updateStats();
}

function undoMove() {
  if (thinking || history.length === 0) return;
  generation++;
  let state = history.pop();
  if (state.turn === BLUE && history.length > 0) state = history.pop();
  restore(state);
}

function handleSquare(row, col) {
  const targetMove = highlights.find(move => sameSquare(move.to, [row, col]));
  if (selected && targetMove) {
    history.push(snapshot());
    makeGameMove(targetMove, RED);
    return;
  }

  if (pieceSide(board[row][col]) === RED) {
    selected = [row, col];
    highlights = legalMoves(board, row, col);
    const name = animalName(board[row][col]);
    setStatus(highlights.length ? `已选择${name}，请选择落点` : `${name}当前无路可走`);
  } else {
    selected = null;
    highlights = [];
    setStatus('轮到你了，请选择红方棋子');
  }
  render();
}

function makeGameMove(move, movedSide) {
  const movingPiece = board[move.from[0]][move.from[1]];
  const capturedPiece = move.capture;
  board = applyMove(board, move);
  lastMove = move;
  selected = null;
  highlights = [];
  if (movedSide === BLUE) round++;
  turn = otherSide(movedSide);

  const key = positionKey(board, turn);
  repetitions.set(key, (repetitions.get(key) || 0) + 1);
  render();
  updateStats();

  const victor = winner(board, turn);
  if (victor) {
    const reason = isDen(move.to[0], move.to[1], otherSide(movedSide))
      ? '成功进入对方兽穴'
      : countPieces(board, turn) === 0
        ? '吃光了对方全部棋子'
        : '对方已无合法走法';
    finishGame(victor, reason);
    return;
  }
  if (repetitions.get(key) >= 3) {
    finishDraw('同一局面重复三次');
    return;
  }

  if (movedSide === BLUE) {
    const captureText = capturedPiece ? `，吃掉红方${animalName(capturedPiece)}` : '';
    aiNoteEl.textContent = `电脑：${animalName(movingPiece)} ${squareName(move.from)}→${squareName(move.to)}${captureText}`;
    undoBtn.disabled = false;
    setStatus('轮到你了，请选择红方棋子');
  } else {
    aiNoteEl.textContent = capturedPiece ? `你吃掉了蓝方${animalName(capturedPiece)}` : '电脑正在计算走法';
    scheduleAiMove();
  }
}

function scheduleAiMove() {
  thinking = true;
  undoBtn.disabled = true;
  setStatus('电脑思考中…', 'thinking');
  const token = ++generation;
  setTimeout(() => {
    if (token !== generation || gameOver || turn !== BLUE) return;
    let move = null;
    try {
      move = searchMove(board, BLUE, difficultyDepth(difficulty));
    } catch (error) {
      console.error('Dou Shou Qi AI error', error);
    }
    if (!move) move = allLegalMoves(board, BLUE)[0] || null;
    thinking = false;
    if (!move) {
      finishGame(RED, '电脑已无合法走法');
      return;
    }
    history.push(snapshot());
    makeGameMove(move, BLUE);
  }, 90);
}

function finishGame(victor, reason) {
  gameOver = true;
  thinking = false;
  undoBtn.disabled = history.length === 0;
  const playerWon = victor === RED;
  setStatus(playerWon ? '红方获胜' : '蓝方获胜', playerWon ? 'win' : 'lose');
  winTitle.textContent = playerWon ? '你赢了' : '电脑获胜';
  winText.textContent = reason;
  winModal.classList.remove('hidden');
}

function finishDraw(reason) {
  gameOver = true;
  thinking = false;
  undoBtn.disabled = history.length === 0;
  setStatus('本局和棋');
  winTitle.textContent = '和棋';
  winText.textContent = reason;
  winModal.classList.remove('hidden');
}

function setStatus(text, className = '') {
  statusEl.textContent = text;
  statusEl.className = `status${className ? ` ${className}` : ''}`;
}

function updateStats() {
  turnEl.textContent = SIDE_LABEL[turn];
  roundEl.textContent = round;
  capturedEl.textContent = 8 - countPieces(board, BLUE);
}

function squareName([row, col]) {
  return `${'abcdefg'[col]}${9 - row}`;
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawTerrain();
  drawLastMove();
  drawHighlights();
  drawPieces();
}

function drawTerrain() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) drawCell(row, col);
  }
  ctx.strokeStyle = 'rgba(70, 53, 28, 0.42)';
  ctx.lineWidth = 1;
  for (let col = 0; col <= COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(col * CELL, 0);
    ctx.lineTo(col * CELL, H);
    ctx.stroke();
  }
  for (let row = 0; row <= ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * CELL);
    ctx.lineTo(W, row * CELL);
    ctx.stroke();
  }
}

function drawCell(row, col) {
  const x = col * CELL;
  const y = row * CELL;
  const water = isWater(row, col);
  const owner = trapOwner(row, col);
  const denOwner = isDen(row, col, BLUE) ? BLUE : isDen(row, col, RED) ? RED : null;

  ctx.fillStyle = water ? '#86b9bb' : (row + col) % 2 ? '#e6ca8b' : '#edd7a2';
  if (owner) ctx.fillStyle = owner === BLUE ? '#c8d7cd' : '#e1c4a8';
  if (denOwner) ctx.fillStyle = denOwner === BLUE ? '#4d7778' : '#9e5a4e';
  ctx.fillRect(x, y, CELL, CELL);

  if (water) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 2;
    for (let offset = 20; offset <= 52; offset += 16) {
      ctx.beginPath();
      ctx.moveTo(x + 12, y + offset);
      ctx.quadraticCurveTo(x + 24, y + offset - 6, x + 36, y + offset);
      ctx.quadraticCurveTo(x + 48, y + offset + 6, x + 60, y + offset);
      ctx.stroke();
    }
  }

  if (owner) {
    ctx.strokeStyle = owner === BLUE ? '#4f7776' : '#a56545';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 18);
    ctx.lineTo(x + CELL - 18, y + CELL - 18);
    ctx.moveTo(x + CELL - 18, y + 18);
    ctx.lineTo(x + 18, y + CELL - 18);
    ctx.stroke();
    drawTerrainText('陷', x + CELL / 2, y + CELL / 2, 'rgba(255,255,255,0.82)', 20);
  }

  if (denOwner) {
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + CELL / 2, y + CELL / 2, 24, 0, Math.PI * 2);
    ctx.stroke();
    drawTerrainText('穴', x + CELL / 2, y + CELL / 2 + 1, '#fffaf0', 25);
  }
}

function drawTerrainText(text, x, y, color, size) {
  ctx.fillStyle = color;
  ctx.font = `${size}px "Kaiti SC", "STKaiti", "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawLastMove() {
  if (!lastMove) return;
  for (const square of [lastMove.from, lastMove.to]) {
    const [row, col] = square;
    ctx.strokeStyle = 'rgba(255, 250, 220, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(col * CELL + 4, row * CELL + 4, CELL - 8, CELL - 8);
  }
}

function drawHighlights() {
  for (const move of highlights) {
    const [row, col] = move.to;
    const x = col * CELL + CELL / 2;
    const y = row * CELL + CELL / 2;
    ctx.beginPath();
    if (move.capture) {
      ctx.arc(x, y, 31, 0, Math.PI * 2);
      ctx.strokeStyle = '#f0b52f';
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(31, 75, 68, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawPieces() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const value = board[row][col];
      if (value) drawPiece(value, row, col);
    }
  }
}

function drawPiece(value, row, col) {
  const side = pieceSide(value);
  const type = pieceType(value);
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  const selectedHere = selected && selected[0] === row && selected[1] === col;

  ctx.save();
  ctx.shadowColor = 'rgba(31, 44, 41, 0.25)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fillStyle = side === RED ? '#fff0e2' : '#e5f1ee';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = selectedHere ? 5 : 2;
  ctx.strokeStyle = selectedHere ? '#f1c34b' : side === RED ? '#7d241b' : '#184449';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.strokeStyle = side === RED ? 'rgba(184,59,46,0.5)' : 'rgba(40,103,108,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '34px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ANIMAL_ICONS[type], x, y + 1);

  ctx.fillStyle = side === RED ? '#7d241b' : '#184449';
  ctx.beginPath();
  ctx.arc(x + 23, y + 22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(String(TYPES[type].rank), x + 23, y + 22.5);
  ctx.restore();
}
