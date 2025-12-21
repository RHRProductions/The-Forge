import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../lib/database/connection';
import { unlink } from 'fs/promises';
import path from 'path';
import { auth } from '../../../../../../../auth';
import { getClientIp } from '../../../../../../../lib/security/rate-limiter';
import { logAudit } from '../../../../../../../lib/security/audit-logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const clientIp = getClientIp(request);

  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, imageId: imageIdParam } = await params;
    const leadId = parseInt(id);
    const imageId = parseInt(imageIdParam);

    if (isNaN(leadId) || isNaN(imageId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = getDatabase();
    const userId = parseInt((session.user as any).id);
    const userRole = (session.user as any).role;

    // Authorization check: verify user has access to this lead
    if (userRole !== 'admin') {
      const lead = db.prepare('SELECT owner_id FROM leads WHERE id = ?').get(leadId) as any;
      if (!lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
      }
      if (lead.owner_id !== userId) {
        // Check if user is an agent with access to this setter's leads
        const user = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(userId) as any;
        const leadOwner = db.prepare('SELECT agent_id FROM users WHERE id = ?').get(lead.owner_id) as any;

        if (!(userRole === 'agent' && (lead.owner_id === userId || leadOwner?.agent_id === userId))) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Get image details
    const image = db.prepare(`
      SELECT * FROM lead_images
      WHERE id = ? AND lead_id = ?
    `).get(imageId, leadId) as any;

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete the physical file
    try {
      const filePath = path.join(process.cwd(), 'public', image.file_path);
      await unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    db.prepare(`
      DELETE FROM lead_images
      WHERE id = ? AND lead_id = ?
    `).run(imageId, leadId);

    // Audit log image deletion
    await logAudit({
      action: 'image_delete',
      userId: userId,
      userEmail: (session.user as any).email,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      resourceType: 'image',
      resourceId: imageId.toString(),
      details: `Deleted image "${image.original_name}" from lead #${leadId}`,
      severity: 'info',
    });

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}