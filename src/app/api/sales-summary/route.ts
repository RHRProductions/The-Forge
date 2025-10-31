import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/connection';

export async function GET() {
  try {
    const db = getDatabase();

    // Get total revenue from all policies (sum of commission_amount)
    const totalResult = db.prepare(`
      SELECT COALESCE(SUM(commission_amount), 0) as totalRevenue
      FROM lead_policies
    `).get() as { totalRevenue: number };

    // Get revenue only from leads that had a cost (cost_per_lead > 0)
    // This is used for ROI calculation
    const paidLeadResult = db.prepare(`
      SELECT COALESCE(SUM(lp.commission_amount), 0) as paidLeadRevenue
      FROM lead_policies lp
      JOIN leads l ON lp.lead_id = l.id
      WHERE l.cost_per_lead > 0
    `).get() as { paidLeadRevenue: number };

    return NextResponse.json({
      totalRevenue: totalResult.totalRevenue || 0,
      paidLeadRevenue: paidLeadResult.paidLeadRevenue || 0
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales summary' },
      { status: 500 }
    );
  }
}
