// 中国象棋 AI 引擎 —— 移植自 itlwei/Chess（一叶孤舟）的 alpha-beta 搜索。
// 原仓库：https://github.com/itlwei/Chess （MIT）。本文件仅保留引擎核心：
//   com（棋子参数 / 走法 bylaw / 位置价值表）、AI（alpha-beta + 评估）、play 桩。
// 已剥离所有渲染、图片、Canvas、开局库依赖，只暴露 searchMove()。
//
// 坐标：与本项目 logic.js 完全一致 —— 10 行 × 9 列，row 0 = 黑方底线（上），
// row 9 = 红方底线（下），col 0..8。棋子字符：红 K帅 A仕 B相 N马 R车 C炮 P兵，
// 黑 k将 a士 b象 n马 r车 c炮 p卒。大写=红，小写=黑。
//
// 引擎内部用 map[y][x]（y=row, x=col），棋子用形如 'c0'/'J0' 的 key；
// key 首字符（pater）大小写决定阵营：小写=红(my=1)，大写=黑(my=-1)。
// 故我方棋盘字符 → 引擎 key 的映射仅是「大小写翻转 + 类型字母映射」。

// ───────────────────────── com ─────────────────────────
const com = {};
com.mans = {};          // 棋子集合（key -> man 对象）
com.arr2Clone = function (arr) {
  const n = [];
  for (let i = 0; i < arr.length; i++) n[i] = arr[i].slice();
  return n;
};

