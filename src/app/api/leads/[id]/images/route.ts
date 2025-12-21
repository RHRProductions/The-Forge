import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../../../lib/database/connection';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../../../../../../auth';
import { rateLimiter, getClientIp } from '../../../../../../lib/security/rate-limiter';
import { logAudit } from '../../../../../../lib/security/audit-logger';
import { validateImageFile } from '../../../../../../lib/security/file-validator';
import { createErrorResponse } from '../../../../../../lib/security/error-sanitizer';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
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

    const images = db.prepare(`
      SELECT * FROM lead_images
      WHERE lead_id = ?
      ORDER BY uploaded_at DESC
    `).all(leadId);

    return NextResponse.json(images);
  } catch (error) {
    const errorResponse = createErrorResponse(error, 'GET /api/leads/[id]/images');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientIp = getClientIp(request);

  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });
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

    // Apply rate limiting: 20 image uploads per hour per user
    const rateLimitKey = `image-upload:${userId}`;
    const rateLimit = rateLimiter.check(rateLimitKey, 20, 60 * 60 * 1000, 60 * 60 * 1000);

    if (!rateLimit.allowed) {
      const blockedMinutes = rateLimit.blockedUntil
        ? Math.ceil((rateLimit.blockedUntil - Date.now()) / 60000)
        : 0;

      await logAudit({
        action: 'image_upload_rate_limit',
        userId: userId,
        userEmail: (session.user as any).email,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        resourceType: 'image',
        resourceId: leadId.toString(),
        details: `Rate limit exceeded - blocked for ${blockedMinutes} minutes`,
        severity: 'warning',
      });

      return NextResponse.json(
        {
          error: `Too many image uploads. Please try again in ${blockedMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Enhanced file validation (checks file content, not just MIME type)
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      // Log failed upload attempt
      await logAudit({
        action: 'image_upload_rejected',
        userId: userId,
        userEmail: (session.user as any).email,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || undefined,
        resourceType: 'image',
        resourceId: leadId.toString(),
        details: `File validation failed: ${validation.error}`,
        severity: 'warning',
      });

      return NextResponse.json({
        error: validation.error || 'File validation failed'
      }, { status: 400 });
    }

    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        error: 'Invalid file type. Allowed: JPG, PNG, GIF, WEBP'
      }, { status: 400 });
    }

    // Generate unique filename
    const filename = `${uuidv4()}${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'leads');
    const filePath = path.join(uploadDir, filename);
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Save to database
    const insertResult = db.prepare(`
      INSERT INTO lead_images (lead_id, filename, original_name, file_path, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      leadId,
      filename,
      file.name,
      `/uploads/leads/${filename}`,
      file.size,
      file.type
    );

    const newImage = db.prepare(`
      SELECT * FROM lead_images WHERE id = ?
    `).get(insertResult.lastInsertRowid);

    // Audit log successful image upload
    await logAudit({
      action: 'image_upload',
      userId: userId,
      userEmail: (session.user as any).email,
      ipAddress: clientIp,
      userAgent: request.headers.get('user-agent') || undefined,
      resourceType: 'image',
      resourceId: insertResult.lastInsertRowid.toString(),
      details: `Uploaded image "${file.name}" (${(file.size / 1024).toFixed(2)}KB) to lead #${leadId}`,
      severity: 'info',
    });

    return NextResponse.json(newImage);
  } catch (error) {
    const errorResponse = createErrorResponse(error, 'POST /api/leads/[id]/images');
    return NextResponse.json(errorResponse, { status: 500 });
  }
}