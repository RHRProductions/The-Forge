import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';

export async function GET() {
  try {
    const db = getDatabase();

    // Get total revenue from all policies (sum of commission_amount)
    const result = db.prepare(`
      SELECT COALESCE(SUM(commission_amount), 0) as totalRevenue
      FROM lead_policies
    `).get() as { totalRevenue: number };

    return NextResponse.json({
      totalRevenue: result.totalRevenue || 0
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales summary' },
      { status: 500 }
    );
  }
}
