# BACKUP_AND_RECOVERY.md — Life OS Data Backup & Recovery Guide

## 1. Backup Architecture

```
Life OS (Node.js / Express)
   ↓
MongoDB Atlas (user data at rest)
   ↓
BackupService (gather → manifest → checksum → compress)
   ↓
Google Drive API (authenticated per-user)
   ↓
"LifeOS Backups" folder in user's personal Drive
```

Backups are **application-managed** and do not rely on MongoDB Atlas paid backup tiers.

---

## 2. Google Drive Authorization

The Google Drive integration uses the existing Life OS Google OAuth 2.0 flow. There are **two completely independent Google concerns in Life OS:**

| Concern | What it is |
|---------|-----------|
| **Life OS Account** | email/password + JWT + optional TOTP. Google OAuth is NOT used for login. |
| **Google API Integrations** | Separate OAuth2 for Drive, Calendar, and Fitness — used independently of the account |

The `drive.file` scope is requested, which gives Life OS access only to files it creates — not the user's entire Drive.

**OAuth tokens are stored encrypted (AES-256-GCM) in MongoDB.** They are never written to logs, API responses, or backup files.

---

## 3. Backup Schedule

| Mode | Behavior |
|------|---------|
| **Manual** | Triggered from Settings → Google → "Backup Now" |
| **Automatic** | Runs every N hours for users with "Automatic Backups" enabled |

The automatic schedule uses `setInterval` in `backend/src/index.ts`. No external job scheduler is required. This is suitable for the current 1 vCPU / 1 GB RAM deployment.

### Configuration

```env
BACKUP_INTERVAL_HOURS=24        # How often scheduled backups run (default: 24h)
BACKUP_RETAIN_DAILY=7           # Number of daily backups to keep
BACKUP_RETAIN_WEEKLY=4          # Number of weekly backups to keep beyond that
```

Automatic backups only run for users who have **both** Google connected **and** "Automatic Backups" enabled in Settings.

---

## 4. Retention Policy

After each backup, `BackupService.applyRetentionPolicy()` cleans old files:

1. Keep the most recent `BACKUP_RETAIN_DAILY` (default: 7) backups
2. Of the remainder, keep 1 per week for `BACKUP_RETAIN_WEEKLY` (default: 4) additional weeks
3. Delete anything older

**Safety checkpoint files are never auto-deleted.** (See Section 7.)

---

## 5. Backup Format

See [BACKUP_FORMAT.md](./BACKUP_FORMAT.md) for the full specification.

Summary:
- **Format version:** 2.0
- **Filename:** `LifeOS_2026-09-04T020000Z_v2.0.json`
- Contains: `manifest`, `data`, `safeUserSettings`
- Manifest includes SHA-256 checksum for integrity verification
- 21 user data collections included
- **Secrets are never included** (see excluded fields below)

---

## 6. Integrity Verification

Every backup includes a `manifest.checksum` — a SHA-256 hash of the `data` section.

Before any restore, `RestoreService.validateBackup()`:
1. Downloads the file from Drive
2. Verifies it parses as valid JSON
3. Verifies the manifest exists with required fields
4. Computes a fresh checksum and compares against `manifest.checksum`
5. Verifies `manifest.userId` matches the requesting user

A restore is only offered to the user if validation passes. A checksum mismatch is surfaced as a warning but does not automatically block — the user sees the warning before confirming.

---

## 7. Restore Procedure

The restore is a **two-step, explicitly-confirmed** process:

### Step 1: Validate (non-destructive)

```
POST /api/backup/restore/validate
Body: { fileId: "drive-file-id" }
```

- Downloads backup from Drive
- Runs full validation (manifest, checksum, ownership)
- Returns: `{ valid, errors, manifest, collectionSummary, checksumValid }`
- **Does NOT touch the database**

### Step 2: Confirm (destructive — requires explicit consent)

```
POST /api/backup/restore/confirm
Body: { fileId: "drive-file-id", confirm: true }
```

**Steps internally:**
1. Re-validates backup
2. Verifies `manifest.userId === requesting user` (IDOR prevention)
3. Creates a **safety checkpoint** of current data in Drive (`LifeOS_safety_checkpoint_*`)
4. If safety checkpoint fails → **aborts restore** (does not proceed)
5. Applies merge-restore to all 20 collections
6. Restores safe settings (accentColor, goals only — never AI keys)
7. Returns: `{ success, restoredCount, safetyBackupId, safetyBackupName, errors }`

### Restore Mode: Merge (Not Wipe)

The restore uses **upsert semantics** (`findOneAndUpdate` with `upsert: true`). This means:
- Records in the backup are added or updated
- Records that exist in the database but NOT in the backup are **NOT deleted**
- This is the safest possible restore mode — no data is silently destroyed

> **Limitation:** A true point-in-time "wipe and restore" (exact database state) is not implemented. If you need an exact-state restore, use the MongoDB Atlas backup features or contact the administrator. This limitation is documented to prevent false confidence.

---

## 8. Failure Handling

