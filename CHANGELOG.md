# Changelog

All notable changes to The Forge CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [0.5.0] - 2025-12-21

### Added - Two-Factor Authentication (2FA)

**TOTP-Based Security Layer**
Implemented comprehensive two-factor authentication using Time-based One-Time Passwords (TOTP), adding an optional security layer to user accounts.

**Core Features:**
- **Authenticator App Support**
  - Compatible with Google Authenticator, Authy, 1Password, Microsoft Authenticator, etc.
  - Standard TOTP implementation (SHA1, 6 digits, 30-second period)
  - QR code generation for easy setup
  - Manual secret entry option as fallback

- **Backup Codes**
  - 8 one-time backup codes generated during setup
  - Hashed with bcrypt for secure storage
  - Downloadable and copyable for safe keeping
  - Auto-invalidated after use
  - Prevents lockout if authenticator device is lost

- **Profile & Security Page** (`/profile`)
  - New user profile page accessible to all roles
  - Self-service 2FA enable/disable
  - QR code display and secret text
  - Backup code management
  - Password-protected 2FA disable
  - Added to navigation menu (👤 Profile & Security)

- **Enhanced Login Flow**
  - Automatic 2FA detection on login
  - Conditional TOTP input field
  - Support for both authenticator codes and backup codes
  - Toggle between code types
  - "Back to login" option
  - Maintained rate limiting (5 attempts/15 min)

### Technical Implementation

**Database Schema Changes:**
- `users.two_factor_enabled` - INTEGER (0/1 flag)
- `users.two_factor_secret` - TEXT (encrypted TOTP secret)
- `users.backup_codes` - TEXT (JSON array of hashed codes)

**New Files Created:**
- `lib/security/totp-manager.ts` - Core TOTP logic
  - `generateSecret()` - Create new TOTP secret
  - `generateQRCode()` - QR code generation
  - `verifyToken()` - TOTP validation with clock drift tolerance
  - `generateBackupCodes()` - Random alphanumeric codes (XXXX-XXXX format)
  - `hashBackupCodes()` - Bcrypt hashing for storage
  - `validateBackupCode()` - Verification and invalidation
  - `encryptSecret()` / `decryptSecret()` - AES-256-GCM encryption

- `src/app/profile/page.tsx` - Profile & Security UI
  - Account information display
  - 2FA setup wizard (3 steps: QR, backup codes, verification)
  - 2FA status badge
  - Enable/disable controls
  - Backup code download/copy

- `src/app/api/auth/2fa/setup/route.ts` - 2FA Setup
  - Generates TOTP secret
  - Creates QR code
  - Returns 8 backup codes
  - Rate limited (10 attempts/hour)
  - Audit logged

- `src/app/api/auth/2fa/verify/route.ts` - 2FA Verification
  - Validates TOTP token
  - Encrypts and saves secret
  - Hashes and stores backup codes
  - Enables 2FA flag
  - Rate limited (5 attempts/15 min)
  - Audit logged

- `src/app/api/auth/2fa/disable/route.ts` - 2FA Disable
  - Requires password confirmation
  - Clears all 2FA data
  - Audit logged

- `src/app/api/auth/check-2fa/route.ts` - Login Helper
  - Checks if user requires 2FA
  - Password pre-validation
  - Prevents user enumeration

**Modified Files:**
- `auth.ts` - NextAuth integration
  - Added `totp` and `backupCode` credentials
  - 2FA verification in authorize()
  - Automatic backup code invalidation after use
  - Decryption of stored secrets

- `src/app/login/page.tsx` - Enhanced login
  - 2FA detection flow
  - Conditional TOTP input
  - Backup code toggle
  - Disabled password field when 2FA active

- `src/components/NavigationMenu.tsx`
  - Added "👤 Profile & Security" link

- `lib/database/connection.ts`
  - Added 2FA columns to users table

