import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';

// DELETE /api/calendar/[id] - Delete a calendar event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id);

    const db = getDatabase();

    // Check if event exists
    const event = db.prepare('SELECT id FROM calendar_events WHERE id = ?').get(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete event
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(eventId);

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json({ error: 'Failed to delete calendar event' }, { status: 500 });
  }
}

// PATCH /api/calendar/[id] - Update a calendar event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id);
    const body = await request.json();
    const { title, description, start_time, end_time, event_type, color } = body;

    const db = getDatabase();

    // Check if event exists
    const event = db.prepare('SELECT id FROM calendar_events WHERE id = ?').get(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(start_time);
    }

    if (end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(end_time);
    }

    if (event_type !== undefined) {
      updates.push('event_type = ?');
      values.push(event_type);
    }

    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add eventId to values for WHERE clause
    values.push(eventId);

    // Execute update
    db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Return updated event
    const updatedEvent = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(eventId);

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 500 });
  }
}
