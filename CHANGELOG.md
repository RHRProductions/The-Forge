# Changelog

All notable changes to The Forge CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.3.0] - 2025-12-20

### Security - CRITICAL UPDATE

**Major Security Incident Response & Hardening**
- **INCIDENT:** Cryptocurrency mining malware (XMRig/Monero) removed from production server
  - Infection period: December 6-19, 2025 (13.2 days)
  - Malware components removed: rootkit (`/etc/ld.so.preload`), systemd service (`bot.service`), malicious cron jobs, backdoor SSH keys
  - No data breach detected - database last modified Dec 3 (before infection)
  - Server cleaned and node_modules rebuilt
  - Production data preserved: 2,355 leads intact

### Added - Phase 1 (Critical Security Fixes)
- **Next.js Security Update**
  - Upgraded from 15.5.2 to 15.5.9
  - Patched critical RCE (Remote Code Execution) vulnerability
  - Result: 0 npm vulnerabilities
- **Authentication Middleware**
  - Enabled authentication enforcement (was previously disabled!)
  - All routes now require authentication except public pages
  - Automatic redirect to login for unauthenticated users
- **Rate Limiting System**
  - Login attempt limiting: 5 attempts per 15 minutes
  - Automatic IP blocking after threshold
  - Prevents brute force attacks
  - API endpoint: `/api/auth/check-rate-limit`

### Added - Phase 2 (High Priority Security)
- **Comprehensive Audit Logging System** (HIPAA/CCPA Compliance)
  - New `audit_logs` database table with indexes
  - Tracks all sensitive operations:
    - Lead viewing (PII/PHI access tracking)
    - Lead updates, deletions (single & bulk)
    - Lead merging
    - CSV imports with vendor information
    - Login attempts (success & failure)
  - Severity levels: info, warning, critical
  - Captures: user details, IP address, user agent, timestamps
  - Suspicious activity detection for after-hours access & bulk operations
  - Admin audit log viewer at `/admin/audit-logs`
    - Filtering by action, severity, date range
    - Pagination (50 entries per page)
    - Real-time suspicious activity alerts
- **Security Headers**
  - Content-Security-Policy (XSS attack prevention)
  - X-Frame-Options: DENY (clickjacking protection)
  - X-Content-Type-Options: nosniff (MIME-sniffing prevention)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy (browser feature restrictions)
  - Strict-Transport-Security (HTTPS enforcement, 1-year max-age)
- **Enhanced Session Security**
  - JWT strategy with 7-day session expiration
  - Automatic session update every 24 hours (prevents session fixation)
  - Secure cookies configuration:
    - `httpOnly: true` - prevents JavaScript access
    - `sameSite: 'lax'` - CSRF protection
    - `secure: true` in production - HTTPS only
    - Cookie name prefixed with `__Secure-` in production

### Added - Phase 3 (Password Security)
- **Strong Password Requirements**
  - Minimum 8 characters, maximum 72 (bcrypt limit)
  - Must contain: uppercase, lowercase, number, special character
  - Real-time validation feedback in UI with ✓/✗ indicators
  - Enforced on user creation and password updates
  - Color-coded requirement checklist (green = met, red = unmet)

### Fixed
- Production server stability issues
  - Resolved PM2 crash-looping from port conflicts
  - Cleaned stale Next.js processes
  - Proper PM2 restart procedure established
- Security vulnerabilities from malware infection
  - Removed all malware remnants from next.config.ts
  - Verified clean build with 0 vulnerabilities

### Changed
- Settings page reorganization
  - Moved Audit Logs to Settings section (blue button, 2nd position)
  - Better grouping of admin tools
- Database backup procedures
  - Production database backed up before deployment: `forge.db.backup-pre-security-20251220-121955`
  - SQLite WAL checkpoint executed for clean backup

### Security Audit Results
All security features verified and working:
- ✅ Authentication middleware active
- ✅ Rate limiting functional (5 attempts/15min)
- ✅ All 6 security headers present
- ✅ Password validation enforced
- ✅ Session security configured (JWT + secure cookies)
- ✅ Audit logging active (7 API endpoints instrumented)

### Developer Notes
- Deployment required full rebuild: `rm -rf .next && npm run build`
- Browser cache clearing required for users to see UI updates
- All changes tested in local dev environment before production deployment
- Git commit: `88cdb98` - "Implement comprehensive security improvements"

---

## [0.2.0] - 2025-10-07

### Fixed
- **CRITICAL:** Turbopack causing Out-Of-Memory crashes on production builds
  - Disabled `--turbopack` flag in package.json build script
  - Production builds now use standard Next.js compiler
  - Development still uses Turbopack for speed
- Multiple lockfile warning during builds
  - Removed stray `/var/www/package-lock.json`
- NextAuth login issues when accessed through Nginx reverse proxy
  - Decision made to use `:3000` port permanently
  - Simplified authentication flow

### Added
- PM2 auto-startup configuration
  - Added systemd service for automatic restart on server reboot
  - Process list saved via `pm2 save`
- Comprehensive troubleshooting guide in PROJECT_DOCUMENTATION.md
  - Common issues and solutions
  - Emergency recovery procedures
  - Step-by-step debugging instructions
- Password reset functionality
- Analytics dashboard improvements
- Support for Melissa Medicare CSV format

### Changed
- Updated deployment process
  - Now requires `--update-env` flag when restarting PM2
  - Added `pm2 save` step to persist configuration
- Production URL standardized to `http://143.244.185.41:3000`
- Documentation updated with all production fixes

### Documentation
- Updated PROJECT_DOCUMENTATION.md with Session 6 changes
- Added detailed troubleshooting section
- Updated deployment process with new steps
- Clarified production configuration requirements

---

## [0.1.0] - 2025-10-01

### Added
- NextAuth v5 authentication system
- Multi-user support (admin, agent, setter roles)
- Calendar functionality with drag-drop appointments
- Analytics dashboard
- State-based filtering
- Bulk delete operations
- Enhanced CSV upload for multiple vendor formats

### Changed
- Migrated from single-user to multi-user architecture
- Improved data visualization

---

## [0.0.1] - 2025-09-30

### Initial Release
- Core CRM functionality
- Lead management (CRUD operations)
- CSV upload system
- Activity tracking
- Lead temperature system (hot/warm/cold)
- Follow-up reminders
- Notes system
- Image attachments
- Policy management
- SQLite database
- Next.js 15 with React 19
- Tailwind CSS styling
- DigitalOcean VPS deployment

---

## Version History Summary

| Version | Date | Major Changes |
|---------|------|---------------|
| 0.3.0 | 2025-12-20 | **SECURITY UPDATE:** Malware removal, audit logging, rate limiting, password enforcement, security headers |
| 0.2.0 | 2025-10-07 | Production stability fixes, Turbopack disabled, PM2 auto-startup |
| 0.1.0 | 2025-10-01 | Authentication, multi-user, calendar, analytics |
| 0.0.1 | 2025-09-30 | Initial release with core CRM features |

---

*Maintained by: Marc Spagnuolo*
*Developer: Claude (Anthropic AI Assistant)*
