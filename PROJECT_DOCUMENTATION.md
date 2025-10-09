# The Forge - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Features & Functionality](#features--functionality)
5. [CSV Upload System](#csv-upload-system)
6. [Activity Tracking System](#activity-tracking-system)
7. [Lead Temperature & Follow-ups](#lead-temperature--follow-ups)
8. [Deployment Information](#deployment-information)
9. [Key Files & Their Purpose](#key-files--their-purpose)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Project Overview

**The Forge** is a custom-built CRM (Customer Relationship Management) system designed specifically for insurance lead management. The name represents the concept of "turning cold leads into gold leads" - forging relationships and converting prospects into clients.

### Core Purpose
- Manage insurance leads (Medicare T65, Life Insurance, etc.)
- Track contact attempts and outcomes
- Monitor lead temperature (Hot/Warm/Cold)
- Schedule and track follow-ups
- Maintain comprehensive lead history and notes
- Analyze ROI and conversion metrics

---

## Technology Stack

### Frontend
- **Next.js 15.5.2** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **SQLite (better-sqlite3)** - Local database for data persistence
- **Node.js** - Runtime environment

### Deployment
- **DigitalOcean VPS** - Production server at IP: 143.244.185.41
- **PM2** - Process manager for Node.js
- **Git/GitHub** - Version control (Repository: RHRProductions/The-Forge)

---

## Database Schema

### Main Tables

#### **leads** table
Primary table storing all lead information:

**Personal Information:**
- `id` - Auto-incrementing primary key
- `first_name`, `last_name` - Lead name
- `email` - Email address
- `phone`, `phone_2` - Primary and secondary phone numbers
- `company` - Company name
- `date_of_birth`, `age` - Birth date and calculated age
- `gender`, `marital_status` - Demographics
- `occupation`, `income`, `household_size` - Financial details

**Address Information:**
- `address` - Street address
- `city`, `state`, `zip_code` - Location details

**Lead Management:**
- `status` - Lead status (new, no_answer, follow_up_needed, appointment_set, closed, etc.)
- `lead_type` - Type of lead (t65, life, client, other)
- `lead_temperature` - Hot/Warm/Cold indicator
- `contact_method` - Preferred contact method (phone, text, email)
- `lead_score` - Scoring system (0-100)

**Tracking & Metrics:**
- `cost_per_lead` - Cost to acquire this lead
- `sales_amount` - Revenue from this lead
- `source` - Where the lead came from
- `last_contact_date` - Last time contact was made
- `next_follow_up` - Scheduled follow-up date
- `contact_attempt_count` - Number of contact attempts

**System Fields:**
- `notes` - General notes
- `created_at`, `updated_at` - Timestamps

#### **lead_activities** table
Tracks all interactions with leads:
- `id` - Primary key
- `lead_id` - Foreign key to leads table
- `activity_type` - Type (call, text, email, note, status_change, appointment, sale)
- `activity_detail` - Description of activity
- `outcome` - Result (answered, voicemail, no_answer, busy, scheduled, completed, cancelled, closed)
- `lead_temperature_after` - Temperature after this activity
- `next_follow_up_date` - Follow-up date set during activity
- `contact_attempt_number` - Which attempt number this was
- `created_at` - When activity occurred

#### **lead_notes** table
Timestamped notes for leads:
- `id` - Primary key
- `lead_id` - Foreign key to leads
- `note` - Note text
- `created_at` - When note was added

#### **lead_images** table
Image attachments for leads:
- `id` - Primary key
- `lead_id` - Foreign key to leads
- `filename` - System filename
- `original_name` - User's original filename
- `file_path` - Path to file
- `file_size` - Size in bytes
- `mime_type` - Image type
- `uploaded_at` - Upload timestamp

#### **lead_policies** table
Insurance policies associated with leads:
- `id` - Primary key
- `lead_id` - Foreign key to leads
- `policy_number` - Policy identifier
- `policy_type` - Type of insurance
- `coverage_amount` - Coverage value
- `premium_amount` - Premium cost
- `start_date`, `end_date` - Policy dates
- `status` - active, pending, cancelled, expired
- `notes` - Policy notes
- `created_at` - When policy was added

---

## Features & Functionality

### 1. Dashboard View
- **Lead Table** - Displays all leads with key information
- **Search Bar** - Search by name or phone number (strips formatting for better matching)
- **Filters** - Filter by status, lead type, city, zip code, age range
- **Statistics Cards** - Total leads, cost, sales, ROI calculation
- **Follow-Up Reminders Sidebar** - Shows warm/hot leads with upcoming follow-ups

### 2. Lead Management

#### Adding Leads
- **Manual Entry** - Form to add single leads
- **CSV Upload** - Bulk import from CSV files
- Automatic lead type detection based on CSV data
- Smart field mapping for various CSV formats

#### Lead Detail View (Modal)
- **Resizable & Draggable Modal** - User can resize and move the detail window
- **Navigation** - Next/Previous arrows to move through filtered leads
- **Multi-column Layout:**
  - Left: Lead information form
  - Right: Activities, Notes, Images, Policies

#### Lead Information Sections
1. **Basic Information** - Name, email, phone, company
2. **Address** - Full address details
3. **Personal Information** - DOB, age, gender, marital status, occupation
4. **Lead Management** - Status, contact method, lead type, cost, sales
5. **Lead Insights** - Temperature, follow-up dates, scoring

### 3. Activity Tracking System

#### Quick Actions
- One-click buttons for Call, Text, Email activities

#### Activity Form
- **Activity Type** - Call, text, email, note, status change, appointment, sale
- **Details** - Description (auto-generated if outcome selected)
- **Outcome** - answered, voicemail, no_answer, busy, scheduled, completed, cancelled, closed
- **Lead Temperature** - Set to hot, warm, or cold
- **Next Follow-Up** - Date picker for scheduling

#### Smart Automation
- **Default Outcome** - Pre-set to "no_answer" (most common)
- **Auto-increment Counter** - Tracks contact attempts for calls, texts, emails
- **Auto-update Status** - Setting outcome to "no_answer" automatically updates lead status
- **Attempt Numbering** - Each contact activity gets numbered (Attempt #1, #2, etc.)
- **Real-time Updates** - Changes reflect immediately without page refresh

#### Activity Timeline
- Chronological list of all activities
- Color-coded outcomes
- Shows temperature changes
- Displays attempt numbers
- Delete capability for each activity

### 4. Lead Temperature & Follow-ups

#### Temperature System
- **🔥 Hot** - High-priority, engaged leads
- **☀️ Warm** - Interested, moderate priority
- **❄️ Cold** - Low engagement

#### Follow-Up Automation
- **Smart Suggestions** - Auto-suggests follow-up dates based on outcome:
  - Voicemail: 2 days
  - Answered: 7 days
  - Completed: 30 days
  - Cancelled: 7 days
  - No Answer/Busy: No auto-suggestion (need more data)
- **Temperature Trigger** - Auto-suggestions only activate for warm/hot leads
- **Manual Override** - User can always change suggested dates

#### Follow-Up Reminders Dashboard
Located in left sidebar, shows:
- **⚠️ Overdue** - Past due follow-ups (red)
- **📅 Today** - Due today (green)
- **Upcoming 7 Days** - Next week's follow-ups (gray)
- Sorted by temperature (hot first), then date
- Click to open lead detail

### 5. Notes System
- Add timestamped notes to any lead
- Mountain Time (America/Denver) timezone
- Delete capability
- Chronological display

### 6. Image Attachments
- Upload images for leads
- View full-size in modal
- Download capability
- Delete functionality
- Tracks file metadata

### 7. Policy Management
- Add insurance policies to leads
- Track policy details, coverage, premiums
- Status tracking (active, pending, cancelled, expired)
- Policy-specific notes

---

## CSV Upload System

### Supported CSV Formats

#### Format 1: T65/Medicare Leads
```csv
Cell,callability,contactable,title,firstname,lastname,addressline1,city,state,zip,zip4,county,age,birth_date,latitude,longitude,carrier
```

#### Format 2: Life Insurance Leads
```csv
Lead Id,Received Date,First Name,Last Name,Status,Lead Partner,Lead Type,Lead Owner,Date Of Birth,Age,Email,Home,Mobile,Work,Other Phone 1,Mortgage Amount,Mortgage Date,Lender,Last Modified,Street Address,City,State,Zip,County,Lead Partner Notes,Assets Notes
```

### Smart Mapping Features
- **Flexible Column Names** - Recognizes variations (first_name, First Name, firstname, etc.)
- **Auto-detect Lead Type** - Analyzes source, campaign, notes for keywords:
  - T65: "medicare", "supplement", "turning 65", etc.
  - Life: "life", "final expense", "burial", etc.
  - Client: "client", "existing", "policyholder", etc.
- **Age Calculation** - Calculates age from birth date
- **Birth Date Parsing** - Handles multiple formats (M/D/YYYY, etc.)
- **Unmapped Data Preservation** - Stores extra columns in notes
- **Error Handling** - Handles malformed CSV quotes gracefully

### Upload Process
1. Select CSV file
2. Enter total cost for all leads (auto-calculates cost per lead)
3. System analyzes and maps columns
4. Imports all leads
5. Shows success/error counts

---

## Lead Temperature & Follow-ups

### Temperature System Purpose
- **Prioritization** - Focus on hot leads first
- **Segmentation** - Group leads by engagement level
- **Follow-up Strategy** - Different approaches for different temperatures

### Follow-up Strategy
**Warm/Hot Leads:**
- Get auto-suggested follow-up dates
- Appear in Follow-Up Reminders sidebar
- Higher priority in workflow

**Cold Leads:**
- No auto-suggestions (avoid clutter)
- Can manually set follow-ups if needed
- Lower priority

### Contact Attempt Strategy
**Multi-channel Tracking:**
- Tracks attempts across call, text, email
- Single counter increments for all contact types
- AI can later analyze: "Lead converted after 2 calls + 1 text"

**Data Collection:**
- Building dataset for AI insights
- Will identify patterns like:
  - Optimal number of attempts
  - Best time of day to call
  - Most effective channel per lead type

---

## Database Backup & Safety

### ⚠️ Critical Database Safety Rules

1. **NEVER commit the database to git** - The database is excluded from version control
2. **ALWAYS create a backup before deploying** - Use `./scripts/backup-database.sh`
3. **Production and local databases are completely separate** - They never sync via git
4. **Automated backups run daily** - 2:00 AM EST, 7-day retention
5. **See DISASTER_RECOVERY.md** for full recovery procedures

### Backup System

**Automated Backups:**
- Runs daily at 2:00 AM EST via cron job
- Keeps 7 days of backups
- Location: `/var/www/the-forge/backups/`

**Manual Backup:**
```bash
cd /var/www/the-forge
./scripts/backup-database.sh
```

**Restore from Backup:**
```bash
cd /var/www/the-forge
./scripts/restore-database.sh /var/www/the-forge/backups/forge_backup_YYYYMMDD_HHMMSS.db
pm2 restart the-forge
```

**Check Existing Backups:**
```bash
ls -lh /var/www/the-forge/backups/
```

### Data Loss Prevention

On **October 9, 2025**, we experienced a critical data loss incident where production data was overwritten by the local development database during a git pull. This happened because the database was previously tracked in git.

**Safeguards Now in Place:**
1. Database removed from git tracking (both local and production)
2. Enhanced `.gitignore` with explicit database exclusions
3. Daily automated backups with 7-day retention
4. Manual backup script for pre-deployment backups
5. Restore script for quick recovery
6. Comprehensive disaster recovery documentation

**See DISASTER_RECOVERY.md for:**
- Complete recovery procedures
- Backup/restore testing protocols
- Prevention checklists
- Emergency contact information

---

## Deployment Information

### Production Server
- **Provider:** DigitalOcean
- **IP Address:** 143.244.185.41
- **Port:** 3000
- **URL:** http://143.244.185.41:3000 (always include :3000)
- **OS:** Ubuntu 22.04 LTS
- **Process Manager:** PM2 (configured for auto-restart on server reboot)

### Deployment Process

**Standard Deployment (from local machine):**

1. **Local Development:**
   ```bash
   npm run dev  # Run development server (uses Turbopack for speed)
   ```

2. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "Your message"
   git push
   ```

3. **Update Production Server:**
   ```bash
   ssh root@143.244.185.41
   cd /var/www/the-forge

   # ALWAYS create a backup before deploying
   ./scripts/backup-database.sh

   # Pull latest changes
   git pull origin master

   # Build and restart
   npm install
   npm run build
   pm2 restart the-forge --update-env
   pm2 save
   ```

### Critical Production Configuration

**Build Configuration:**
- **Turbopack is DISABLED for production builds** (package.json: `"build": "next build"`)
- **Reason:** VPS has limited memory (957MB) - Turbopack causes Out-Of-Memory crashes
- **Development still uses Turbopack** for faster compilation
- **Both produce identical production builds**

**PM2 Auto-Startup:**
- PM2 is configured to auto-start on server reboot
- Process list is saved via `pm2 save`
- If server restarts, The Forge will automatically come back online

**Environment Variables:**
- Located in `/var/www/the-forge/.env.local`
- Contains `AUTH_SECRET` and `NEXTAUTH_URL`
- PM2 must be restarted with `--update-env` flag to pick up changes

### Important Notes
- **Database Location:** `/var/www/the-forge/data/forge.db`
- **⚠️ CRITICAL: Database is NOT tracked in git** - Production data stays on server, never syncs via git
- **Daily Automated Backups:** Database backed up every day at 2:00 AM EST (7-day retention)
- **See DISASTER_RECOVERY.md** for backup procedures and data recovery protocols
- **ESLint/TypeScript disabled in production** - For faster builds (set in next.config.ts)
- **Always access via :3000** - Nginx reverse proxy exists but causes NextAuth session issues
- **Do not use Turbopack flag in production builds** - Will crash due to memory limits

---

## Key Files & Their Purpose

### Core Application Files

**`src/app/page.tsx`** (Main Dashboard)
- Primary UI component
- Lead table and filtering
- Lead detail modal
- All lead management logic
- Contains multiple sub-components:
  - ResizableMovableModal
  - FollowUpReminders
  - LeadDetailForm
  - ActivitiesSection
  - NotesSection
  - ImagesSection
  - PoliciesSection

**`types/lead.ts`**
- TypeScript type definitions
- Interfaces for Lead, LeadActivity, LeadPolicy, etc.
- Enums for status types, activity types, outcomes

**`lib/database/connection.ts`**
- Database initialization
- Schema creation and migrations
- Table setup and indexes

**`lib/utils.ts`**
- Utility functions:
  - `formatPhoneNumber()` - Formats phone to (XXX) XXX-XXXX
  - `formatName()` - Capitalizes names properly
  - `formatLocation()` - Capitalizes city/state
  - `calculateAge()` - Calculates age from birth date
  - `formatDateForInput()` - Formats dates for input fields

### API Routes

**`src/app/api/leads/route.ts`**
- GET - Fetch all leads
- POST - Create new lead

**`src/app/api/leads/[id]/route.ts`**
- GET - Fetch single lead
- PUT - Update lead
- DELETE - Delete lead

**`src/app/api/leads/[id]/activities/route.ts`**
- GET - Fetch activities for a lead
- POST - Create new activity (includes auto-updates for status, temperature, follow-ups)

**`src/app/api/leads/[id]/activities/[activityId]/route.ts`**
- DELETE - Delete activity

**`src/app/api/leads/[id]/notes/route.ts`**
- GET - Fetch notes for a lead
- POST - Create new note

**`src/app/api/leads/[id]/notes/[noteId]/route.ts`**
- DELETE - Delete note

**`src/app/api/leads/[id]/images/route.ts`**
- GET - Fetch images for a lead
- POST - Upload new image

**`src/app/api/leads/[id]/images/[imageId]/route.ts`**
- DELETE - Delete image

**`src/app/api/leads/[id]/policies/route.ts`**
- GET - Fetch policies for a lead
- POST - Create new policy

**`src/app/api/leads/[id]/policies/[policyId]/route.ts`**
- PUT - Update policy
- DELETE - Delete policy

**`src/app/api/leads/upload/route.ts`**
- POST - Handle CSV file upload and bulk import

**`src/app/api/leads/bulk-delete/route.ts`**
- DELETE - Delete all leads (developer tool, requires confirmation)

### Configuration Files

**`next.config.ts`**
```typescript
{
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
}
```

**`tailwind.config.ts`**
- Tailwind CSS configuration

**`tsconfig.json`**
- TypeScript configuration

**`package.json`**
- Dependencies and scripts

---

## Recent Updates & Features Added

### Session 1: Initial Build
- Basic CRUD operations
- CSV upload system
- Lead detail modal
- Resizable/draggable modal

### Session 2: Activity Tracking
- Activity timeline
- Quick action buttons
- Outcome tracking
- Auto-generated details

### Session 3: Smart Features
- Lead temperature system
- Contact attempt counter
- Smart follow-up suggestions
- Follow-up reminders dashboard
- Mountain Time timezone support

### Session 4: UI/UX Improvements
- Search functionality (name/phone)
- Filtered navigation (next/previous in filtered list)
- Lead type auto-population fix
- Contact method defaults to phone
- Activity outcome defaults to "no_answer"
- Auto-update status on "no_answer" activity
- Real-time status updates (no refresh needed)
- GET endpoint for single lead fetch

### Session 5: Multi-User & Authentication (October 2025)
- NextAuth v5 authentication system
- Multi-user support (admin/agent/setter roles)
- Calendar with drag-drop appointments
- Analytics dashboard
- Password reset functionality
- State filtering
- Bulk delete improvements
- Melissa Medicare CSV format support

### Session 6: Production Stability & Deployment Fixes (October 7, 2025)
- **Fixed:** Turbopack memory crash on production builds
  - Disabled Turbopack for production (`npm run build`)
  - Kept Turbopack for development speed
  - Prevents SIGKILL Out-Of-Memory errors on VPS
- **Fixed:** Multiple lockfile warning by removing `/var/www/package-lock.json`
- **Configured:** PM2 auto-startup on server reboot
  - Added systemd service for automatic recovery
  - Process list saved for resurrection after crashes
- **Documented:** Decision to use `:3000` port permanently
  - NextAuth session issues with Nginx reverse proxy
  - Simplified deployment and authentication
- **Updated:** Deployment process with `--update-env` flag
- **Created:** Comprehensive troubleshooting guide

### Session 7: Commission Tracking & Data Safety (October 9, 2025)
- **Added:** Commission tracking system
  - `commission_amount` field on policies
  - Total Sales now calculates from commission sum
  - Policy edit/delete functionality in calendar view
  - Mobile-responsive policy management
- **Critical Incident:** Data loss during deployment
  - Production database overwritten by local dev database via git pull
  - Lost several days of production data (leads, appointments, policies)
  - Root cause: Database was tracked in git before being added to .gitignore
- **Implemented:** Comprehensive backup and safety system
  - Removed database from git tracking permanently
  - Enhanced .gitignore with explicit exclusions
  - Created automated daily backup script (7-day retention)
  - Created manual backup/restore scripts
  - Documented disaster recovery procedures (DISASTER_RECOVERY.md)
  - Updated deployment process to require pre-deployment backups
- **Fixed:** All commission tracking features verified working locally

---

## Future Enhancements (Planned)

### AI & Analytics
- Pattern recognition for optimal contact times
- Lead scoring based on historical conversion data
- Predictive follow-up scheduling
- Channel effectiveness analysis (call vs text vs email)

### Additional Features
- Email integration
- SMS integration
- Calendar integration for appointments
- Automated reminders/notifications
- Custom reporting dashboards
- Team collaboration features
- Mobile app

---

## Developer Notes

### Key Design Decisions

1. **SQLite Choice** - Simple, fast, no external dependencies, perfect for single-user or small team
2. **Server Components** - Next.js App Router for better performance
3. **Real-time Updates** - State management ensures UI updates without page refresh
4. **Timezone Handling** - All timestamps stored in UTC, converted to Mountain Time for display
5. **CSV Flexibility** - Smart mapping handles various formats without manual configuration

### Common Operations

**Add a new field to leads:**
1. Update `types/lead.ts` interface
2. Update `lib/database/connection.ts` schema
3. Add column with ALTER TABLE (for existing databases)
4. Update form in `page.tsx`
5. Update API routes to handle new field

**Add a new activity type:**
1. Update `ActivityType` in `types/lead.ts`
2. Add to activity form in `page.tsx`
3. Add icon/label in `getActivityTypeIcon()` and `getActivityTypeLabel()`

**Add a new status:**
1. Update `LeadStatus` in `types/lead.ts`
2. Add to status dropdown in `page.tsx`
3. Add color coding in status badge logic

### Debugging Tips
- Check browser console for errors (F12)
- Check PM2 logs on server: `pm2 logs the-forge`
- Verify database with: `sqlite3 data/forge.db "SELECT * FROM leads LIMIT 5"`
- Check API responses in Network tab

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Build fails with "SIGKILL" error
**Symptoms:**
- `npm run build` crashes with "Next.js build worker exited with code: null and signal: SIGKILL"
- Build hangs at "Creating an optimized production build..."

**Cause:** Out of memory - Turbopack uses too much RAM for the VPS (957MB available)

**Solution:**
1. Edit `package.json` line 7
2. Change `"build": "next build --turbopack"` to `"build": "next build"`
3. Run `npm run build` again
4. This is already fixed in current production configuration

**Date Fixed:** October 7, 2025

---

#### Issue: Can't log in after deployment
**Symptoms:**
- Login works at `http://143.244.185.41:3000`
- Login fails at `http://143.244.185.41` (through Nginx)
- Error logs show: `[auth][error] CredentialsSignin`

**Cause:** NextAuth v5 has issues with the Nginx reverse proxy configuration despite `trustHost: true` being set

**Solution:**
- **Always use `http://143.244.185.41:3000`** (include the :3000 port)
- Bookmark this address to avoid confusion
- Nginx is configured and running but should not be used for authentication

**Decision Made:** October 7, 2025 - Use :3000 permanently instead of troubleshooting reverse proxy

---

#### Issue: Site is down after server reboot
**Symptoms:**
- Can't access `http://143.244.185.41:3000`
- Connection timeout or refused

**Cause:** PM2 not configured to auto-start, or process crashed

**Solution:**
1. SSH into server: `ssh root@143.244.185.41`
2. Check PM2 status: `pm2 status`
3. If stopped: `pm2 restart the-forge`
4. If not listed: `cd /var/www/the-forge && pm2 start npm --name "the-forge" -- start`
5. Save configuration: `pm2 save`

**Prevention:**
- PM2 auto-startup is now configured (as of October 7, 2025)
- Process list saved, will auto-resurrect after reboot

---

#### Issue: Environment variables not loading
**Symptoms:**
- Auth errors
- Features not working as expected
- Different behavior in production vs. local

**Cause:** PM2 caches environment variables, doesn't reload .env.local automatically

**Solution:**
```bash
pm2 restart the-forge --update-env
```

**Always use `--update-env` flag when restarting after deployment**

---

#### Issue: Multiple lockfile warning during build
**Symptoms:**
- Warning about `/var/www/package-lock.json` and `/var/www/the-forge/package-lock.json`
- Build still works but shows warning

**Cause:** Stray `package-lock.json` in parent directory

**Solution:**
```bash
rm /var/www/package-lock.json
```

**Date Fixed:** October 7, 2025

---

#### Issue: PM2 shows high restart count (↺ 800+)
**Symptoms:**
- `pm2 status` shows restart count in hundreds
- App seems to work but restarts frequently

**Investigation Needed:**
- Check logs: `pm2 logs the-forge --err --lines 100`
- Look for crash patterns or memory issues
- Monitor with: `pm2 monit`

**Status:** Identified October 7, 2025 - needs further investigation

---

### Emergency Recovery

**If The Forge is completely down:**

1. **Check if server is running:**
   ```bash
   ssh root@143.244.185.41
   ```

2. **Check PM2 status:**
   ```bash
   pm2 status
   ```

3. **Restart the application:**
   ```bash
   cd /var/www/the-forge
   pm2 restart the-forge --update-env
   ```

4. **Check logs for errors:**
   ```bash
   pm2 logs the-forge --lines 50
   ```

5. **If build is corrupted, rebuild:**
   ```bash
   cd /var/www/the-forge
   git status  # Make sure you're on master and up to date
   rm -rf .next
   npm run build
   pm2 restart the-forge --update-env
   ```

6. **Verify site is accessible:**
   - Visit: http://143.244.185.41:3000
   - Try logging in

---

## Support & Resources

### Documentation
- Next.js Docs: https://nextjs.org/docs
- React Docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs

### Repository
- GitHub: https://github.com/RHRProductions/The-Forge

### Contact
- Developer: Claude (Anthropic AI Assistant)
- Owner: Marc Spagnuolo

---

*Last Updated: October 9, 2025*
