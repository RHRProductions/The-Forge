import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { LeadActivity } from '../../../../../../types/lead';
import { auth } from '../../../../../../auth';
import { sanitizeActivity } from '../../../../../../lib/security/input-sanitizer';

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
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const rawActivity: Omit<LeadActivity, 'id' | 'created_at'> = await request.json();

    // Sanitize activity data to prevent XSS
    const sanitized = sanitizeActivity(rawActivity);
    const activity = { ...rawActivity, ...sanitized };

    const db = getDatabase();
    const leadId = parseInt(id);
    const userId = parseInt((session.user as any).id);

    // Get current lead data
    const lead = db.prepare('SELECT contact_attempt_count, lead_temperature, total_dials, total_texts, total_emails FROM leads WHERE id = ?').get(leadId) as any;

    // Auto-increment contact attempt counter for contact activities
    const contactActivities = ['call', 'text', 'email'];
    const isContactActivity = contactActivities.includes(activity.activity_type);
    const newAttemptNumber = isContactActivity ? (lead?.contact_attempt_count || 0) + 1 : null;

    // Calculate new totals based on activity type
    const currentTotalDials = lead?.total_dials || 0;
    const currentTotalTexts = lead?.total_texts || 0;
    const currentTotalEmails = lead?.total_emails || 0;

    // Use provided dial_count for calls, default to 1 if not provided, 0 for non-calls
    const dialCountToAdd = activity.activity_type === 'call'
      ? (activity.dial_count && activity.dial_count > 0 ? activity.dial_count : 1)
      : 0;

    // Update totals - use actual dial count for calls
    const newTotalDials = activity.activity_type === 'call' ? currentTotalDials + dialCountToAdd : currentTotalDials;
    const newTotalTexts = activity.activity_type === 'text' ? currentTotalTexts + 1 : currentTotalTexts;
    const newTotalEmails = activity.activity_type === 'email' ? currentTotalEmails + 1 : currentTotalEmails;

    // Insert the activity
    const result = db.prepare(
      `INSERT INTO lead_activities (
        lead_id, activity_type, activity_detail, outcome,
        lead_temperature_after, next_follow_up_date, contact_attempt_number, dial_count,
        total_dials_at_time, total_texts_at_time, total_emails_at_time, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      leadId,
      activity.activity_type,
      activity.activity_detail,
      activity.outcome || null,
      activity.lead_temperature_after || null,
      activity.next_follow_up_date || null,
      newAttemptNumber,
      dialCountToAdd,  // Use the calculated dial count (0 for appointments)
      newTotalDials,
      newTotalTexts,
      newTotalEmails,
      userId
    );

    // Update lead record
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];

    // Auto-update last_contact_date for contact-type activities
    if (isContactActivity) {
      updates.push('last_contact_date = CURRENT_TIMESTAMP');
      updates.push(`contact_attempt_count = ${newAttemptNumber}`);
    }

    // Update total counts (only if they changed)
    if (newTotalDials !== currentTotalDials) {
      updates.push(`total_dials = ${newTotalDials}`);
    }
    if (newTotalTexts !== currentTotalTexts) {
      updates.push(`total_texts = ${newTotalTexts}`);
    }
    if (newTotalEmails !== currentTotalEmails) {
      updates.push(`total_emails = ${newTotalEmails}`);
    }

    // Auto-update lead status to "no_answer" when outcome is "no_answer"
    if (activity.outcome === 'no_answer') {
      updates.push(`status = 'no_answer'`);
    }

    // Auto-update lead status to "refund_needed" when outcome is "disconnected"
    if (activity.outcome === 'disconnected') {
      updates.push(`status = 'refund_needed'`);
    }

    // Auto-update lead status to "appointment_set" when outcome is "scheduled"
    // Also clear next_follow_up so lead is removed from warm/hot follow-up list
    if (activity.outcome === 'scheduled') {
      updates.push(`status = 'appointment_set'`);
      updates.push(`next_follow_up = NULL`);
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

    // Update next follow-up date if provided (but NOT if scheduled - appointment clears follow-up)
    if (activity.next_follow_up_date && activity.outcome !== 'scheduled') {
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
