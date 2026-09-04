# MCP.md — Life OS Universal MCP Interface

> Version: 1.0.0  
> Branch: `feat/mcp-platform`  
> Updated: 2026-09-04

---

## 1. What Life OS MCP Is

Life OS MCP is a **Model Context Protocol server** that exposes your personal Life OS data and actions to any MCP-compatible client.

It is a **universal interface** — not built for any specific client (Claude Desktop, Cursor, Kairos, etc.), though any of them can connect to it.

**What it is NOT:**
- Not a replacement for the web UI
- Not an OpenClaw or Obsidian integration
- Not a second database

---

## 2. Architecture

```
MCP Client (Claude Desktop, Inspector, custom agent, etc.)
                     │
                  stdio
                     │
         Life OS MCP Server (backend/src/mcp/)
                     │
              token verification
                     │
         Life OS Service Layer (TaskService, HabitService, etc.)
                     │
                   MongoDB
```

The MCP server is a **separate Node.js process** from the Express REST API. Both connect to the same MongoDB and share the same service classes. Neither process knows about the other.

---

## 3. Authentication

**Mechanism:** Life OS JWT, passed as a `token` argument in every tool call.

**How to get a token:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "..."}'
# response: { "token": "eyJ..." }
```

Use that token as the `token` argument in every MCP tool call.

**Security properties:**
- Token expiry: 30 days
- `userId` is always derived from the verified JWT — never from client-supplied arguments
- MFA challenge tokens are explicitly rejected
- Invalid/expired tokens cause immediate failure before any service call

**Known limitation:** No revocation mechanism without rotating `JWT_SECRET`. Future improvement: Personal Access Tokens (PATs).

---

## 4. Transport

**stdio** — the MCP server communicates via stdin/stdout.

No HTTP port is opened by the MCP process. The existing Express API (`PORT=4000`) runs completely separately.

---

## 5. Available Tools

All tools require a `token` string argument (your Life OS JWT).

### `get_tasks`
Returns all tasks, optionally filtered by status.

**Input:**
```json
{
  "token": "eyJ...",
  "status": "todo"  // optional: "todo" | "in_progress" | "done"
}
```

**Output:** Array of `{ id, title, status, priority, dueDate, tags, createdAt }`

---

### `create_task`
Creates a new task.

**Input:**
```json
{
  "token": "eyJ...",
  "title": "Book dentist appointment",  // required
  "priority": "high",                   // optional: "low" | "medium" | "high"
  "dueDate": "2026-09-10",              // optional: YYYY-MM-DD
  "tags": ["health"],                   // optional: max 10
  "notes": "..."                        // optional
}
```

**Output:** The created task object.

---

### `complete_task`
Marks a task as done. Idempotent — safe to call multiple times.

**Input:**
```json
{
  "token": "eyJ...",
  "task_id": "507f1f77bcf86cd799439011"  // 24-char MongoDB ID
}
```

---

### `get_habits`
Returns all habits with their completion dates.

**Input:** `{ "token": "eyJ..." }`

**Output:** Array of `{ id, name, icon, frequency, completedDates }`

---

### `log_habit`
Marks a habit complete for a date. Idempotent.

**Input:**
```json
{
  "token": "eyJ...",
  "habit_id": "507f1f77bcf86cd799439011",
  "date": "2026-09-04"  // optional: defaults to today UTC
}
```

---

### `quick_capture`
Saves a thought, idea, to-do, or reminder to your inbox.

**Input:**
```json
{
  "token": "eyJ...",
  "text": "Remember to check the project deadline",  // required
  "type": "reminder",   // optional: "thought" | "idea" | "todo" | "reminder"
  "tags": ["work"]      // optional
}
```

MCP-originated captures are tagged with `source: "mcp"` in both the Capture document and the AuditLog.

---

### `get_captures`
Returns inbox captures.

**Input:**
```json
{
  "token": "eyJ...",
  "processed": false,    // optional: filter by processed status
  "type": "todo",        // optional: filter by type
  "limit": 50            // optional: max 100
}
```

---

### `get_goals`
Returns goals, optionally filtered by status.

**Input:**
```json
{
  "token": "eyJ...",
  "status": "active"  // optional: "active" | "completed" | "paused"
}
```

**Output:** Array of `{ id, title, category, status, progress, target, unit, deadline, createdAt }`

---

### `get_projects`
Returns projects, optionally filtered by status.

**Input:**
```json
{
  "token": "eyJ...",
  "status": "active"  // optional: "active" | "completed" | "paused" | "archived"
}
```

---

### `get_today`
Returns a complete overview of today's Life OS state.

**Input:**
```json
{
  "token": "eyJ...",
  "tz": 330  // optional: timezone offset in minutes ahead of UTC (330 = UTC+5:30)
}
```

**Output:** `{ date, tasks, habits, goals, journal, inbox, projects }`

---

### `search_life`
Keyword search across all Life OS collections.

**Input:**
```json
{
  "token": "eyJ...",
  "query": "gym workout",    // required
  "types": ["task", "note"], // optional: filter by entity type
  "limit": 20                // optional: max 50
}
```

**Output:** `{ query, total, durationMs, results: [{ id, type, title, subtitle, snippet, view, score }] }`

---

## 6. Resources

Resources are read-only snapshots. They use **UTC** (no timezone argument). For timezone-aware queries, use the `get_today` tool.

### `life://today`
Today's Life OS summary — tasks, habits, goals, journal, inbox, projects.

