import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';

// GET - Fetch all lead vendors (public endpoint for dropdown)
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const vendors = db.prepare('SELECT id, vendor_name FROM lead_vendors ORDER BY vendor_name ASC').all();

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}
