# Performance Optimization Guide - The Forge

## Current Status Analysis

### ✅ What's Already Good
- **Database indexes**: All properly indexed (leads, activities, policies, etc.)
- **Database size**: 2.1MB - healthy and manageable
- **Build size**: 92MB - normal for Next.js
- **Server**: Running stable on DigitalOcean

### ⚠️ Performance Issues Identified

1. **CRITICAL: Main Dashboard is 3,486 lines**
   - Single massive component causes slow rendering
   - Every state change re-renders entire dashboard
   - Hard to maintain and debug

2. **Missing Performance Features**
   - No React memoization
   - No database query caching
   - No pagination on large lists
   - All data loads on every page visit

3. **Frontend Bottlenecks**
   - Re-fetching data unnecessarily
   - Large component trees
   - No code splitting for heavy features

---

## Immediate Optimizations (Do First)

### 1. Add Missing Database Indexes

Your analytics queries will benefit from these additional indexes:

```sql
-- Add to lib/database/connection.ts in the indexes section

-- For analytics queries filtering by source
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- For follow-up reminder queries
CREATE INDEX IF NOT EXISTS idx_leads_temperature_followup ON leads(lead_temperature, next_follow_up);

-- For analytics date range queries
CREATE INDEX IF NOT EXISTS idx_lead_policies_created_at ON lead_policies(created_at);

-- For outcome filtering in analytics
CREATE INDEX IF NOT EXISTS idx_lead_activities_outcome ON lead_activities(outcome);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_leads_status_temperature ON leads(status, lead_temperature);
```

### 2. Enable Database Optimization

Add these settings to your database connection:

```typescript
// In lib/database/connection.ts after creating db instance
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
db.pragma('synchronous = NORMAL'); // Faster writes without risk
db.pragma('cache_size = -64000'); // 64MB cache
db.pragma('temp_store = MEMORY'); // Temporary tables in memory
db.pragma('mmap_size = 30000000000'); // Memory-mapped I/O
```

### 3. Paginate Leads List

The main leads table loads ALL leads at once. Limit to 100 per page:

```typescript
// Add to main dashboard API
const limit = 100;
const offset = page * limit;

const leads = db.prepare(`
  SELECT * FROM leads
  WHERE ...
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`).all(limit, offset);
```

---

## Medium Priority Optimizations

### 4. Break Down Main Dashboard Component

**Target:** Reduce `src/app/page.tsx` from 3,486 lines to < 500 lines

Create separate components:
- `components/LeadTable.tsx` - The leads table
- `components/FollowUpReminders.tsx` - Follow-up section
- `components/LeadDetailsModal.tsx` - Lead detail view
- `components/ActivityTracker.tsx` - Activity tracking form
- `components/LeadFilters.tsx` - Search and filter UI

Benefits:
- Faster rendering (only changed components re-render)
- Easier debugging
- Better code organization
- Reusable components

### 5. Add React Performance Hooks

```typescript
// Memoize expensive computations
const filteredLeads = useMemo(() => {
  return leads.filter(...);
}, [leads, filters]);

// Memoize callbacks to prevent re-renders
const handleLeadClick = useCallback((leadId) => {
  // ...
}, []);

// Memoize components that don't change often
const LeadCard = React.memo(({ lead }) => {
  // ...
});
```

### 6. Add Query Caching

Use React Query or SWR for automatic caching:

```typescript
// Install: npm install @tanstack/react-query

import { useQuery } from '@tanstack/react-query';

const { data: leads } = useQuery({
  queryKey: ['leads'],
  queryFn: fetchLeads,
  staleTime: 60000, // Cache for 1 minute
});
```

### 7. Lazy Load Heavy Components

```typescript
import dynamic from 'next/dynamic';

// Load analytics chart only when needed
const AnalyticsChart = dynamic(() => import('../components/AnalyticsChart'), {
  loading: () => <div>Loading chart...</div>
});
```

---

## Advanced Optimizations (Later)

### 8. Database Query Optimization

**Check for N+1 queries** - Loading related data in loops:

