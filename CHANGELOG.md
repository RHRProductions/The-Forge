# Changelog

All notable changes to The Forge CRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### To Investigate
- High PM2 restart count (800+) - need to identify root cause
- Potential memory optimization opportunities

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
| 0.2.0 | 2025-10-07 | Production stability fixes, Turbopack disabled, PM2 auto-startup |
| 0.1.0 | 2025-10-01 | Authentication, multi-user, calendar, analytics |
| 0.0.1 | 2025-09-30 | Initial release with core CRM features |

---

*Maintained by: Marc Spagnuolo*
*Developer: Claude (Anthropic AI Assistant)*
