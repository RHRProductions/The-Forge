import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourcesToMerge, targetSource } = await request.json();

    if (!sourcesToMerge || !Array.isArray(sourcesToMerge) || sourcesToMerge.length === 0) {
      return NextResponse.json(
        { error: 'sourcesToMerge must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!targetSource || typeof targetSource !== 'string' || targetSource.trim() === '') {
      return NextResponse.json(
        { error: 'targetSource is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);

    // Build placeholders for the IN clause
    const placeholders = sourcesToMerge.map(() => '?').join(',');

    // Update only leads owned by the current user
    const result = db.prepare(`
      UPDATE leads
      SET source = ?, updated_at = CURRENT_TIMESTAMP
      WHERE source IN (${placeholders}) AND owner_id = ?
    `).run(targetSource.trim(), ...sourcesToMerge, userId);

    console.log(`Merged ${result.changes} leads from [${sourcesToMerge.join(', ')}] into "${targetSource}"`);

    return NextResponse.json({
      success: true,
      updated: result.changes,
      merged: sourcesToMerge,
      target: targetSource.trim()
    });
  } catch (error) {
    console.error('Error merging lead sources:', error);
    return NextResponse.json(
      { error: 'Failed to merge lead sources' },
      { status: 500 }
    );
  }
}
