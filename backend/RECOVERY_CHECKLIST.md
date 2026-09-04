# Life OS Recovery Checklist

Print or keep this checklist securely in your password vault.

## Phase 1: Preparation
- [ ] Fresh Ubuntu machine provisioned (1 vCPU, 1 GB RAM).
- [ ] Git access established (SSH keys added to Github).
- [ ] MongoDB Atlas access established (Network Access IPs whitelisted for the new VPS).
- [ ] Google Drive account accessible (to download the DR artifact).
- [ ] Secure Vault accessible (to retrieve `.env` secrets).

## Phase 2: Restore Process
- [ ] Node 22 (LTS) installed on the VPS.
- [ ] `life-os` repository cloned.
- [ ] `.env` file recreated in `backend/` using credentials from vault.
- [ ] `npm install` executed successfully.
- [ ] `LifeOS_DR_*.tar.gz` downloaded to the server.
- [ ] `npx tsx bin/dr-restore.ts LifeOS_DR_*.tar.gz` executed successfully.

## Phase 3: Verification
- [ ] Backend build completes (`npm run build`).
- [ ] Backend starts without crashing (`npm start`).
- [ ] Frontend successfully reaches the backend.
- [ ] **Authentication**: You can log in using your existing credentials or Google OAuth.
- [ ] **Database**: Old tasks, habits, and captures are visible.
- [ ] **Files**: Old uploaded photos/attachments load correctly (verifies B2).
- [ ] **Google Integrations**: Calendar/Drive exports function without re-authentication.
- [ ] **Backup System**: `npx tsx bin/dr-backup.ts` generates a new valid backup.
- [ ] **MCP**: Re-register the MCP server in Claude Desktop if you moved to a new desktop machine.
