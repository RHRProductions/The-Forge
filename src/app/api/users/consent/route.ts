import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET /api/users/consent - Get current user's consent status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const db = getDatabase();

    const user = db.prepare(`
      SELECT data_sharing_consent
      FROM users
      WHERE id = ?
    `).get(userId) as { data_sharing_consent: number } | undefined;

    return NextResponse.json({
      consent: user?.data_sharing_consent === 1
    });
  } catch (error) {
    console.error('Error fetching consent status:', error);
    return NextResponse.json({ error: 'Failed to fetch consent status' }, { status: 500 });
  }
}

// POST /api/users/consent - Update current user's consent status
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { consent } = body;

    if (typeof consent !== 'boolean') {
      return NextResponse.json({ error: 'Consent must be a boolean value' }, { status: 400 });
    }

    const db = getDatabase();

    db.prepare(`
      UPDATE users
      SET data_sharing_consent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(consent ? 1 : 0, userId);

    return NextResponse.json({
      success: true,
      consent: consent
    });
  } catch (error) {
    console.error('Error updating consent status:', error);
    return NextResponse.json({ error: 'Failed to update consent status' }, { status: 500 });
  }
}
