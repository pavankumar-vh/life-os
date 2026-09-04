# Pre-MCP Readiness Audit

This audit evaluates the Life OS backend to determine its readiness to expose a universal Model Context Protocol (MCP) interface.

## 1. Is authentication safe enough for MCP?
**Partially.** The backend currently uses secure JWTs and MFA for the web client. However, MCP clients typically need long-lived Personal Access Tokens (PATs) or API keys. Currently, Life OS does not have a native PAT system. Relying on short-lived web JWTs for an MCP server will result in poor UX (frequent disconnections).

## 2. Is authorization reliable enough for MCP?
**Yes.** Tenant isolation is fundamentally sound. Database queries consistently enforce `{ userId }` matching, preventing cross-user data leakage (IDOR). 

## 3. Which services are clean enough to expose through MCP?
Currently, **Tasks, Habits, Search, Today, and Captures** are clean enough. The recent API hardening extracted business logic into `TaskService` and `HabitService`, making them perfectly decoupled and ready for direct invocation by an MCP server without faking HTTP requests.

## 4. Which operations should NOT be exposed?
- Account management (changing passwords, resetting MFA, deleting the account).
- System-level operations (Importing/Exporting full database backups).
- Modifying AI provider keys or global user settings.

## 5. Which operations require confirmation?
- Any `DELETE` operation (deleting tasks, goals, journal entries).
- Destructive updates (e.g., overwriting a large journal entry).
- High-value financial logs (e.g., deleting an expense).

## 6. Which operations are destructive?
- `deleteTask()`, `deleteHabit()`, `unlogHabit()`
- Deleting or heavily modifying existing captures, journal entries, or vault attachments.

## 7. Which operations need idempotency?
- `logHabit()`: An agent logging a habit twice in the same day due to a retry should not crash or award double XP.
- `completeTask()`: Completing a task multiple times should be safe.
- `quickCapture()`: Retries on network failure shouldn't create duplicate captures.

## 8. Which operations need pagination?
- **Global Search**: Agents could be overwhelmed by massive token payloads if search returns hundreds of hits.
- **Timeline / Activity fetching**.
- **Notes and Journal entries lists**.

## 9. Which operations are sensitive?
- **Journal access**: Highly personal, an MCP client shouldn't read old journals unless explicitly requested.
- **Vault access**: Reading sensitive file attachments.

## 10. What should the first MCP toolset contain?
A focused set of non-destructive, high-utility tools:
- `quickCapture(content, source)`
- `createTask(title, dueDate, priority)`
- `searchLife(query)`
- `getTodayOverview()`

## 11. What resources would be useful?
MCP Resources expose readable data. Useful URIs:
- `life://today` (Read-only dashboard data)
- `life://tasks/active`
- `life://habits/today`
- `life://review/weekly`

## 12. What should remain out of MCP?
- UI-specific configurations (theme colors, dashboard layouts).
- The raw `AuditLog` stream (too verbose for an LLM context window).
- Analytics generation (the backend should serve the raw data, let the LLM do the analytics, rather than creating complex backend analytical tools).

## 13. What technical debt should be fixed before MCP?
- **Service Layer Migration**: The remaining 20+ routes (Goals, Workouts, Meals, Expenses, Notes, etc.) are still tightly coupled to Express `req`/`res` objects. They must be migrated to the `Service` pattern (like `TaskService`) before they can be cleanly exposed to MCP.
- **API Keys**: Implement a secure Personal Access Token (PAT) table to allow the user to generate long-lived, revocable tokens specifically for their local MCP server.

## 14. What can safely wait?
- Vector embeddings and semantic search (keyword search is sufficient for v1).
- Complex graph relationships.
- Deep integration with external tools (Obsidian, OpenClaw) via MCP.

---

## Final Readiness Verdict

**READY WITH CONDITIONS**

The Life OS backend possesses a strong foundation. The database models, tenant isolation, global error handling, and rate-limiting are highly mature. The recent creation of `TaskService` and `HabitService` proves the architecture can cleanly support MCP.

**Conditions for full readiness:**
1. Complete the migration of all target entities (Expenses, Journal, Notes) to the decoupled `Service` pattern.
2. Implement a dedicated API Key (PAT) system for secure, long-lived MCP authentication.
