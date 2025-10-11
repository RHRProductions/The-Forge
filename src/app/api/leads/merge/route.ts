import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { auth } from '../../../../../auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keepLeadId, mergeLeadIds, mergedData } = await request.json();

    if (!keepLeadId || !mergeLeadIds || !Array.isArray(mergeLeadIds)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const db = getDatabase();

    // Update the lead we're keeping with merged data
    if (mergedData) {
      const updateFields = [];
      const updateValues = [];

      // Build dynamic update query based on provided fields
      Object.keys(mergedData).forEach(key => {
        if (mergedData[key] !== undefined && key !== 'id') {
          updateFields.push(`${key} = ?`);
          updateValues.push(mergedData[key]);
        }
      });

      if (updateFields.length > 0) {
        updateValues.push(keepLeadId);
        const updateQuery = `UPDATE leads SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        db.prepare(updateQuery).run(...updateValues);
      }
    }

    // Move related records from merged leads to the kept lead
    for (const mergeLeadId of mergeLeadIds) {
      if (mergeLeadId === keepLeadId) continue;

      // Move notes
      db.prepare('UPDATE lead_notes SET lead_id = ? WHERE lead_id = ?').run(keepLeadId, mergeLeadId);

      // Move activities
      db.prepare('UPDATE lead_activities SET lead_id = ? WHERE lead_id = ?').run(keepLeadId, mergeLeadId);

      // Move policies
      db.prepare('UPDATE lead_policies SET lead_id = ? WHERE lead_id = ?').run(keepLeadId, mergeLeadId);

      // Move images
      db.prepare('UPDATE lead_images SET lead_id = ? WHERE lead_id = ?').run(keepLeadId, mergeLeadId);

      // Delete the merged lead
      db.prepare('DELETE FROM leads WHERE id = ?').run(mergeLeadId);
    }

    return NextResponse.json({ success: true, message: 'Leads merged successfully' });
  } catch (error) {
    console.error('Error merging leads:', error);
    return NextResponse.json({ error: 'Failed to merge leads' }, { status: 500 });
  }
}