**Dependencies Added:**
- `otpauth` (v11.x) - TOTP generation and verification
- `qrcode` (v1.x) - QR code generation
- `@types/qrcode` - TypeScript definitions

### Security Features

**Encryption:**
- TOTP secrets encrypted with AES-256-GCM before storage
- PBKDF2 key derivation (100,000 iterations)
- Random salt and IV for each encryption
- Authentication tags for integrity verification
- Environment variable for encryption key (`TOTP_ENCRYPTION_KEY`)

**Rate Limiting:**
- Setup: 10 attempts per hour
- Verification: 5 attempts per 15 minutes
- Integrates with existing rate limiting system

**Audit Logging:**
All 2FA events logged to audit system:
- `2fa_setup_initiated` - Setup process started
- `2fa_setup_rate_limit` - Too many setup attempts
- `2fa_verify_failed` - Invalid TOTP provided
- `2fa_enabled` - Successfully enabled
- `2fa_disabled` - Successfully disabled
- `2fa_disable_failed` - Invalid password on disable

**Best Practices:**
- ✅ Clock drift tolerance (±30 seconds)
- ✅ One-time use backup codes
- ✅ Hashed backup codes (bcrypt)
- ✅ Encrypted TOTP secrets
- ✅ Password confirmation for disable
- ✅ Comprehensive audit trail
- ✅ Industry-standard TOTP (RFC 6238)

### User Experience

**Setup Flow:**
1. Navigate to Profile & Security
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app
4. Save 8 backup codes (download or copy)
5. Enter TOTP code to verify
6. 2FA enabled!

**Login Flow:**
1. Enter email and password
2. If 2FA enabled, show TOTP field
3. Enter 6-digit code from app (or backup code)
4. Sign in successfully

**Disable Flow:**
1. Navigate to Profile & Security
2. Enter password
3. Confirm disable
4. 2FA disabled

### Recommendations
- **Admin accounts:** Enable 2FA for all admin users
- **High-value accounts:** Recommended for agents handling sensitive data
- **Backup codes:** Store securely (password manager, encrypted file, physical copy)
- **Encryption key:** Set `TOTP_ENCRYPTION_KEY` environment variable in production

---

## [0.4.1] - 2025-12-21

### Security - EMERGENCY PRODUCTION CLEANUP

**Additional Malware Discovered on Production Server**

During deployment verification on December 21, 2025, **three additional malware backdoors** were discovered on the production server that were NOT present in the GitHub repository. These backdoors were injected directly onto the production server during the initial compromise (Dec 5-6, 2025).

### Removed - Critical Backdoors

**1. Remote Code Execution Backdoor - poss.cjs** 🔴 CRITICAL
- **File:** `src/app/api/poss.cjs`
- **Type:** Node.js HTTP server hijack backdoor
- **Method:** Intercepted all HTTP requests, executed shell commands via `/_proxy/decode` endpoint
- **API Key:** `oxoeL1A7RNPpape5Il5n8czf`
- **Capability:** Full remote command execution on server
- **Impact:** Attackers could run any shell command with root privileges
- **Status:** REMOVED

**2. Remote Code Execution Backdoor - sinicize-swanskins** 🔴 CRITICAL
- **File:** `src/app/sinicize-swanskins/route.ts`
- **Type:** Next.js API route backdoor
- **Method:** Legitimate-looking API route that executed shell commands via query parameter
- **API Key:** `nulFFsDwKHn8PwueisB6hqfX`
- **Capability:** Remote command execution via GET request
- **Impact:** Attackers could execute arbitrary commands through HTTPS endpoint
- **Status:** REMOVED

**3. Malware Marker File**
- **File:** `.pwned`
- **Content:** "pwned"
- **Purpose:** Marker file indicating successful server compromise
- **Created:** December 5, 2025
- **Status:** REMOVED

### Fixed - Production Server

