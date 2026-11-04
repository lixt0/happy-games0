CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  username TEXT,
  anonymous_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  status TEXT NOT NULL DEFAULT 'playing',
  score REAL,
  duration_ms INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_started
  ON game_sessions(game_id, started_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_username_started
  ON game_sessions(username, started_at);

CREATE TABLE IF NOT EXISTS game_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  username TEXT,
  event_type TEXT NOT NULL,
  score REAL,
  score_delta REAL,
  payload TEXT NOT NULL DEFAULT '{}',
  client_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_events_session_created
  ON game_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_events_game_type_created
  ON game_events(game_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS game_scores (
  session_id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  username TEXT,
  score REAL NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL,
  duration_ms INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_scores_game_score
  ON game_scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_username_game
  ON game_scores(username, game_id, score DESC);
