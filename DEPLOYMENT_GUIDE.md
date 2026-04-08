# Life OS Deployment Guide (Vercel + Railway)

This guide is for:
- Frontend on Vercel
- Backend on Railway
- Custom frontend domain: https://life-os.pavankumarvh.me

## 1) Google OAuth Configuration

In Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client ID (Web application):

- Authorised JavaScript origins:
  - https://life-os.pavankumarvh.me

- Authorised redirect URIs:
  - https://life-os.pavankumarvh.me/api/google/callback

Important:
- Origins must be domain only (no path, no trailing slash).
- Redirect URI must include the full callback path.

## 2) Railway Backend Setup

Service settings:
- Source repo: pavankumar-vh/life-os
- Root directory: /backend
- Branch: main

Networking:
- Public Networking: enabled
- Generate Service Domain: enabled
- Target port: 8080

Deploy settings:
- Builder: Railpack (default)
- Custom Build Command: npm install && npm run build
- Custom Start Command: npm run start
- Healthcheck Path: /api/health
- Restart Policy: On Failure
- Max restart retries: 10

Recommended watch path for backend-only deploy triggers:
- /backend/**

### Railway Environment Variables (Required)

Set these in Railway Variables:

- PORT=8080
- MONGODB_URI=<your mongodb atlas uri>
- JWT_SECRET=<strong random secret>
- FRONTEND_URL=https://life-os.pavankumarvh.me
- FRONTEND_URLS=<optional comma-separated additional origins>
- GOOGLE_CLIENT_ID=<google oauth client id>
- GOOGLE_CLIENT_SECRET=<google oauth client secret>
- GOOGLE_REDIRECT_URI=https://life-os.pavankumarvh.me/api/google/callback

Optional (only if using these features):
- ENCRYPTION_KEY=<32-byte key in base64 or compatible with app expectations>
- OPENAI_API_KEY=<if AI chat default key is needed>
- GEMINI_API_KEY=<if flashcard generation uses server key>
- MAILJET_API_KEY=<if email features are enabled>
- MAILJET_API_SECRET=<if email features are enabled>
- MAILJET_FROM_EMAIL=<optional>
- MAILJET_FROM_NAME=<optional>

Backblaze B2 (only required for Vault/Photo upload features):
- B2_ENDPOINT=https://s3.<region>.backblazeb2.com
- B2_KEY_ID=<application key id>
- B2_APP_KEY=<application key>
- B2_BUCKET_NAME=<bucket name>
- B2_PUBLIC_URL=https://<native-endpoint>/file/<bucket-name>
- B2_REGION=<optional; if omitted, code defaults to us-east-005>

Examples:
- B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
- B2_PUBLIC_URL=https://f005.backblazeb2.com/file/life-os-files

If you are not using Vault/Photo uploads yet, you can skip all B2_* variables.

## 3) Vercel Frontend Setup

Project settings:
- Root directory: /frontend
- Framework preset: Next.js

Environment variables:
- NEXT_PUBLIC_API_URL=https://<your-primary-backend-domain>
- NEXT_PUBLIC_API_URLS=<optional comma-separated fallback backend domains>

For open-source setup templates, copy these files:
- backend/.env.example -> backend/.env
- frontend/.env.example -> frontend/.env.local

If you use the custom frontend domain:
- Keep domain configured in Vercel as life-os.pavankumarvh.me
- Keep FRONTEND_URL on Railway exactly the same domain

## 4) Post-Deploy Verification

1. Railway logs should show backend started and connected to MongoDB.
2. Open health endpoint:
   - https://<your-railway-service-domain>/api/health
3. Open frontend and test login.
4. From Settings -> Google:
   - Start Google connect flow
   - Complete consent
   - Confirm callback returns to app and account shows connected
5. Test one API action (create task/habit) to confirm frontend -> backend connection.

## 5) Common Fixes

- Error: "Invalid origin: URIs must not contain a path"
  - Put only https://life-os.pavankumarvh.me in Authorised JavaScript origins.

- Error: "redirect_uri_mismatch"
  - Ensure Google redirect URI exactly matches:
    - https://life-os.pavankumarvh.me/api/google/callback
  - Ensure Railway GOOGLE_REDIRECT_URI matches the same value.

- Backend crash on startup
  - Confirm JWT_SECRET is set (required by app startup).
  - Confirm MONGODB_URI is valid and reachable from Railway.

- CORS/auth issues in browser
  - Confirm FRONTEND_URL on Railway is exactly:
    - https://life-os.pavankumarvh.me
  - Confirm NEXT_PUBLIC_API_URL in Vercel points to your primary backend domain.
  - If configured, confirm NEXT_PUBLIC_API_URLS contains valid fallback backend domains.
