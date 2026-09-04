# Life OS Data Export Format

Life OS supports exporting all your personal data in standard, portable formats (JSON or Markdown).

## Formats

### JSON (`?format=json`)
Returns a single JSON object containing arrays for all collections.
The schema is:
```json
{
  "exportedAt": "2026-09-04T00:00:00.000Z",
  "version": "1.0",
  "user": {
    "name": "User",
    "email": "user@example.com",
    "settings": { ... }
    // All secrets (passwords, tokens, MFA secrets, recovery codes) are strictly scrubbed.
  },
  "data": {
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
    "activity": [...]
  }
}
```

### Markdown (`?format=md`)
Returns a single plain-text markdown file that contains all data, logically separated by headers. It is designed to be easily readable and easily parsed by LLMs or plain-text readers.

```markdown
# Life OS Export
Exported At: 2026-09-04T00:00:00.000Z
User: User (user@example.com)

## Tasks
- **Task Title** (Status: done)
  Due: 2026-09-01
  Notes: ...

## Notes
### Note Title
Created: 2026-09-01
[Note body content]

## Journal
### 2026-09-01
Mood: 4/5
[Journal body]

... (other categories)
```

## Security Guarantees
- **User Isolation**: You will only ever receive data belonging to your account.
- **No Secrets**: The export explicitly omits:
  - Password hashes
  - JWT Secrets
  - Google OAuth Tokens
  - MFA / TOTP Secrets
  - Recovery Codes
  - Third-party API keys stored in your settings
