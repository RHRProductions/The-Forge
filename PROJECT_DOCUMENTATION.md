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

## Deployment Information

### Production Server
- **Provider:** DigitalOcean
- **IP Address:** 143.244.185.41
- **Port:** 3000
- **URL:** http://143.244.185.41:3000
- **OS:** Ubuntu 22.04 LTS

### Deployment Process
1. **Local Development:**
   ```bash
   npm run dev  # Run development server
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
   git pull
   npm run build
   pm2 restart the-forge
   ```

### Important Notes
- **Database Location:** `/var/www/the-forge/data/forge.db`
- **Production data stays on server** - Don't overwrite with local database
- **ESLint/TypeScript disabled in production** - For faster builds (set in next.config.ts)

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

*Last Updated: October 4, 2025*
