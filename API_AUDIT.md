# API Hardening & Architectural Audit

This document summarizes the current state of the Life OS backend, highlighting the architectural shifts made to support external agents (like MCP) and the overall hardening of the API surface.

## 1. Architectural Strategy

**Goal**: Prepare the platform to support seamless integration with external clients (Web UI, future MCP, custom integrations) without replicating business logic.

**Approach**:
- **Service Layer Extraction**: Core business logic (DB mutations, XP awarding, auditing) is heavily decoupled from Express `req`/`res` objects into dedicated services (`TaskService`, `HabitService`).
- **MCP Suitability**: External tools (like MCP servers) can now import and call `TaskService.createTask(userId, payload)` directly. They do not need to mock HTTP requests or re-implement XP awarding rules.

## 2. Security & Rate Limiting

- **Rate Limiting**: 
  - `express-rate-limit` is now globally applied (1000 requests / 15 min per IP) to prevent abuse.
  - A strict limiter is applied to `/api/auth` (50 requests / 15 min) to prevent brute-force attacks.
- **Authorization / Ownership checks**:
  - Validated across the service layer. Database queries explicitly use `{ _id: entityId, userId: authenticatedUserId }` preventing IDOR (Insecure Direct Object Reference). Attempting to mutate another user's entity safely throws a `NotFoundError` (preventing information leakage about other users' data).

## 3. Error Handling

- **`AppError` Standard**: Created a unified error schema via custom classes (`NotFoundError`, `ValidationError`, `ForbiddenError`).
- **Global `errorHandler`**: Caught exceptions yield structured JSON responses `{ error, code, details }` ensuring that backend stack traces do not leak to external clients.
- **`asyncHandler`**: Wrapped routes effortlessly catch unhandled promise rejections.

## 4. Input Validation

- Handled within the Service layer via explicit checks (`throw new ValidationError(...)`) and combined with Mongoose's built-in schema validations.

## 5. Endpoints Assessed (Proof of Concept)

| Endpoint | Auth Required | Authorization | Validation | MCP Suitability |
|----------|---------------|---------------|------------|-----------------|
| `GET /api/tasks` | Yes | Scoped to `req.user.userId` | None | High (`TaskService.getTasks`) |
| `POST /api/tasks` | Yes | Scoped to `req.user.userId` | `TaskService` checks title | High (`TaskService.createTask`) |
| `PUT /api/tasks/:id` | Yes | `{ _id: id, userId }` query | Checked by Mongoose / `TaskService` | High (`TaskService.updateTask`) |
| `DELETE /api/tasks/:id` | Yes | `{ _id: id, userId }` query | None | High (`TaskService.deleteTask`) |
| `GET /api/habits` | Yes | Scoped to `req.user.userId` | None | High (`HabitService.getHabits`) |
| `POST /api/habits` | Yes | Scoped to `req.user.userId` | `HabitService` checks name | High (`HabitService.createHabit`) |
| `PUT /api/habits/:id` | Yes | `{ _id: id, userId }` query | Checked by Mongoose | High (`HabitService.updateHabit`) |
| `POST /api/habits/:id/log`| Yes | `{ _id: id, userId }` query | Validates date string format | High (`HabitService.logCompletion`)|

## 6. Next Steps (For Future Engineers)
- Incrementally migrate remaining routes (`goals.ts`, `workouts.ts`, etc.) to this Service pattern using `asyncHandler`.
- Formalize validation layers (e.g. Zod schemas) if payload structures grow in complexity.
