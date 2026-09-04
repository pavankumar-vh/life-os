# Life OS Environment Variable Reference

This document maps all environment variables used in the Life OS project, their purpose, their necessity, and their security level.

## Required Backend Variables
These variables **must** be present for the backend to start and function correctly in a production deployment.

| Variable | Description | Secret? | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | Connection string for MongoDB Atlas (e.g. `mongodb+srv://...`). | Yes | **YES** |
| `JWT_SECRET` | Cryptographic key used to sign session tokens. | Yes | **YES** |
| `FRONTEND_URL` | The primary production URL of the frontend for CORS. | No | **YES** (Prod) |

## Authentication / Integrations
Optional variables that enable specific features like Google OAuth, AI, and Cloud Storage.

| Variable | Description | Secret? | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID for Calendar/Drive integrations. | No | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret. | Yes | No |
| `GOOGLE_REDIRECT_URI` | The OAuth callback URL (must match GCP Console). | No | No |
| `OPENAI_API_KEY` | Key for GPT capabilities (if enabled). | Yes | No |
| `GEMINI_API_KEY` | Key for Gemini capabilities (if enabled). | Yes | No |

## Cloud Storage (Backblaze B2)
Required if you intend to upload files, photos, or vault attachments natively.

| Variable | Description | Secret? | Required |
|----------|-------------|---------|----------|
| `B2_ENDPOINT` | The Backblaze S3-compatible endpoint URL. | No | No |
| `B2_KEY_ID` | Backblaze Application Key ID. | Yes | No |
| `B2_APP_KEY` | Backblaze Application Key Secret. | Yes | No |
| `B2_BUCKET_NAME` | The target bucket name. | No | No |
| `B2_PUBLIC_URL` | Base URL for accessing public bucket files. | No | No |

## Disaster Recovery / Backup
| Variable | Description | Secret? | Required |
|----------|-------------|---------|----------|
| `DR_UPLOAD_USER_ID` | Optional user ID. If set, the `dr-backup.ts` script will automatically upload the DR artifact to this user's connected Google Drive. | No | No |
| `BACKUP_INTERVAL_HOURS` | Defaults to 24. How often the scheduled background job runs to export data for users who have auto-backup enabled. | No | No |

## Security Note on Frontend `NEXT_PUBLIC_*` Variables
No backend secret (such as `JWT_SECRET`, `MONGO_URI`, or `B2_APP_KEY`) should **ever** be prefixed with `NEXT_PUBLIC_` or pushed to the frontend deployment platform in a way that exposes it to the browser.
