import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/emails/bounced - Get all bounced emails
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get bounced emails with lead information
    const bouncedEmails = db.prepare(`
      SELECT
        es.email_address,
        es.bounce_reason,
        MAX(es.sent_at) as last_bounce_date,
        COUNT(DISTINCT es.id) as bounce_count,
        l.id as lead_id,
        l.first_name,
        l.last_name,
        l.phone
      FROM email_sends es
      LEFT JOIN leads l ON es.email_address = l.email
      WHERE es.bounced = 1
      GROUP BY es.email_address
      ORDER BY last_bounce_date DESC
    `).all();

    return NextResponse.json(bouncedEmails);
  } catch (error) {
    console.error('Error fetching bounced emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounced emails' },
      { status: 500 }
    );
  }
}