```typescript
// ❌ BAD: N+1 query (fetches activities for each lead separately)
leads.forEach(lead => {
  lead.activities = db.prepare('SELECT * FROM lead_activities WHERE lead_id = ?').all(lead.id);
});

// ✅ GOOD: Single query with JOIN
const leads = db.prepare(`
  SELECT
    l.*,
    json_group_array(json_object(
      'id', la.id,
      'type', la.activity_type,
      'detail', la.activity_detail
    )) as activities
  FROM leads l
  LEFT JOIN lead_activities la ON l.id = la.lead_id
  GROUP BY l.id
`).all();
```

### 9. Add Virtual Scrolling

For long lists (100+ items), use virtual scrolling:

```bash
npm install react-window
```

Only renders visible rows, handles thousands of leads smoothly.

### 10. Implement Server-Side Filtering

Move filtering logic to database queries instead of JavaScript:

```typescript
// ❌ Slow: Filter in JavaScript
const filtered = allLeads.filter(l => l.city === 'Phoenix');

// ✅ Fast: Filter in SQL
const filtered = db.prepare('SELECT * FROM leads WHERE city = ?').all('Phoenix');
```

### 11. Add Image Optimization

Optimize uploaded images on the server:

```bash
npm install sharp
```

```typescript
// Resize/compress images before saving
import sharp from 'sharp';

await sharp(buffer)
  .resize(1200, 1200, { fit: 'inside' })
  .jpeg({ quality: 80 })
  .toFile(outputPath);
```

### 12. Monitor Production Performance

Add performance monitoring:

```typescript
// Track slow queries
const start = Date.now();
const result = db.prepare(query).all();
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`Slow query (${duration}ms):`, query);
}
```

---

## Quick Wins Checklist

**You can do these now:**

- [ ] Add the 5 missing database indexes (copy SQL above)
- [ ] Enable database pragma settings (WAL mode, etc.)
- [ ] Add pagination to leads list (100 per page)
- [ ] Reduce follow-up reminders height (already done ✓)
- [ ] Test analytics page with 1000+ activities

**Plan for next sprint:**

- [ ] Break dashboard into separate components
- [ ] Add React.memo to LeadCard components
- [ ] Install and configure React Query for caching
- [ ] Add virtual scrolling to leads table

**Long-term goals:**

- [ ] Optimize all SQL queries (check execution time)
- [ ] Add image compression for uploads
- [ ] Implement server-side filtering
- [ ] Add performance monitoring

---

## Expected Performance Improvements

| Optimization | Impact | Effort |
|--------------|--------|--------|
| Database indexes | 🔥🔥🔥 High | 5 min |
| Database pragma | 🔥🔥 Medium | 2 min |
| Pagination | 🔥🔥🔥 High | 30 min |
| Component splitting | 🔥🔥🔥 High | 4 hours |
| React.memo | 🔥🔥 Medium | 1 hour |
| React Query | 🔥🔥 Medium | 2 hours |
| Virtual scrolling | 🔥 Low-Med | 2 hours |

---

## Monitoring Performance

### Check Database Performance

```bash
# SSH into production
ssh root@143.244.185.41

# Check database size
cd /var/www/the-forge
du -h data/forge.db

# Vacuum database (optimize file size)
sqlite3 data/forge.db "VACUUM;"

# Analyze query plans
sqlite3 data/forge.db "EXPLAIN QUERY PLAN SELECT * FROM leads WHERE status = 'new';"
```

### Check Server Resources

```bash
# Memory usage
pm2 status

# If memory is high, restart
pm2 restart the-forge

# Check logs for errors
pm2 logs the-forge --err --lines 50
```

### Browser Performance

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record, use the app, stop recording
4. Look for:
   - Long JavaScript tasks (> 50ms)
   - Excessive re-renders
   - Slow network requests

---

## When to Optimize

**Optimize if you notice:**

- ⏱️ Page takes > 2 seconds to load
- 🐌 Typing in search feels laggy
- 📊 Analytics page takes > 5 seconds to load
- 🔄 Dashboard refreshes feel slow
- 💾 Database file > 100MB

**Current baseline (with ~2,800 leads):**
- Dashboard load: Should be < 2 seconds
- Search/filter: Should be instant
- Analytics: Should be < 3 seconds

---

## Need Help?

If performance gets bad:
1. Check PM2 memory usage: `pm2 status`
2. Review slow queries in logs
3. Test locally with production data copy
4. Use browser DevTools Performance tab

**Last Updated:** October 9, 2025
