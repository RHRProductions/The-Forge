import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { LeadActivity } from '../../../../../../types/lead';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const activities = db.prepare(
      'SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC'
    ).all(parseInt(id));

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activity: Omit<LeadActivity, 'id' | 'created_at'> = await request.json();
    const db = getDatabase();

    // Insert the activity
    const result = db.prepare(
      `INSERT INTO lead_activities (lead_id, activity_type, activity_detail, outcome)
       VALUES (?, ?, ?, ?)`
    ).run(
      parseInt(id),
      activity.activity_type,
      activity.activity_detail,
      activity.outcome || null
    );

    // Auto-update last_contact_date for contact-type activities
    const contactActivities = ['call', 'text', 'email'];
    if (contactActivities.includes(activity.activity_type)) {
      db.prepare(
        `UPDATE leads SET last_contact_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(parseInt(id));
    }

    // Get the newly created activity
    const newActivity = db.prepare(
      'SELECT * FROM lead_activities WHERE id = ?'
    ).get(result.lastInsertRowid);

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
