# Life OS Disaster Recovery Guide

This guide explains how to rebuild the Life OS platform from a **Fresh Linux Machine** (e.g., a new 1 vCPU, 1 GB RAM Ubuntu VPS).

It assumes your previous server, database cluster, and deployment platform have been completely destroyed, and you only have access to:
1. Your Google Drive (containing the `LifeOS_DR_*.tar.gz` backup artifact).
2. A new Ubuntu VPS.
3. Your secure password vault (containing your MongoDB Atlas credentials, JWT secrets, Backblaze B2 keys, etc.).

---

## Part 1: Preparation

### 1. Provision the Machine
Start with a fresh Ubuntu Server. Connect via SSH.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential
```

### 2. Install Node.js
Install Node 22 (LTS) via NVM:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
```

### 3. Clone the Source Code
Extract the Git commit SHA from your backup's `manifest.json` (or just check out the main branch if you are recovering to the latest version).
```bash
git clone https://github.com/your-username/life-os.git
cd life-os/backend
git checkout <COMMIT_SHA> # Optional: only if you need a specific historical build
```

---

## Part 2: Configuration & Secrets Recovery

The backup artifact contains a `config.json` with safe configuration, but **you must manually restore your secrets** from your password manager.

Create a `.env` file in `life-os/backend/`:
```bash
nano .env
```

Add your credentials:
```env
# SERVER
PORT=3000
NODE_ENV=production

# MONGODB ATLAS (Ensure you created a fresh cluster if the old one was destroyed)
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/life-os?retryWrites=true&w=majority

# AUTHENTICATION
JWT_SECRET=your_super_secret_jwt_key_from_vault

# BACKBLAZE B2 (For user files/attachments)
B2_ENDPOINT=s3.us-east-005.backblazeb2.com
B2_KEY_ID=your_b2_key_id
B2_APP_KEY=your_b2_app_key
B2_BUCKET_NAME=your_b2_bucket_name
B2_PUBLIC_URL=https://f005.backblazeb2.com/file/your_b2_bucket_name

# GOOGLE INTEGRATION
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

---

## Part 3: Install & Restore

1. Install dependencies:
```bash
npm install
```

2. Download your `LifeOS_DR_*.tar.gz` backup artifact from Google Drive and place it in the `backend/` folder.

3. Run the restore script:
```bash
npx tsx bin/dr-restore.ts LifeOS_DR_xxxxxxx.tar.gz
```

> **Note on MongoDB**: If your Atlas cluster was NOT destroyed and still contains data, the script will automatically create a `safety_checkpoint` backup of the existing data before applying the merge-restore. 

---

## Part 4: Verification & Startup

1. Build the backend:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. **Verify Everything:**
   - Log in to the web interface.
   - Verify that your Tasks, Habits, and Journals have appeared.
   - Click on an image or attachment (this verifies Backblaze B2 is correctly linked).
   - Create a test task to ensure write-capability is active.

4. **Re-configure Automatic Backups:**
   - Go to your settings in the UI and ensure Google Drive is still linked.
   - Trigger a manual backup to confirm the DR system is functional for the future.

You have successfully survived a catastrophic infrastructure failure!
