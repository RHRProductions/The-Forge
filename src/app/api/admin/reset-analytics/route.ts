import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Start a transaction to ensure all-or-nothing reset
    db.exec('BEGIN TRANSACTION');

    try {
      // 1. Delete all activities (this clears all call/text/email tracking)
      const activitiesDeleted = db.prepare('DELETE FROM lead_activities').run();

      // 2. Delete all policies (this clears all sales data)
      const policiesDeleted = db.prepare('DELETE FROM lead_policies').run();

      // 3. Reset contact attempt counts on all leads
      db.prepare(`
        UPDATE leads
        SET contact_attempt_count = 0
      `).run();

      // 4. Clear next_follow_up dates (user will set manually as needed)
      db.prepare(`
        UPDATE leads
        SET next_follow_up = NULL
      `).run();

      // Commit the transaction
      db.exec('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Analytics data reset successfully',
        details: {
          activitiesDeleted: activitiesDeleted.changes,
          policiesDeleted: policiesDeleted.changes,
          leadsUpdated: 'All leads reset to 0 contact attempts'
        }
      });
    } catch (error) {
      // Rollback on error
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error resetting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to reset analytics data' },
      { status: 500 }
    );
  }
}
