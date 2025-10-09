import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../lib/database/connection';

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  try {
    const { id, policyId: policyIdParam } = await params;
    const leadId = parseInt(id);
    const policyId = parseInt(policyIdParam);
    
    if (isNaN(leadId) || isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Verify the policy belongs to the lead
    const policy = db.prepare(`
      SELECT * FROM lead_policies 
      WHERE id = ? AND lead_id = ?
    `).get(policyId, leadId);
    
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Delete the policy
    db.prepare(`
      DELETE FROM lead_policies 
      WHERE id = ? AND lead_id = ?
    `).run(policyId, leadId);

    return NextResponse.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  try {
    const { id, policyId: policyIdParam } = await params;
    const leadId = parseInt(id);
    const policyId = parseInt(policyIdParam);
    
    if (isNaN(leadId) || isNaN(policyId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Verify the policy belongs to the lead
    const existingPolicy = db.prepare(`
      SELECT * FROM lead_policies 
      WHERE id = ? AND lead_id = ?
    `).get(policyId, leadId);
    
    if (!existingPolicy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
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

    // Update the policy
    db.prepare(`
      UPDATE lead_policies SET
        policy_number = ?,
        policy_type = ?,
        coverage_amount = ?,
        premium_amount = ?,
        commission_amount = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        notes = ?
      WHERE id = ? AND lead_id = ?
    `).run(
      policy_number || null,
      policy_type.trim(),
      coverage_amount || null,
      premium_amount || null,
      commission_amount || null,
      start_date || null,
      end_date || null,
      status || 'pending',
      notes || null,
      policyId,
      leadId
    );

    const updatedPolicy = db.prepare(`
      SELECT * FROM lead_policies WHERE id = ?
    `).get(policyId);

    return NextResponse.json(updatedPolicy);
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}