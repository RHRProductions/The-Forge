import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { getDatabase } from '../../../../../../lib/database/connection';

// DELETE /api/emails/bounced/[email] - Remove email from bounce list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    const db = getDatabase();

    // Reset bounce status for this email
    const result = db.prepare(`
      UPDATE email_sends
      SET bounced = 0, bounce_reason = NULL
      WHERE email_address = ? AND bounced = 1
    `).run(decodedEmail);

    return NextResponse.json({
      success: true,
      updated: result.changes
    });
  } catch (error) {
    console.error('Error removing bounced email:', error);
    return NextResponse.json(
      { error: 'Failed to remove bounced email' },
      { status: 500 }
    );
  }
}
