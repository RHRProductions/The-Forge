#!/usr/bin/env node

/**
 * Normalize Lead Status Values
 *
 * This script fixes inconsistent status values in the database from CSV imports.
 * It maps old/custom status values to the correct LeadStatus enum values.
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/forge.db'));

// Mapping of old status values to new standardized values
const statusMapping = {
  // Case variations
  'New': 'new',
  'NEW': 'new',

  // Old custom statuses
  'First Call': 'contacted',
  'Second Call': 'contacted',
  'Contacted': 'contacted',
  'Engaged': 'follow_up_needed',
  'Appointment': 'appointment_set',
  'Client': 'closed_won',
  'DNC Request': 'closed_lost',
  'Not decision maker': 'not_qualified',
};

console.log('🔍 Checking current status distribution...\n');

// Get current status distribution
const currentStatuses = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM leads
  GROUP BY status
  ORDER BY count DESC
`).all();

console.log('Current status values:');
currentStatuses.forEach(row => {
  const willChange = statusMapping[row.status] ? ` → will change to "${statusMapping[row.status]}"` : '';
  console.log(`  ${row.status}: ${row.count}${willChange}`);
});

console.log('\n🔄 Starting status normalization...\n');

let totalUpdated = 0;

// Update each status that needs normalization
for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
  const result = db.prepare(`
    UPDATE leads
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE status = ?
  `).run(newStatus, oldStatus);

  if (result.changes > 0) {
    console.log(`✓ Updated ${result.changes} leads from "${oldStatus}" to "${newStatus}"`);
    totalUpdated += result.changes;
  }
}

console.log(`\n✅ Total leads updated: ${totalUpdated}\n`);

// Show new status distribution
console.log('📊 New status distribution:\n');
const newStatuses = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM leads
  GROUP BY status
  ORDER BY count DESC
`).all();

newStatuses.forEach(row => {
  console.log(`  ${row.status}: ${row.count}`);
});

db.close();

console.log('\n✅ Status normalization complete!\n');
