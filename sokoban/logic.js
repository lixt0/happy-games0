// Sokoban — pure game logic, no DOM.
// Grid cell types: 0=floor, 1=wall, 2=target
// Entities tracked separately: player position and box positions.

const WALL = 1;
const FLOOR = 0;
const TARGET = 2;

export function parseLevel(mapLines) {
  const height = mapLines.length;
  let width = 0;
  for (const line of mapLines) {
    if (line.length > width) width = line.length;
  }

  const grid = Array.from({ length: height }, () => Array(width).fill(FLOOR));
  let player = null;
  const boxes = [];
  const targets = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < mapLines[y].length; x++) {
      const ch = mapLines[y][x];
      switch (ch) {
        case '#':
          grid[y][x] = WALL;
          break;
        case ' ':
          grid[y][x] = FLOOR;
          break;
        case '.':
          grid[y][x] = TARGET;
          targets.push({ x, y });
          break;
        case '$':
          grid[y][x] = FLOOR;
          boxes.push({ x, y });
          break;
        case '*':
          grid[y][x] = TARGET;
          targets.push({ x, y });
          boxes.push({ x, y });
          break;
        case '@':
          grid[y][x] = FLOOR;
          player = { x, y };
          break;
        case '+':
          grid[y][x] = TARGET;
          targets.push({ x, y });
          player = { x, y };
          break;
      }
    }
  }

  return {
    grid,
    width,
    height,
    player: { ...player },
    boxes: boxes.map(b => ({ ...b })),
    targets: targets.map(t => ({ ...t })),
  };
}

export function cloneState(state) {
  return {
    grid: state.grid,
    width: state.width,
    height: state.height,
    player: { ...state.player },
    boxes: state.boxes.map(b => ({ ...b })),
    targets: state.targets.map(t => ({ ...t })),
  };
}

function findBox(boxes, x, y) {
  return boxes.findIndex(b => b.x === x && b.y === y);
}

function isWall(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return true;
  return grid[y][x] === WALL;
}

const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function move(state, dir) {
  const d = DIRS[dir];
  if (!d) return { state, moved: false, pushed: false };

  const nx = state.player.x + d.dx;
  const ny = state.player.y + d.dy;

  if (isWall(state.grid, nx, ny)) {
    return { state, moved: false, pushed: false };
  }

  const boxIdx = findBox(state.boxes, nx, ny);
  if (boxIdx >= 0) {
    const bx = nx + d.dx;
    const by = ny + d.dy;
    if (isWall(state.grid, bx, by) || findBox(state.boxes, bx, by) >= 0) {
      return { state, moved: false, pushed: false };
    }
    const newState = cloneState(state);
    newState.player = { x: nx, y: ny };
    newState.boxes[boxIdx] = { x: bx, y: by };
    return { state: newState, moved: true, pushed: true };
  }

  const newState = cloneState(state);
  newState.player = { x: nx, y: ny };
  return { state: newState, moved: true, pushed: false };
}

export function isSolved(state) {
  for (const t of state.targets) {
    if (findBox(state.boxes, t.x, t.y) < 0) return false;
  }
  return true;
}

export function isDeadlock(state) {
  for (const box of state.boxes) {
    if (isOnTarget(state, box.x, box.y)) continue;
    const wallUp = isWall(state.grid, box.x, box.y - 1);
    const wallDown = isWall(state.grid, box.x, box.y + 1);
    const wallLeft = isWall(state.grid, box.x - 1, box.y);
    const wallRight = isWall(state.grid, box.x + 1, box.y);
    if ((wallUp || wallDown) && (wallLeft || wallRight)) return true;
  }
  return false;
}

function isOnTarget(state, x, y) {
  return state.targets.some(t => t.x === x && t.y === y);
}

export function boxOnTarget(state, x, y) {
  return isOnTarget(state, x, y);
}
