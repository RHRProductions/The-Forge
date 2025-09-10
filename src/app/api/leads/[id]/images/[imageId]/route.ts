import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../../lib/database/connection';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId: imageIdParam } = await params;
    const leadId = parseInt(id);
    const imageId = parseInt(imageIdParam);
    
    if (isNaN(leadId) || isNaN(imageId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Get image details
    const image = db.prepare(`
      SELECT * FROM lead_images 
      WHERE id = ? AND lead_id = ?
    `).get(imageId, leadId);
    
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

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}