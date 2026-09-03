# Life OS — Authentication

This document describes how authentication, MFA, and recovery codes work in Life OS.

---

## 1. Registration

Send a `POST /api/auth/register` request with `name`, `email`, and `password` (minimum 8 characters).

- Email is normalised to lowercase.
- Password is hashed with `bcryptjs` at cost factor 12 before storage.
- A JWT session token is returned on success.
- A welcome email is sent asynchronously (non-blocking).

---

## 2. Login

Send a `POST /api/auth/login` request with `email` and `password`.

**Without MFA:**

Returns `{ token, user }`. Store the token and include it as `Authorization: Bearer <token>` on all subsequent requests.

**With MFA enabled:**

Returns `{ requiresMfa: true, mfaToken }`. The `mfaToken` is a short-lived (5-minute) JWT that cannot be used to access protected routes. You must complete the MFA step to receive a full session token.

---

## 3. Password Requirements

- Minimum 8 characters.
- No maximum character limit.
- Passwords are hashed with bcryptjs (cost factor 12) and never stored in plaintext.
- Passwords are never returned in any API response.

---

## 4. TOTP MFA Setup

Go to **Settings → Security → Two-Factor Authentication** in the Life OS web UI.

1. Click **Enable 2FA**.
2. Life OS generates a new TOTP secret and displays a QR code and a manual entry key.
3. Open your authenticator app and scan the QR code, or enter the manual key.
4. Enter the 6-digit code shown by your authenticator to verify.
5. Life OS activates MFA only after the OTP is successfully verified.
6. You are shown your **10 recovery codes**. Save them immediately.

---

## 5. Compatible Authenticator Applications

Life OS uses the standard TOTP protocol (RFC 6238, 6-digit codes, 30-second window).

Compatible apps include:

- **Google Authenticator** (Android / iOS)
- **Microsoft Authenticator** (Android / iOS)
- **Aegis** (Android, recommended — open source)
- **2FAS** (Android / iOS)
- **Raivo OTP** (iOS)
- **1Password** (desktop / mobile)
- **Bitwarden** (desktop / mobile)
- **Any RFC 6238 / TOTP-compliant authenticator**

Life OS does **not** depend on any specific authenticator app.

---

## 6. Recovery Codes

Recovery codes are **emergency access codes** for when you cannot access your authenticator app (e.g., lost phone, deleted app).

- 10 codes are generated on MFA activation.
- Each code is shown to you **only once**.
- Store them in a safe location (password manager, printed paper in a secure place).
- Each code can be used **only once** — it becomes invalid after use.
- Regenerating codes immediately invalidates all previous codes.

> **Recovery codes ≠ database backups.**
>
> - Recovery codes = regain access to your Life OS account.
> - Database exports = back up your personal data (Tasks, Journals, Habits, etc.).
>
> These are separate and unrelated concepts.

### Using a recovery code

During the MFA login step, click **"Use recovery code"** and enter one of your saved codes.

### Regenerating recovery codes

Go to **Settings → Security → Two-Factor Authentication** and click **Regenerate Recovery Codes**.

You must provide your current password and a valid authenticator OTP to regenerate.

---

## 7. MFA Disable / Re-enable

### Disabling MFA

Click **Disable 2FA** in Settings → Security.

You must provide:
- Your current password
- A valid TOTP code from your authenticator app

> **Warning:** Disabling MFA removes all existing recovery codes. Re-enabling will generate a new set.

### Re-enabling MFA

Simply repeat the setup flow. A new secret and a new set of recovery codes are generated.

---

## 8. Password Reset

If you forget your password:

1. On the login screen, click **Forgot password?**
2. Enter your email address.
3. You will receive an email with a reset link if the email is registered (the response is the same either way to prevent email enumeration).
4. Click the link in the email. It expires in **30 minutes**.
5. Enter and confirm your new password (minimum 8 characters).

> **Note for Google-only accounts:**
> If your account was previously created via Google Sign-In and has no password set, use the Forgot Password flow to set one.

---

## 9. Logout / Session Behavior

- Sessions use JWTs with a 30-day expiry.
- JWTs are stored in `localStorage` (`lifeos-token`).
- Logging out removes the token from localStorage. There is no server-side token blacklist (stateless JWT architecture).
- MFA challenge tokens expire in 5 minutes and cannot be used to access protected routes.

---

## 10. Required Environment Variables

### Backend (`backend/.env`)

```env
# Core
PORT=8080
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=a-long-random-string-at-least-32-chars

# Frontend CORS origin
FRONTEND_URL=http://localhost:3000

# Required for TOTP secret encryption at rest
ENCRYPTION_KEY=64-hex-char-string-representing-32-bytes

# Google API credentials (for Calendar/Drive/Fitness integrations — NOT for authentication)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 11. Local Development Setup

```bash
# 1. Install dependencies
npm install
npm run install:all

# 2. Copy and configure environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit backend/.env:
#   - Set MONGODB_URI to your Atlas or local MongoDB connection string
#   - Set JWT_SECRET to a long random string
#   - Set ENCRYPTION_KEY to 64 hex chars (run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 3. Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

---

## 12. Security Considerations

- **Passwords** are never stored in plaintext or returned in API responses.
- **TOTP secrets** are encrypted at rest with AES-256-GCM using `ENCRYPTION_KEY`.
- **Recovery codes** are bcrypt-hashed before storage and shown only once.
- **MFA challenge tokens** (`mfaToken`) have a 5-minute TTL and are rejected by all protected routes.
- **Rate limiting** is applied to all authentication endpoints:
  - Login / Register: 15 requests per 15 minutes
  - Forgot Password: 5 requests per hour
  - MFA verify / disable / regenerate: 10 requests per 15 minutes
- **JWT secrets** must be set via environment variables. Hard-coding them in source code is a security vulnerability.
- **Recovery codes vs. database backups** are different things. Do not confuse them.
- OTP codes and recovery codes are never logged.
