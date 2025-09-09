import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { Lead } from '../../../../../types/lead';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadData: Partial<Lead> = await request.json();
    const db = getDatabase();
    
    db.prepare(
      `UPDATE leads SET 
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        company = COALESCE(?, company),
        status = COALESCE(?, status),
        contact_method = COALESCE(?, contact_method),
        cost_per_lead = COALESCE(?, cost_per_lead),
        sales_amount = COALESCE(?, sales_amount),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      leadData.first_name,
      leadData.last_name,
      leadData.email,
      leadData.phone,
      leadData.company,
      leadData.status,
      leadData.contact_method,
      leadData.cost_per_lead,
      leadData.sales_amount,
      leadData.notes,
      params.id
    );

    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.id);
    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM leads WHERE id = ?').run(params.id);
    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}