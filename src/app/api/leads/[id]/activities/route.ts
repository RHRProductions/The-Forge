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
    const leadId = parseInt(id);

    // Get current lead data
    const lead = db.prepare('SELECT contact_attempt_count, lead_temperature, total_dials FROM leads WHERE id = ?').get(leadId) as any;

    // Auto-increment contact attempt counter for contact activities
    const contactActivities = ['call', 'text', 'email'];
    const isContactActivity = contactActivities.includes(activity.activity_type);
    const newAttemptNumber = isContactActivity ? (lead?.contact_attempt_count || 0) + 1 : null;

    // Calculate new total dials
    const currentTotalDials = lead?.total_dials || 0;
    const newTotalDials = currentTotalDials + (activity.dial_count || 1);

    // Insert the activity
    const result = db.prepare(
      `INSERT INTO lead_activities (
        lead_id, activity_type, activity_detail, outcome,
        lead_temperature_after, next_follow_up_date, contact_attempt_number, dial_count, total_dials_at_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      leadId,
      activity.activity_type,
      activity.activity_detail,
      activity.outcome || null,
      activity.lead_temperature_after || null,
      activity.next_follow_up_date || null,
      newAttemptNumber,
      activity.dial_count || 1,
      newTotalDials
    );

    // Update lead record
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];

    // Auto-update last_contact_date for contact-type activities
    if (isContactActivity) {
      updates.push('last_contact_date = CURRENT_TIMESTAMP');
      updates.push(`contact_attempt_count = ${newAttemptNumber}`);
    }

    // Update total dials count
    updates.push(`total_dials = ${newTotalDials}`);

    // Auto-update lead status to "no_answer" when outcome is "no_answer"
    if (activity.outcome === 'no_answer') {
      updates.push(`status = 'no_answer'`);
    }

    // Auto-update lead status to "refund_needed" when outcome is "disconnected"
    if (activity.outcome === 'disconnected') {
      updates.push(`status = 'refund_needed'`);
    }

    // Auto-update lead status to "appointment_set" when outcome is "scheduled"
    if (activity.outcome === 'scheduled') {
      updates.push(`status = 'appointment_set'`);
    }

    // Auto-update lead status to "not_set" when outcome is "answered" (without temperature)
    // OR to "follow_up_needed" when outcome is "answered" with warm/hot temperature
    if (activity.outcome === 'answered') {
      if (activity.lead_temperature_after === 'warm' || activity.lead_temperature_after === 'hot') {
        updates.push(`status = 'follow_up_needed'`);
      } else {
        updates.push(`status = 'not_set'`);
      }
    }

    // Update lead temperature if provided
    if (activity.lead_temperature_after) {
      updates.push(`lead_temperature = '${activity.lead_temperature_after}'`);
    }

    // Update next follow-up date if provided
    if (activity.next_follow_up_date) {
      updates.push(`next_follow_up = '${activity.next_follow_up_date}'`);
    }

    db.prepare(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`
    ).run(leadId);

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
