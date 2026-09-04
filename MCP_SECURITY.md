# MCP_SECURITY.md — Life OS MCP Security

> Updated: 2026-09-04

## Threat Model

The Life OS MCP server exposes personal data and write operations to an MCP client (e.g., Claude Desktop) running locally. The primary threats are:

| Threat | Likelihood | Impact |
|--------|-----------|--------|
| Unauthenticated access | Low (stdio, local) | High |
| Token theft (client-side) | Medium | High |
| IDOR — cross-user data access | Low | High |
| Secret leakage in tool output | Low | High |
| Injection via tool arguments | Low | Medium |
| Excessive write operations (agent misuse) | Medium | Medium |
| Destructive operations (delete) | Low | High |

---

## Implemented Protections

### Authentication
- Every tool call requires a `token` argument (Life OS JWT).
- The server calls `verifyToken(token)` before any service call.
- MFA challenge tokens are explicitly rejected.
- Invalid or expired tokens cause immediate `McpError(InvalidParams)` — no service calls made.

### Authorization / User Isolation
- `userId` is **always** derived from the verified JWT — never from tool arguments.
- All service calls (`TaskService.getTasks(userId, ...)`) enforce `userId` ownership.
- Cross-user data access returns `NotFoundError` — same as the REST API (no information disclosure).
- This is verified by tests in `src/tests/mcp.test.ts`.

### Secret Protection
- Tool outputs never include: passwords, JWT secrets, TOTP secrets, recovery codes, OAuth tokens, AI API keys, or server credentials.
- The `toMcpError()` function strips all internal details (stack traces, file paths, DB internals) from error messages.
- The `User` model's sensitive fields (`password`, `mfaSecret`, `googleTokens`, `aiKeys`) are never queried by MCP handlers.

### Write Safety
- No destructive operations (delete) are exposed in v1.
- `complete_task` is idempotent via the service's `_xpAwarded` guard.
- `log_habit` is idempotent via `$addToSet`.
- `quick_capture` is non-idempotent — network retries will create duplicates. Documented as a known limitation.

### Injection Prevention
- Tool inputs are validated by Zod schemas before reaching service calls.
- Services use `sanitizeBody()` which strips `$`-prefixed MongoDB operator keys.
- String lengths are capped at tool level (text: max 10,000, tags: max 10 × 50 chars, query: max 200 chars).

### Transport Security
- stdio transport — no open network port, no unauthenticated HTTP endpoint.
- The MCP process communicates only with its parent process via stdin/stdout.

### Source Tracking
- All MCP-originated captures record `source: 'mcp'` in the Capture document.
- All MCP-originated mutations record `source: 'mcp'` in the AuditLog via the `audit()` function.

---

## Known Limitations

| Limitation | Severity | Recommended Fix |
|-----------|---------|----------------|
| No token revocation without rotating JWT_SECRET | Medium | Implement PAT table with per-token revocation |
| 30-day JWT expiry may be too long | Low | Shorten to 7-day; add refresh mechanism |
| `quick_capture` not idempotent | Low | Add client-supplied idempotency key in v2 |
| No rate limiting on MCP process (stdio) | Low | Acceptable for local use; add for HTTP transport |
| Resources (`life://today`) use server-UTC, not user timezone | Low | Pass tz via ResourceTemplate or use tools |
| No audit logging for READ operations | Low | Acceptable — only writes are audited |

---

## Operations Never Exposed

- Password changes, TOTP setup/disable, recovery code management
- Authentication tokens or session management
- MongoDB direct queries
- Backup and restore operations
- Infrastructure configuration
- User deletion
- Any operation affecting another user's data

---

## Future Improvements

1. **Personal Access Tokens (PATs)** — scoped, revocable long-lived tokens
2. **Tool-level rate limiting** — max N calls per minute per userId
3. **Idempotency keys** for write tools
4. **Audit logging for MCP reads** — optional, for compliance use cases
5. **HTTP/SSE transport** with TLS for remote access scenarios
