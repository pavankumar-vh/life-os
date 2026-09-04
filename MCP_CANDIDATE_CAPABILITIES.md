# MCP Candidate Capabilities — Life OS

> **Status:** Pre-MCP planning document. MCP is NOT implemented.  
> This document describes what a future Life OS MCP server should expose,
> based on the current service layer architecture.
>
> Updated: 2026-09-04

---

## Architecture Reminder

```
MCP Client (Claude, Kairos, etc.)
          │
          ▼
   Life OS MCP Server   ← NOT YET BUILT
          │
          ▼
   Life OS Services     ← THIS IS WHAT IS BUILT NOW
          │
          ▼
       MongoDB
```

MCP must call the **same** service methods used by the web UI.
No business logic should be duplicated.

---

## READ Capabilities

### Daily State

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getToday()` | `GET /api/today` (aggregation route) | Returns today's tasks, habits, goals, inbox, projects in one call |
| `getInbox()` | `CaptureService.getCaptures(userId, { processed: false })` | Unprocessed captures |

### Tasks

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getTasks()` | `TaskService.getTasks(userId)` | All tasks, sorted newest first |
| `getActiveTasks()` | Filter `status !== 'done'` | Client-side filter |
| `getOverdueTasks()` | Filter `status !== 'done' && dueDate < today` | Client-side filter |
| `getTodayTasks()` | Filter `dueDate === today` | Client-side filter |

### Goals

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getGoals()` | `GoalService.getGoals(userId)` | All goals |
| `getActiveGoals()` | Filter `status === 'active'` | Client-side filter |

### Projects

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getProjects()` | `ProjectService.getProjects(userId)` | All projects |
| `getActiveProjects()` | Filter `status === 'active'` | Client-side filter |

### Habits

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getHabits()` | `HabitService.getHabits(userId)` | All habits |
| `getHabitsForDate(date)` | Filter by `completedDates.includes(date)` | Client-side filter |

### Journal & Notes

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getJournalEntries(limit)` | `JournalService.getEntries(userId, limit)` | Recent entries |
| `getJournalEntry(date)` | `Journal.findOne({ userId, date })` | Specific day |
| `getNotes()` | `Note.find({ userId }).limit(200)` | All notes, 200 cap |

### Search

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `searchLife(query)` | `SearchService.search({ q, userId, limit })` | Keyword search across 9 collections |

### Review

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getWeeklyReview(start, end)` | `GET /api/review/weekly?start=&end=` | Cross-collection aggregation |

### Workouts & Health

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getWorkouts()` | `WorkoutService.getWorkouts(userId)` | Last 100 workouts |

### Captures

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `getCaptures(filters)` | `CaptureService.getCaptures(userId, filters)` | Supports text search, type, processed filter |
| `getUnprocessedCaptures()` | `CaptureService.getCaptures(userId, { processed: 'false' })` | Inbox items |

---

## WRITE Capabilities

### Quick Capture (Highest Priority for MCP)

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `quickCapture(text, type?, tags?)` | `CaptureService.createCapture(userId, { text, type, source: 'future_mcp' })` | Source should be `'future_mcp'` |

### Tasks

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `createTask(title, dueDate?, priority?)` | `TaskService.createTask(userId, data)` | |
| `completeTask(taskId)` | `TaskService.updateTask(userId, taskId, { status: 'done' })` | Awards XP atomically |
| `updateTask(taskId, updates)` | `TaskService.updateTask(userId, taskId, updates)` | |

### Habits

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `logHabit(habitId, date)` | `HabitService.logCompletion(userId, habitId, date)` | Idempotent — `$addToSet` |
| `unlogHabit(habitId, date)` | `HabitService.unlogCompletion(userId, habitId, date)` | ⚠️ Requires confirmation |

### Workouts

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `logWorkout(name, duration, date?)` | `WorkoutService.logWorkout(userId, data)` | Awards XP |

### Goals

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `updateGoalProgress(goalId, progress)` | `GoalService.updateGoal(userId, goalId, { progress })` | |

### Journal

| Capability | Service Method | Notes |
|-----------|---------------|-------|
| `saveJournalEntry(date, content, mood?)` | `JournalService.saveEntry(userId, data)` | Upsert-by-date |

---

## ⛔ DO NOT EXPOSE via MCP

| Capability | Reason |
|-----------|--------|
| `deleteUser()` | Irreversible, destructive |
| `resetPassword()` | Authentication internals |
| `manageMFA()` | Security internals |
| `setAiKeys()` | Secret management |
| `exportData()` | Large payload, not a tool use case |
| `importData()` | Could overwrite user data |
| `restoreBackup()` | Requires explicit two-step confirmation, not suitable for autonomous agents |
| `deleteJournalEntry()` | Destructive personal data |
| `deleteGoal()` | Destructive |
| `deleteProject()` | Destructive |
| `rawAuditLog()` | Too verbose, not useful for LLM context |
| `googleTokens` | OAuth internals |
| Any password field | Security |

---

## ⚠️ HIGH-RISK — Require Confirmation Before Exposing

| Capability | Risk | Mitigation |
|-----------|------|------------|
| `deleteTask(taskId)` | Irreversible | Require explicit confirmation parameter |
| `unlogHabit(habitId, date)` | Removes XP, history | Require confirmation |
| `deleteCapture(captureId)` | Data loss | Soft-delete preferred |
| `updateExpense()` | Financial data | Audit trail required |
| Bulk update operations | Could corrupt many records | Not recommended for v1 MCP |

---

## Idempotency Notes

| Operation | Safe for Retries? | Notes |
|-----------|------------------|-------|
| `quickCapture()` | ⚠️ No | Network retry → duplicate captures. Callers should use client-generated ID or deduplicate by text+timestamp. |
| `logHabit(date)` | ✅ Yes | Uses `$addToSet` — logging same date twice is safe |
| `completeTask()` | ✅ Yes | `_xpAwarded` flag prevents double XP |
| `saveJournalEntry(date)` | ✅ Yes | Upsert-by-date — safe to retry |
| `logWorkout()` | ⚠️ No | Creates a new document each time — requires deduplication |

---

## Suggested First MCP Toolset (v1)

A minimal, safe, high-value starting set:

```
quickCapture(text, type?)   — primary entry point for any agent
createTask(title, dueDate?) — structured task creation
searchLife(query)           — universal knowledge retrieval
getTodayOverview()          — read-only daily context
getCaptures(processed=false) — read inbox
```

These 5 tools cover the most common "AI assistant" interactions with minimal risk.

---

## Authentication for MCP

Current state: Web JWTs (short-lived, 7d expiry).

MCP clients need **long-lived, revocable tokens**. Required before MCP launch:
- Personal Access Token (PAT) table in the User model
- `POST /api/auth/tokens` — create PAT
- `GET /api/auth/tokens` — list PATs  
- `DELETE /api/auth/tokens/:id` — revoke PAT
- PAT scope should be limited (e.g., `read:all`, `write:captures`, `write:tasks`)

This is explicitly **not implemented** in this phase.
