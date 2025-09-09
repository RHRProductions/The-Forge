import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../lib/database/connection';
import * as Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
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
        first_name, last_name, email, phone, company, 
        status, contact_method, cost_per_lead, sales_amount, 
        notes, source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    let successCount = 0;
    let errors = [];

    for (const row of results.data as any[]) {
      try {
        insertStmt.run(
          row.first_name || row.firstname || '',
          row.last_name || row.lastname || '',
          row.email || '',
          row.phone || '',
          row.company || '',
          row.status || 'new',
          row.contact_method || '',
          parseFloat(row.cost_per_lead || '0') || 0,
          parseFloat(row.sales_amount || '0') || 0,
          row.notes || '',
          'csv_upload'
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