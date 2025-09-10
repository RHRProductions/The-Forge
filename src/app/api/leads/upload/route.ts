import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import { formatPhoneNumber, formatName, formatLocation } from '../../../../../lib/utils';
import * as Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const totalSpent = parseFloat(formData.get('totalSpent') as string) || 0;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    
    // Parse CSV
    const results = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_')
    });

    if (results.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: results.errors },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO leads (
        first_name, last_name, email, phone, phone_2, company, 
        address, city, state, zip_code, date_of_birth, age, gender,
        marital_status, occupation, income, household_size, status, 
        contact_method, cost_per_lead, sales_amount, notes, source, 
        lead_score, last_contact_date, next_follow_up, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    let successCount = 0;
    let errors = [];
    
    // Calculate cost per lead based on total spent
    const costPerLead = totalSpent > 0 && results.data.length > 0 ? totalSpent / results.data.length : 0;

    for (const row of results.data as any[]) {
      try {
        // Parse age from date of birth if provided
        let calculatedAge = null;
        if (row.date_of_birth || row.dob) {
          const dob = new Date(row.date_of_birth || row.dob);
          if (!isNaN(dob.getTime())) {
            const today = new Date();
            calculatedAge = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
              calculatedAge--;
            }
          }
        }

        insertStmt.run(
          formatName(row.first_name || row.firstname || ''),
          formatName(row.last_name || row.lastname || ''),
          row.email || '',
          formatPhoneNumber(row.phone || row.phone_number || row.other_phone_1 || row['other phone 1'] || ''),
          formatPhoneNumber(row.phone_2 || row.phone2 || row.other_phone_2 || row['other phone 2'] || ''),
          row.company || '',
          row.address || row.street_address || '',
          formatLocation(row.city || ''),
          formatLocation(row.state || ''),
          row.zip_code || row.zip || row.zipcode || '',
          row.date_of_birth || row.dob || '',
          parseInt(row.age) || calculatedAge || null,
          row.gender || '',
          row.marital_status || row.marital || '',
          row.occupation || row.job_title || '',
          row.income || row.annual_income || '',
          parseInt(row.household_size) || null,
          row.status || 'new',
          row.contact_method || '',
          parseFloat(row.cost_per_lead || costPerLead.toString()) || costPerLead,
          parseFloat(row.sales_amount || '0') || 0,
          row.notes || '',
          'csv_upload',
          parseInt(row.lead_score) || 0,
          row.last_contact_date || '',
          row.next_follow_up || ''
        );
        successCount++;
      } catch (error) {
        errors.push({ row, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${successCount} leads`,
      total: results.data.length,
      successCount,
      costPerLead,
      totalSpent,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error uploading CSV:', error);
    return NextResponse.json(
      { error: 'Failed to upload CSV file' },
      { status: 500 }
    );
  }
}