### `life://inbox`
Up to 50 unprocessed captures (inbox items).

---

## 7. Prompts

Not implemented in v1. No strong use case identified for static reusable prompts.

---

## 8. Security

See [MCP_SECURITY.md](./MCP_SECURITY.md) for the full threat model and protections.

Summary:
- Every tool call requires a valid JWT
- `userId` always comes from the token — never trusted from client input
- Tool outputs never contain secrets, passwords, or credentials
- No destructive operations in v1

---

## 9. User Isolation

Every tool call is scoped to the authenticated user. A user with token A cannot access, modify, or discover data belonging to a user with token B.

This is verified by tests in `backend/src/tests/mcp.test.ts`.

---

## 10. Local Development

```bash
cd backend

# 1. Ensure .env has JWT_SECRET and MONGODB_URI
# 2. Start the MCP server in development mode
npm run mcp:dev

# 3. Test with the official MCP inspector
npx @modelcontextprotocol/inspector tsx src/mcp/index.ts
```

The MCP server and the REST API server are separate processes. You can run both simultaneously.

---

## 11. Production Usage

```bash
cd backend
npm run build         # compile TypeScript to dist/
npm run mcp           # run compiled MCP server
```

For Claude Desktop, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "life-os": {
      "command": "node",
      "args": ["/absolute/path/to/life-os/backend/dist/mcp/index.js"],
      "env": {
        "JWT_SECRET": "...",
        "MONGODB_URI": "..."
      }
    }
  }
}
```

---

## 12. Testing

```bash
cd backend
JWT_SECRET=test-secret npm test src/tests/mcp.test.ts
```

Tests cover:
- Token validation
- Error mapping (no secret leakage)
- User isolation (cross-user access blocked)
- Service delegation (correct userId forwarded)
- MCP source tracking (`source: 'mcp'`)

---

## 13. Deployment Considerations

- The MCP server needs `JWT_SECRET` and `MONGODB_URI` — same as the REST API
- No additional infrastructure required
- For remote access, an HTTP/SSE transport would be needed (not implemented in v1)
- The current stdio transport is designed for local use only

---

## 14. Version

MCP Interface: **1.0.0**  
Life OS Backend: **0.1.0**  
MCP SDK: **@modelcontextprotocol/sdk@1.30.0**

Breaking changes to tool names or schemas will increment the MCP Interface version.

---

## 15. How to Add a Future Tool

1. Verify the Life OS service capability exists (check `src/services/`)
2. Create a tool handler file in `src/mcp/tools/`
3. Import and register it in `src/mcp/index.ts`
4. Add Zod input schema validation
5. Extract `userId` from `verifyMcpToken(token)`
6. Call the existing service method with that `userId`
7. Return structured JSON in the `content` array
8. Add tests to `src/tests/mcp.test.ts`
9. Update this document

---

## 16. What Is Intentionally NOT Exposed

| Capability | Reason |
|-----------|--------|
| Delete task/habit/goal/project | Destructive, no confirmation in v1 |
| Journal write | High risk of accidental overwrite |
| Expense/workout logging | Lower priority — add in v2 |
| Backup/restore | Infrastructure level |
| Password/auth management | Security critical |
| Direct DB queries | Prohibited by design |
| Data export | Wrong tool for agents |
| Another user's data | Never — enforced by token |
