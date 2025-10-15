# Production Deployment SOP

## Standard Operating Procedure for Deploying to Production Server

**Server IP:** 143.244.185.41
**Project Path:** `/var/www/the-forge`
**Application Name:** `the-forge`
**Process Manager:** PM2

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All changes have been tested locally
- [ ] All changes have been committed to git
- [ ] Changes have been pushed to GitHub (`git push`)
- [ ] No database files are being committed (check with `git status`)
- [ ] You have access to the production server

---

## Automated Deployment (Recommended)

For quick deployments, use the automated deployment script:

```bash
./deploy.sh
```

The script will:
1. ✓ Verify SSH connection to production server
2. ✓ Check for uncommitted local changes
3. ✓ Backup production database with timestamp
4. ✓ Pull latest changes from GitHub
5. ✓ Install dependencies
6. ✓ Build production bundle
7. ✓ Restart application with PM2
8. ✓ Verify deployment success
9. ✓ Show recent logs

**Prerequisites:**
- SSH key configured for passwordless login to production server
- All changes committed and pushed to GitHub

---

## Manual Deployment Steps

If you prefer manual control or need to troubleshoot:

### 1. SSH into Production Server

```bash
ssh root@143.244.185.41
```

### 2. Navigate to Project Directory

```bash
cd /var/www/the-forge
```

### 3. Backup Production Database (CRITICAL!)

Always backup before pulling changes:

```bash
cp data/forge.db data/forge.db.backup-$(date +%Y%m%d-%H%M%S)
```

### 4. Verify Backup Created

```bash
ls -lh data/*.backup*
```

You should see your new backup file with current timestamp.

### 5. Pull Latest Changes from GitHub

```bash
git pull origin master
```

**Note:** The database is excluded from git, so `git pull` will NOT affect your production data.

### 6. Install Dependencies

If `package.json` was updated:

```bash
npm install
```

### 7. Build Production Bundle

```bash
npm run build
```

This compiles your Next.js application for production.

### 8. Restart Application

```bash
pm2 restart the-forge
```

### 9. Verify Application is Running

```bash
pm2 status
```

You should see `the-forge` with status `online`.

### 10. Check Application Logs

```bash
pm2 logs the-forge --lines 50
```

Look for any errors. Press `Ctrl+C` to exit logs.

---

## Post-Deployment Verification

1. Visit your production URL in browser
2. Test login functionality
3. Verify new features are working
4. Check that existing data is intact

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs for errors
pm2 logs the-forge --lines 100

# Try stopping and starting fresh
pm2 stop the-forge
pm2 start npm --name "the-forge" -- start
```

### Build Fails

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

### Database Issues

```bash
# Check database exists
ls -lh data/forge.db

# Check permissions
chmod 644 data/forge.db
```

---

## Rollback Procedure

If deployment causes issues:

### 1. Stop the Application

```bash
pm2 stop the-forge
```

### 2. Restore Previous Database Backup

```bash
# List backups
ls -lh data/*.backup*

# Restore specific backup (replace with your backup filename)
cp data/forge.db.backup-20251012-120000 data/forge.db
```

### 3. Revert Code Changes

```bash
# See recent commits
git log --oneline -10

# Revert to previous commit (replace COMMIT_HASH)
git reset --hard COMMIT_HASH
```

### 4. Rebuild and Restart

```bash
npm run build
pm2 restart the-forge
```

---

## Important Safety Notes

⚠️ **NEVER** commit database files to git
⚠️ **ALWAYS** backup database before deployment
⚠️ **TEST** locally before deploying to production
⚠️ **VERIFY** application is running after deployment

---

## Quick Reference Commands

### View Application Status
```bash
pm2 status
```

### View Application Logs
```bash
pm2 logs the-forge
```

### Restart Application
```bash
pm2 restart the-forge
```

### List Database Backups
```bash
ls -lh data/*.backup*
```

### Create Manual Backup
```bash
cp data/forge.db data/forge.db.manual-backup-$(date +%Y%m%d-%H%M%S)
```

---

## Emergency Contacts

If you encounter issues during deployment:

- Check PM2 logs first: `pm2 logs the-forge`
- Check Next.js logs: `tail -f /var/www/the-forge/.next/trace`
- Verify database integrity: `sqlite3 data/forge.db "PRAGMA integrity_check;"`

---

## Deployment History

Keep a log of deployments:

| Date | Version/Commit | Changes | Status | Notes |
|------|----------------|---------|--------|-------|
| YYYY-MM-DD | commit-hash | Brief description | Success/Failed | Any issues |

---

*Document Version: 1.0*
*Last Updated: 2025-10-12*
