import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const db = getDatabase();

    // Both admins and agents see only THEIR OWN setters (where agent_id = current user's ID)
    const setters = db.prepare(`
      SELECT
        id,
        name,
        email,
        role,
        created_at
      FROM users
      WHERE role = 'setter' AND agent_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    return NextResponse.json(setters);

  } catch (error) {
    console.error('Error fetching setters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setters' },
      { status: 500 }
    );
  }
}
