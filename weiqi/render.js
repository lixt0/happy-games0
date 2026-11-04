// 围棋棋盘渲染：纯函数，无状态、无 DOM、不依赖引擎。
// 交点坐标：i 为行（从上 0），j 为列（从左 0），均在 0..size-1。

export function metrics(size, canvasSize) {
  // 留出边距：边距 = 间距的一半，使最外圈交点不贴边
  const step = (canvasSize - canvasSize / size) / (size - 1);
  const span = step * (size - 1);
  const ox = (canvasSize - span) / 2;
  const oy = ox;
  const stoneR = step * 0.46;
  return { ox, oy, step, stoneR };
}

export function cellToPixel(i, j, m) {
  return { x: m.ox + j * m.step, y: m.oy + i * m.step };
}

export function pixelToCell(px, py, m, size) {
  const j = Math.round((px - m.ox) / m.step);
  const i = Math.round((py - m.oy) / m.step);
  if (i < 0 || i >= size || j < 0 || j >= size) return null;
  // 容忍半个交点内
  const dx = Math.abs(px - (m.ox + j * m.step));
  const dy = Math.abs(py - (m.oy + i * m.step));
  if (dx > m.step / 2 || dy > m.step / 2) return null;
  return [i, j];
}

export function drawBoard(ctx, m, size) {
  const { ox, oy, step } = m;
  const span = step * (size - 1);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + i * step);
    ctx.lineTo(ox + span, oy + i * step);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + i * step, oy);
    ctx.lineTo(ox + i * step, oy + span);
    ctx.stroke();
  }
  ctx.lineWidth = 1.6;
  ctx.strokeRect(ox, oy, span, span);
  // 星位
  const stars = size === 9 ? [[2,2],[2,6],[6,2],[6,6],[4,4]] : [[3,3],[3,9],[9,3],[9,9],[6,6]];
  ctx.fillStyle = '#3a2a1a';
  for (const [i, j] of stars) {
    const { x, y } = cellToPixel(i, j, m);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 2 * Math.PI); ctx.fill();
  }
}

export function drawStones(ctx, board, m, size, lastMove) {
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const v = board[i][j];
      if (!v) continue;
      const { x, y } = cellToPixel(i, j, m);
      ctx.beginPath(); ctx.arc(x, y, m.stoneR, 0, 2 * Math.PI);
      ctx.fillStyle = v === 1 ? '#111' : '#f5f1e6';
      ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = v === 1 ? '#000' : '#9a8e72';
      ctx.stroke();
    }
  }
  if (lastMove) {
    const { x, y } = cellToPixel(lastMove[0], lastMove[1], m);
    ctx.beginPath(); ctx.arc(x, y, m.stoneR * 0.32, 0, 2 * Math.PI);
    ctx.fillStyle = lastMove[0] === 0 ? '#f5f1e6' : '#111'; // 标在最近一子的色块上
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#c0392b';
    ctx.stroke();
  }
}
