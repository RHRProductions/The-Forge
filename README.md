# The Forge

> "Where Cold Leads Turn to Gold Leads"

A comprehensive CRM system built specifically for insurance lead management.

![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-Private-red)

---

## Quick Links

📚 **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Complete technical documentation
🚀 **[DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md)** - Deployment guide & troubleshooting
📋 **[CHANGELOG.md](./CHANGELOG.md)** - Version history & release notes
📝 **[SESSION_NOTES.md](./SESSION_NOTES.md)** - Development session logs

---

## What is The Forge?

The Forge is a custom-built CRM designed for insurance agents to manage leads efficiently, track ROI, and convert prospects into clients. It specializes in:

- **Medicare T65 Leads** - Turning 65, supplements, advantage plans
- **Life Insurance Leads** - Final expense, term life, whole life
- **Client Management** - Existing policyholders and renewals

---

## Key Features

✅ Lead Management (CRUD operations)
✅ CSV Upload from Multiple Vendors
✅ Activity Tracking (calls, texts, emails)
✅ Lead Temperature (Hot/Warm/Cold)
✅ Follow-Up Reminders
✅ Multi-User Authentication
✅ Calendar & Appointments
✅ Analytics Dashboard
✅ ROI Tracking

---

## Tech Stack

- **Frontend:** Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, SQLite (better-sqlite3)
- **Authentication:** NextAuth v5
- **Deployment:** DigitalOcean VPS, PM2, Nginx
- **Version Control:** Git, GitHub

---

## Getting Started

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Production Deployment

**See [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) for complete deployment guide.**

Quick version:
```bash
ssh root@143.244.185.41
cd /var/www/the-forge
git pull
npm run build
pm2 restart the-forge --update-env
pm2 save
```

**Production URL:** http://143.244.185.41:3000

---

## Documentation

| Document | Purpose |
|----------|---------|
| [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) | Complete technical documentation, database schema, API routes, features |
| [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) | Deployment procedures, troubleshooting, production settings |
| [CHANGELOG.md](./CHANGELOG.md) | Version history, release notes, what changed when |
| [SESSION_NOTES.md](./SESSION_NOTES.md) | Development logs, problems encountered, solutions implemented |

---

## Project Structure

```
the-forge/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── page.tsx      # Main dashboard
│   │   ├── login/        # Authentication
│   │   ├── analytics/    # Analytics dashboard
│   │   ├── calendar/     # Calendar view
│   │   └── api/          # API routes
│   └── components/       # React components
├── lib/
│   ├── database/         # Database connection & schema
│   └── utils.ts          # Utility functions
├── types/
│   └── lead.ts          # TypeScript type definitions
├── data/
│   └── forge.db         # SQLite database
└── public/              # Static assets
```

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack

# Production
npm run build           # Build for production (no Turbopack)
npm start              # Start production server

# Utilities
npm run lint           # Run ESLint
```

---

## Quick Troubleshooting

### Build Fails on Server
**Error:** SIGKILL during build
**Fix:** Turbopack disabled in production (already fixed)

### Can't Login
**Issue:** Only works on :3000, not through Nginx
**Fix:** Always use http://143.244.185.41:3000

### Site Down After Reboot
**Fix:**
```bash
ssh root@143.244.185.41
pm2 restart the-forge
```

**See [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) for more troubleshooting.**

---

## Database

**Location:** `/var/www/the-forge/data/forge.db` (production)

**Main Tables:**
- `leads` - Lead information
- `lead_activities` - Activity history
- `lead_notes` - Timestamped notes
- `lead_images` - File attachments
- `lead_policies` - Insurance policies
- `users` - Authentication & authorization
- `calendar_events` - Appointments

---

## Contributing

This is a private project for Marc Spagnuolo's insurance business.

---

## Version

**Current Version:** 0.2.0
**Last Updated:** October 7, 2025

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## Support

**Owner:** Marc Spagnuolo
**Developer:** Claude (Anthropic AI Assistant)
**Repository:** https://github.com/RHRProductions/The-Forge

---

## License

Private - All Rights Reserved

---

*Built with Next.js 15, React 19, and TypeScript*
