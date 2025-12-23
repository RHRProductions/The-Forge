import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getDatabase } from '../../../../../lib/database/connection';

interface ParsedLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string;
  age: number | null;
  gender: string;
  marital_status: string;
  occupation: string;
  income: string;
  household_size: number | null;
  status: string;
  contact_method: string;
  lead_type: string;
  cost_per_lead: number;
  sales_amount: number;
  notes: string;
  source: string;
  lead_score: number;
  lead_temperature: string;
}

// POST /api/admin/save-and-assign-leads - Save parsed leads to database with owner_id
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can use this endpoint
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { leads, targetAgentId } = body as { leads: ParsedLead[]; targetAgentId: number };

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    if (!targetAgentId) {
      return NextResponse.json({ error: 'Target agent is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Verify target agent exists and is agent/admin
    const targetAgent = db.prepare(`
      SELECT id, name, role FROM users WHERE id = ? AND role IN ('agent', 'admin')
    `).get(targetAgentId) as { id: number; name: string; role: string } | undefined;

    if (!targetAgent) {
      return NextResponse.json({ error: 'Invalid target agent' }, { status: 400 });
    }

    // Prepare insert statement
    const insertStmt = db.prepare(`
      INSERT INTO leads (
        first_name, last_name, email, phone, phone_2, company,
        address, city, state, zip_code, date_of_birth, age, gender,
        marital_status, occupation, income, household_size, status,
        contact_method, lead_type, cost_per_lead, sales_amount, notes, source,
        lead_score, lead_temperature, owner_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    // Prepare duplicate check statement - check within target agent's leads
    const duplicateCheckStmt = db.prepare(`
      SELECT id FROM leads
      WHERE LOWER(first_name) = LOWER(?)
      AND LOWER(last_name) = LOWER(?)
      AND phone = ?
      AND owner_id = ?
    `);

    let successCount = 0;
    let duplicateCount = 0;

    // Use a transaction for better performance
    const insertMany = db.transaction((leadsToInsert: ParsedLead[]) => {
      for (const lead of leadsToInsert) {
        // Check for duplicates in target agent's leads
        const duplicate = duplicateCheckStmt.get(
          lead.first_name || '',
          lead.last_name || '',
          lead.phone,
          targetAgentId
        );

        if (duplicate) {
          duplicateCount++;
          continue;
        }

        try {
          insertStmt.run(
            lead.first_name,
            lead.last_name,
            lead.email,
            lead.phone,
            lead.phone_2,
            lead.company,
            lead.address,
            lead.city,
            lead.state,
            lead.zip_code,
            lead.date_of_birth,
            lead.age,
            lead.gender,
            lead.marital_status,
            lead.occupation,
            lead.income,
            lead.household_size,
            lead.status,
            lead.contact_method,
            lead.lead_type,
            lead.cost_per_lead,
            lead.sales_amount,
            lead.notes,
            lead.source,
            lead.lead_score,
            lead.lead_temperature,
            targetAgentId
          );
          successCount++;
        } catch (error) {
          console.error('Error inserting lead:', error);
        }
      }
    });

    // Execute the transaction
    insertMany(leads);

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${successCount} leads to ${targetAgent.name}${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`,
      successCount,
      duplicateCount
    });

  } catch (error) {
    console.error('Error saving and assigning leads:', error);
    return NextResponse.json({ error: 'Failed to save and assign leads' }, { status: 500 });
  }
}