// 位置价值表（row 0=黑方上，row 9=红方下）。直接取自原仓库 common.js。
com.value = {
  c: [ // 车
    [206, 208, 207, 213, 214, 213, 207, 208, 206],
    [206, 212, 209, 216, 233, 216, 209, 212, 206],
    [206, 208, 207, 214, 216, 214, 207, 208, 206],
    [206, 213, 213, 216, 216, 216, 213, 213, 206],
    [208, 211, 211, 214, 215, 214, 211, 211, 208],
    [208, 212, 212, 214, 215, 214, 212, 212, 208],
    [204, 209, 204, 212, 214, 212, 204, 209, 204],
    [198, 208, 204, 212, 212, 212, 204, 208, 198],
    [200, 208, 206, 212, 200, 212, 206, 208, 200],
    [194, 206, 204, 212, 200, 212, 204, 206, 194],
  ],
  m: [ // 马
    [90, 90, 90, 96, 90, 96, 90, 90, 90],
    [90, 96, 103, 97, 94, 97, 103, 96, 90],
    [92, 98, 99, 103, 99, 103, 99, 98, 92],
    [93, 108, 100, 107, 100, 107, 100, 108, 93],
    [90, 100, 99, 103, 104, 103, 99, 100, 90],
    [90, 98, 101, 102, 103, 102, 101, 98, 90],
    [92, 94, 98, 95, 98, 95, 98, 94, 92],
    [93, 92, 94, 95, 92, 95, 94, 92, 93],
    [85, 90, 92, 93, 78, 93, 92, 90, 85],
    [88, 85, 90, 88, 90, 88, 90, 85, 88],
  ],
  x: [ // 相
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 23, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [18, 0, 0, 0, 23, 0, 0, 0, 18],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 20, 0, 0, 0, 20, 0, 0],
  ],
  s: [ // 士
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
    [0, 0, 0, 0, 23, 0, 0, 0, 0],
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
    [0, 0, 0, 0, 23, 0, 0, 0, 0],
    [0, 0, 0, 20, 0, 20, 0, 0, 0],
  ],
  j: [ // 将/帅
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
    [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
  ],
  p: [ // 炮
    [100, 100, 96, 91, 90, 91, 96, 100, 100],
    [98, 98, 96, 92, 89, 92, 96, 98, 98],
    [97, 97, 96, 91, 92, 91, 96, 97, 97],
    [96, 99, 99, 98, 100, 98, 99, 99, 96],
    [96, 96, 96, 96, 100, 96, 96, 96, 96],
    [95, 96, 99, 96, 100, 96, 99, 96, 95],
    [96, 96, 96, 96, 96, 96, 96, 96, 96],
    [97, 96, 100, 99, 101, 99, 100, 96, 97],
    [96, 97, 98, 98, 98, 98, 98, 97, 96],
    [96, 96, 97, 99, 99, 99, 97, 96, 96],
  ],
  z: [ // 卒/兵
    [9, 9, 9, 11, 13, 11, 9, 9, 9],
    [19, 24, 34, 42, 44, 42, 34, 24, 19],
    [19, 24, 32, 37, 37, 37, 32, 24, 19],
    [19, 23, 27, 29, 30, 29, 27, 23, 19],
    [14, 18, 20, 27, 29, 27, 20, 18, 14],
    [7, 0, 13, 0, 16, 0, 13, 0, 7],
    [7, 0, 7, 0, 15, 0, 7, 0, 7],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};
// 黑子价值表 = 红子表上下倒置（原仓库做法），相/士对称故共用。
com.value.C = com.arr2Clone(com.value.c).reverse();
com.value.M = com.arr2Clone(com.value.m).reverse();
com.value.X = com.value.x;
com.value.S = com.value.s;
com.value.J = com.value.j;
com.value.P = com.arr2Clone(com.value.p).reverse();
com.value.Z = com.arr2Clone(com.value.z).reverse();

// 棋子参数：pater(大小写) -> {my, bl(走法函数名), value}. text 仅调试用。
com.args = {
  c: { my: 1, bl: 'c', value: com.value.c },
  m: { my: 1, bl: 'm', value: com.value.m },
  x: { my: 1, bl: 'x', value: com.value.x },
  s: { my: 1, bl: 's', value: com.value.s },
  j: { my: 1, bl: 'j', value: com.value.j },
  p: { my: 1, bl: 'p', value: com.value.p },
  z: { my: 1, bl: 'z', value: com.value.z },
  C: { my: -1, bl: 'c', value: com.value.C },
  M: { my: -1, bl: 'm', value: com.value.M },
  X: { my: -1, bl: 'x', value: com.value.X },
  S: { my: -1, bl: 's', value: com.value.S },
  J: { my: -1, bl: 'j', value: com.value.J },
  P: { my: -1, bl: 'p', value: com.value.P },
  Z: { my: -1, bl: 'z', value: com.value.Z },
};

// ───────────────────────── bylaw（走法生成，伪合法） ─────────────────────────
// 注意：蹩马腿 / 塞象眼 / 将帅照面 用 play.map（根局面）判定，这是原引擎的既定行为，
// 搜索过程中不再更新；保持与原仓库一致。
com.bylaw = {};

com.bylaw.c = function (x, y, map, my) { // 车
  const d = [];
  for (let i = x - 1; i >= 0; i--) { if (map[y][i]) { if (com.mans[map[y][i]].my != my) d.push([i, y]); break; } else d.push([i, y]); }
  for (let i = x + 1; i <= 8; i++) { if (map[y][i]) { if (com.mans[map[y][i]].my != my) d.push([i, y]); break; } else d.push([i, y]); }
  for (let i = y - 1; i >= 0; i--) { if (map[i][x]) { if (com.mans[map[i][x]].my != my) d.push([x, i]); break; } else d.push([x, i]); }
  for (let i = y + 1; i <= 9; i++) { if (map[i][x]) { if (com.mans[map[i][x]].my != my) d.push([x, i]); break; } else d.push([x, i]); }
  return d;
};

com.bylaw.m = function (x, y, map, my) { // 马
  const d = [];
  if (y - 2 >= 0 && x + 1 <= 8 && !play.map[y - 1][x] && (!com.mans[map[y - 2][x + 1]] || com.mans[map[y - 2][x + 1]].my != my)) d.push([x + 1, y - 2]);
  if (y - 1 >= 0 && x + 2 <= 8 && !play.map[y][x + 1] && (!com.mans[map[y - 1][x + 2]] || com.mans[map[y - 1][x + 2]].my != my)) d.push([x + 2, y - 1]);
  if (y + 1 <= 9 && x + 2 <= 8 && !play.map[y][x + 1] && (!com.mans[map[y + 1][x + 2]] || com.mans[map[y + 1][x + 2]].my != my)) d.push([x + 2, y + 1]);
  if (y + 2 <= 9 && x + 1 <= 8 && !play.map[y + 1][x] && (!com.mans[map[y + 2][x + 1]] || com.mans[map[y + 2][x + 1]].my != my)) d.push([x + 1, y + 2]);
  if (y + 2 <= 9 && x - 1 >= 0 && !play.map[y + 1][x] && (!com.mans[map[y + 2][x - 1]] || com.mans[map[y + 2][x - 1]].my != my)) d.push([x - 1, y + 2]);
  if (y + 1 <= 9 && x - 2 >= 0 && !play.map[y][x - 1] && (!com.mans[map[y + 1][x - 2]] || com.mans[map[y + 1][x - 2]].my != my)) d.push([x - 2, y + 1]);
  if (y - 1 >= 0 && x - 2 >= 0 && !play.map[y][x - 1] && (!com.mans[map[y - 1][x - 2]] || com.mans[map[y - 1][x - 2]].my != my)) d.push([x - 2, y - 1]);
  if (y - 2 >= 0 && x - 1 >= 0 && !play.map[y - 1][x] && (!com.mans[map[y - 2][x - 1]] || com.mans[map[y - 2][x - 1]].my != my)) d.push([x - 1, y - 2]);
  return d;
};

com.bylaw.x = function (x, y, map, my) { // 相/象
  const d = [];
  if (my === 1) {
    if (y + 2 <= 9 && x + 2 <= 8 && !play.map[y + 1][x + 1] && (!com.mans[map[y + 2][x + 2]] || com.mans[map[y + 2][x + 2]].my != my)) d.push([x + 2, y + 2]);
    if (y + 2 <= 9 && x - 2 >= 0 && !play.map[y + 1][x - 1] && (!com.mans[map[y + 2][x - 2]] || com.mans[map[y + 2][x - 2]].my != my)) d.push([x - 2, y + 2]);
    if (y - 2 >= 5 && x + 2 <= 8 && !play.map[y - 1][x + 1] && (!com.mans[map[y - 2][x + 2]] || com.mans[map[y - 2][x + 2]].my != my)) d.push([x + 2, y - 2]);
    if (y - 2 >= 5 && x - 2 >= 0 && !play.map[y - 1][x - 1] && (!com.mans[map[y - 2][x - 2]] || com.mans[map[y - 2][x - 2]].my != my)) d.push([x - 2, y - 2]);
  } else {
    if (y + 2 <= 4 && x + 2 <= 8 && !play.map[y + 1][x + 1] && (!com.mans[map[y + 2][x + 2]] || com.mans[map[y + 2][x + 2]].my != my)) d.push([x + 2, y + 2]);
    if (y + 2 <= 4 && x - 2 >= 0 && !play.map[y + 1][x - 1] && (!com.mans[map[y + 2][x - 2]] || com.mans[map[y + 2][x - 2]].my != my)) d.push([x - 2, y + 2]);
    if (y - 2 >= 0 && x + 2 <= 8 && !play.map[y - 1][x + 1] && (!com.mans[map[y - 2][x + 2]] || com.mans[map[y - 2][x + 2]].my != my)) d.push([x + 2, y - 2]);
    if (y - 2 >= 0 && x - 2 >= 0 && !play.map[y - 1][x - 1] && (!com.mans[map[y - 2][x - 2]] || com.mans[map[y - 2][x - 2]].my != my)) d.push([x - 2, y - 2]);
  }
  return d;
};

com.bylaw.s = function (x, y, map, my) { // 士/仕
  const d = [];
  if (my === 1) {
    if (y + 1 <= 9 && x + 1 <= 5 && (!com.mans[map[y + 1][x + 1]] || com.mans[map[y + 1][x + 1]].my != my)) d.push([x + 1, y + 1]);
    if (y + 1 <= 9 && x - 1 >= 3 && (!com.mans[map[y + 1][x - 1]] || com.mans[map[y + 1][x - 1]].my != my)) d.push([x - 1, y + 1]);
    if (y - 1 >= 7 && x + 1 <= 5 && (!com.mans[map[y - 1][x + 1]] || com.mans[map[y - 1][x + 1]].my != my)) d.push([x + 1, y - 1]);
    if (y - 1 >= 7 && x - 1 >= 3 && (!com.mans[map[y - 1][x - 1]] || com.mans[map[y - 1][x - 1]].my != my)) d.push([x - 1, y - 1]);
  } else {
    if (y + 1 <= 2 && x + 1 <= 5 && (!com.mans[map[y + 1][x + 1]] || com.mans[map[y + 1][x + 1]].my != my)) d.push([x + 1, y + 1]);
    if (y + 1 <= 2 && x - 1 >= 3 && (!com.mans[map[y + 1][x - 1]] || com.mans[map[y + 1][x - 1]].my != my)) d.push([x - 1, y + 1]);
    if (y - 1 >= 0 && x + 1 <= 5 && (!com.mans[map[y - 1][x + 1]] || com.mans[map[y - 1][x + 1]].my != my)) d.push([x + 1, y - 1]);
    if (y - 1 >= 0 && x - 1 >= 3 && (!com.mans[map[y - 1][x - 1]] || com.mans[map[y - 1][x - 1]].my != my)) d.push([x - 1, y - 1]);
  }
  return d;
};

com.bylaw.j = function (x, y, map, my) { // 将/帅
  const d = [];
  // 将帅照面：两王同列且中间无子时可直接「飞将」吃对方老将
  const isNull = (function () {
    const y1 = com.mans['j0'].y;
    const x1 = com.mans['J0'].x;
    const y2 = com.mans['J0'].y;
    for (let i = y1 - 1; i > y2; i--) { if (map[i][x1]) return false; }
    return true;
  })();
  if (my === 1) {
    if (y + 1 <= 9 && (!com.mans[map[y + 1][x]] || com.mans[map[y + 1][x]].my != my)) d.push([x, y + 1]);
    if (y - 1 >= 7 && (!com.mans[map[y - 1][x]] || com.mans[map[y - 1][x]].my != my)) d.push([x, y - 1]);
    if (com.mans['j0'].x == com.mans['J0'].x && isNull) d.push([com.mans['J0'].x, com.mans['J0'].y]);
  } else {
    if (y + 1 <= 2 && (!com.mans[map[y + 1][x]] || com.mans[map[y + 1][x]].my != my)) d.push([x, y + 1]);
    if (y - 1 >= 0 && (!com.mans[map[y - 1][x]] || com.mans[map[y - 1][x]].my != my)) d.push([x, y - 1]);
    if (com.mans['j0'].x == com.mans['J0'].x && isNull) d.push([com.mans['j0'].x, com.mans['j0'].y]);
  }
  if (x + 1 <= 5 && (!com.mans[map[y][x + 1]] || com.mans[map[y][x + 1]].my != my)) d.push([x + 1, y]);
  if (x - 1 >= 3 && (!com.mans[map[y][x - 1]] || com.mans[map[y][x - 1]].my != my)) d.push([x - 1, y]);
  return d;
};

com.bylaw.p = function (x, y, map, my) { // 炮
  const d = [];
  let n = 0;
  for (let i = x - 1; i >= 0; i--) { if (map[y][i]) { if (n == 0) { n++; continue; } else { if (com.mans[map[y][i]].my != my) d.push([i, y]); break; } } else { if (n == 0) d.push([i, y]); } }
  n = 0;
  for (let i = x + 1; i <= 8; i++) { if (map[y][i]) { if (n == 0) { n++; continue; } else { if (com.mans[map[y][i]].my != my) d.push([i, y]); break; } } else { if (n == 0) d.push([i, y]); } }
  n = 0;
  for (let i = y - 1; i >= 0; i--) { if (map[i][x]) { if (n == 0) { n++; continue; } else { if (com.mans[map[i][x]].my != my) d.push([x, i]); break; } } else { if (n == 0) d.push([x, i]); } }
  n = 0;
  for (let i = y + 1; i <= 9; i++) { if (map[i][x]) { if (n == 0) { n++; continue; } else { if (com.mans[map[i][x]].my != my) d.push([x, i]); break; } } else { if (n == 0) d.push([x, i]); } }
  return d;
};

com.bylaw.z = function (x, y, map, my) { // 兵/卒
  const d = [];
  if (my === 1) { // 红方向上(row 减)
    if (y - 1 >= 0 && (!com.mans[map[y - 1][x]] || com.mans[map[y - 1][x]].my != my)) d.push([x, y - 1]);
    if (x + 1 <= 8 && y <= 4 && (!com.mans[map[y][x + 1]] || com.mans[map[y][x + 1]].my != my)) d.push([x + 1, y]);
    if (x - 1 >= 0 && y <= 4 && (!com.mans[map[y][x - 1]] || com.mans[map[y][x - 1]].my != my)) d.push([x - 1, y]);
  } else { // 黑方向下(row 增)
    if (y + 1 <= 9 && (!com.mans[map[y + 1][x]] || com.mans[map[y + 1][x]].my != my)) d.push([x, y + 1]);
    if (x + 1 <= 8 && y >= 6 && (!com.mans[map[y][x + 1]] || com.mans[map[y][x + 1]].my != my)) d.push([x + 1, y]);
    if (x - 1 >= 0 && y >= 6 && (!com.mans[map[y][x - 1]] || com.mans[map[y][x - 1]].my != my)) d.push([x - 1, y]);
  }
  return d;
};

// ───────────────────────── play 桩 ─────────────────────────
const play = {};
play.mans = com.mans;   // 共用同一引用
play.map = [];
play.my = 1;            // 1=红，-1=黑；即引擎视角的「行棋方」
play.depth = 4;
play.isFoul = false;    // 无长将禁手过滤

// ───────────────────────── AI（alpha-beta） ─────────────────────────
const AI = {};
AI.historyBill = [];     // 不加载开局库，纯搜索

AI.init = function () {
  // 开局库分支：historyBill 为空 → 直接进搜索
  const initTime = Date.now();
  AI.treeDepth = play.depth;
  AI.number = 0;
  let val = AI.getAlphaBeta(-99999, 99999, AI.treeDepth, com.arr2Clone(play.map), play.my);
  if (!val || val.value == -8888) { // 该深度无解（被将死），降深度重试
    AI.treeDepth = 2;
    val = AI.getAlphaBeta(-99999, 99999, AI.treeDepth, com.arr2Clone(play.map), play.my);
  }
  if (val && val.value != -8888) {
    const man = play.mans[val.key];
    return [man.x, man.y, val.x, val.y]; // [fromX, fromY, toX, toY]
  }
  return false;
};

AI.getMapAllMan = function (map, my) {
  const mans = [];
  for (let i = 0; i < map.length; i++) {
    for (let n = 0; n < map[i].length; n++) {
      const key = map[i][n];
      if (key && play.mans[key].my == my) {
        play.mans[key].x = n;
        play.mans[key].y = i;
        mans.push(play.mans[key]);
      }
    }
  }
  return mans;
};

AI.getMoves = function (map, my) {
  const manArr = AI.getMapAllMan(map, my);
  const moves = [];
  const foul = play.isFoul;
  for (let i = 0; i < manArr.length; i++) {
    const man = manArr[i];
    const val = man.bl(map);
    for (let n = 0; n < val.length; n++) {
      const x = man.x, y = man.y, newX = val[n][0], newY = val[n][1];
      if (foul[0] != x || foul[1] != y || foul[2] != newX || foul[3] != newY) {
        moves.push([x, y, newX, newY, man.key]);
      }
    }
  }
  return moves;
};

AI.getAlphaBeta = function (A, B, depth, map, my) {
  if (depth == 0) return { value: AI.evaluate(map, my) };
  const moves = AI.getMoves(map, my);
  let rootKey;
  let key, oldX, oldY, newX, newY;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    key = move[4];
    oldX = move[0]; oldY = move[1]; newX = move[2]; newY = move[3];
    const clearKey = map[newY][newX] || '';

    map[newY][newX] = key;
    delete map[oldY][oldX];
    play.mans[key].x = newX;
    play.mans[key].y = newY;

    if (clearKey == 'j0' || clearKey == 'J0') { // 被吃老将，撤销
      play.mans[key].x = oldX;
      play.mans[key].y = oldY;
      map[oldY][oldX] = key;
      delete map[newY][newX];
      if (clearKey) map[newY][newX] = clearKey;
      return { key, x: newX, y: newY, value: 8888 };
    } else {
      const val = -AI.getAlphaBeta(-B, -A, depth - 1, map, -my).value;
      // 撤销
      play.mans[key].x = oldX;
      play.mans[key].y = oldY;
      map[oldY][oldX] = key;
      delete map[newY][newX];
      if (clearKey) map[newY][newX] = clearKey;
      if (val >= B) return { key, x: newX, y: newY, value: B };
      if (val > A) {
        A = val;
        if (AI.treeDepth == depth) rootKey = { key, x: newX, y: newY, value: A };
      }
    }
  }
  if (AI.treeDepth == depth) return rootKey || false;
  return { key, x: newX, y: newY, value: A };
};

