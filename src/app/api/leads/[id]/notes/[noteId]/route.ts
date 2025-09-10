import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../lib/database/connection';

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { id, noteId: noteIdParam } = await params;
    const leadId = parseInt(id);
    const noteId = parseInt(noteIdParam);
    
    if (isNaN(leadId) || isNaN(noteId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Verify the note belongs to the lead
    const note = db.prepare(`
      SELECT * FROM lead_notes 
      WHERE id = ? AND lead_id = ?
    `).get(noteId, leadId);
    
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Delete the note
    db.prepare(`
      DELETE FROM lead_notes 
      WHERE id = ? AND lead_id = ?
    `).run(noteId, leadId);

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}