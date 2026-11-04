export async function insertSession(db, session) {
  return db.prepare(`
    INSERT INTO game_sessions
      (id, game_id, username, anonymous_id, started_at, status, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'playing', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at
  `).bind(
    session.id,
    session.gameId,
    session.username,
    session.anonymousId,
    session.startedAt,
    session.metadata,
    session.createdAt,
    session.updatedAt,
  ).run();
}

export async function findSession(db, sessionId) {
  return db.prepare(
    'SELECT id, game_id, status, started_at, username FROM game_sessions WHERE id = ?'
  ).bind(sessionId).first();
}

export async function insertEvents(db, events) {
  return db.batch(events.map(event => db.prepare(`
    INSERT OR IGNORE INTO game_events
      (event_id, session_id, game_id, username, event_type, score, score_delta, payload, client_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.eventId,
    event.sessionId,
    event.gameId,
    event.username,
    event.eventType,
    event.score,
    event.scoreDelta,
    event.payload,
    event.clientAt,
    event.createdAt,
  )));
}

export async function finishSession(db, result) {
  return db.batch([
    db.prepare(`
      UPDATE game_sessions
      SET ended_at = ?, status = ?, score = ?, duration_ms = ?, updated_at = ?
      WHERE id = ?
    `).bind(result.endedAt, result.outcome, result.score, result.durationMs, result.updatedAt, result.sessionId),
    db.prepare(`
      INSERT OR IGNORE INTO game_scores
        (session_id, game_id, username, score, outcome, duration_ms, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      result.sessionId,
      result.gameId,
      result.username,
      result.score,
      result.outcome,
      result.durationMs,
      result.metadata,
      result.createdAt,
    ),
  ]);
}
