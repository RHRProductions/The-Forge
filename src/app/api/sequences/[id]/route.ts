import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';

/**
 * GET /api/sequences/[id]
 *
 * Gets a specific sequence with its steps
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequenceId = parseInt(params.id);

    if (isNaN(sequenceId)) {
      return NextResponse.json(
        { error: 'Invalid sequence ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get the sequence
    const sequence = db.prepare(`
      SELECT * FROM email_sequences WHERE id = ?
    `).get(sequenceId) as any;

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    // Get the steps
    const steps = db.prepare(`
      SELECT * FROM email_sequence_steps
      WHERE sequence_id = ?
      ORDER BY step_order ASC
    `).all(sequenceId);

    return NextResponse.json({
      ...sequence,
      steps
    });

  } catch (error) {
    console.error('Error fetching sequence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sequence' },
      { status: 500 }
    );
  }
}
