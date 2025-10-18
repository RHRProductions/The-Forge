import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getDatabase } from '../../../../lib/database/connection';

// GET /api/seminars - List all seminars
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();

    // Get seminars with stats
    const seminars = db.prepare(`
      SELECT
        s.*,
        COUNT(DISTINCT si.id) as total_invited,
        COUNT(DISTINCT CASE WHEN si.registered = 1 THEN si.id END) as total_registered,
        COUNT(DISTINCT CASE WHEN si.attended = 1 THEN si.id END) as total_attended
      FROM seminars s
      LEFT JOIN seminar_invitations si ON s.id = si.seminar_id
      GROUP BY s.id
      ORDER BY s.event_date DESC, s.event_time DESC
    `).all();

    return NextResponse.json(seminars);
  } catch (error) {
    console.error('Error fetching seminars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seminars' },
      { status: 500 }
    );
  }
}

// POST /api/seminars - Create new seminar
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      seminar_type,
      event_date,
      event_time,
      timezone,
      duration_minutes,
      platform,
      meeting_link,
      meeting_id,
      meeting_password,
      max_attendees,
    } = body;

    // Validation
    if (!title || !event_date || !event_time || !meeting_link) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const userId = (session.user as any).id;

    // Create seminar
    const result = db.prepare(`
      INSERT INTO seminars (
        title, description, seminar_type, event_date, event_time,
        timezone, duration_minutes, platform, meeting_link,
        meeting_id, meeting_password, max_attendees, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      seminar_type || 'medicare',
      event_date,
      event_time,
      timezone || 'America/Denver',
      duration_minutes || 60,
      platform || 'zoom',
      meeting_link,
      meeting_id || null,
      meeting_password || null,
      max_attendees || 100,
      userId
    );

    const seminar = db.prepare('SELECT * FROM seminars WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(seminar, { status: 201 });
  } catch (error) {
    console.error('Error creating seminar:', error);
    return NextResponse.json(
      { error: 'Failed to create seminar' },
      { status: 500 }
    );
  }
}
