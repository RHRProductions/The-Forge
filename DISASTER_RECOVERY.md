# Disaster Recovery Plan - The Forge

## Critical Safeguards

### Database Protection

**NEVER COMMIT THE DATABASE TO GIT**

The production database (`data/forge.db`) contains live customer data and must NEVER be tracked in git. The `.gitignore` file explicitly excludes:
- `data/forge.db`
- `data/forge.db-shm`
- `data/forge.db-wal`
- All backup files

### Why This Matters

On **October 9, 2025**, we experienced a critical data loss incident:
- Running `git pull` on production attempted to overwrite the live database
- Several days of production data (leads, appointments, policies) were permanently lost
- The incident occurred because the database was previously tracked in git before being added to `.gitignore`

**This must NEVER happen again.**

## Automated Backup System

### Backup Schedule

Production database is backed up automatically:
- **Frequency**: Daily at 2:00 AM EST
- **Retention**: 7 days of backups
- **Location**: `/var/www/the-forge/backups/`

### Manual Backup

To create a manual backup:

```bash
cd /var/www/the-forge
./scripts/backup-database.sh
```

This creates a timestamped backup: `backups/forge_backup_YYYYMMDD_HHMMSS.db`

### Backup Verification

Check existing backups:
```bash
ls -lh /var/www/the-forge/backups/
```

You should see backups from the last 7 days.

## Disaster Recovery Procedures

### Scenario 1: Accidental Data Deletion

**If you accidentally delete leads, policies, or other data:**

1. **Stop the application immediately**:
   ```bash
   pm2 stop the-forge
   ```

2. **List available backups**:
   ```bash
   ./scripts/restore-database.sh
   ```

3. **Restore from the most recent backup**:
   ```bash
   ./scripts/restore-database.sh /var/www/the-forge/backups/forge_backup_YYYYMMDD_HHMMSS.db
   ```

4. **Restart the application**:
   ```bash
   pm2 restart the-forge
   ```

5. **Verify data is restored** by checking the application

### Scenario 2: Database Corruption

**If the database becomes corrupted:**

1. **Stop the application**:
   ```bash
   pm2 stop the-forge
   ```

2. **Check database integrity**:
   ```bash
   sqlite3 /var/www/the-forge/data/forge.db "PRAGMA integrity_check;"
   ```

3. **If corrupted, restore from backup**:
   ```bash
   ./scripts/restore-database.sh /var/www/the-forge/backups/forge_backup_YYYYMMDD_HHMMSS.db
   ```

4. **Restart**:
   ```bash
   pm2 restart the-forge
   ```

### Scenario 3: Git Pull Tries to Overwrite Database

**If you see this warning during `git pull`:**
```
error: Your local changes to the following files would be overwritten by merge:
  data/forge.db
```

**DO NOT PROCEED WITH THE PULL**

This means the database is still tracked in git. Follow these steps:

1. **Create an immediate backup**:
   ```bash
   ./scripts/backup-database.sh
   ```

2. **Remove database from git tracking**:
   ```bash
   git rm --cached data/forge.db
   git commit -m "Remove database from git tracking"
   ```

3. **Now you can safely pull**:
   ```bash
   git pull origin master
   ```

4. **Verify your database is intact** by checking the application

### Scenario 4: Server Failure

**If the entire server goes down:**

1. **Check DigitalOcean backups** (if enabled)
2. **Restore the droplet** from the most recent snapshot
3. **If no server backup, set up a new server** and restore database from local backups (if you've been downloading them)

## Deployment Safety Protocol

**Every time you deploy to production:**

1. **Create a backup BEFORE pulling changes**:
   ```bash
   ssh root@143.244.185.41
   cd /var/www/the-forge
   ./scripts/backup-database.sh
   ```

2. **Pull changes** (database is now excluded from git):
   ```bash
   git pull origin master
   ```

3. **Build and restart**:
   ```bash
   npm install
   npm run build
   pm2 restart the-forge
   ```

4. **Verify** the application is working correctly

## Prevention Checklist

- [ ] Database files are in `.gitignore`
- [ ] Database is NOT tracked by git (`git ls-files data/forge.db` returns nothing)
- [ ] Daily automated backups are running (check `/var/www/the-forge/backups/`)
- [ ] Manual backup created before deployments
- [ ] Backup restoration procedure has been tested

## DigitalOcean Droplet Backups

Consider enabling DigitalOcean's automated backups:
- **Cost**: Additional 20% of droplet cost
- **Frequency**: Weekly snapshots
- **Retention**: 4 weeks
- **Benefit**: Full server recovery, not just database

To enable:
1. Go to DigitalOcean dashboard
2. Select your droplet
3. Click "Backups" tab
4. Enable backups

## Recovery Time Objectives

- **Backup Creation**: ~1 second
- **Backup Restoration**: ~5 seconds
- **Full Recovery**: < 5 minutes (with backups)
- **Data Loss Tolerance**: Maximum 24 hours (if last backup was 24 hours ago)

## Testing

Test the backup/restore procedure monthly:
1. Create a test lead/appointment
2. Create a backup
3. Delete the test data
4. Restore from backup
5. Verify test data is back

## Emergency Contacts

If you need help with disaster recovery:
- **Developer**: Check project documentation
- **DigitalOcean Support**: https://www.digitalocean.com/support

## Last Updated

October 9, 2025 - After data loss incident

---

**Remember**: The database is your most valuable asset. Treat it with care.
