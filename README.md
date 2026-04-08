# Life OS

Life OS is a full-stack personal operating system for tracking goals, habits, health, notes, projects, finances, and more in one place.

It includes:
- A modern Next.js frontend with rich feature views (dashboard, habits, journal, tasks, goals, calendar, notes, whiteboard, vault, and more)
- A TypeScript + Express API with MongoDB persistence
- Google integrations (OAuth, Calendar sync, Drive backups, Fitness data sync)
- AI-assisted chat and flashcard workflows

## Table of Contents

- Overview
- Core Features
- Tech Stack
- Repository Structure
- Getting Started (Local Development)
- Environment Variables
- Available Scripts
- Google Integration Setup
- API Route Map
- Build and Production
- Deployment
- Troubleshooting
- Contributing

## Overview

Life OS is designed as a monorepo with two main apps:

- `frontend/` -> Next.js App Router application
- `backend/` -> Express API server

The root workspace provides convenience scripts for running and building both services together.

## Core Features

### Productivity and Planning
- Habits with streaks
- Tasks and goals with progress tracking
- Projects, wishlist, quick captures, and weekly review

### Personal Logs
- Journal entries
- Workout logs
- Meals and nutrition
- Sleep, body, and water tracking
- Gratitude, expenses, books, bookmarks

### Creative and Knowledge Tools
- Rich notes editor
- Whiteboard workspace
- Flashcards (including AI generation)

### Cloud and Integrations
- Google OAuth account connect
- Google Calendar read/create/update/delete sync
- Google Drive backup listing and backup upload
- Google Fitness steps/calories sync in UI

### AI Layer
- In-app AI chat with configurable provider/model keys
- Context-aware responses based on your stored data

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19 + TypeScript
- Zustand for state management
- Tailwind CSS + Framer Motion

### Backend
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT auth
- Google APIs client

### Storage and Integrations
- MongoDB Atlas (primary database)
- Google APIs (OAuth, Calendar, Drive, Fitness)
- Optional Backblaze B2 for vault uploads

## Repository Structure

```text
life-os/
  backend/
    src/
      index.ts
      routes/
      models/
      lib/
    .env.example
  frontend/
    src/
      app/
      features/
      components/
      store/
      lib/
    public/
    .env.example
  DEPLOYMENT_GUIDE.md
  package.json
  render.yaml
```

## Getting Started (Local Development)

### 1) Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- npm 9+
- MongoDB database (local or Atlas)

### 2) Install dependencies

From repository root:

```bash
npm install
npm run install:all
```

### 3) Configure environment files

Create local env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Minimum recommended local values:

Backend (`backend/.env`):

```env
PORT=8080
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<strong-secret>
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

Frontend (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
# Optional comma-separated fallback API endpoints
# NEXT_PUBLIC_API_URLS=http://localhost:8080
```

### 4) Run in development

From root (starts frontend + backend together):

```bash
npm run dev
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080` (if `PORT=8080`)

## Environment Variables

### Backend (`backend/.env`)

Required:
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Optional:
- `FRONTEND_URLS` (comma-separated additional allowed origins)
- `APP_URL` (email fallback)
- `ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `MAILJET_API_KEY`
- `MAILJET_API_SECRET`
- `MAILJET_FROM_EMAIL`
- `MAILJET_FROM_NAME`
- `B2_ENDPOINT`
- `B2_KEY_ID`
- `B2_APP_KEY`
- `B2_BUCKET_NAME`
- `B2_PUBLIC_URL`
- `B2_REGION`

### Frontend (`frontend/.env.local`)

Required:
- `NEXT_PUBLIC_API_URL`

Optional:
- `NEXT_PUBLIC_API_URLS` (comma-separated fallback API bases)

## Available Scripts

### Root scripts

- `npm run dev` -> run frontend + backend concurrently
- `npm run dev:frontend` -> run frontend only
- `npm run dev:backend` -> run backend only
- `npm run build` -> build frontend + backend
- `npm run build:fast` -> faster build mode for both
- `npm run install:all` -> install frontend and backend dependencies

### Frontend scripts (`frontend/`)

- `npm run dev`
- `npm run build`
- `npm run build:fast`
- `npm run start`
- `npm run lint`

### Backend scripts (`backend/`)

- `npm run dev`
- `npm run build`
- `npm run build:fast`
- `npm run start`

## Google Integration Setup

In Google Cloud Console:

1. Create an OAuth 2.0 Web Client.
2. Enable required APIs:
   - Google Calendar API
   - Google Drive API
   - Google Fitness API
3. Add authorized origins and redirect URI.

For production examples and platform steps, use:
- `DEPLOYMENT_GUIDE.md`

Important:
- Origins must be domain-only (no path).
- Redirect URI must exactly match your configured callback.

## API Route Map

Main backend route groups mounted in `backend/src/index.ts`:

- `/api/auth`
- `/api/habits`
- `/api/tasks`
- `/api/goals`
- `/api/journal`
- `/api/workouts`
- `/api/meals`
- `/api/water`
- `/api/sleep`
- `/api/body`
- `/api/gratitude`
- `/api/expenses`
- `/api/notes`
- `/api/books`
- `/api/bookmarks`
- `/api/captures`
- `/api/flashcards`
- `/api/projects`
- `/api/wishlist`
- `/api/whiteboards`
- `/api/timeline`
- `/api/backup`
- `/api/chat`
- `/api/google`
- `/api/settings`
- `/api/focus`
- `/api/uploads`
- `/api/vault`
- `/api/health` (health check)

## Build and Production

Run full build validation from root:

```bash
npm run build
```

This compiles:
- Frontend production build (Next.js)
- Backend TypeScript output

## Deployment

Recommended setup:
- Frontend on Vercel
- Backend on Railway

Detailed step-by-step deployment instructions are maintained in:
- `DEPLOYMENT_GUIDE.md`

`render.yaml` is also included for backend service configuration compatibility.

## Troubleshooting

### CORS issues
- Ensure backend `FRONTEND_URL` exactly matches your frontend domain.
- Add previews to `FRONTEND_URLS` when needed.

### OAuth `redirect_uri_mismatch`
- Confirm `GOOGLE_REDIRECT_URI` matches your Google OAuth client redirect URI exactly.

### Frontend cannot reach backend
- Verify `NEXT_PUBLIC_API_URL`.
- Optionally configure `NEXT_PUBLIC_API_URLS` fallbacks.

### Google features not loading in UI
- Confirm account is connected in Settings -> Google.
- Reconnect Google if token is expired.
- Check backend logs for Google API permission or grant errors.

### Health check fails after deploy
- Confirm backend is running and health endpoint is exposed:

```text
GET /api/health
```

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Run `npm run build` from repo root.
4. Open a PR with a clear summary and test notes.

---

If you are onboarding quickly, start with:
1. Environment setup section in this README
2. `DEPLOYMENT_GUIDE.md` for production
3. Route map for backend feature orientation