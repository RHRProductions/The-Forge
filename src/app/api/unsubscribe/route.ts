import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';

// POST /api/unsubscribe - Unsubscribe email from mailing list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, leadId } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Check if already unsubscribed
    const existing = db.prepare(`
      SELECT id FROM email_unsubscribes WHERE email = ?
    `).get(email.toLowerCase());

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Email already unsubscribed'
      });
    }

    // Add to unsubscribe list
    db.prepare(`
      INSERT INTO email_unsubscribes (
        lead_id, email, reason, unsubscribed_at
      ) VALUES (?, ?, 'User requested via unsubscribe link', datetime('now'))
    `).run(leadId || null, email.toLowerCase());

    console.log(`Email unsubscribed: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed'
    });
  } catch (error) {
    console.error('Error unsubscribing email:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
