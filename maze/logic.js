export function generateMaze(width, height, seed = Date.now()) {
  const rng = createRNG(seed);
  const grid = Array(height).fill(null).map(() =>
    Array(width).fill(null).map(() => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
      visited: false,
    }))
  );

  const stack = [];
  const start = { x: 0, y: 0 };
  grid[0][0].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(current, grid, width, height);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(rng() * neighbors.length)];
      removeWall(current, next, grid);
      grid[next.y][next.x].visited = true;
      stack.push(next);
    }
  }

  return grid;
}

function getUnvisitedNeighbors(cell, grid, width, height) {
  const { x, y } = cell;
  const neighbors = [];

  if (y > 0 && !grid[y - 1][x].visited) neighbors.push({ x, y: y - 1, dir: 'top' });
  if (x < width - 1 && !grid[y][x + 1].visited) neighbors.push({ x: x + 1, y, dir: 'right' });
  if (y < height - 1 && !grid[y + 1][x].visited) neighbors.push({ x, y: y + 1, dir: 'bottom' });
  if (x > 0 && !grid[y][x - 1].visited) neighbors.push({ x: x - 1, y, dir: 'left' });

  return neighbors;
}

function removeWall(current, next, grid) {
  const dx = next.x - current.x;
  const dy = next.y - current.y;

  if (dx === 1) {
    grid[current.y][current.x].right = false;
    grid[next.y][next.x].left = false;
  } else if (dx === -1) {
    grid[current.y][current.x].left = false;
    grid[next.y][next.x].right = false;
  } else if (dy === 1) {
    grid[current.y][current.x].bottom = false;
    grid[next.y][next.x].top = false;
  } else if (dy === -1) {
    grid[current.y][current.x].top = false;
    grid[next.y][next.x].bottom = false;
  }
}

export function canMove(cell, direction) {
  return !cell[direction];
}

export function movePlayer(pos, direction, grid) {
  const { x, y } = pos;
  const cell = grid[y][x];

  if (!canMove(cell, direction)) return null;

  switch (direction) {
    case 'top': return { x, y: y - 1 };
    case 'right': return { x: x + 1, y };
    case 'bottom': return { x, y: y + 1 };
    case 'left': return { x: x - 1, y };
    default: return null;
  }
}

export function isSolved(pos, width, height) {
  return pos.x === width - 1 && pos.y === height - 1;
}

export function solveMaze(grid, width, height) {
  const visited = new Set();
  const queue = [{ x: 0, y: 0, path: [] }];
  visited.add('0,0');

  while (queue.length > 0) {
    const { x, y, path } = queue.shift();

    if (x === width - 1 && y === height - 1) {
      return path;
    }

    const cell = grid[y][x];
    const moves = [
      { dir: 'top', dx: 0, dy: -1 },
      { dir: 'right', dx: 1, dy: 0 },
      { dir: 'bottom', dx: 0, dy: 1 },
      { dir: 'left', dx: -1, dy: 0 },
    ];

    for (const { dir, dx, dy } of moves) {
      if (!cell[dir]) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;

        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] });
        }
      }
    }
  }

  return [];
}

function createRNG(seed) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}
