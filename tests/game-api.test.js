import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_TYPES, GAME_ID_RE, numberOrNull, safeJson } from '../functions/api/game/_shared.js';
import { createSession, finishSessionForGame, recordEvents } from '../functions/services/game-service.js';

function fakeDb(session = null) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() { return session; },
        async run() { calls.push(this); return { success: true }; },
      };
      return statement;
    },
    async batch(statements) {
      calls.push(...statements);
      return statements.map(() => ({ success: true }));
    },
  };
}

test('telemetry validation accepts bounded values and known event types', () => {
  assert.equal(GAME_ID_RE.test('gomoku'), true);
  assert.equal(GAME_ID_RE.test('../gomoku'), false);
  assert.equal(EVENT_TYPES.has('score_snapshot'), true);
  assert.equal(EVENT_TYPES.has('arbitrary_event'), false);
  assert.equal(numberOrNull('42'), 42);
  assert.equal(numberOrNull(Infinity), null);
  assert.equal(safeJson({ score: 2 }), '{"score":2}');
  assert.equal(safeJson({ text: 'x'.repeat(9000) }), null);
});

test('createSession writes through the repository boundary', async () => {
  const db = fakeDb();
  await createSession(db, {
    id: '5cdf34be-bb3d-452c-8971-fb4a50ee89d0',
    gameId: 'jump',
    username: 'tester',
    anonymousId: null,
    metadata: '{}',
  });
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].sql, /INSERT INTO game_sessions/);
  assert.equal(db.calls[0].values[1], 'jump');
});

test('recordEvents rejects missing and completed sessions', async () => {
  const missing = await recordEvents(fakeDb(null), { sessionId: 'x', gameId: 'jump', events: [] });
  assert.equal(missing.error, 'not_found');
  const finished = await recordEvents(fakeDb({ game_id: 'jump', status: 'won' }), { sessionId: 'x', gameId: 'jump', events: [] });
  assert.equal(finished.error, 'finished');
  const forbidden = await recordEvents(fakeDb({ game_id: 'jump', status: 'playing', username: 'owner' }), { sessionId: 'x', gameId: 'jump', username: 'other', events: [] });
  assert.equal(forbidden.error, 'forbidden');
});

test('recordEvents batches normalized repository writes', async () => {
  const db = fakeDb({ game_id: 'jump', status: 'playing' });
  const result = await recordEvents(db, {
    sessionId: 'session',
    gameId: 'jump',
    username: 'tester',
    events: [{ eventId: 'event', eventType: 'score_snapshot', score: 5, scoreDelta: 1, payload: '{}', clientAt: 1 }],
  });
  assert.equal(result.accepted, 1);
  assert.match(db.calls[0].sql, /INSERT OR IGNORE INTO game_events/);
  assert.equal(db.calls[0].values[2], 'jump');
});

test('finishSessionForGame persists both session result and score', async () => {
  const db = fakeDb({ game_id: 'jump', status: 'playing', started_at: Date.now() - 100 });
  const result = await finishSessionForGame(db, {
    sessionId: 'session',
    gameId: 'jump',
    username: 'tester',
    outcome: 'lost',
    score: 12,
    durationMs: 100,
    metadata: '{}',
  });
  assert.equal(result.score, 12);
  assert.equal(db.calls.length, 2);
  assert.match(db.calls[0].sql, /UPDATE game_sessions/);
  assert.match(db.calls[1].sql, /INSERT OR IGNORE INTO game_scores/);
});
