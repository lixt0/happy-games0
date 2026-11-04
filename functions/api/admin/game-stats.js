import { json, requireAdmin } from './_shared.js';

export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return json({ error: '无管理员权限' }, 403);
  const [summary, games, recent] = await Promise.all([
    env.DB.prepare(`
      SELECT COUNT(*) AS sessions,
        SUM(CASE WHEN ended_at IS NOT NULL THEN 1 ELSE 0 END) AS completed,
        COUNT(DISTINCT username) AS players,
        ROUND(AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms END)) AS avg_duration_ms
      FROM game_sessions
    `).first(),
    env.DB.prepare(`
      SELECT s.game_id,
        COUNT(*) AS sessions,
        SUM(CASE WHEN s.ended_at IS NOT NULL THEN 1 ELSE 0 END) AS completed,
        ROUND(AVG(sc.score), 1) AS avg_score,
        MAX(sc.score) AS best_score,
        ROUND(AVG(s.duration_ms)) AS avg_duration_ms
      FROM game_sessions s
      LEFT JOIN game_scores sc ON sc.session_id = s.id
      GROUP BY s.game_id
      ORDER BY sessions DESC, s.game_id ASC
    `).all(),
    env.DB.prepare(`
      SELECT session_id, game_id, username, score, outcome, duration_ms, created_at
      FROM game_scores
      ORDER BY created_at DESC
      LIMIT 20
    `).all(),
  ]);
  return json({
    summary: summary || { sessions: 0, completed: 0, players: 0, avg_duration_ms: 0 },
    games: games.results || [],
    recent: recent.results || [],
  });
}
