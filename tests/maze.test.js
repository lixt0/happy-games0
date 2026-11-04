import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateMaze,
  canMove,
  movePlayer,
  isSolved,
  solveMaze,
} from '../maze/logic.js';

test('generateMaze: returns grid with correct dimensions', () => {
  const maze = generateMaze(5, 5);
  assert.equal(maze.length, 5);
  assert.equal(maze[0].length, 5);
});

test('generateMaze: all cells visited', () => {
  const maze = generateMaze(8, 8);
  for (const row of maze) {
    for (const cell of row) {
      assert.equal(cell.visited, true);
    }
  }
});

test('generateMaze: deterministic with same seed', () => {
  const maze1 = generateMaze(5, 5, 12345);
  const maze2 = generateMaze(5, 5, 12345);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      assert.deepEqual(maze1[y][x], maze2[y][x]);
    }
  }
});

test('generateMaze: different seeds produce different mazes', () => {
  const maze1 = generateMaze(5, 5, 12345);
  const maze2 = generateMaze(5, 5, 54321);
  let different = false;
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      if (JSON.stringify(maze1[y][x]) !== JSON.stringify(maze2[y][x])) {
        different = true;
        break;
      }
    }
    if (different) break;
  }
  assert.ok(different);
});

test('canMove: returns true when no wall', () => {
  const cell = { top: false, right: true, bottom: true, left: true };
  assert.equal(canMove(cell, 'top'), true);
  assert.equal(canMove(cell, 'right'), false);
});

test('movePlayer: moves in correct direction', () => {
  const grid = [
    [{ top: true, right: false, bottom: false, left: true }],
    [{ top: false, right: true, bottom: true, left: true }],
  ];

  const result = movePlayer({ x: 0, y: 0 }, 'bottom', grid);
  assert.deepEqual(result, { x: 0, y: 1 });
});

test('movePlayer: returns null when blocked by wall', () => {
  const grid = [
    [{ top: true, right: true, bottom: true, left: true }],
  ];

  const result = movePlayer({ x: 0, y: 0 }, 'top', grid);
  assert.equal(result, null);
});

test('isSolved: returns true at end position', () => {
  assert.equal(isSolved({ x: 4, y: 4 }, 5, 5), true);
  assert.equal(isSolved({ x: 3, y: 4 }, 5, 5), false);
});

test('solveMaze: finds path from start to end', () => {
  const maze = generateMaze(5, 5, 12345);
  const path = solveMaze(maze, 5, 5);
  assert.ok(path.length > 0);
  assert.equal(path[path.length - 1].x, 4);
  assert.equal(path[path.length - 1].y, 4);
});

test('solveMaze: path only uses valid moves', () => {
  const maze = generateMaze(8, 8, 99999);
  const path = solveMaze(maze, 8, 8);

  let pos = { x: 0, y: 0 };
  for (const next of path) {
    const dx = next.x - pos.x;
    const dy = next.y - pos.y;

    let dir = null;
    if (dx === 1) dir = 'right';
    else if (dx === -1) dir = 'left';
    else if (dy === 1) dir = 'bottom';
    else if (dy === -1) dir = 'top';

    assert.ok(dir, `Invalid move from ${pos.x},${pos.y} to ${next.x},${next.y}`);
    assert.equal(canMove(maze[pos.y][pos.x], dir), true);

    pos = next;
  }
});

test('generateMaze: every maze is solvable', () => {
  for (let i = 0; i < 10; i++) {
    const maze = generateMaze(10, 10, i);
    const path = solveMaze(maze, 10, 10);
    assert.ok(path.length > 0, `Maze with seed ${i} is not solvable`);
  }
});

test('generateMaze: larger mazes work correctly', () => {
  const maze = generateMaze(20, 20, 77777);
  assert.equal(maze.length, 20);
  assert.equal(maze[0].length, 20);
  const path = solveMaze(maze, 20, 20);
  assert.ok(path.length > 0);
});
