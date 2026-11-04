# Happy Games Architecture

## Direction

The project remains a multi-page static site deployed to Cloudflare Pages. Each game keeps its own domain logic and renderer, while lifecycle, score, feedback, authentication, and data access move into shared contracts.

```text
page -> shared UI/runtime -> game domain -> API client -> Pages Functions -> D1
```

The domain layer must stay independent of DOM, Canvas, network, and database code. Pages and renderers consume snapshots from the domain layer. The shared runtime owns lifecycle events, score snapshots, feedback batching, and end-of-session persistence.

## Game runtime contract

Every migrated game exposes a controller with `start`, `pause`, `resume`, `applyInput`, `getSnapshot`, `getScore`, `finish`, `reset`, and `destroy`. Existing games may be adapted incrementally; no all-at-once SPA rewrite is required.

## Feedback and scores

`game_sessions` stores one lifecycle record per run. `game_events` stores bounded, whitelisted key events. `game_scores` stores the final score and outcome. Client identity is optional; authenticated usernames are resolved from the `hg_token` cookie on the server. Client scores are useful telemetry but must not be treated as trusted leaderboard data without server-side rule validation.

The client runtime batches events and keeps network failures out of the play loop. The API validates game IDs, event types, payload size, numeric ranges, session ownership by session ID, and duplicate event IDs.

## Backend boundaries

Pages Functions are transport adapters. Services own game-session and feedback workflows. Repositories own D1 SQL. New migrations live in `migrations/` and are mirrored in `schema.sql` for fresh databases.

## Migration rules

1. Keep existing URLs and static deployment behavior stable.
2. Migrate representative games before changing every page.
3. Keep pure game logic tests green after each migration.
4. Add browser coverage for lifecycle, scores, offline behavior, and responsive layout.
