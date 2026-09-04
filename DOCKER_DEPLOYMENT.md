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
