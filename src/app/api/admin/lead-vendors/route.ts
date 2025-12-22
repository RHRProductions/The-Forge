import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

// GET - Fetch all lead vendors
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const vendors = db.prepare('SELECT * FROM lead_vendors ORDER BY vendor_name ASC').all();

    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

// POST - Add a new vendor
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendor_name } = await request.json();

    if (!vendor_name || !vendor_name.trim()) {
      return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
    }

    const db = getDatabase();

    try {
      const result = db.prepare('INSERT INTO lead_vendors (vendor_name) VALUES (?)').run(vendor_name.trim());

      return NextResponse.json({
        success: true,
        id: result.lastInsertRowid,
        vendor_name: vendor_name.trim()
      });
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        return NextResponse.json({ error: 'Vendor name already exists' }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error adding vendor:', error);
    return NextResponse.json({ error: 'Failed to add vendor' }, { status: 500 });
  }
}

// DELETE - Remove a vendor
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Vendor ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const result = db.prepare('DELETE FROM lead_vendors WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
