import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getAuditLogs, getAuditLogCount, getSuspiciousActivity } from '../../../../../lib/security/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Check authentication and admin role
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || undefined;
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Special endpoint for suspicious activity
    if (searchParams.get('suspicious') === 'true') {
      const hours = parseInt(searchParams.get('hours') || '24');
      const suspiciousActivity = getSuspiciousActivity(hours);
      return NextResponse.json({ suspiciousActivity });
    }

    // Get audit logs with filters
    const logs = getAuditLogs({
      action: action as any,
      userId,
      resourceType: resourceType as any,
      severity: severity as any,
      startDate,
      endDate,
      limit,
      offset,
    });

    // Get total count for pagination
    const totalCount = getAuditLogCount({
      action: action as any,
      userId,
      resourceType: resourceType as any,
      severity: severity as any,
      startDate,
      endDate,
    });

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
