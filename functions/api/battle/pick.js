export async function onRequestPost({ request, env }) {
  const { code, username, heroName, posIdx, seed } = await request.json();
  if (!code || !username || !heroName) {
    return json({ error: '缺少参数' }, 400);
  }
  const room = await env.DB.prepare('SELECT * FROM battle_rooms WHERE code = ?').bind(code).first();
  if (!room) return json({ error: '房间不存在' }, 404);
  const state = JSON.parse(room.state);

  const mySide = state.players.A === username ? 'A' : state.players.B === username ? 'B' : null;
  if (!mySide) return json({ error: '你不是该房间的玩家' }, 403);

  if (state.phase === 'ready' && seed != null) {
    state.phase = 'drafting';
    state.seed = seed;
    state.draftStep = 0;
    state.lineupA = {};
    state.lineupB = {};
    await env.DB.prepare('UPDATE battle_rooms SET state = ?, updated_at = ? WHERE code = ?')
      .bind(JSON.stringify(state), Date.now(), code).run();
    return json({ ok: true, draftStep: 0, phase: 'drafting' });
  }

  if (heroName === '__init__') return json({ error: '已初始化' }, 400);
  if (state.phase !== 'drafting') return json({ error: '当前阶段不可选将' }, 400);

  // Snake draft: A(1), B(2), A(2), B(2)... A(1) = 20 picks total
  const DRAFT_ORDER = ['A','B','B','A','A','B','B','A','A','B','B','A','A','B','B','A','A','B','B','A'];
  const step = state.draftStep;
  if (step >= 20) return json({ error: '选将已结束' }, 400);
  if (DRAFT_ORDER[step] !== mySide) return json({ error: '还没轮到你' }, 400);

  const posIndex = Math.floor(step / 2);
  if (posIndex !== posIdx) return json({ error: '职位序号不匹配' }, 400);

  const POS_IDS = ['monarch', 'prince', 'consort', 'minister', 'strategist', 'envoy', 'general', 'vanguard', 'logistics', 'talent'];
  const posId = POS_IDS[posIndex];
  const allPicked = [...Object.values(state.lineupA || {}), ...Object.values(state.lineupB || {})];
  if (allPicked.includes(heroName)) return json({ error: '该英雄已被选择' }, 400);
  if (mySide === 'A') state.lineupA[posId] = heroName;
  else state.lineupB[posId] = heroName;

  state.draftStep = step + 1;
  if (state.draftStep >= 20) state.phase = 'battle';

  await env.DB.prepare('UPDATE battle_rooms SET state = ?, updated_at = ? WHERE code = ?')
    .bind(JSON.stringify(state), Date.now(), code).run();
  return json({ ok: true, draftStep: state.draftStep, phase: state.phase });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
