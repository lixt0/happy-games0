// GNU Go worker：加载 gnugo.js，封装为消息接口。
// 主线程发 {cmd, ...}，worker 回 {ok, cmd, ...}。
// 注意：gnugo.js 自身声明全局 `var Module`，这里不能再用 let/var 重复声明，
// 否则报 "Identifier 'Module' has already been declared"。统一用 self.Module。
//
// 颜色归一化：gnugo 内部颜色常量方向（BLACK=1 还是 2）不便假设，故不依赖它。
// 玩家执黑先手（init 后 to_move=BLACK），玩家第一次落子后该格的 _getBoard 值即"玩家色"。
// 之后 snapshot 把玩家色统一映射为 1（=黑）、另一色映射为 2（=白）再传给主线程，
// 这样主线程的 drawStones 永远是 1→黑、2→白，与玩家执黑先走一致。
let size = 0;
let playerColor = 0;   // gnugo 原始颜色值（玩家方）
const moveLog = [];    // 走法记录，崩溃时带出便于复现

function mod() { return self.Module; }
function ready() { const m = mod(); return m && m._initializeGoGame; }

// 把 gnugo 原始盘面值归一化：玩家色→1，AI 色→2，空→0
function norm(v) {
  if (v === 0) return 0;
  if (playerColor === 0) return v; // 玩家色未定时（init 全空），原样返回
  return v === playerColor ? 1 : 2;
}

function snapshot() {
  const m = mod();
  const board = [];
  for (let i = 0; i < size; i++) {
    const row = [];
    for (let j = 0; j < size; j++) row.push(norm(m._getBoard(i, j)));
    board.push(row);
  }
  let last = null;
  for (let i = 0; i < size && !last; i++)
    for (let j = 0; j < size && !last; j++)
      if (m._isLastMove(i, j)) last = [i, j];
  return { board, last };
}

self.onmessage = (e) => {
  const { cmd } = e.data;
  try {
    if (cmd === 'init') {
      const { size: s, seed } = e.data;
      importScripts('./gnugo.js');   // 同步加载；创建全局 self.Module
      const m = mod();
      // 捕获 gnugo 的 stdout/stderr，便于诊断崩溃原因
      const log = [];
      m.print = (x) => { log.push(String(x)); if (log.length > 200) log.shift(); };
      m.printErr = (x) => { log.push('[err] ' + String(x)); if (log.length > 200) log.shift(); };
      m.onAbort = (reason) => {
        self.postMessage({
          ok: false, cmd: 'abort',
          error: '引擎中止：' + String(reason),
          log: log.slice(-40).join('\n'),
          moves: moveLog.slice(-60).join(' '),
        });
      };
      m.onRuntimeInitialized = () => {
        size = s;
        playerColor = 0;
        moveLog.length = 0;
        m._initializeGoGame(s, 7.5, 0, seed | 0);
        self.postMessage({ ok: true, cmd: 'init', ...snapshot() });
      };
      return;
    }
    if (!ready()) { self.postMessage({ ok: false, cmd, error: 'engine not ready' }); return; }
    const m = mod();
    if (cmd === 'play') {
      const { i, j } = e.data;
      const code = m._moveTo(i, j);
      if (code !== 0) { moveLog.push(`P(${i},${j})=${code}`); self.postMessage({ ok: true, cmd: 'play', code }); return; }
      // 玩家先手：成功落子后该格即玩家色，记录之（仅首次）
      if (playerColor === 0) playerColor = m._getBoard(i, j);
      moveLog.push(`P(${i},${j})`);
      self.postMessage({ ok: true, cmd: 'play', code: 0, ...snapshot() });
      return;
    }
    if (cmd === 'genmove') {
      m._genNextStep();
      // 记录 AI 走到哪
      let ai = null;
      for (let a = 0; a < size && !ai; a++) for (let b = 0; b < size && !ai; b++) if (m._isLastMove(a, b)) ai = [a, b];
      moveLog.push(ai ? `A(${ai[0]},${ai[1]})` : 'A?');
      self.postMessage({ ok: true, cmd: 'genmove', pass: false, ...snapshot() });
      return;
    }
    self.postMessage({ ok: false, cmd, error: 'unknown cmd ' + cmd });
  } catch (err) {
    self.postMessage({ ok: false, cmd, error: String(err) });
  }
};