**Post-Deployment Actions:**
- Scanned production server source code for malware
- Removed all three backdoor files from production
- Deleted infected build directory (`.next`)
- Rebuilt application from clean source code
- Restarted application with PM2
- Verified all security checks passing

**Key Insight:**
These backdoors were ONLY on the production server, not in GitHub repository. This confirms:
1. Initial compromise occurred on production server directly (Dec 5-6, 2025)
2. Attackers had direct access to production filesystem
3. Malware was injected after repository code was deployed
4. GitHub repository remained clean throughout infection

### Security Verification
- ✅ All backdoor files removed from production
- ✅ Clean build deployed
- ✅ Application running on clean v0.4.0 codebase
- ✅ Security monitoring active (6/6 checks passing)
- ✅ No malware detected in source code or running processes

### Total Malware Components Removed (Dec 20-21, 2025)
**18+ malware components eliminated:**
- Phase 1 (Dec 20): 15 components (miners, backdoors, rootkits, persistence)
- Phase 2 (Dec 21): 3 components (RCE backdoors, marker file)

---

## [0.4.0] - 2025-12-20

### Security - COMPREHENSIVE HARDENING (Phase 5)

**Critical Security Improvements Package:**

### Added - Phase 5 (Final Security Layer)

**1. Localhost-Only Binding**
- Next.js now binds to 127.0.0.1 (localhost) only
- Direct IP:port access blocked (http://143.244.185.41:3000)
- ALL traffic must go through HTTPS via nginx reverse proxy
- Prevents unencrypted credential/session transmission
- Modified: `package.json` start script

**2. Image Upload/Delete Authentication & Hardening** 🔴 CRITICAL FIX
- **FIXED:** Image upload endpoint was completely unauthenticated
- **FIXED:** Image deletion endpoint was completely unauthenticated
- **FIXED:** Anyone could upload/delete images to any lead
- Added authentication checks to all image endpoints
- Added authorization checks (user must own lead or be agent with access)
- Added rate limiting: 20 uploads per hour per user
- Added file size validation: 10MB maximum
- Added file type validation: extension + MIME type
- Added audit logging for uploads, deletions, and violations
- Instrumented: GET, POST, DELETE `/api/leads/[id]/images`

**3. Input Sanitization System (XSS Prevention)**
- Created comprehensive input sanitizer (`lib/security/input-sanitizer.ts`)
- Strips HTML tags, JavaScript, event handlers from all user input
- Removes iframe, object, embed tags
- Sanitizes: text, emails, phone numbers, notes, numbers
- Enforces field length limits
- Applied to ALL user input endpoints:
  - Lead creation (`/api/leads POST`)
  - Lead updates (`/api/leads/[id] PUT`)
  - CSV uploads (`/api/leads/upload`) - CRITICAL for external data
  - User creation (`/api/users POST`)
  - User updates (`/api/users/[id] PATCH`)
  - Notes (`/api/leads/[id]/notes POST`)
  - Activities (`/api/leads/[id]/activities POST`)
- Prevents stored XSS attacks from malicious user input

**4. Enhanced File Upload Validation**
- Created file validator (`lib/security/file-validator.ts`)
- **Magic number validation:** Checks actual file signatures, not just MIME type
- **File content verification:** Validates file matches claimed type
- **Executable detection:** Scans for embedded PHP, scripts, malicious code
- **Size enforcement:** 10MB images, 50MB CSV files
- **Binary detection:** Ensures CSV files are actually text
- Applied to:
  - Image uploads: validates JPEG, PNG, GIF, WEBP signatures
  - CSV uploads: validates text content, blocks binary files
- Logs rejected uploads to audit log
- Prevents file spoofing and malicious uploads

**5. CORS Policy Configuration**
- Configured strict Cross-Origin Resource Sharing policy
- Production: Only `https://the4rge.com` allowed
- Development: Only `http://localhost:3000` allowed
- Blocks unauthorized cross-origin API requests
- Allows credentials for session cookies
- 24-hour preflight cache for performance

**6. Error Message Sanitization**
- Created error sanitizer (`lib/security/error-sanitizer.ts`)
- Production errors are sanitized before sending to client
- Removes: file paths, database details, connection strings, stack traces
- Replaces detailed errors with safe generic messages
- Full error logging server-side for debugging
- Prevents information disclosure attacks
- Applied to critical endpoints (leads API, image uploads)

### Security Audit Summary
All Phase 5 security measures verified and working:
- ✅ Localhost binding active
- ✅ Image endpoints authenticated and authorized
- ✅ Input sanitization on all user inputs
- ✅ File validation with magic number checking
- ✅ CORS policy configured
- ✅ Error messages sanitized in production

### Security Fixes Timeline
- **Phase 1** (v0.3.0): Authentication, rate limiting, Next.js updates
- **Phase 2** (v0.3.0): Audit logging, security headers, session security
- **Phase 3** (v0.3.0): Password strength requirements
- **Phase 4** (v0.3.1): Extended rate limiting, automated backups, bulk delete auth
- **Phase 5** (v0.4.0): Localhost binding, image auth, input sanitization, file validation, CORS, error sanitization

---

## [0.3.1] - 2025-12-20

### Added - Phase 4 (Extended Rate Limiting & Data Protection)
- **Automated Database Backup System**
  - Daily backups at 2 AM via cron job
  - SQLite WAL checkpoint for clean snapshots
  - Gzip compression to save disk space
  - 30-day retention policy with automatic cleanup
  - Backup location: `/var/backups/the-forge/`
  - Script: `/var/www/the-forge/scripts/backup-database.sh`
- **Extended Rate Limiting Coverage**
  - Password reset endpoint: 3 attempts per hour (prevents brute force)
  - User creation endpoint: 10 users per hour (prevents account spam)
  - Bulk delete endpoint: 5 operations per hour (prevents abuse)
  - All endpoints return HTTP 429 with retry timing
- **Enhanced Password Reset Security**
  - Strong password requirements enforced (matches user creation standards)
  - Audit logging for failed and successful reset attempts
  - Rate limit counter reset on successful password change
  - Detailed validation error messages
- **Bulk Delete Endpoint Hardening**
  - Added authentication check (was missing - **CRITICAL FIX**)
  - Restricted to admin role only
  - Combined rate limiting with existing audit logging

### Security
- Fixed critical vulnerability: bulk delete endpoint was unauthenticated
- Environment variable security audit: verified `.env*` files in `.gitignore`, no hardcoded secrets
- 0 npm vulnerabilities maintained

### Changed
- Updated backup script to modern format with better error handling and logging

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
| 0.5.0 | 2025-12-21 | **2FA IMPLEMENTATION:** TOTP-based two-factor authentication, backup codes, profile page, encrypted secrets, comprehensive security |
| 0.4.1 | 2025-12-21 | **EMERGENCY CLEANUP:** Removed 3 additional RCE backdoors from production server, clean rebuild deployed |
| 0.4.0 | 2025-12-20 | **SECURITY HARDENING:** Localhost binding, image auth fixes, input sanitization, file validation, CORS, error sanitization |
| 0.3.1 | 2025-12-20 | **SECURITY PATCH:** Extended rate limiting, automated backups, critical bulk delete auth fix |
| 0.3.0 | 2025-12-20 | **SECURITY UPDATE:** Malware removal, audit logging, rate limiting, password enforcement, security headers |
| 0.2.0 | 2025-10-07 | Production stability fixes, Turbopack disabled, PM2 auto-startup |
| 0.1.0 | 2025-10-01 | Authentication, multi-user, calendar, analytics |
| 0.0.1 | 2025-09-30 | Initial release with core CRM features |

---

*Maintained by: Marc Spagnuolo*
*Developer: Claude (Anthropic AI Assistant)*