| Failure | Behavior |
|---------|---------|
| Google not connected | Returns `400 Google not connected` |
| Expired OAuth tokens | Google SDK auto-refreshes; if refresh fails, returns `401` with reconnect guidance |
| Drive upload failure | `runBackupForUser` returns `status: 'failed'` — logged, user status updated |
| Malformed backup JSON | Validate step returns `valid: false` with error message |
| Missing manifest | Validate step returns `valid: false` |
| Checksum mismatch | Surfaces as warning — user sees it before confirming |
| Safety checkpoint failure | Restore **aborts** — status `500` with explanation |
| Per-record restore error | Non-fatal: recorded in `errors` array, restore continues |
| Network failure | Standard Express error propagation — no silent failures |

No failure is ever silently swallowed. Backup status (`success / failed / partial`) is persisted to the User model after every attempt.

---

## 9. Security

- **All backup operations are authenticated** — `authMiddleware` required on all routes
- **Backups are user-scoped** — `manifest.userId` is verified against `req.user.userId` on every restore
- **Cross-user restore is impossible** — validation rejects any backup with a mismatched `userId` with an explicit `SECURITY:` error
- **No secrets in responses** — AI keys, OAuth tokens, and MFA secrets are never included in backup JSON
- **No secrets in logs** — only file IDs, counts, and filenames are logged
- **Google tokens are encrypted at rest** (AES-256-GCM, `ENCRYPTION_KEY` env var required)
- **Google OAuth scope is `drive.file`** — Life OS can only access files it creates, not the user's entire Drive

### Backup Encryption at Rest

Backups currently rely on Google Drive's native encryption for files at rest. Application-level encryption of the backup JSON before upload is not implemented.

> **Known Limitation:** A determined attacker with access to the user's Google Drive can read backup files. Encrypting the backup with the `ENCRYPTION_KEY` before upload would add defense-in-depth. This is the recommended next improvement before any enterprise deployment.

---

## 10. Excluded Data

The following are **never included** in any backup:

- `password` (bcrypt hash)
- `passwordResetToken` / `passwordResetExpires`
- `mfaSecret` (active TOTP secret)
- `mfaPendingSecret` (in-progress TOTP enrollment)
- `mfaRecoveryCodes` (bcrypt-hashed recovery codes)
- `googleTokens` (OAuth access/refresh tokens)
- `settings.aiKeys` (encrypted AI provider API keys)

---

## 11. Known Limitations

1. **No wipe-restore mode**: Restore is merge-based. An exact point-in-time restore is not possible without using MongoDB Atlas backup tools.
2. **No backup encryption at rest**: Backup files in Google Drive are not additionally encrypted by Life OS. Google Drive's native encryption applies.
3. **Activity log limited**: The `activity` (AuditLog) collection is limited to the most recent 500 entries in backups to prevent unbounded file sizes.
4. **In-memory scheduler**: The `setInterval` scheduler is lost on process restart. Automatic backups rely on the server process staying alive.
5. **Single Google Drive account**: Backups go to the user's own Google Drive. Multi-destination backup is not supported.
6. **No incremental backups**: Every backup is a full data export.

---

## 12. Manual Emergency Recovery

If the Life OS server is unavailable but you have your backup file:

1. Set up a fresh Life OS instance with a valid MongoDB connection
2. Register with the same email address
3. Use `POST /api/backup/import` with your JSON backup file (legacy endpoint supports all collection types)
4. Alternatively, use `POST /api/backup/restore/confirm` after connecting Google Drive

For MongoDB-level recovery (direct Atlas tools):

```bash
# Use mongorestore if you have a mongodump backup (separate from Life OS application backups)
mongorestore --uri="mongodb+srv://..." --db=lifeos ./dump/lifeos
```

> **Never** run mongorestore with hard-coded credentials. Use environment variables or Atlas console.

---

## 13. How to Verify a Backup

1. Go to **Settings → Google → Google Drive Backup**
2. Find the backup in the list
3. Click the **restore icon (↑)** next to any backup
4. The system downloads and validates the backup without touching your data
5. Review the validation panel — it shows:
   - Backup date and format version
   - Record counts by collection  
   - Checksum validity
   - Any errors
6. Close the panel if just verifying — no changes are made

---

## 14. How to Perform a Safe Restore

> ⚠️ Read this fully before proceeding.

1. Go to **Settings → Google → Google Drive Backup**
2. Click the **restore icon (↑)** next to the backup you want to restore
3. Wait for validation to complete
4. Review the validation panel carefully:
   - Confirm the backup date is correct
   - Confirm the record counts look right
   - Confirm the checksum is valid
5. Read the safety notice: *"A safety checkpoint will be created before restoring"*
6. Click **⚡ Confirm Restore**
7. The system will:
   - Create a safety checkpoint of your current data in Drive
   - Apply the merge-restore
   - Report the number of records restored
8. If the restore reports errors, check the Drive "LifeOS Backups" folder — your safety checkpoint is there and can be used to restore your pre-restore state

> **After restore:** Refresh the page to see updated data.

---

## API Reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/google/drive/backup` | JWT | Trigger manual Drive backup |
| `GET` | `/api/google/drive/backups` | JWT | List Drive backups |
| `POST` | `/api/backup/restore/validate` | JWT | Validate backup (non-destructive) |
| `POST` | `/api/backup/restore/confirm` | JWT | Confirm and apply restore |
| `GET` | `/api/backup/export` | JWT | Export JSON (local download) |
| `POST` | `/api/backup/import` | JWT | Import JSON backup |
