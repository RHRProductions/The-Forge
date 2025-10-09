# The Forge - Deployment Notes

Quick reference guide for deploying updates to production.

---

## Production Environment

**Server Details:**
- Provider: DigitalOcean VPS
- IP: 143.244.185.41
- Port: 3000
- URL: http://143.244.185.41:3000 ⚠️ Always include :3000
- OS: Ubuntu 22.04 LTS
- Memory: 957MB (limited - affects build process)

**Access:**
```bash
ssh root@143.244.185.41
```

---

## Standard Deployment Process

### Step 1: Local Development & Testing
```bash
# On your local machine
npm run dev
# Test your changes thoroughly
```

### Step 2: Commit & Push to GitHub
```bash
git add -A
git commit -m "Descriptive commit message"
git push
```

### Step 3: Deploy to Production
```bash
# SSH into production server
ssh root@143.244.185.41

# Navigate to project directory
cd /var/www/the-forge

# Pull latest changes
git pull

# Build the project (without Turbopack - important!)
npm run build

# Restart PM2 with environment variable refresh
pm2 restart the-forge --update-env

# Save PM2 configuration
pm2 save
```

### Step 4: Verify Deployment
- Visit: http://143.244.185.41:3000
- Test login functionality
- Check that new features work as expected
- Review PM2 logs if needed: `pm2 logs the-forge --lines 50`

---

## Critical Production Settings

### ⚠️ NEVER USE TURBOPACK IN PRODUCTION

**package.json should have:**
```json
"build": "next build"
```

**NOT:**
```json
"build": "next build --turbopack"  ❌ WILL CRASH
```

**Why:** VPS has only 957MB RAM. Turbopack causes Out-Of-Memory (SIGKILL) errors.

---

### PM2 Must Use --update-env Flag

**Always use:**
```bash
pm2 restart the-forge --update-env
```

**NOT:**
```bash
pm2 restart the-forge  ❌ Won't reload .env.local
```

**Why:** PM2 caches environment variables. Without `--update-env`, changes to `.env.local` won't be picked up.

---

## Quick Troubleshooting

### Build Fails with SIGKILL
**Symptom:** Build crashes with "signal: SIGKILL"
**Cause:** Out of memory (Turbopack enabled)
**Fix:**
```bash
# Edit package.json
nano package.json
# Change line 7 to: "build": "next build"
npm run build
```

---

### Can't Login After Deployment
**Symptom:** Login works on :3000 but not without port
**Solution:** Always use http://143.244.185.41:3000 (include :3000)
**Why:** NextAuth has issues with Nginx reverse proxy

---

### Site Down After Server Reboot
**Symptom:** Can't access site
**Fix:**
```bash
ssh root@143.244.185.41
pm2 status
pm2 restart the-forge --update-env
```

**Prevention:** PM2 auto-startup is configured (as of Oct 7, 2025)

---

### Environment Variables Not Working
**Symptom:** Features broken, auth errors
**Fix:**
```bash
pm2 restart the-forge --update-env
```

---

## Emergency Recovery

If site is completely broken:

```bash
ssh root@143.244.185.41
cd /var/www/the-forge

# Check what's wrong
pm2 status
pm2 logs the-forge --lines 50

# Nuclear option: rebuild from scratch
rm -rf .next
npm run build
pm2 restart the-forge --update-env
pm2 save
```

---

## Deployment Checklist

Before deploying:
- [ ] Tested locally with `npm run dev`
- [ ] Committed with clear message
- [ ] Pushed to GitHub

During deployment:
- [ ] SSH'd into server
- [ ] Pulled latest code
- [ ] Built without errors
- [ ] Restarted with `--update-env` flag
- [ ] Saved PM2 config

After deployment:
- [ ] Verified site loads at http://143.244.185.41:3000
- [ ] Tested login
- [ ] Checked new features work
- [ ] Reviewed logs for errors

---

## Important Files & Locations

**On Production Server:**
- Project: `/var/www/the-forge`
- Database: `/var/www/the-forge/data/forge.db`
- Environment: `/var/www/the-forge/.env.local`
- Nginx Config: `/etc/nginx/sites-available/the-forge`
- PM2 Logs: `~/.pm2/logs/the-forge-*.log`

**On Local Machine:**
- Project: `/Users/mspags/Desktop/ClaudeTutorial/a new vibe/the-forge`
- Git Remote: https://github.com/RHRProductions/The-Forge

---

## PM2 Common Commands

```bash
pm2 status                           # Check app status
pm2 logs the-forge                   # View live logs
pm2 logs the-forge --lines 100       # View last 100 lines
pm2 logs the-forge --err             # View only errors
pm2 restart the-forge --update-env   # Restart with env refresh
pm2 save                             # Save current process list
pm2 monit                           # Real-time monitoring
```

---

## What NOT To Do

❌ Don't use `git pull` without checking `git status` first
❌ Don't delete the production database (`forge.db`)
❌ Don't overwrite production `.env.local` with local version
❌ Don't use Turbopack in production builds
❌ Don't restart PM2 without `--update-env` after deployment
❌ Don't access site without `:3000` port and expect login to work
❌ Don't run builds on low battery/unstable connection (can corrupt .next folder)

---

## Need Help?

1. Check `PROJECT_DOCUMENTATION.md` → Troubleshooting Guide
2. Review `CHANGELOG.md` for recent changes
3. Check PM2 logs: `pm2 logs the-forge --lines 100`
4. Review git history: `git log --oneline -10`

---

*Last Updated: October 7, 2025*
*Quick access: Always bookmark http://143.244.185.41:3000*
