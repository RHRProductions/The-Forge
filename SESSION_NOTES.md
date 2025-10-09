# The Forge - Development Session Notes

Detailed log of each development session, problems encountered, and solutions implemented.

---

## Session 6 - October 7, 2025
**Focus:** Production Deployment Fixes & Stability

### Issues Encountered

#### 1. Build Failure - Out of Memory (CRITICAL)
**Problem:**
- Ran `npm run build` on production server
- Build hung at "Creating an optimized production build..."
- Process killed with SIGKILL error
- Error message: "Next.js build worker exited with code: null and signal: SIGKILL"

**Root Cause:**
- Turbopack enabled in production build script
- VPS only has 957MB RAM
- Turbopack requires more memory than available
- Linux OOM killer terminated the process

**Solution:**
1. Edited `package.json` line 7
2. Changed from: `"build": "next build --turbopack"`
3. Changed to: `"build": "next build"`
4. Build completed successfully in 13.8 seconds

**Impact:**
- Production builds now work reliably
- Development still uses Turbopack (faster, more memory available locally)
- Both produce identical production output

---

#### 2. Multiple Lockfile Warning
**Problem:**
- Build showed warning about multiple package-lock.json files
- Warning pointed to `/var/www/package-lock.json` and `/var/www/the-forge/package-lock.json`
- Build worked but produced confusing warnings

**Root Cause:**
- Stray `package-lock.json` in parent directory
- Probably created during initial server setup

**Solution:**
```bash
rm /var/www/package-lock.json
```

**Impact:**
- Clean builds without warnings
- Next.js correctly identifies workspace root

---

#### 3. Login Fails Through Nginx Reverse Proxy
**Problem:**
- Login works at `http://143.244.185.41:3000`
- Login fails at `http://143.244.185.41` (through Nginx)
- Error logs show: `[auth][error] CredentialsSignin`
- `trustHost: true` already set in auth.ts

**Investigation:**
- Nginx config is correct (`proxy_pass http://localhost:3000`)
- Environment variables correct (`NEXTAUTH_URL=http://143.244.185.41`)
- NextAuth v5 has known issues with reverse proxies
- Tried `pm2 restart --update-env` - didn't fix it

**Decision:**
- Use `http://143.244.185.41:3000` permanently
- Accept :3000 in URL as tradeoff for working auth
- Don't spend more time troubleshooting reverse proxy
- Nginx stays configured but won't be used

**Impact:**
- Reliable login functionality
- Simpler deployment (one less thing to debug)
- Slightly less professional URL (but functional)

---

#### 4. PM2 Not Surviving Reboots
**Problem:**
- Server had message "System restart required"
- After reboots, app might not auto-start
- Could cause downtime during appointments

**Solution:**
```bash
pm2 startup  # Configure systemd service
# Run the command it outputs
pm2 save     # Save current process list
```

**Impact:**
- App automatically starts on server reboot
- Reduced risk of downtime
- Better disaster recovery

---

#### 5. Environment Variables Not Loading
**Problem:**
- `.env.local` exists with correct values
- PM2 restart didn't pick up changes
- Different behavior than expected

**Root Cause:**
- PM2 caches environment variables
- Standard `pm2 restart` doesn't reload env

**Solution:**
- Always use: `pm2 restart the-forge --update-env`
- Updated deployment documentation
- Added to deployment checklist

**Impact:**
- Environment changes now take effect
- Consistent behavior between deployments

---

### Work Completed

**Code Changes:**
- Modified package.json build script (Turbopack removal)

**Server Configuration:**
- Removed stray lockfile
- Configured PM2 auto-startup
- Saved PM2 process list

**Documentation Created/Updated:**
1. **PROJECT_DOCUMENTATION.md**
   - Added Session 6 to Recent Updates
   - Updated Deployment Information section
   - Added Critical Production Configuration section
   - Created comprehensive Troubleshooting Guide
   - Updated Table of Contents
   - Changed last updated date

2. **CHANGELOG.md** (NEW)
   - Version 0.2.0 release notes
   - Detailed fixes and changes
   - Version history table
   - Following Keep a Changelog format

3. **DEPLOYMENT_NOTES.md** (NEW)
   - Quick-reference deployment guide
   - Step-by-step deployment process
   - Critical production settings
   - Common issues and solutions
   - Emergency recovery procedures
   - Deployment checklist

4. **SESSION_NOTES.md** (NEW - this file)
   - Detailed session logs
   - Problem-solving process
   - Decisions and rationale

