import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';
import { Lead } from '../../../../types/lead';

export async function GET() {
  try {
    const db = getDatabase();
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const lead: Omit<Lead, 'id'> = await request.json();
    const db = getDatabase();
    
    const result = db.prepare(
      `INSERT INTO leads (first_name, last_name, email, phone, company, status, contact_method, cost_per_lead, sales_amount, notes, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      lead.first_name,
      lead.last_name,
      lead.email,
      lead.phone,
      lead.company || '',
      lead.status,
      lead.contact_method || '',
      lead.cost_per_lead,
      lead.sales_amount,
      lead.notes || '',
      lead.source
    );

    const newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}