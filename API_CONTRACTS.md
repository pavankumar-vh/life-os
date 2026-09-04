# API_CONTRACTS.md — Life OS Stable API Behavior

> **Version:** 2.0  
> **Updated:** 2026-09-04  
> **Branch:** `chore/api-platform-hardening`

This document describes the stable, tested behavior of the Life OS backend API.
It is the authoritative reference for any client (web UI, future MCP, integrations).

---

## Global Conventions

### Authentication
All `/api/*` routes (except `/api/auth/*` and `/api/health`) require:
```
Authorization: Bearer <jwt>
```
A missing or invalid token returns:
```json
HTTP 401
{ "error": "Unauthorized", "code": "UNAUTHORIZED" }
```

### Authorization
All database operations are **strictly scoped to the authenticated user**.
The server derives `userId` from the JWT — client-provided `userId` fields are stripped.
Cross-user access returns `404 Not Found`, not `403 Forbidden` (to prevent information leakage).

### Error Format
All errors follow a consistent structure:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}  // optional, present for validation errors
}
```

Common codes:
| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Resource not found (or belongs to another user) |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `INVALID_ID` | 400 | Malformed MongoDB ObjectId in path |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Input Sanitization
The server strips the following from all request bodies:
- `userId` — always derived from JWT
- `_id`, `__v` — server-controlled
- Keys starting with `$` — MongoDB operator injection prevention

---

## Rate Limits

| Scope | Limit |
|-------|-------|
| Global | 1000 req / 15 min per IP |
| `/api/auth/*` | 50 req / 15 min per IP |
| MFA endpoints | 10 req / 15 min per IP |

Rate limit exceeded: `HTTP 429 { "error": "Too many requests...", "code": "RATE_LIMIT_EXCEEDED" }`

---

## Service Boundaries (MCP-Ready)

The following operations are implemented as reusable services. The web API and any future MCP server both call these same services.

| Service | Methods |
|---------|---------|
| `TaskService` | `getTasks`, `createTask`, `updateTask`, `deleteTask` |
| `HabitService` | `getHabits`, `createHabit`, `updateHabit`, `deleteHabit`, `logCompletion`, `unlogCompletion` |
| `GoalService` | `getGoals`, `createGoal`, `updateGoal`, `deleteGoal` |
| `CaptureService` | `getCaptures`, `createCapture`, `updateCapture`, `deleteCapture` |
| `WorkoutService` | `getWorkouts`, `logWorkout`, `updateWorkout`, `deleteWorkout` |
| `ProjectService` | `getProjects`, `createProject`, `updateProject`, `deleteProject` |
| `JournalService` | `getEntries`, `saveEntry`, `deleteEntry` |
| `SearchService` | `search(query)` |
| `BackupService` | `runBackupForUser`, `verifyChecksum`, `generateBackupFilename` |
| `RestoreService` | `validateBackup`, `applyRestore` |

---

## Endpoints

### Health

#### `GET /api/health`
Returns server and database status. No auth required.
```json
{ "status": "ok", "db": "connected", "timestamp": "2026-09-04T..." }
```
Returns `HTTP 503` when database is not connected.

---

### Auth — `/api/auth`

All endpoints subject to auth rate limiter (50/15min).

#### `POST /api/auth/register`
Body: `{ name, email, password }`
- Returns `201 { user, token }`
- `400` if fields missing or invalid
- `409` if email already registered

#### `POST /api/auth/login`
Body: `{ email, password }`
- Returns `200 { token, user }` or `200 { mfaRequired: true, mfaToken }`
- `400` if fields missing
- `401` if credentials invalid

#### `GET /api/auth/me` *(auth required)*
- Returns the authenticated user (sensitive fields excluded: `password`, `mfaSecret`, `googleTokens`, `settings.aiKeys`)

---

### Tasks — `/api/tasks`

#### `GET /api/tasks`
- Returns all tasks for the authenticated user, sorted newest first
- **No pagination** (tasks are bounded in personal use)

#### `POST /api/tasks`
Body: `{ title, status?, priority?, dueDate?, tags? }`
- `title` is required (non-empty string)
- Returns `201 { task }`
- `400` if title is missing

#### `PUT /api/tasks/:id`
Body: partial task fields
- Returns `200 { task }`
- `404` if task not found or not owned by user
- Awards 15 XP atomically on first `status: 'done'` transition

#### `DELETE /api/tasks/:id`
- Returns `200 { success: true }`
- `404` if not found or not owned

---

### Habits — `/api/habits`

#### `GET /api/habits`
- Returns all habits, sorted by `order`

#### `POST /api/habits`
Body: `{ name, icon?, color?, frequency? }`
- `name` is required
- Returns `201 { habit }`

#### `PUT /api/habits/:id`
- Updates habit metadata (name, icon, color, frequency, order)
- Returns `200 { habit }`

#### `DELETE /api/habits/:id`
- Returns `200 { success: true }`

#### `POST /api/habits/:id/log`
Body: `{ date: "YYYY-MM-DD" }`
- Marks habit as complete for that date
- **Idempotent** — safe to call multiple times for the same date (`$addToSet`)
- Awards 10 XP on first completion of that date
- Returns `200 { habit }`

#### `POST /api/habits/:id/unlog`
Body: `{ date: "YYYY-MM-DD" }`
- Removes completion for that date
- Deducts 10 XP if the date was previously logged
- Returns `200 { habit }`

---

### Goals — `/api/goals`

#### `GET /api/goals`
- Returns up to **100** goals, sorted newest first

#### `POST /api/goals`
Body: `{ title, category?, target?, unit?, deadline?, status? }`
- `title` required
- `target` must be non-negative number if provided
- `status` must be one of: `active | completed | paused`
- Returns `201 { goal }`

#### `PUT /api/goals/:id`
- `status` must be a valid enum value if provided
- Awards 50 XP atomically on first `status: 'completed'` transition
- Returns `200 { goal }`

#### `DELETE /api/goals/:id`
- Returns `200 { success: true }`

---

### Projects — `/api/projects`

#### `GET /api/projects`
- Returns up to **100** projects, sorted by `updatedAt` descending

#### `POST /api/projects`
Body: `{ name, description?, status?, deadline? }`
- `name` required
- `status` must be one of: `active | completed | paused | archived`
- Returns `201 { project }`

#### `PUT /api/projects/:id` / `DELETE /api/projects/:id`
- Standard update/delete with ownership check

---

### Captures — `/api/captures`

#### `GET /api/captures`
Query params: `q`, `type`, `source`, `processed`, `limit` (default 100, max 500), `skip`
- Full-text search via `q` when the `$text` index exists
- Returns array of captures

#### `POST /api/captures`
Body: `{ text, type?, source?, tags? }`
- `text` required (max 10,000 chars)
- `type`: `thought | idea | todo | reminder` (defaults to `thought`)
- `source`: `manual | api | import | automation | future_mcp | future_agent` (defaults to `manual`)
- Tags: max 10, each max 50 chars, lowercased
- Returns `201 { capture }`

#### `PUT /api/captures/:id`
- Updatable fields: `text`, `type`, `tags`, `processed`
- Returns `200 { capture }`

#### `DELETE /api/captures/:id`
- Returns `200 { success: true }`

---

### Journal — `/api/journal`

#### `GET /api/journal`
Query: `limit` (default 100, max 365)
- Returns entries sorted by date descending

#### `POST /api/journal`
Body: `{ date (YYYY-MM-DD, required), title?, content?, mood? (1-5), tags? }`
- **Upsert-by-date** — one entry per day; later write wins
- Returns the upserted entry

#### `DELETE /api/journal/:id`
- Returns `200 { success: true }`

---

### Workouts — `/api/workouts`

#### `GET /api/workouts`
- Returns last **100** workouts, sorted by date descending

#### `POST /api/workouts`
Body: `{ name (required), duration? (0-1440 min), date? (YYYY-MM-DD), exercises? }`
- Awards 25 XP per workout
- Returns `201 { workout }`

#### `PUT /api/workouts/:id` / `DELETE /api/workouts/:id`
- Standard update/delete with ownership check

---

### Notes — `/api/notes`

#### `GET /api/notes`
- Returns up to **200** notes, sorted by `updatedAt` descending

#### `POST /api/notes`
- If body contains `_id`: **upsert** (update existing note by ID)
- If no `_id`: **create** new note
- Returns the note

#### `DELETE /api/notes/:id`
- Returns `200 { success: true }`

---

### Expenses — `/api/expenses`

#### `GET /api/expenses`
Query: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD) — optional date range
- Returns up to **500** expenses, sorted by date descending

#### `POST /api/expenses`
Body: `{ amount (required, number), date? (YYYY-MM-DD), description?, category? }`
- `amount` must be a finite number
- Returns `201 { expense }`

#### `PUT /api/expenses/:id` / `DELETE /api/expenses/:id`
- Standard update/delete with ownership check

---

### Bookmarks — `/api/bookmarks`

#### `GET /api/bookmarks`
- Returns up to **200** bookmarks, sorted newest first

#### `POST /api/bookmarks`
Body: `{ url (required), title?, tags?, category? }`
- Returns `201 { bookmark }`

#### `PUT /api/bookmarks/:id` / `DELETE /api/bookmarks/:id`
- Standard update/delete

---

### Books — `/api/books`

#### `GET /api/books`
- Returns up to **200** books, sorted newest first

#### `POST /api/books`
Body: `{ title (required), author?, status?, notes? }`
- Returns `201 { book }`

#### `PUT /api/books/:id` / `DELETE /api/books/:id`
- Standard update/delete

---

### Search — `/api/search`

#### `GET /api/search?q=...`
Query: `q` (required), `types` (comma-separated), `limit` (default 30, max 100), `skip`
- Keyword search across: tasks, goals, notes, journal, habits, captures, bookmarks, books, projects
- Results include: `id`, `type`, `title`, `subtitle`, `snippet`, `view`, `recordId`, `score`
- Always user-scoped — `userId` never accepted from client

---

### Today Dashboard — `/api/today`

#### `GET /api/today?tz=<minutes>`
`tz` — minutes ahead of UTC (e.g., 330 for IST UTC+5:30). Default: 0 (UTC).
- Returns: `{ date, tasks, habits, goals, journal, inbox, projects }`
- No write operations

---

### Weekly Review — `/api/review`

#### `GET /api/review/weekly?start=YYYY-MM-DD&end=YYYY-MM-DD`
- Returns cross-collection aggregation for the given date range
- Both `start` and `end` are required

---

### Activity / Timeline — `/api/activity`

#### `GET /api/activity`
Query: `limit` (default 50, max 200), `skip`
- Returns enriched audit log events (those with `eventType` set)
- Fields: `eventType`, `source`, `metadata`, `timestamp`, `collectionName`, `documentId`

---

### Export — `/api/export`

#### `GET /api/export`
- Returns a full JSON export of all user data
- Sensitive fields excluded (see `EXPORT_FORMAT.md`)

---

### Backup / Restore — `/api/backup` + `/api/google/drive`

See [`BACKUP_AND_RECOVERY.md`](./BACKUP_AND_RECOVERY.md) and [`BACKUP_FORMAT.md`](./BACKUP_FORMAT.md).

---

## Pagination Reference

| Endpoint | Default Limit | Max Limit | Pagination Style |
|----------|-------------|-----------|-----------------|
| `/api/activity` | 50 | 200 | `limit` + `skip` |
| `/api/captures` | 100 | 500 | `limit` + `skip` |
| `/api/chat` | 50 | 100 | `limit` + `skip` |
| `/api/goals` | 100 | 100 | Hard cap |
| `/api/projects` | 100 | 100 | Hard cap |
| `/api/notes` | 200 | 200 | Hard cap |
| `/api/bookmarks` | 200 | 200 | Hard cap |
| `/api/books` | 200 | 200 | Hard cap |
| `/api/expenses` | 500 | 500 | Hard cap |
| `/api/journal` | 100 | 365 | `limit` query param |
| `/api/workouts` | 100 | 100 | Hard cap |
| `/api/search` | 30 | 100 | `limit` + `skip` |

"Hard cap" = a single `.limit()` call with no pagination API. Suitable for personal data volumes.

---

## XP Award Summary

| Action | XP |
|--------|----|
| Complete a task | +15 |
| Log a habit | +10 |
| Unlog a habit | -10 |
| Log a workout | +25 |
| Complete a goal | +50 |

XP awards use atomic `findOneAndUpdate` with `_xpAwarded: { $ne: true }` to prevent double-awarding on retries.

---

## Known Limitations

1. **No PAT (Personal Access Token) system** — MCP will need long-lived tokens
2. **No webhook support** — events are in the AuditLog but not pushed to external systems
3. **Search is keyword-only** — no semantic/vector search
4. **Backup scheduler is in-memory** — lost on process restart
5. **Single-tenant per deployment** — no multi-organization support
