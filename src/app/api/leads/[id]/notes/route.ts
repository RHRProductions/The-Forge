import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { sanitizeNotes } from '../../../../../../lib/security/input-sanitizer';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    const db = getDatabase();
    const notes = db.prepare(`
      SELECT * FROM lead_notes 
      WHERE lead_id = ? 
      ORDER BY created_at DESC
    `).all(leadId);

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    const { note } = await request.json();

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Sanitize note content to prevent XSS
    const sanitizedNote = sanitizeNotes(note);

    const db = getDatabase();
    const insertResult = db.prepare(`
      INSERT INTO lead_notes (lead_id, note)
      VALUES (?, ?)
    `).run(leadId, sanitizedNote);

    const newNote = db.prepare(`
      SELECT * FROM lead_notes WHERE id = ?
    `).get(insertResult.lastInsertRowid);

    return NextResponse.json(newNote);
  } catch (error) {
    console.error('Error adding note:', error);
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    );
  }
}