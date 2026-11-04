import { json, requireAdmin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: '无管理员权限' }, 403);
  const { results } = await env.DB.prepare(`
    SELECT u.username, u.created_at,
      SUM(CASE WHEN s.expires_at > ? THEN 1 ELSE 0 END) AS session_count,
      MAX(CASE WHEN s.expires_at > ? THEN s.expires_at ELSE NULL END) AS active_until
    FROM users u
    LEFT JOIN sessions s ON s.username = u.username
    GROUP BY u.username, u.created_at
    ORDER BY u.created_at DESC
  `).bind(Date.now(), Date.now()).all();
  return json({ users: results || [] });
}

export async function onRequestDelete({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: '无管理员权限' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) return json({ error: '缺少用户名' }, 400);
  if (username === 'zhoujun') return json({ error: '不能删除管理员账户' }, 400);

  const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ?').bind(username).first();
  if (!existing) return json({ error: '用户不存在' }, 404);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM game_events WHERE username = ?').bind(username),
    env.DB.prepare('DELETE FROM game_scores WHERE username = ?').bind(username),
    env.DB.prepare('DELETE FROM game_sessions WHERE username = ?').bind(username),
    env.DB.prepare('DELETE FROM sessions WHERE username = ?').bind(username),
    env.DB.prepare('DELETE FROM users WHERE username = ?').bind(username),
  ]);
  return json({ ok: true, username });
}
