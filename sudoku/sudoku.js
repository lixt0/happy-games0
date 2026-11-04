import {
  SIZE,
  EMPTY,
  createEmptyBoard,
  generatePuzzle,
  solve,
  isValidPlacement,
} from '/sudoku/logic.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const newGameBtn = document.getElementById('new-game');
const difficultyButtons = document.querySelectorAll('.diff-btn');
const numberButtons = document.querySelectorAll('.num-btn');
const winModal = document.getElementById('win-modal');
const winTimeEl = document.getElementById('win-time');
const winNewBtn = document.getElementById('win-new');

const state = {
  puzzle: null,      // initial givens, 0 = empty
  current: null,     // current player state
  solution: null,    // the unique solution
  selected: null,    // {row, col} or null
  difficulty: 'medium',
  startTime: 0,
  elapsed: 0,
  timerInterval: null,
  paused: false,
  won: false,
  generating: false,
};

function init() {
  buildBoard();
  setupEvents();
  startNewGame('medium');
}

function buildBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.setAttribute('role', 'gridcell');
      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }
}

function setupEvents() {
  newGameBtn.addEventListener('click', () => startNewGame(state.difficulty));
  winNewBtn.addEventListener('click', () => {
    hideWinModal();
    startNewGame(state.difficulty);
  });
  difficultyButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const diff = btn.dataset.difficulty;
      if (diff === state.difficulty) return;
      if (state.startTime > 0 && !state.won) {
        if (!window.confirm('放弃当前对局？')) return;
      }
      setDifficulty(diff);
      startNewGame(diff);
    });
  });
  numberButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.num, 10);
      onNumberInput(num);
    });
  });
  // Keyboard
  window.addEventListener('keydown', onKeyDown);
}

function setDifficulty(diff) {
  state.difficulty = diff;
  difficultyButtons.forEach((btn) => {
    const active = btn.dataset.difficulty === diff;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', String(active));
  });
}

function startNewGame(difficulty) {
  state.won = false;
  state.selected = null;
  stopTimer();
  setStatus('生成谜题中...');
  state.generating = true;
  // Defer to next tick so the UI can repaint.
  setTimeout(() => {
    const { puzzle, solution } = generatePuzzle(difficulty);
    state.puzzle = puzzle;
    state.solution = solution;
    state.current = puzzle.map(row => row.slice());
    state.generating = false;
    state.startTime = Date.now();
    state.elapsed = 0;
    startTimer();
    setStatus('点格子填数字');
    render();
  }, 50);
}

function render() {
  const cells = boardEl.children;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = cells[r * SIZE + c];
      const v = state.current[r][c];
      const isGiven = state.puzzle[r][c] !== EMPTY;
      const isSelected = state.selected && state.selected.row === r && state.selected.col === c;
      const isSameNumber = state.selected && v !== EMPTY && !isGiven
        && state.current[state.selected.row][state.selected.col] === v;
      const isHighlighted = state.selected
        && !isSelected
        && (state.selected.row === r || state.selected.col === c
            || (Math.floor(state.selected.row / 3) === Math.floor(r / 3)
                && Math.floor(state.selected.col / 3) === Math.floor(c / 3)));
      const isError = isSelected
        ? v !== EMPTY && !isValidPlacement(state.current, r, c, v)
        : false;

      cell.className = 'cell';
      if (isGiven) cell.classList.add('given');
      if (isSelected) cell.classList.add('selected');
      else if (isSameNumber) cell.classList.add('same-number');
      else if (isHighlighted) cell.classList.add('highlighted');
      if (isError) cell.classList.add('error');

      cell.textContent = v === EMPTY ? '' : String(v);
    }
  }
}

function onCellClick(r, c) {
  if (state.generating || state.won) return;
  state.selected = { row: r, col: c };
  render();
}

function onNumberInput(num) {
  if (state.generating || state.won) return;
  if (!state.selected) return;
  const { row, col } = state.selected;
  if (state.puzzle[row][col] !== EMPTY) return; // can't overwrite givens

  if (num === 0) {
    state.current[row][col] = EMPTY;
  } else {
    state.current[row][col] = num;
  }
  render();
  checkWin();
}

function onKeyDown(e) {
  if (state.generating) return;
  if (e.key >= '1' && e.key <= '9') {
    onNumberInput(parseInt(e.key, 10));
    e.preventDefault();
    return;
  }
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    onNumberInput(0);
    e.preventDefault();
    return;
  }
  // Arrow keys to move selection
  if (!state.selected) {
    if (e.key.startsWith('Arrow')) {
      state.selected = { row: 0, col: 0 };
      render();
      e.preventDefault();
    }
    return;
  }
  let { row, col } = state.selected;
  switch (e.key) {
    case 'ArrowUp': row = Math.max(0, row - 1); break;
    case 'ArrowDown': row = Math.min(8, row + 1); break;
    case 'ArrowLeft': col = Math.max(0, col - 1); break;
    case 'ArrowRight': col = Math.min(8, col + 1); break;
    default: return;
  }
  state.selected = { row, col };
  render();
  e.preventDefault();
}

function checkWin() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.current[r][c] === EMPTY) return;
      if (state.current[r][c] !== state.solution[r][c]) return;
    }
  }
  // Win!
  state.won = true;
  stopTimer();
  winTimeEl.textContent = formatTime(state.elapsed);
  showWinModal();
}

function startTimer() {
  state.timerInterval = setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    timerEl.textContent = formatTime(state.elapsed);
  }, 1000);
}
function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function setStatus(text) { statusEl.textContent = text; }
function showWinModal() { winModal.classList.remove('hidden'); }
function hideWinModal() { winModal.classList.add('hidden'); }

init();
