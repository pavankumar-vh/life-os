# Docker Deployment & Development Guide

Life OS provides native Docker support to make deploying to a production VPS trivially easy, while also providing a robust local development environment.

## 🛠 Local Development (Fixing Bugs)

When you need to fix a bug or add a feature in the future without setting up Node.js or MongoDB on your laptop, you can use the Development Compose stack.

By default, Docker Compose automatically merges `docker-compose.yml` and `docker-compose.override.yml`. The override file configures hot-reloading and spins up a local, offline MongoDB container so you don't mutate your production Atlas database.

### Start Local Development
```bash
# Start the stack (Backend, Frontend, Local MongoDB)
docker compose up
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **Database:** `mongodb://localhost:27017/life-os-dev` (accessible locally or inside the container).

Because of the volume maps in the override file, any edits you make in the `frontend/` or `backend/` source directories will instantly hot-reload inside the containers.

---

## 🚀 Production Deployment (VPS)

When you are ready to deploy Life OS to a remote server (Ubuntu, Oracle Cloud, DigitalOcean, etc.), you only want to use the production containers, and you want to connect to MongoDB Atlas (not a local DB).

### 1. Prepare the VPS
SSH into your server and ensure Docker is installed:
```bash
sudo apt update && sudo apt install docker.io docker-compose-v2 -y
git clone https://github.com/your-username/life-os.git
cd life-os
```

### 2. Configure Environment Variables
You must create the environment files exactly where Docker expects them:

`backend/.env`
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<your-atlas-uri>
JWT_SECRET=your_super_secret_jwt
FRONTEND_URL=https://your-domain.com
# Include B2 and Google OAuth keys if required...
```

`frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 3. Deploy
To start the production deployment, you must explicitly ignore the development override file. 
Use the `-f` flag to specify *only* the base `docker-compose.yml`:

```bash
docker compose -f docker-compose.yml up -d --build
```
*The `--build` flag ensures the images are compiled using the multi-stage production builder, stripping out all devDependencies and minimizing image size.*

### 4. Updates & Rollbacks
If you modify code later and push to Git, SSH into your server, pull the code, and rebuild seamlessly:

```bash
git pull origin main
docker compose -f docker-compose.yml up -d --build
```
Docker will gracefully swap the old containers with the new ones.

---

## 🔑 Admin Bootstrap / Recovery

### When to use this

This command is for the **self-hosting operator** only. Use it when:

- Your account was created **before** the first-account-admin bootstrap was deployed, so it is still a regular user without admin access.
- You need to recover host admin access after accidentally removing all admins.

> **This is an operator-only, CLI-based recovery mechanism.** It has no HTTP endpoint and cannot be triggered remotely. Only someone with direct access to the running production container can execute it.

### Command

Run this from your VPS (SSH session) after the container is running:

```bash
docker exec lifeos-backend node dist/scripts/adminPromote.js your-email@example.com
```

Or using the npm script alias:

```bash
docker exec lifeos-backend npm run admin:promote -- your-email@example.com
```

### Expected success output

```
✅ Admin bootstrap successful!
   User  : Pavan Kumar <pavankumarvh@outlook.com>
   isAdmin    : false    → true
   isApproved : false → true
   isDisabled : false → false

   The user can now log in and access the Host Control Center.
```

### Expected output for unknown email

```
❌ No user found with email: nobody@example.com
   Check the email address and try again.
```
The command exits with code 1 on any failure (user not found, database error, missing argument).

### How it works

- Connects to MongoDB using `MONGODB_URI` from the container's environment (same as the running server).
- Finds the user by email (case-insensitive).
- Sets `isAdmin = true`, `isApproved = true`, `isDisabled = false`.
- Saves via Mongoose and disconnects cleanly.
- Does **not** log passwords, tokens, or any secrets.

### After running

Reload the Life OS frontend and log in with the promoted account. You will see the **Host Control Center** in the sidebar.

