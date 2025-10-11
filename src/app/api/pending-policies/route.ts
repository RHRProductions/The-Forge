import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { auth } from '../../../../auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    let policies;

    if (userRole === 'admin') {
      // Admins see all pending policies
      policies = db.prepare(`
        SELECT
          p.*,
          l.first_name,
          l.last_name,
          l.phone,
          l.phone_2,
          l.email,
          l.address,
          l.city,
          l.state,
          l.zip_code,
          l.date_of_birth,
          l.age,
          l.owner_id
        FROM lead_policies p
        LEFT JOIN leads l ON p.lead_id = l.id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
      `).all();
    } else if (userRole === 'agent') {
      // Agents see their own pending policies and their setters'
      policies = db.prepare(`
        SELECT
          p.*,
          l.first_name,
          l.last_name,
          l.phone,
          l.phone_2,
          l.email,
          l.address,
          l.city,
          l.state,
          l.zip_code,
          l.date_of_birth,
          l.age,
          l.owner_id
        FROM lead_policies p
        LEFT JOIN leads l ON p.lead_id = l.id
        LEFT JOIN users u ON l.owner_id = u.id
        WHERE p.status = 'pending' AND (l.owner_id = ? OR u.agent_id = ?)
        ORDER BY p.created_at DESC
      `).all(userId, userId);
    } else {
      // Setters see their agent's pending policies
      const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;

      if (user?.agent_id) {
        policies = db.prepare(`
          SELECT
            p.*,
            l.first_name,
            l.last_name,
            l.phone,
            l.phone_2,
            l.email,
            l.address,
            l.city,
            l.state,
            l.zip_code,
            l.date_of_birth,
            l.age,
            l.owner_id
          FROM lead_policies p
          LEFT JOIN leads l ON p.lead_id = l.id
          LEFT JOIN users u ON l.owner_id = u.id
          WHERE p.status = 'pending' AND (l.owner_id = ? OR u.agent_id = ?)
          ORDER BY p.created_at DESC
        `).all(user.agent_id, user.agent_id);
      } else {
        // Setter without agent sees only their own
        policies = db.prepare(`
          SELECT
            p.*,
            l.first_name,
            l.last_name,
            l.phone,
            l.phone_2,
            l.email,
            l.address,
            l.city,
            l.state,
            l.zip_code,
            l.date_of_birth,
            l.age,
            l.owner_id
          FROM lead_policies p
          LEFT JOIN leads l ON p.lead_id = l.id
          WHERE p.status = 'pending' AND l.owner_id = ?
          ORDER BY p.created_at DESC
        `).all(userId);
      }
    }

    return NextResponse.json({ policies });
  } catch (error) {
    console.error('Error fetching pending policies:', error);
    return NextResponse.json({ error: 'Failed to fetch pending policies' }, { status: 500 });
  }
}
