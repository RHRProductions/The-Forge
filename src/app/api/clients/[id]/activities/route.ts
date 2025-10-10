import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { auth } from '../../../../../../auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const clientId = parseInt(params.id);

    const activities = db.prepare(`
      SELECT
        ca.*,
        u.name as created_by_name
      FROM client_activities ca
      LEFT JOIN users u ON ca.created_by_user_id = u.id
      WHERE ca.client_id = ?
      ORDER BY ca.created_at DESC
    `).all(clientId);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching client activities:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activity_type, notes } = await request.json();
    const db = getDatabase();
    const clientId = parseInt(params.id);
    const userId = parseInt((session.user as any).id);

    const result = db.prepare(`
      INSERT INTO client_activities (client_id, activity_type, notes, created_by_user_id)
      VALUES (?, ?, ?, ?)
    `).run(clientId, activity_type, notes || null, userId);

    const newActivity = db.prepare(`
      SELECT
        ca.*,
        u.name as created_by_name
      FROM client_activities ca
      LEFT JOIN users u ON ca.created_by_user_id = u.id
      WHERE ca.id = ?
    `).get(result.lastInsertRowid);

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error('Error creating client activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}
