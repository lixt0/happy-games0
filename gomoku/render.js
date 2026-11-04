import { SIZE, BLACK, WHITE, EMPTY } from '/gomoku/ai.js';

const PADDING_RATIO = 0.04;  // space around the grid
const STAR_POINTS = [
  [3, 3], [3, 11], [11, 3], [11, 11], [7, 7],
];

export function computeMetrics(size) {
  const padding = size * PADDING_RATIO;
  const gridSize = size - padding * 2;
  const cell = gridSize / (SIZE - 1);
  return { padding, cell, gridSize };
}

export function pixelToCell(metrics, px, py, size) {
  const x = Math.round((px - metrics.padding) / metrics.cell);
  const y = Math.round((py - metrics.padding) / metrics.cell);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return null;
  return { x, y };
}

export function render(ctx, state) {
  const { board, lastMove, hoverMove, size, animatedStones } = state;
  const dpr = window.devicePixelRatio || 1;
  const backingSize = Math.round(size * dpr);

  if (
    ctx.canvas.width !== backingSize ||
    ctx.canvas.height !== backingSize
  ) {
    ctx.canvas.width = backingSize;
    ctx.canvas.height = backingSize;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ctx.clearRect(0, 0, size, size);

  const m = computeMetrics(size);
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // 暗色下木色底变深,网格线改用主题 --muted,否则几乎不可见
  const lineColor = dark
    ? getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#a6b5b1'
    : '#6e5a40';

  // Grid lines
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < SIZE; i++) {
    const p = m.padding + i * m.cell;
    ctx.beginPath();
    ctx.moveTo(m.padding, p);
    ctx.lineTo(m.padding + m.gridSize, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p, m.padding);
    ctx.lineTo(p, m.padding + m.gridSize);
    ctx.stroke();
  }

  // Star points
  ctx.fillStyle = lineColor;
  for (const [sx, sy] of STAR_POINTS) {
    ctx.beginPath();
    ctx.arc(m.padding + sx * m.cell, m.padding + sy * m.cell, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stones
  const radius = m.cell * 0.44;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const color = board[y][x];
      if (color === EMPTY) continue;
      const cx = m.padding + x * m.cell;
      const cy = m.padding + y * m.cell;
      const animated = animatedStones && animatedStones.get(`${x},${y}`);
      const scale = animated ? animated.scale : 1;
      drawStone(ctx, cx, cy, radius * scale, color);
    }
  }

  // Hover preview
  if (hoverMove && board[hoverMove.y][hoverMove.x] === EMPTY) {
    const cx = m.padding + hoverMove.x * m.cell;
    const cy = m.padding + hoverMove.y * m.cell;
    ctx.globalAlpha = 0.35;
    drawStone(ctx, cx, cy, radius, dark ? WHITE : BLACK);
    ctx.globalAlpha = 1;
  }

  // Last-move marker
  if (lastMove && board[lastMove.y][lastMove.x] !== EMPTY) {
    const cx = m.padding + lastMove.x * m.cell;
    const cy = m.padding + lastMove.y * m.cell;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, radius * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStone(ctx, cx, cy, r, color) {
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  if (color === BLACK) {
    grad.addColorStop(0, '#555');
    grad.addColorStop(1, '#000');
  } else {
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#cfc7b3');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color === BLACK ? '#000' : '#999';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}