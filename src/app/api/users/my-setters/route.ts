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

    let setters;

    if (userRole === 'admin') {
      // Admins can see all setters
      setters = db.prepare(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.created_at,
          agent.name as agent_name
        FROM users u
        LEFT JOIN users agent ON u.agent_id = agent.id
        WHERE u.role = 'setter'
        ORDER BY u.created_at DESC
      `).all();
    } else {
      // Agents see only their setters
      setters = db.prepare(`
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
    }

    return NextResponse.json(setters);

  } catch (error) {
    console.error('Error fetching setters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch setters' },
      { status: 500 }
    );
  }
}
