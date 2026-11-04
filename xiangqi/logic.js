// 中国象棋核心规则引擎
// 棋盘 10 行 × 9 列。row 0 = 黑方底线，row 9 = 红方底线。
// 棋子字符：红 K帅 A仕 B相 N马 R车 C炮 P兵  |  黑 k将 a士 b象 n马 r车 c炮 p卒
// 大写=红，小写=黑。null = 空。

export const ROWS = 10;
export const COLS = 9;
export const RED = 'r', BLACK = 'b';

export function initialBoard() {
  return [
    ['r','n','b','a','k','a','b','n','r'],
    [null,null,null,null,null,null,null,null,null],
    [null,'c',null,null,null,null,null,'c',null],
    ['p',null,'p',null,'p',null,'p',null,'p'],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    ['P',null,'P',null,'P',null,'P',null,'P'],
    [null,'C',null,null,null,null,null,'C',null],
    [null,null,null,null,null,null,null,null,null],
    ['R','N','B','A','K','A','B','N','R'],
  ];
}

export function cloneBoard(b) {
  return b.map(row => row.slice());
}

export function isRed(p) { return p && p === p.toUpperCase(); }
export function isBlack(p) { return p && p === p.toLowerCase(); }
export function sideOf(p) {
  if (!p) return null;
  return isRed(p) ? RED : BLACK;
}

function inBoard(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

function inPalace(r, c, side) {
  if (c < 3 || c > 5) return false;
  if (side === RED) return r >= 7 && r <= 9;
  return r >= 0 && r <= 2;
}

function onOwnHalf(r, side) {
  return side === RED ? r >= 5 : r <= 4;
}

// 基础走法（不考虑将军暴露），返回 [r,c] 列表
function pieceMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const side = sideOf(p);
  const up = side === RED ? -1 : 1; // 红向上(row减)，黑向下(row增)
  const out = [];
  const P = p.toLowerCase();

  const isEnemy = (rr, cc) => board[rr][cc] && sideOf(board[rr][cc]) !== side;
  const isEmpty = (rr, cc) => inBoard(rr, cc) && !board[rr][cc];
  const canLand = (rr, cc) => inBoard(rr, cc) && (!board[rr][cc] || sideOf(board[rr][cc]) !== side);

  switch (P) {
    case 'k': { // 帅/将
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dr, dc] of dirs) {
        const rr = r + dr, cc = c + dc;
        if (inPalace(rr, cc, side) && canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'a': { // 仕/士
      const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
      for (const [dr, dc] of dirs) {
        const rr = r + dr, cc = c + dc;
        if (inPalace(rr, cc, side) && canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'b': { // 相/象
      const dirs = [[2,2],[2,-2],[-2,2],[-2,-2]];
      for (const [dr, dc] of dirs) {
        const rr = r + dr, cc = c + dc;
        const mr = r + dr / 2, mc = c + dc / 2; // 塞象眼
        if (!onOwnHalf(rr, side)) continue; // 不能过河
        if (!inBoard(rr, cc)) continue;
        if (board[mr][mc]) continue; // 塞象眼
        if (canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'n': { // 马
      const moves = [
        [-2,-1, -1,0],[-2,1, -1,0], // 上，蹩腿在(-1,0)
        [2,-1, 1,0],[2,1, 1,0],     // 下
        [-1,-2, 0,-1],[1,-2, 0,-1],  // 左
        [-1,2, 0,1],[1,2, 0,1],      // 右
      ];
      for (const [dr, dc, br, bc] of moves) {
        const rr = r + dr, cc = c + dc;
        if (!inBoard(rr, cc)) continue;
        if (board[r + br][c + bc]) continue; // 蹩马腿
        if (canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'r': { // 车
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inBoard(rr, cc)) {
          if (!board[rr][cc]) { out.push([rr, cc]); }
          else { if (sideOf(board[rr][cc]) !== side) out.push([rr, cc]); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    }
    case 'c': { // 炮
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        // 平移（不吃子）
        while (inBoard(rr, cc) && !board[rr][cc]) { out.push([rr, cc]); rr += dr; cc += dc; }
        // 越过炮架找吃子
        if (inBoard(rr, cc)) {
          rr += dr; cc += dc;
          while (inBoard(rr, cc)) {
            if (board[rr][cc]) { if (sideOf(board[rr][cc]) !== side) out.push([rr, cc]); break; }
            rr += dr; cc += dc;
          }
        }
      }
      break;
    }
    case 'p': { // 兵 / 卒
      // 前进
      if (canLand(r + up, c)) out.push([r + up, c]);
      // 过河后可左右
      const crossed = side === RED ? r <= 4 : r >= 5;
      if (crossed) {
        if (canLand(r, c - 1)) out.push([r, c - 1]);
        if (canLand(r, c + 1)) out.push([r, c + 1]);
      }
      break;
    }
  }
  return out;
}

// 找到某方将帅位置
export function findKing(board, side) {
  const k = side === RED ? 'K' : 'k';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === k) return [r, c];
    }
  }
  return null;
}

// 某方是否被将军
export function isInCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return true; // 没有将视为被将
  const [kr, kc] = king;
  const enemy = side === RED ? BLACK : RED;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || sideOf(p) !== enemy) continue;
      const mv = pieceMoves(board, r, c);
      for (const [rr, cc] of mv) if (rr === kr && cc === kc) return true;
    }
  }
  // 将帅照面也算被将
  const ek = findKing(board, enemy);
  if (ek) {
    const [er, ec] = ek;
    if (ec === kc) {
      let blocked = false;
      const lo = Math.min(kr, er) + 1, hi = Math.max(kr, er);
      for (let rr = lo; rr < hi; rr++) if (board[rr][kc]) { blocked = true; break; }
      if (!blocked) return true;
    }
  }
  return false;
}

// 模拟走子后是否仍被将军（非法）
export function moveExposesKing(board, from, to, side) {
  const b = cloneBoard(board);
  b[to[0]][to[1]] = b[from[0]][from[1]];
  b[from[0]][from[1]] = null;
  return isInCheck(b, side);
}

// 合法走法（过滤掉走出后被将军的）
export function legalMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const side = sideOf(p);
  return pieceMoves(board, r, c).filter(([rr, cc]) => !moveExposesKing(board, [r, c], [rr, cc], side));
}

// 某方是否还有任何合法走子（无则被将死/困毙）
export function hasAnyLegalMove(board, side) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || sideOf(p) !== side) continue;
      if (legalMoves(board, r, c).length > 0) return true;
    }
  }
  return false;
}

export function isCheckmate(board, side) {
  return isInCheck(board, side) && !hasAnyLegalMove(board, side);
}

export function makeMove(board, from, to) {
  const b = cloneBoard(board);
  b[to[0]][to[1]] = b[from[0]][from[1]];
  b[from[0]][from[1]] = null;
  return b;
}

// FEN 风格表示（喂给 AI 用）：红大写、黑小写，行从黑方到红方，用数字表示连续空格
export function toFEN(board, sideToMove) {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    let row = '', empty = 0;
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p) { empty++; }
      else { if (empty) { row += empty; empty = 0; } row += p; }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/') + ' ' + (sideToMove === RED ? 'w' : 'b');
}

export function pieceName(p) {
  const names = {
    K: '帅', A: '仕', B: '相', N: '马', R: '车', C: '炮', P: '兵',
    k: '将', a: '士', b: '象', n: '马', r: '车', c: '炮', p: '卒',
  };
  return names[p] || '';
}