**Testing:**
- Verified build completes successfully
- Confirmed app runs after restart
- Tested login at :3000 (works)
- Verified PM2 auto-startup configuration

---

### Lessons Learned

1. **Memory matters on small VPS instances**
   - 957MB is tight for Next.js builds
   - Turbopack is great locally, not for production VPS
   - Monitor memory usage during builds

2. **PM2 environment handling is tricky**
   - Always use `--update-env` flag
   - Don't assume env changes are picked up automatically
   - Test after deployment

3. **Reverse proxies add complexity**
   - NextAuth v5 + Nginx = headaches
   - Sometimes the simple solution (use :3000) is better
   - Don't over-engineer if basic solution works

4. **Documentation is critical**
   - Future deployments will be smoother
   - Can reference solutions to common problems
   - Helps track what was tried and why

5. **PM2 auto-startup is essential**
   - Server reboots happen
   - Auto-recovery prevents downtime
   - Should be configured from day one

---

### Deployment URL Decision

**Final Decision:** Use `http://143.244.185.41:3000` permanently

**Rationale:**
- Login works reliably
- Simple, predictable behavior
- One less system to debug
- Nginx can be left configured as failover if needed

**Alternatives Considered:**
- Debugging NextAuth + Nginx (rejected: too time-consuming)
- Using subdomain with DNS (rejected: not needed for MVP)
- Disabling authentication (rejected: security requirement)

---

### Next Session TODO

**Investigate:**
- [ ] High PM2 restart count (813 restarts)
- [ ] Check error logs for crash patterns
- [ ] Monitor memory usage during runtime
- [ ] Consider memory optimization if crashes are frequent

**Future Enhancements:**
- [ ] Consider upgrading VPS if memory becomes issue
- [ ] Set up monitoring/alerting for downtime
- [ ] Implement database backup automation
- [ ] Add SSL certificate (Let's Encrypt)
- [ ] Consider domain name instead of IP

---

## Session 5 - October 1-6, 2025
**Focus:** Authentication & Multi-User Features

### Work Completed
- Implemented NextAuth v5 authentication system
- Added multi-user support (admin/agent/setter roles)
- Created calendar functionality with drag-drop
- Built analytics dashboard
- Added password reset feature
- Implemented state-based filtering
- Enhanced bulk delete operations
- Added Melissa Medicare CSV format support

### Deployment
- Successfully deployed to production
- All features working as expected
- Database migrated to support new schema

---

## Session 4 - Late September 2025
**Focus:** UI/UX Improvements

### Work Completed
- Added search functionality (name/phone)
- Implemented filtered navigation (next/previous)
- Fixed lead type auto-population
- Set contact method default to phone
- Set activity outcome default to "no_answer"
- Added auto-update status on "no_answer" activity
- Implemented real-time status updates (no refresh)
- Created GET endpoint for single lead fetch

---

## Session 3 - Mid September 2025
**Focus:** Smart Features & Automation

### Work Completed
- Implemented lead temperature system (hot/warm/cold)
- Added contact attempt counter
- Created smart follow-up suggestions
- Built follow-up reminders dashboard
- Added Mountain Time timezone support
- Enhanced activity tracking with temperature

---

## Session 2 - Early September 2025
**Focus:** Activity Tracking System

### Work Completed
- Created activity timeline
- Added quick action buttons (Call, Text, Email)
- Implemented outcome tracking
- Added auto-generated activity details
- Built activity history view with colors
- Added delete capability for activities

---

## Session 1 - September 2025
**Focus:** Initial Build & Core Features

### Work Completed
- Set up Next.js 15 project structure
- Implemented basic CRUD operations for leads
- Created CSV upload system
- Built lead detail modal (resizable/draggable)
- Set up SQLite database
- Created initial API routes
- Deployed to DigitalOcean VPS
- Configured PM2 process manager
- Set up Nginx reverse proxy

---

## Development Patterns Observed

### What Works Well
- SQLite for simple, fast data storage
- Next.js API routes for backend
- PM2 for process management
- Git workflow with GitHub

### Common Pitfalls
- Memory constraints on VPS
- Environment variable handling with PM2
- NextAuth configuration with proxies
- Build tool compatibility issues

### Best Practices Established
1. Always test locally first
2. Use `--update-env` with PM2 restarts
3. Keep documentation updated
4. Track issues in session notes
5. Save PM2 config after changes
6. Don't use Turbopack in production

---

*Maintained by: Marc Spagnuolo*
*Development Partner: Claude (Anthropic AI Assistant)*
