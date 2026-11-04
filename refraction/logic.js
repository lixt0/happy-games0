export const SIZE = 8;

const VECTORS = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
const SLASH = { up: 'right', right: 'up', down: 'left', left: 'down' };
const BACK = { up: 'left', left: 'up', down: 'right', right: 'down' };
const TURN_RIGHT = { up: 'right', right: 'down', down: 'left', left: 'up' };
const key = ({ r, c }) => `${r},${c}`;

// Each solution corresponds to the final slash/back orientation of pieces in order.
export const LEVELS = [
  { name: '初见', source: { r: 7, c: 0, dir: 'up' }, targets: [{ r: 3, c: 5 }], pieces: [{ r: 3, c: 0, type: 'mirror', orientation: 1 }], solution: [0] },
  { name: '三重折光', source: { r: 7, c: 0, dir: 'up' }, targets: [{ r: 5, c: 0 }, { r: 3, c: 5 }, { r: 1, c: 5 }], pieces: [{ r: 3, c: 0, type: 'mirror', orientation: 1 }, { r: 3, c: 5, type: 'mirror', orientation: 1 }], solution: [0, 0] },
  { name: '逆行', source: { r: 7, c: 7, dir: 'left' }, targets: [{ r: 7, c: 5 }, { r: 3, c: 3 }, { r: 3, c: 0 }], pieces: [{ r: 7, c: 3, type: 'mirror', orientation: 0 }, { r: 3, c: 3, type: 'mirror', orientation: 0 }], solution: [1, 1] },
  { name: '折返', source: { r: 7, c: 0, dir: 'up' }, targets: [{ r: 5, c: 0 }, { r: 5, c: 4 }, { r: 1, c: 4 }], pieces: [{ r: 5, c: 0, type: 'mirror', orientation: 1 }, { r: 5, c: 4, type: 'mirror', orientation: 1 }], solution: [0, 0] },
  { name: '回廊', source: { r: 0, c: 0, dir: 'down' }, targets: [{ r: 4, c: 0 }, { r: 4, c: 5 }, { r: 1, c: 5 }, { r: 1, c: 1 }], pieces: [{ r: 4, c: 0, type: 'mirror', orientation: 0 }, { r: 4, c: 5, type: 'mirror', orientation: 1 }, { r: 1, c: 5, type: 'mirror', orientation: 0 }], solution: [1, 0, 1] },
  { name: '定向', source: { r: 7, c: 0, dir: 'up' }, targets: [{ r: 5, c: 0 }, { r: 5, c: 3 }, { r: 2, c: 3 }, { r: 2, c: 0 }], pieces: [{ r: 5, c: 0, type: 'mirror', orientation: 1 }, { r: 5, c: 3, type: 'mirror', orientation: 0, locked: true }, { r: 2, c: 3, type: 'mirror', orientation: 0 }], solution: [0, 0, 1] },
  { name: '四方', source: { r: 7, c: 7, dir: 'left' }, targets: [{ r: 7, c: 5 }, { r: 5, c: 2 }, { r: 5, c: 6 }, { r: 7, c: 6 }], pieces: [{ r: 7, c: 2, type: 'mirror', orientation: 0 }, { r: 5, c: 2, type: 'mirror', orientation: 1 }, { r: 5, c: 6, type: 'mirror', orientation: 0 }], solution: [1, 0, 1] },
  { name: '分光', source: { r: 7, c: 3, dir: 'up' }, targets: [{ r: 3, c: 3 }, { r: 3, c: 7 }, { r: 0, c: 3 }], pieces: [{ r: 3, c: 3, type: 'splitter' }, { r: 3, c: 7, type: 'mirror', orientation: 1 }], solution: [0, 0] },
  { name: '双线', source: { r: 7, c: 0, dir: 'up' }, targets: [{ r: 5, c: 0 }, { r: 5, c: 3 }, { r: 2, c: 3 }, { r: 2, c: 6 }], pieces: [{ r: 5, c: 0, type: 'mirror', orientation: 1 }, { r: 5, c: 3, type: 'mirror', orientation: 0 }, { r: 2, c: 3, type: 'mirror', orientation: 1 }], solution: [0, 0, 0] },
  { name: '环形', source: { r: 7, c: 7, dir: 'left' }, targets: [{ r: 7, c: 5 }, { r: 5, c: 2 }, { r: 5, c: 5 }, { r: 2, c: 6 }], pieces: [{ r: 7, c: 2, type: 'mirror', orientation: 0 }, { r: 5, c: 2, type: 'mirror', orientation: 1 }, { r: 5, c: 6, type: 'mirror', orientation: 1 }], solution: [1, 0, 0] },
  { name: '交错', source: { r: 0, c: 7, dir: 'down' }, targets: [{ r: 3, c: 7 }, { r: 3, c: 3 }, { r: 6, c: 3 }, { r: 6, c: 0 }], pieces: [{ r: 3, c: 7, type: 'mirror', orientation: 1 }, { r: 3, c: 3, type: 'mirror', orientation: 1 }, { r: 6, c: 3, type: 'mirror', orientation: 1 }], solution: [0, 0, 0] },
  { name: '终局折射', source: { r: 7, c: 0, dir: 'up' }, targets: [{ r: 5, c: 0 }, { r: 5, c: 3 }, { r: 2, c: 3 }, { r: 2, c: 6 }, { r: 0, c: 6 }], pieces: [{ r: 5, c: 0, type: 'mirror', orientation: 1 }, { r: 5, c: 3, type: 'mirror', orientation: 1 }, { r: 2, c: 3, type: 'mirror', orientation: 1 }, { r: 2, c: 6, type: 'mirror', orientation: 0 }], solution: [0, 0, 0, 0] },
];

