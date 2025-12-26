import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import { getDatabase } from '../../../../../../../lib/database/connection';

// POST: Mark conversation as read
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
    const conversationId = parseInt(id);
    const userId = parseInt((session.user as any).id);
    const db = getDatabase();

    // Update last_read_at for this user in this conversation
    const result = db.prepare(`
      UPDATE conversation_participants
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ? AND user_id = ?
    `).run(conversationId, userId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
