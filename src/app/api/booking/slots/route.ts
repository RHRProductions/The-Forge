import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';

/**
 * GET /api/booking/slots?lead={leadId}
 * Generate available appointment time slots for booking
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('lead');

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get lead information
    const lead = db.prepare(`
      SELECT id, first_name, last_name, email, phone, owner_id
      FROM leads
      WHERE id = ?
    `).get(parseInt(leadId)) as any;

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Get agent information
    const agentId = lead.owner_id || 1; // Default to first user if no owner
    const agent = db.prepare(`
      SELECT id, name, email
      FROM users
      WHERE id = ?
    `).get(agentId) as any;

    // Generate available time slots (next 14 days, weekdays only, 9am-5pm MT)
    const availableSlots = generateTimeSlots(db, agentId);

    return NextResponse.json({
      lead: {
        id: lead.id,
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone
      },
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email
      },
      availableSlots
    });

  } catch (error) {
    console.error('Error fetching booking slots:', error);
    return NextResponse.json(
      { error: 'Failed to load booking slots' },
      { status: 500 }
    );
  }
}

/**
 * Generate available time slots for the next 14 days
 * Excludes weekends and times when agent already has appointments
 */
function generateTimeSlots(db: any, agentId: number) {
  const slots = [];
  const now = new Date();
  const timeZone = 'America/Denver'; // Mountain Time

  // Business hours: 9 AM - 5 PM MT
  const businessHours = [
    { hour: 9, minute: 0 },
    { hour: 10, minute: 0 },
    { hour: 11, minute: 0 },
    { hour: 13, minute: 0 }, // 1 PM (skip noon)
    { hour: 14, minute: 0 },
    { hour: 15, minute: 0 },
    { hour: 16, minute: 0 }
  ];

  // Generate slots for next 14 days
  for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    // Check each business hour
    for (const time of businessHours) {
      const slotDate = new Date(date);
      slotDate.setHours(time.hour, time.minute, 0, 0);

      // Check if this slot is already booked
      const isBooked = db.prepare(`
        SELECT id FROM calendar_events
        WHERE agent_id = ?
          AND datetime(start_time) <= datetime(?)
          AND datetime(end_time) > datetime(?)
      `).get(
        agentId,
        slotDate.toISOString(),
        slotDate.toISOString()
      );

      if (!isBooked) {
        slots.push({
          date: formatDate(slotDate),
          time: formatTime(slotDate),
          datetime: slotDate.toISOString()
        });
      }
    }
  }

  // Return first 12 available slots
  return slots.slice(0, 12);
}

/**
 * Format date as "Monday, January 15, 2025"
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Denver'
  });
}

/**
 * Format time as "9:00 AM MT"
 */
function formatTime(date: Date): string {
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Denver'
  });
  return `${timeStr} MT`;
}
