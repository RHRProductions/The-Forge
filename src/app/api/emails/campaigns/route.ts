import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/emails/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get campaigns with stats
    const campaigns = db.prepare(`
      SELECT
        c.*,
        COUNT(DISTINCT s.id) as total_sent,
        COUNT(DISTINCT CASE WHEN s.opened_at IS NOT NULL THEN s.id END) as total_opened,
        COUNT(DISTINCT CASE WHEN s.clicked_at IS NOT NULL THEN s.id END) as total_clicked
      FROM email_campaigns c
      LEFT JOIN email_sends s ON c.id = s.campaign_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/emails/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      subject_line,
      body_html,
      body_text,
      from_name,
      from_email,
      reply_to_email,
      segment_filter,
    } = body;

    // Validation
    if (!name || !subject_line || !body_html || !from_name || !from_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const userId = (session.user as any).id;

    // Create campaign
    const result = db.prepare(`
      INSERT INTO email_campaigns (
        name, subject_line, body_html, body_text,
        from_name, from_email, reply_to_email,
        segment_filter, status, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).run(
      name,
      subject_line,
      body_html,
      body_text || null,
      from_name,
      from_email,
      reply_to_email || from_email,
      segment_filter || null,
      userId
    );

    const campaign = db.prepare('SELECT * FROM email_campaigns WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
