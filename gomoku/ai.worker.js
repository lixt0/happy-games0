import { bestMove, DIFFICULTY, BLACK, WHITE, SIZE } from '/gomoku/ai.js';

self.onmessage = (e) => {
  const { board, color, difficulty, requestId } = e.data;
  const config = DIFFICULTY[difficulty] ?? DIFFICULTY.medium;
  try {
    const move = bestMove(board, color, config);
    self.postMessage({ ok: true, move, requestId });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err), requestId });
  }
};