export function createState(levelIndex = 0) {
  const level = LEVELS[levelIndex];
  return { levelIndex, moves: 0, pieces: structuredClone(level.pieces), completed: false };
}

export function rotatePiece(state, pieceIndex) {
  const piece = state.pieces[pieceIndex];
  if (!piece || piece.locked || piece.type !== 'mirror') return state;
  const next = structuredClone(state);
  next.pieces[pieceIndex].orientation = next.pieces[pieceIndex].orientation ? 0 : 1;
  next.moves += 1;
  next.completed = isSolved(next);
  return next;
}

export function traceBeam(state) {
  const level = LEVELS[state.levelIndex];
  const pieces = new Map(state.pieces.map(piece => [key(piece), piece]));
  const targetKeys = new Set(level.targets.map(key));
  const hits = new Set();
  const segments = [];
  const rays = [{ ...level.source }];
  const visited = new Set();
  while (rays.length) {
    const ray = rays.pop();
    const [dr, dc] = VECTORS[ray.dir];
    const next = { r: ray.r + dr, c: ray.c + dc };
    if (next.r < 0 || next.r >= SIZE || next.c < 0 || next.c >= SIZE) continue;
    const stateKey = `${next.r},${next.c},${ray.dir}`;
    if (visited.has(stateKey)) continue;
    visited.add(stateKey);
    segments.push({ from: { r: ray.r, c: ray.c }, to: next });
    if (targetKeys.has(key(next))) hits.add(key(next));
    const piece = pieces.get(key(next));
    if (!piece) { rays.push({ ...next, dir: ray.dir }); continue; }
    if (piece.type === 'block') continue;
    if (piece.type === 'splitter') {
      rays.push({ ...next, dir: ray.dir }, { ...next, dir: TURN_RIGHT[ray.dir] });
      continue;
    }
    rays.push({ ...next, dir: piece.orientation === 0 ? SLASH[ray.dir] : BACK[ray.dir] });
  }
  return { segments, hits, targetCount: targetKeys.size };
}

export function isSolved(state) {
  const trace = traceBeam(state);
  return trace.hits.size === trace.targetCount;
}

export function solveState(levelIndex) {
  const state = createState(levelIndex);
  LEVELS[levelIndex].solution.forEach((orientation, index) => { if (state.pieces[index].type === 'mirror') state.pieces[index].orientation = orientation; });
  state.completed = isSolved(state);
  return state;
}
