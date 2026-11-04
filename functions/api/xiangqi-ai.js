// 中国象棋 AI 代理 — 调用 GLM-4.7-Flash（经模力方舟 Moark 接口）
// 不依赖 logic.js（Pages Function 跨目录 import 易崩），仅做走法字符串解析 + 失败兜底。

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// 从 FEN 解析棋盘到二维数组（10x9）
const ROWS = 10, COLS = 9;
function fromFEN(fen) {
  const [boardPart] = fen.split(' ');
  const rows = boardPart.split('/');
  const board = [];
  for (const row of rows) {
    const cells = [];
    for (const ch of row) {
      if (/\d/.test(ch)) { for (let i = 0; i < +ch; i++) cells.push(null); }
      else cells.push(ch);
    }
    while (cells.length < COLS) cells.push(null);
    board.push(cells);
  }
  while (board.length < ROWS) board.push(new Array(COLS).fill(null));
  return board;
}

const isRed = p => p && p === p.toUpperCase();
const sideOf = p => (p ? (isRed(p) ? 'r' : 'b') : null);

function inBoard(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function inPalace(r, c, side) {
  if (c < 3 || c > 5) return false;
  return side === 'r' ? r >= 7 && r <= 9 : r >= 0 && r <= 2;
}
function onOwnHalf(r, side) { return side === 'r' ? r >= 5 : r <= 4; }

function pieceMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const side = sideOf(p);
  const up = side === 'r' ? -1 : 1;
  const out = [];
  const P = p.toLowerCase();
  const canLand = (rr, cc) => inBoard(rr, cc) && (!board[rr][cc] || sideOf(board[rr][cc]) !== side);

  switch (P) {
    case 'k': {
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const rr = r + dr, cc = c + dc;
        if (inPalace(rr, cc, side) && canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'a': {
      for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const rr = r + dr, cc = c + dc;
        if (inPalace(rr, cc, side) && canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'b': {
      for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
        const rr = r + dr, cc = c + dc;
        if (!onOwnHalf(rr, side) || !inBoard(rr, cc)) continue;
        if (board[r + dr / 2][c + dc / 2]) continue;
        if (canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'n': {
      const moves = [
        [-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],
        [-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1],
      ];
      for (const [dr, dc, br, bc] of moves) {
        const rr = r + dr, cc = c + dc;
        if (!inBoard(rr, cc)) continue;
        if (board[r + br][c + bc]) continue;
        if (canLand(rr, cc)) out.push([rr, cc]);
      }
      break;
    }
    case 'r': {
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        let rr = r + dr, cc = c + dc;
        while (inBoard(rr, cc)) {
          if (!board[rr][cc]) { out.push([rr, cc]); }
          else { if (sideOf(board[rr][cc]) !== side) out.push([rr, cc]); break; }
          rr += dr; cc += dc;
        }
      }
      break;
    }
    case 'c': {
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        let rr = r + dr, cc = c + dc;
        while (inBoard(rr, cc) && !board[rr][cc]) { out.push([rr, cc]); rr += dr; cc += dc; }
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
    case 'p': {
      if (canLand(r + up, c)) out.push([r + up, c]);
      const crossed = side === 'r' ? r <= 4 : r >= 5;
      if (crossed) {
        if (canLand(r, c - 1)) out.push([r, c - 1]);
        if (canLand(r, c + 1)) out.push([r, c + 1]);
      }
      break;
    }
  }
  return out;
}

function findKing(board, side) {
  const k = side === 'r' ? 'K' : 'k';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === k) return [r, c];
  return null;
}

function isInCheck(board, side) {
  const king = findKing(board, side);
  if (!king) return true;
  const [kr, kc] = king;
  const enemy = side === 'r' ? 'b' : 'r';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || sideOf(p) !== enemy) continue;
      for (const [rr, cc] of pieceMoves(board, r, c))
        if (rr === kr && cc === kc) return true;
    }
  const ek = findKing(board, enemy);
  if (ek && ek[1] === kc) {
    let blocked = false;
    const lo = Math.min(kr, ek[0]) + 1, hi = Math.max(kr, ek[0]);
    for (let rr = lo; rr < hi; rr++) if (board[rr][kc]) { blocked = true; break; }
    if (!blocked) return true;
  }
  return false;
}

function legalMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const side = sideOf(p);
  return pieceMoves(board, r, c).filter(([rr, cc]) => {
    const b = board.map(row => row.slice());
    b[rr][cc] = b[r][c];
    b[r][c] = null;
    return !isInCheck(b, side);
  });
}

function listAllLegalMoves(board, side) {
  const moves = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || sideOf(p) !== side) continue;
      for (const [rr, cc] of legalMoves(board, r, c)) moves.push({ from: [r, c], to: [rr, cc], piece: p });
    }
  return moves;
}

function isLegal(board, move) {
  if (!move || !move.from || !move.to) return false;
  const [fr, fc] = move.from, [tr, tc] = move.to;
  if (!inBoard(fr, fc) || !inBoard(tr, tc)) return false;
  if (!board[fr][fc]) return false;
  return legalMoves(board, fr, fc).some(([rr, cc]) => rr === tr && cc === tc);
}

function boardToText(board) {
  return board.map(row =>
    row.map(p => p || '·').join(' ')
  ).join('\n');
}

