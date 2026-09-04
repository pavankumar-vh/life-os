# MCP_IMPLEMENTATION_PLAN.md — Life OS Universal MCP Interface

> Based on actual repository inspection on 2026-09-04.

## Architecture Discovered

- **Runtime**: Node.js 25.6.1, Express 4.x, TypeScript 5.7, CommonJS
- **Database**: MongoDB via Mongoose 8.x
- **Auth**: JWT (30-day), HS256, via `verifyToken()` in `lib/auth.ts`
- **Services confirmed**: TaskService, HabitService, GoalService, CaptureService, WorkoutService, ProjectService, JournalService, SearchService
- **Activity tracking**: AuditLog model with `source: 'mcp'` already in enum

## MCP Existence Before This Work

**None.** Zero MCP files existed before this branch.

## Decisions Made

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth mechanism | Existing 30-day JWT | No PAT system exists; smallest safe option |
| Transport | stdio | Universal local transport; no open port |
| Tool count | 11 | Bounded to real service capabilities |
| Resource count | 2 | today + inbox |
| Prompts | 0 | No strong case for v1 |

## Tools Implemented

`get_tasks`, `create_task`, `complete_task`, `get_habits`, `log_habit`, `quick_capture`, `get_captures`, `get_goals`, `get_projects`, `get_today`, `search_life`

## Resources Implemented

`life://today`, `life://inbox`

## Capabilities Excluded

Delete operations, journal writes, expense/workout logging, auth management, backup/restore, raw DB queries, data export.
