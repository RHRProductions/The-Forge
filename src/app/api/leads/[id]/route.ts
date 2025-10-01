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
        phone_2 = COALESCE(?, phone_2),
        company = COALESCE(?, company),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip_code = COALESCE(?, zip_code),
        date_of_birth = COALESCE(?, date_of_birth),
        age = COALESCE(?, age),
        gender = COALESCE(?, gender),
        marital_status = COALESCE(?, marital_status),
        occupation = COALESCE(?, occupation),
        income = COALESCE(?, income),
        household_size = COALESCE(?, household_size),
        status = COALESCE(?, status),
        contact_method = COALESCE(?, contact_method),
        lead_type = COALESCE(?, lead_type),
        cost_per_lead = COALESCE(?, cost_per_lead),
        sales_amount = COALESCE(?, sales_amount),
        notes = COALESCE(?, notes),
        lead_score = COALESCE(?, lead_score),
        last_contact_date = COALESCE(?, last_contact_date),
        next_follow_up = COALESCE(?, next_follow_up),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      leadData.first_name,
      leadData.last_name,
      leadData.email,
      leadData.phone,
      leadData.phone_2,
      leadData.company,
      leadData.address,
      leadData.city,
      leadData.state,
      leadData.zip_code,
      leadData.date_of_birth,
      leadData.age,
      leadData.gender,
      leadData.marital_status,
      leadData.occupation,
      leadData.income,
      leadData.household_size,
      leadData.status,
      leadData.contact_method,
      leadData.lead_type,
      leadData.cost_per_lead,
      leadData.sales_amount,
      leadData.notes,
      leadData.lead_score,
      leadData.last_contact_date,
      leadData.next_follow_up,
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