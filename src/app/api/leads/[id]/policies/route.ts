import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    const db = getDatabase();
    const policies = db.prepare(`
      SELECT * FROM lead_policies 
      WHERE lead_id = ? 
      ORDER BY created_at DESC
    `).all(leadId);

    return NextResponse.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const leadId = parseInt(id);
    
    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
    }

    const policyData = await request.json();
    const {
      policy_type,
      policy_number,
      coverage_amount,
      premium_amount,
      commission_amount,
      start_date,
      end_date,
      status,
      notes
    } = policyData;
    
    if (!policy_type || typeof policy_type !== 'string' || policy_type.trim().length === 0) {
      return NextResponse.json({ error: 'Policy type is required' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['active', 'pending', 'cancelled', 'expired'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid policy status' }, { status: 400 });
    }

    const db = getDatabase();
    const insertResult = db.prepare(`
      INSERT INTO lead_policies (
        lead_id, policy_number, policy_type, coverage_amount,
        premium_amount, commission_amount, start_date, end_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      policy_number || null,
      policy_type.trim(),
      coverage_amount || null,
      premium_amount || null,
      commission_amount || null,
      start_date || null,
      end_date || null,
      status || 'pending',
      notes || null
    );

    const newPolicy = db.prepare(`
      SELECT * FROM lead_policies WHERE id = ?
    `).get(insertResult.lastInsertRowid);

    // If policy status is pending, update the lead status to pending
    if ((status || 'pending') === 'pending') {
      db.prepare('UPDATE leads SET status = ? WHERE id = ?')
        .run('pending', leadId);
    }

    return NextResponse.json(newPolicy);
  } catch (error) {
    console.error('Error adding policy:', error);
    return NextResponse.json(
      { error: 'Failed to add policy' },
      { status: 500 }
    );
  }
}