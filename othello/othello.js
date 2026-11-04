import { BLACK, WHITE, DIFFICULTY, applyMove, chooseAiMove, countPieces, createBoard, isGameOver, legalMoves, winner } from './logic.js';

const $ = id => document.getElementById(id);
let board = createBoard();
let turn = BLACK;
let difficulty = 'medium';
let history = [];
let aiThinking = false;
let message = '';

function render() {
  const moves = turn === BLACK && !aiThinking ? legalMoves(board, BLACK) : [];
  const moveKeys = new Set(moves.map(move => `${move.x},${move.y}`));
  $('board').innerHTML = board.map((row, y) => row.map((piece, x) => {
    const isMove = moveKeys.has(`${x},${y}`);
    const label = piece === BLACK ? '黑棋' : piece === WHITE ? '白棋' : isMove ? '可落子' : '空位';
    return `<button class="ot-cell${isMove ? ' legal' : ''}" data-x="${x}" data-y="${y}" type="button" role="gridcell" aria-label="${x + 1}, ${y + 1} ${label}"${isMove ? '' : ' disabled'}>${piece ? `<span class="ot-disc ${piece === BLACK ? 'black' : 'white'}"></span>` : '<span class="ot-move-dot"></span>'}</button>`;
  }).join('')).join('');
  const score = countPieces(board);
  $('black-score').textContent = score.black;
  $('white-score').textContent = score.white;
  $('undo-button').disabled = !history.length || aiThinking;
  $('status').textContent = message || (turn === BLACK ? '轮到你落子' : 'AI 正在思考');
}

function finishIfNeeded() {
  if (!isGameOver(board)) return false;
  const result = winner(board);
  message = result === BLACK ? '你获胜了' : result === WHITE ? 'AI 获胜' : '平局';
  turn = 0;
  render();
  return true;
}

function advanceTurn() {
  if (finishIfNeeded()) return;
  const moves = legalMoves(board, turn);
  if (!moves.length) {
    const skipped = turn;
    turn = turn === BLACK ? WHITE : BLACK;
    message = skipped === BLACK ? '你无棋可下，AI 接手' : 'AI 无棋可下，轮到你';
    render();
  } else {
    message = '';
  }
  if (turn === WHITE) runAi();
  else render();
}

function runAi() {
  aiThinking = true;
  render();
  window.setTimeout(() => {
    const move = chooseAiMove(board, WHITE, DIFFICULTY[difficulty]);
    aiThinking = false;
    if (move) board = applyMove(board, move.x, move.y, WHITE);
    turn = BLACK;
    advanceTurn();
  }, 360);
}

function playerMove(x, y) {
  if (turn !== BLACK || aiThinking || !legalMoves(board, BLACK).some(move => move.x === x && move.y === y)) return;
  history.push({ board: board.map(row => row.slice()), turn: BLACK });
  board = applyMove(board, x, y, BLACK);
  turn = WHITE;
  advanceTurn();
}

function restart() {
  board = createBoard(); turn = BLACK; history = []; aiThinking = false; message = '';
  render();
}

$('board').addEventListener('click', event => {
  const cell = event.target.closest('.ot-cell');
  if (cell) playerMove(Number(cell.dataset.x), Number(cell.dataset.y));
});
$('restart-button').onclick = restart;
$('undo-button').onclick = () => {
  if (!history.length || aiThinking) return;
  const last = history.pop();
  board = last.board; turn = last.turn; message = '';
  render();
};
document.querySelectorAll('[data-difficulty]').forEach(button => {
  button.onclick = () => {
    difficulty = button.dataset.difficulty;
    document.querySelectorAll('[data-difficulty]').forEach(item => item.classList.toggle('active', item === button));
    restart();
  };
});
const closeRules = () => $('rules-modal').classList.add('hidden');
$('rules-button').onclick = () => $('rules-modal').classList.remove('hidden');
$('close-rules').onclick = closeRules;
document.querySelector('[data-close-rules]').onclick = closeRules;
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeRules(); });

render();