AI.evaluate = function (map, my) {
  let val = 0;
  for (let i = 0; i < map.length; i++) {
    for (let n = 0; n < map[i].length; n++) {
      const key = map[i][n];
      if (key) val += play.mans[key].value[i][n] * play.mans[key].my;
    }
  }
  AI.number++;
  return val * my;
};

// ───────────────────────── 我方棋盘 ↔ 引擎棋盘 转换 ─────────────────────────
// 我方字符 → 引擎 pater（首字母大小写定阵营）
const TYPE_MAP = { k: 'j', a: 's', b: 'x', n: 'm', r: 'c', c: 'p', p: 'z' };
// 引擎 pater → 显示名（用于 AI 走子提示）
const PATER_NAME = { j: '帅', J: '将', s: '仕', S: '士', x: '相', X: '象', m: '马', M: '马', c: '车', C: '车', p: '炮', P: '炮', z: '兵', Z: '卒' };

function isRedChar(p) { return p && p === p.toUpperCase(); }

// 把本项目 logic.js 的棋盘（字符二维数组）转成引擎 map + mans。
function buildEngineState(board) {
  const map = [];
  for (let r = 0; r < 10; r++) map.push(new Array(9));
  // 同一 pater 的计数器，用于生成唯一 key；王固定为 j0/J0
  const counters = {};
  com.mans = {};
  play.mans = com.mans;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) { map[r][c] = undefined; continue; }
      const type = TYPE_MAP[p.toLowerCase()];
      const pater = isRedChar(p) ? type : type.toUpperCase();
      let key;
      if (type === 'j') {
        key = isRedChar(p) ? 'j0' : 'J0'; // 唯一的王
      } else {
        const idx = counters[pater] || 0;
        counters[pater] = idx + 1;
        key = pater + idx;
      }
      const o = com.args[pater];
      const man = {
        key, pater, x: c, y: r, my: o.my, value: o.value,
        bl(m) { return com.bylaw[o.bl](this.x, this.y, m || play.map, this.my); },
      };
      com.mans[key] = man;
      map[r][c] = key;
    }
  }
  play.map = map;
}

// ───────────────────────── 对外接口 ─────────────────────────
// board: logic.js 棋盘；side: 'r'(红) | 'b'(黑)；depth: 搜索深度。
// 返回 { from:[r,c], to:[r,c], piece, name } 或 null（无棋可走）。
export function searchMove(board, side, depth) {
  buildEngineState(board);
  play.my = side === 'r' ? 1 : -1;
  play.depth = depth || 4;
  const res = AI.init();
  if (!res) return null;
  const [fromX, fromY, toX, toY] = res;
  const piece = board[fromY][fromX];
  return {
    from: [fromY, fromX],
    to: [toY, toX],
    piece,
    name: PATER_NAME[piece.toLowerCase() ? (isRedChar(piece) ? TYPE_MAP[piece.toLowerCase()] : TYPE_MAP[piece.toLowerCase()].toUpperCase()) : ''] || '',
  };
}

// 引擎走子的中文记号（供 UI 显示，如「炮 b3→b7」）—— 调用方可选用于 aiNote。
export function moveText(from, to) {
  const cols = 'abcdefghi';
  return `${cols[from[1]]}${from[0]}→${cols[to[1]]}${to[0]}`;
}