function parseMove(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*?"from"[\s\S]*?"to"[\s\S]*?\}/);
  if (m) {
    try {
      const obj = JSON.parse(m[0]);
      if (Array.isArray(obj.from) && Array.isArray(obj.to) &&
          obj.from.length === 2 && obj.to.length === 2) {
        return { from: obj.from, to: obj.to, reason: obj.reason || '' };
      }
    } catch {}
  }
  const m2 = text.match(/from\s*(\d+)\s*[,，]\s*(\d+)[^0-9]*to\s*(\d+)\s*[,，]\s*(\d+)/i);
  if (m2) return { from: [+m2[1], +m2[2]], to: [+m2[3], +m2[4]], reason: '' };
  // 兼容代数式记法：列字母 a-i（0-8）+ 行数字 0-9，如 "马 h0→i2" / "h0-i2" / "h0→i2"
  const colLetter = ch => { const i = ch.toLowerCase().charCodeAt(0) - 97; return (i >= 0 && i < COLS) ? i : null; };
  const cell = s => {
    const m = s.match(/^\s*([a-iA-I])(\d+)\s*$/);
    if (!m) return null;
    const c = colLetter(m[1]); if (c === null) return null;
    const r = +m[2]; if (r < 0 || r >= ROWS) return null;
    return [r, c];
  };
  const m3 = text.match(/[a-iA-I]\d+\s*(?:→|->|-|到|至)\s*[a-iA-I]\d+/);
  if (m3) {
    const parts = m3[0].split(/\s*(?:→|->|-|到|至)\s*/);
    if (parts.length === 2) {
      const from = cell(parts[0]); const to = cell(parts[1]);
      if (from && to) return { from, to, reason: '' };
    }
  }
  return null;
}

async function callGLM(env, messages) {
  const key = env.MOARK_KEY;
  if (!key) throw new Error('MOARK_KEY 未配置（请检查 Pages secret）');
  let res;
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    res = await fetch('https://api.moark.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'glm-4.7-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
    if (res.status === 429 && tryNo < 2) {
      // 限流退避：5s / 15s（偶发限流，等配额恢复）
      await new Promise(r => setTimeout(r, 5000 * (tryNo + 1)));
      continue;
    }
    break;
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GLM ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

const PIECE_NAME = { K:'帅',A:'仕',B:'相',N:'马',R:'车',C:'炮',P:'兵',k:'将',a:'士',b:'象',n:'马',r:'车',c:'炮',p:'卒' };

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const fen = body.fen;
  const aiSide = body.aiSide === 'b' ? 'b' : 'r';
  if (!fen) return json({ error: '缺少 fen' }, 400);

  let board;
  try { board = fromFEN(fen); } catch { return json({ error: 'fen 无效' }, 400); }

  if (!env.MOARK_KEY) {
    // 服务端无密钥：直接兜底合法走法，不阻断游戏
    const fb = listAllLegalMoves(board, aiSide);
    if (fb.length === 0) return json({ error: '无合法走法', fallbackUsed: false });
    const m = fb[Math.floor(Math.random() * fb.length)];
    return json({
      from: m.from, to: m.to, reason: 'AI 密钥未配置，使用本地兜底走法',
      piece: m.piece, captured: board[m.to[0]][m.to[1]] || null,
      raw: '', fallbackUsed: true, keyMissing: true,
    });
  }

  const aiLabel = aiSide === 'r' ? '红方（大写）' : '黑方（小写）';
  const legal = listAllLegalMoves(board, aiSide);
  if (legal.length === 0) return json({ error: '无合法走法（将死/困毙）', fallbackUsed: false });

  const moveStr = legal.map((m, i) =>
    `${i}: ${PIECE_NAME[m.piece] || m.piece} ${m.from[0]},${m.from[1]} → ${m.to[0]},${m.to[1]}` +
    (board[m.to[0]][m.to[1]] ? `（吃${PIECE_NAME[board[m.to[0]][m.to[1]]] || board[m.to[0]][m.to[1]]}）` : '')
  ).join('\n');

  const buildPrompt = (hint) => [
    {
      role: 'system',
      content: `你是一名中国象棋 AI。下面给你当前所有合法走法的编号列表。你只需回复一个数字（编号）来选择你认为最好的一步，不要输出任何其它内容。${hint}`,
    },
    {
      role: 'user',
      content: `棋盘：\n${boardToText(board)}\n\n轮到 ${aiLabel}，合法走法如下：\n${moveStr}\n\n请只回复一个编号。`,
    },
  ];

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const hint = attempt === 0 ? '' : `你上一步回复的不是合法编号（${lastError}）。请只回复 0 到 ${legal.length - 1} 之间的一个数字。`;
    let text;
    try {
      text = await callGLM(env, buildPrompt(hint));
    } catch (e) {
      const m = legal[Math.floor(Math.random() * legal.length)];
      return json({
        from: m.from, to: m.to, reason: `AI 调用失败，回退本地走法：${e.message}`,
        piece: m.piece, captured: board[m.to[0]][m.to[1]] || null,
        raw: `CALL_ERROR: ${e.message}`, fallbackUsed: true,
      });
    }
    const numMatch = (text || '').match(/\d+/);
    if (numMatch) {
      const idx = +numMatch[0];
      if (idx >= 0 && idx < legal.length) {
        const m = legal[idx];
        return json({
          from: m.from, to: m.to, reason: `AI 选择 #${idx}`,
          piece: m.piece, captured: board[m.to[0]][m.to[1]] || null,
          raw: (text || '').slice(0, 600), fallbackUsed: false,
        });
      }
      lastError = `编号 ${idx} 超出范围`;
    } else {
      lastError = '未找到数字';
    }
  }

  // 两次都没拿到合法编号 → 兜底随机
  const m = legal[Math.floor(Math.random() * legal.length)];
  return json({
    from: m.from, to: m.to, reason: 'AI 解析失败，回退到本地合法走法',
    piece: m.piece, captured: board[m.to[0]][m.to[1]] || null,
    raw: '', fallbackUsed: true,
  });
}