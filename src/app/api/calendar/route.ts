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

    // Get calendar events for the agent with lead temperature and appointment outcome
    const events = db.prepare(`
      SELECT
        ce.*,
        l.first_name as lead_first_name,
        l.last_name as lead_last_name,
        l.phone as lead_phone,
        l.lead_temperature as lead_temperature,
        l.status as lead_status,
        u.name as created_by_name,
        la.outcome as appointment_outcome,
        la.activity_detail as appointment_detail,
        (SELECT COUNT(*) FROM lead_policies WHERE lead_id = ce.lead_id AND status = 'pending') as pending_policies,
        (SELECT COUNT(*) FROM lead_policies WHERE lead_id = ce.lead_id AND status = 'active') as active_policies
      FROM calendar_events ce
      LEFT JOIN leads l ON ce.lead_id = l.id
      LEFT JOIN users u ON ce.created_by_user_id = u.id
      LEFT JOIN (
        SELECT lead_id, outcome, activity_detail,
               ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY created_at DESC) as rn
        FROM lead_activities
        WHERE activity_type = 'appointment'
      ) la ON ce.lead_id = la.lead_id AND la.rn = 1
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
    const { agent_id, lead_id, title, description, start_time, end_time, event_type, color } = body;

    if (!agent_id || !title || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);

    // Insert calendar event
    const result = db.prepare(`
      INSERT INTO calendar_events (
        agent_id, lead_id, title, description, start_time, end_time, event_type, color, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(agent_id, lead_id || null, title, description || null, start_time, end_time, event_type || 'appointment', color || null, userId);

    // If this is linked to a lead and it's an appointment, update lead status
    if (lead_id && event_type === 'appointment') {
      db.prepare('UPDATE leads SET status = ? WHERE id = ?')
        .run('appointment_set', lead_id);
    }

    // Get the newly created event
    const newEvent = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
}
