import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';

/**
 * POST /api/booking/create
 * Create an appointment from the public booking page
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, datetime, notes } = body;

    if (!lead_id || !datetime) {
      return NextResponse.json(
        { error: 'Lead ID and datetime are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get lead information
    const lead = db.prepare(`
      SELECT id, first_name, last_name, email, phone, owner_id
      FROM leads
      WHERE id = ?
    `).get(lead_id) as any;

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    const agentId = lead.owner_id || 1;

    // Parse the datetime
    const startTime = new Date(datetime);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30); // 30-minute appointment

    // Check if slot is still available
    const isBooked = db.prepare(`
      SELECT id FROM calendar_events
      WHERE agent_id = ?
        AND datetime(start_time) <= datetime(?)
        AND datetime(end_time) > datetime(?)
    `).get(
      agentId,
      startTime.toISOString(),
      startTime.toISOString()
    );

    if (isBooked) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select another time.' },
        { status: 409 }
      );
    }

    // Create the appointment
    const eventResult = db.prepare(`
      INSERT INTO calendar_events (
        agent_id,
        lead_id,
        title,
        description,
        start_time,
        end_time,
        event_type,
        color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agentId,
      lead_id,
      `Medicare Consultation - ${lead.first_name} ${lead.last_name}`,
      notes || 'Booked via email link',
      startTime.toISOString(),
      endTime.toISOString(),
      'appointment',
      '#dc2626' // red
    );

    // Log the activity
    db.prepare(`
      INSERT INTO lead_activities (
        lead_id,
        activity_type,
        activity_detail,
        outcome,
        created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      lead_id,
      'appointment',
      `Appointment booked for ${startTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MT`,
      'scheduled'
    );

    // Update lead status to appointment_set if not already
    if (lead.status !== 'appointment_set') {
      db.prepare(`
        UPDATE leads
        SET status = 'appointment_set',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(lead_id);
    }

    // Mark any active sequence enrollments as converted
    const activeEnrollments = db.prepare(`
      SELECT id FROM email_sequence_enrollments
      WHERE lead_id = ? AND status = 'active'
    `).all(lead_id) as any[];

    for (const enrollment of activeEnrollments) {
      // Mark enrollment as completed
      db.prepare(`
        UPDATE email_sequence_enrollments
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            stop_reason = 'converted'
        WHERE id = ?
      `).run(enrollment.id);

      // Mark the most recent email send as converted
      db.prepare(`
        UPDATE email_sequence_sends
        SET converted = 1,
            conversion_type = 'appointment_booked'
        WHERE enrollment_id = ?
        ORDER BY sent_at DESC
        LIMIT 1
      `).run(enrollment.id);
    }

    // TODO: Send confirmation email

    return NextResponse.json({
      success: true,
      appointment: {
        id: eventResult.lastInsertRowid,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      },
      message: 'Appointment booked successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    );
  }
}
