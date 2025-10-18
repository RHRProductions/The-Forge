import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/leads/email-stats - Get email statistics for leads
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get total leads
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    const totalLeads = totalResult.count;

    // Get leads with valid emails
    const withEmailResult = db.prepare(`
      SELECT COUNT(*) as count
      FROM leads
      WHERE email IS NOT NULL AND LENGTH(email) > 0
    `).get() as { count: number };
    const leadsWithEmails = withEmailResult.count;

    // Get leads without emails
    const withoutEmails = totalLeads - leadsWithEmails;

    // Calculate percentage
    const percentage = totalLeads > 0 ? Math.round((leadsWithEmails / totalLeads) * 100) : 0;

    return NextResponse.json({
      totalLeads,
      leadsWithEmails,
      leadsWithoutEmails: withoutEmails,
      percentage
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email stats' },
      { status: 500 }
    );
  }
}
