import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { Lead } from '../../../../../types/lead';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(parseInt(id));

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const leadData: Partial<Lead> = await request.json();
    const db = getDatabase();

    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    // Helper to add field to update - allows explicit null values
    const addField = (field: string, value: any) => {
      if (value !== undefined) {
        updates.push(`${field} = ?`);
        values.push(value);
      }
    };

    addField('first_name', leadData.first_name);
    addField('last_name', leadData.last_name);
    addField('email', leadData.email);
    addField('phone', leadData.phone);
    addField('phone_2', leadData.phone_2);
    addField('company', leadData.company);
    addField('address', leadData.address);
    addField('city', leadData.city);
    addField('state', leadData.state);
    addField('zip_code', leadData.zip_code);
    addField('date_of_birth', leadData.date_of_birth);
    addField('age', leadData.age);
    addField('gender', leadData.gender);
    addField('marital_status', leadData.marital_status);
    addField('occupation', leadData.occupation);
    addField('income', leadData.income);
    addField('household_size', leadData.household_size);
    addField('status', leadData.status);
    addField('contact_method', leadData.contact_method);
    addField('lead_type', leadData.lead_type);
    addField('cost_per_lead', leadData.cost_per_lead);
    addField('sales_amount', leadData.sales_amount);
    addField('notes', leadData.notes);
    addField('lead_score', leadData.lead_score);
    addField('last_contact_date', leadData.last_contact_date);
    addField('next_follow_up', leadData.next_follow_up);
    addField('lead_temperature', leadData.lead_temperature);
    // Convert boolean to number for SQLite
    if (leadData.wrong_info !== undefined) {
      addField('wrong_info', leadData.wrong_info ? 1 : 0);
    }

    // Always update updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    // Add the id parameter
    values.push(id);

    if (updates.length > 1) { // More than just updated_at
      const query = `UPDATE leads SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
    }

    const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}