import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';

// GET /api/calendar - Get calendar events for the user's agent
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    let agentId: number;

    if (userRole === 'admin' || userRole === 'agent') {
      // Admins and agents see their own calendar
      agentId = userId;
    } else {
      // Setters see their agent's calendar
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;

      if (!user?.agent_id) {
        return NextResponse.json({ error: 'No agent assigned' }, { status: 404 });
      }

      agentId = user.agent_id;
    }

    // Get calendar events for the agent
    const events = db.prepare(`
      SELECT
        ce.*,
        l.first_name as lead_first_name,
        l.last_name as lead_last_name,
        l.phone as lead_phone
      FROM calendar_events ce
      LEFT JOIN leads l ON ce.lead_id = l.id
      WHERE ce.agent_id = ?
      ORDER BY ce.start_time ASC
    `).all(agentId);

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// POST /api/calendar - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, lead_id, title, description, start_time, end_time, event_type } = body;

    if (!agent_id || !title || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);

    // Insert calendar event
    const result = db.prepare(`
      INSERT INTO calendar_events (
        agent_id, lead_id, title, description, start_time, end_time, event_type, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(agent_id, lead_id || null, title, description || null, start_time, end_time, event_type || 'appointment', userId);

    // Get the newly created event
    const newEvent = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
