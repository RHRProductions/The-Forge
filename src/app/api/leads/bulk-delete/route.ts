import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';

export async function DELETE() {
  try {
    const db = getDatabase();
    
    // Get count before deletion
    const countResult = db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number };
    const deletedCount = countResult.count;
    
    // Delete all leads
    db.prepare('DELETE FROM leads').run();
    
    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} leads`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting all leads:', error);
    return NextResponse.json(
      { error: 'Failed to delete leads' },
      { status: 500 }
    );
  }
}