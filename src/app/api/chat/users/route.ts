import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';
import type { ChatUser } from '../../../../../types/chat';

// GET: List all users available for chat (excluding current user)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const db = getDatabase();

    const users = db.prepare(`
      SELECT id, name, email, role
      FROM users
      WHERE id != ?
      ORDER BY name ASC
    `).all(userId) as ChatUser[];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
