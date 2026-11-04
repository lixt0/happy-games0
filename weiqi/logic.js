// 围棋状态/同步纯函数。无引擎、无 DOM。
export const EMPTY = 0, BLACK = 1, WHITE = 2;

export function emptyBoard(size) {
  return Array.from({ length: size }, () => new Array(size).fill(EMPTY));
}

export function syncBoard(getCell, size) {
  const b = emptyBoard(size);
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++)
      b[i][j] = getCell(i, j);
  return b;
}
