# Deployment Checklist - The Forge

## ⚠️ CRITICAL: Follow This Checklist for Every Deployment

This checklist ensures production data integrity and prevents data loss during deployments.

---

## Pre-Deployment (Local Machine)

### 1. Verify Local Changes
- [ ] All commission tracking features work on local (http://localhost:3000)
- [ ] No TypeScript/ESLint errors
- [ ] Tested all modified features thoroughly
- [ ] Database migrations tested locally (if applicable)

### 2. Commit Changes
```bash
git status  # Review what will be committed
git add -A
git commit -m "Descriptive commit message"
git push origin master
```

### 3. Verify Git Repository
- [ ] Changes pushed to GitHub successfully
- [ ] Check that `data/forge.db` is NOT in the commit
- [ ] Check that `/backups/` is NOT in the commit
- [ ] Verify package.json has `"build": "next build"` (without --turbopack)

---

## Production Deployment

### 4. SSH into Production
```bash
ssh root@143.244.185.41
cd /var/www/the-forge
```

### 5. ⚠️ MANDATORY: Create Backup BEFORE Pulling
```bash
# This is NON-NEGOTIABLE - always create backup first
./scripts/backup-database.sh
```

**Verify backup was created:**
```bash
ls -lh /var/www/the-forge/backups/ | tail -1
```

You should see a new `.tar.gz` file with today's timestamp.

### 6. Check Git Status
```bash
git status
```

**If you see "Your local changes would be overwritten":**
- **STOP!** Do NOT proceed with git pull
- Check what files would be overwritten
- If it's `data/forge.db` - something is very wrong, contact developer
- If it's `package.json` or other code files - stash them:
  ```bash
  git stash
  git pull origin master
  ```

**If clean (no local changes):**
```bash
git pull origin master
```

### 7. Verify Pull Success
```bash
git log -1  # Check latest commit matches GitHub
```

### 8. Install Dependencies (if package.json changed)
```bash
npm install
```

### 9. Build Application
```bash
npm run build
```

**Watch for errors:**
- Out of memory errors (SIGKILL)
- TypeScript compilation errors
- Missing dependencies

**If build fails:**
- Check the error message
- Fix the issue locally, commit, push, and restart deployment
- Do NOT try to fix on production server

### 10. Restart Application
```bash
pm2 restart the-forge --update-env
pm2 save
```

### 11. Verify Application Status
```bash
pm2 status
pm2 logs the-forge --lines 20
```

**Check that:**
- [ ] Status shows "online" (not "errored")
- [ ] Memory usage is reasonable (< 500MB)
- [ ] No error messages in logs

---

## Post-Deployment Verification

### 12. Test Production Site
Visit: **https://the4rge.com**

- [ ] Site loads with SSL padlock icon
- [ ] Can log in successfully
- [ ] Dashboard loads with data
- [ ] Commission tracking features work
- [ ] Can view/edit leads
- [ ] Calendar functions properly
- [ ] No JavaScript console errors (F12 → Console tab)

### 13. Verify Data Integrity
- [ ] Lead count matches expectations
- [ ] Recent activities are present
- [ ] Appointments on calendar are correct
- [ ] Uploaded images load properly

### 14. Check Backup Status
```bash
# Verify automated backups are still scheduled
crontab -l

# Should see: 0 2 * * * cd /var/www/the-forge && ./scripts/backup-database.sh
```

---

## If Something Goes Wrong

### Deployment Failed - Application Won't Start

1. **Check PM2 logs:**
   ```bash
   pm2 logs the-forge --err --lines 50
   ```

2. **Common issues:**
   - Port 3000 already in use
   - Database connection errors
   - Environment variables not loaded
   - Build corruption

3. **Quick fixes:**
   ```bash
   # Rebuild from scratch
   rm -rf .next
   npm run build
   pm2 restart the-forge --update-env
   ```

### Data Loss or Corruption Detected

1. **IMMEDIATELY stop the application:**
   ```bash
   pm2 stop the-forge
   ```

2. **Restore from backup:**
   ```bash
   ./scripts/restore-database.sh /var/www/the-forge/backups/forge_backup_YYYYMMDD_HHMMSS.tar.gz
   pm2 restart the-forge
   ```

3. **Verify data is restored:**
   - Check lead counts
   - Check recent activities
   - Verify appointments

### Build Fails with "SIGKILL" Error

**Cause:** Out of memory during build (Turbopack enabled)

**Fix:**
1. Check package.json line 7:
   ```bash
   grep '"build"' package.json
   ```

2. Should be: `"build": "next build"` (NO --turbopack)

3. If wrong, edit locally, commit, push:
   ```bash
   # On local machine
   # Edit package.json, remove --turbopack from build script
   git add package.json
   git commit -m "Fix: Remove Turbopack from production builds"
   git push origin master
   ```

4. On production:
   ```bash
   git pull origin master
   npm run build  # Should work now
   ```

---

## Rollback Procedure

If new deployment is broken and you need to rollback:

### Option 1: Revert to Previous Git Commit
```bash
# On production server
cd /var/www/the-forge

# Find the previous working commit
git log --oneline -5

# Rollback to previous commit (replace COMMIT_HASH)
git reset --hard COMMIT_HASH

# Rebuild and restart
npm run build
pm2 restart the-forge --update-env
pm2 save
```

### Option 2: Restore from Backup (if data was affected)
```bash
# Stop application
pm2 stop the-forge

# Restore database and images
./scripts/restore-database.sh /var/www/the-forge/backups/forge_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart
pm2 restart the-forge
```

---

## Monthly Maintenance

### First Week of Month:
- [ ] Test backup restoration procedure
- [ ] Verify SSL certificate is renewing (`certbot certificates` - should show > 30 days remaining)
- [ ] Check disk space: `df -h`
- [ ] Review PM2 logs for recurring errors: `pm2 logs the-forge --lines 100`
- [ ] Verify DigitalOcean snapshots are being created
- [ ] Update dependencies if needed (test locally first!)

### Security Checks:
- [ ] Review user accounts - remove any inactive users
- [ ] Check for failed login attempts (future feature)
- [ ] Verify HTTPS is enforced (no HTTP access)
- [ ] Confirm backups contain recent data

---

## Emergency Contacts

**If you need help:**
- Check PROJECT_DOCUMENTATION.md for troubleshooting
- Check DISASTER_RECOVERY.md for data recovery
- Review git commit history: `git log --oneline -20`

**Before Calling for Help, Have Ready:**
- PM2 logs: `pm2 logs the-forge --lines 50 --err`
- Git status: `git log -1`
- Application status: `pm2 status`
- Description of what you were trying to deploy

---

## Success Criteria

Deployment is successful when:
- ✅ Site loads at https://the4rge.com with SSL
- ✅ Can log in and access all features
- ✅ All data is intact (leads, activities, appointments)
- ✅ PM2 shows "online" status
- ✅ No errors in PM2 logs
- ✅ Backup was created before deployment
- ✅ New features work as expected

---

**Last Updated:** October 9, 2025

**Remember:** When in doubt, create a backup first. Backups are cheap, data loss is expensive.
