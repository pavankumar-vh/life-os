# BACKUP_FORMAT.md — Life OS Backup Format Specification

## Version: 2.0

## Overview

Life OS backups are versioned JSON files uploaded to Google Drive. Every backup contains a **manifest** (metadata + integrity checksum) and a **data** section (the actual user records).

## File Naming

```
LifeOS_2026-09-04T020000Z_v2.0.json
```

**Format:** `LifeOS_{ISO8601-timestamp}_v{format-version}.json`

- Timestamp uses colons replaced with hyphens for filesystem compatibility
- Format version tracks the structural version of the backup schema
- Legacy files from before v2.0 follow the pattern `lifeos-backup-YYYY-MM-DD.json` — these are still listed and readable by the restore validator

## Top-Level Structure

```json
{
  "manifest": { ... },
  "data": { ... },
  "safeUserSettings": { ... }
}
```

## manifest

```json
{
  "formatVersion": "2.0",
  "appVersion": "0.1.0",
  "createdAt": "2026-09-04T02:00:00.000Z",
  "userId": "6abc...",
  "userEmail": "user@example.com",
  "userName": "Alice",
  "checksum": "sha256hex...",
  "collections": {
    "tasks": 42,
    "habits": 7,
    "journal": 120,
    ...
  },
  "totalRecords": 1234
}
```

| Field | Description |
|-------|-------------|
| `formatVersion` | Backup schema version — used by the restore validator to detect incompatible formats |
| `appVersion` | Life OS app version at time of backup |
| `createdAt` | ISO 8601 UTC timestamp of backup creation |
| `userId` | MongoDB user ID — verified against the requesting user on restore (IDOR prevention) |
| `userEmail` / `userName` | Human-readable identity for display (not used programmatically) |
| `checksum` | SHA-256 hex of `JSON.stringify(data, sortedKeys)` — used for integrity verification |
| `collections` | Per-collection record counts for pre-restore review |
| `totalRecords` | Sum of all collection counts |

## data

Contains one array per Life OS collection. Only collections that exist in the database are included. Empty arrays are included for completeness.

```json
{
  "tasks": [...],
  "goals": [...],
  "projects": [...],
  "habits": [...],
  "notes": [...],
  "journal": [...],
  "workouts": [...],
  "meals": [...],
  "sleep": [...],
  "water": [...],
  "body": [...],
  "expenses": [...],
  "books": [...],
  "bookmarks": [...],
  "flashcards": [...],
  "captures": [...],
  "activity": [...],
  "gratitude": [...],
  "wishlist": [...],
  "focus": [...]
}
```

> **Note:** The `activity` (AuditLog) collection is limited to the last **500 entries** in backup to prevent unbounded file sizes. Full activity history is preserved in MongoDB Atlas.

## safeUserSettings

Non-sensitive user settings restored alongside data. **Never includes secrets.**

```json
{
  "accentColor": "#e8d5b7",
  "goals": {
    "calories": 2200,
    "protein": 150,
    ...
  }
}
```

## Integrity Verification

The `checksum` in the manifest is computed as:

```typescript
crypto
  .createHash('sha256')
  .update(JSON.stringify(data, Object.keys(data).sort()))
  .digest('hex')
```

Key-sorted JSON is used to ensure the checksum is deterministic regardless of key insertion order.

## NEVER INCLUDED in Backups

The following are **explicitly stripped** and will never appear in any Life OS backup:

- `password` (bcrypt hash)
- `passwordResetToken`
- `passwordResetExpires`
- `mfaSecret` (TOTP secret)
- `mfaPendingSecret`
- `mfaRecoveryCodes` (hashed one-time codes)
- `googleTokens` (OAuth access/refresh tokens)
- `settings.aiKeys` (encrypted AI provider keys)

## Safety Checkpoint Files

Before any restore operation, the system creates a safety checkpoint:

```
LifeOS_safety_checkpoint_2026-09-04T020000Z_v2.0.json
```

These files are **never included** in the backup count shown to the user and are **never auto-deleted** by the retention policy. They serve as the immediate rollback point if a restore goes wrong.
