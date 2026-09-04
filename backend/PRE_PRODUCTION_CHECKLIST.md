# Pre-Production Deployment Checklist

This document details the exact requirements for a clean deployment of the Life OS platform.

## 1. REPOSITORY
- **Required Version:** Git SHA `ac48c67d` (or later) on branch `feat/disaster-recovery`.
- **Required Files:** Both `backend/` and `frontend/` directories must be deployed.

## 2. RUNTIME
- **Node Version:** Node 22 (LTS) is recommended, though the platform is verified to build and run successfully on Node 25.6.1.
- **Package Manager:** `npm` v10+ (tested successfully with v11.9.0).

## 3. ENVIRONMENT VARIABLES

### Backend (`backend/.env`)
Must securely inject:
- `PORT` (e.g. 4000)
- `NODE_ENV=production`
- `MONGODB_URI` (Atlas connection string)
- `JWT_SECRET`
- `FRONTEND_URL` (For CORS)
- `B2_*` Keys (if attachments are needed)

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL` (Points to the deployed backend URL)

## 4. DATABASE
- **MongoDB Atlas Requirements:**
  - Cluster must be reachable via the network (whitelist deployment IP or use `0.0.0.0/0`).
  - Database User must have `readWriteAnyDatabase` or specific `readWrite` on the Life OS DB.
  - Connection string must include `retryWrites=true&w=majority`.

## 5. GOOGLE INTEGRATIONS
- **Google OAuth:**
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be set.
  - `GOOGLE_REDIRECT_URI` must perfectly match the authorized origins in GCP Console (e.g. `https://your-frontend/api/auth/google/callback`).

## 6. BACKUP
- **Disaster Recovery System:**
  - Does NOT require external dependencies like `mongodump`.
  - Driven by Node streaming (`bin/dr-backup.ts` and `bin/dr-restore.ts`).
  - `BACKUP_INTERVAL_HOURS` configures scheduled exports (default 24).
  - Can optionally use `DR_UPLOAD_USER_ID` to push system-wide artifacts to Google Drive.

## 7. MCP (Model Context Protocol)
- **Current Transport/Auth Requirements:**
  - The MCP Server currently leverages **stdio transport**.
  - It runs via `node dist/mcp/index.js` (or `npm run mcp:dev`).
  - **Authentication:** Token-based. The AI client must supply the user's JWT `token` in the input schema for every tool invocation.
  - **Authorization:** Handled seamlessly by Life OS service-layer methods (which enforce `userId` checks before any database query).

## 8. APPLICATION STARTUP & HEALTH CHECKS
- **Backend Build:** `npm install && npm run build`
- **Backend Startup:** `npm start`
- **Health Check Endpoint:** `GET /api/health`
  - Registered before DB initialization to ensure platforms (Render/Vercel/Railway) instantly detect the container as alive. Returns HTTP 200 `status: ok` when fully initialized.
