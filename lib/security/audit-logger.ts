import { getDatabase } from '../database/connection';
import { auth } from '../../auth';

export type AuditAction =
  // Authentication
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset'
  // 2FA operations
  | '2fa_setup_initiated'
  | '2fa_setup_rate_limit'
  | '2fa_verify_failed'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_disable_failed'
  | 'image_upload'
  | 'image_upload_rejected'
  | 'image_upload_rate_limit'
  // Lead operations
  | 'lead_view'
  | 'lead_view_details'
  | 'lead_create'
  | 'lead_update'
  | 'lead_delete'
  | 'lead_bulk_delete'
  | 'lead_export'
  | 'lead_merge'
  // Activity operations
  | 'activity_create'
  | 'activity_delete'
  // Note operations
  | 'note_create'
  | 'note_update'
  | 'note_delete'
  // Policy operations
  | 'policy_create'
  | 'policy_update'
  | 'policy_delete'
  | 'policy_issue'
  // Email operations
  | 'email_send'
  | 'email_campaign_create'
  | 'email_bulk_send'
  // User operations
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'user_role_change'
  // System operations
  | 'settings_update'
  | 'data_import'
  | 'data_export';

export type AuditResourceType =
  | 'lead'
  | 'activity'
  | 'note'
  | 'policy'
  | 'user'
  | 'email'
  | 'campaign'
  | 'system'
  | '2fa'
  | 'image';

export type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditLogEntry {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: number;
  details?: Record<string, any>;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogFilter {
  userId?: number;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: number;
  startDate?: string;
  endDate?: string;
  severity?: AuditSeverity;
  limit?: number;
  offset?: number;
}

/**
 * Log an audit event
 * Automatically captures user info from session
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const session = await auth();
    const db = getDatabase();

    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, user_email, user_name, user_role,
        action, resource_type, resource_id, details,
        ip_address, user_agent, severity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session?.user ? (session.user as any).id : null,
      session?.user?.email || 'system',
      session?.user?.name || 'System',
      session?.user ? (session.user as any).role : 'system',
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null,
      entry.severity || 'info'
    );
  } catch (error) {
    // Don't throw - audit logging failures shouldn't break the app
    console.error('Audit log error:', error);
  }
}

/**
 * Log an audit event from API route with request context
 */
export async function logAuditFromRequest(
  request: Request,
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
): Promise<void> {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  await logAudit({
    ...entry,
    ipAddress,
    userAgent,
  });
}

/**
 * Query audit logs with filters
 */
export function getAuditLogs(filter: AuditLogFilter = {}) {
  const db = getDatabase();

  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (filter.userId) {
    query += ' AND user_id = ?';
    params.push(filter.userId);
  }

  if (filter.action) {
    query += ' AND action = ?';
    params.push(filter.action);
  }

  if (filter.resourceType) {
    query += ' AND resource_type = ?';
    params.push(filter.resourceType);
  }

  if (filter.resourceId) {
    query += ' AND resource_id = ?';
    params.push(filter.resourceId);
  }

  if (filter.startDate) {
    query += ' AND timestamp >= ?';
    params.push(filter.startDate);
  }

  if (filter.endDate) {
    query += ' AND timestamp <= ?';
    params.push(filter.endDate);
  }

  if (filter.severity) {
    query += ' AND severity = ?';
    params.push(filter.severity);
  }

  query += ' ORDER BY timestamp DESC';

  if (filter.limit) {
    query += ' LIMIT ?';
    params.push(filter.limit);
  }

  if (filter.offset) {
    query += ' OFFSET ?';
    params.push(filter.offset);
  }

  return db.prepare(query).all(...params);
}

/**
 * Get audit log count with filters
 */
export function getAuditLogCount(filter: AuditLogFilter = {}): number {
  const db = getDatabase();

  let query = 'SELECT COUNT(*) as count FROM audit_logs WHERE 1=1';
  const params: any[] = [];

  if (filter.userId) {
    query += ' AND user_id = ?';
    params.push(filter.userId);
  }

  if (filter.action) {
    query += ' AND action = ?';
    params.push(filter.action);
  }

  if (filter.resourceType) {
    query += ' AND resource_type = ?';
    params.push(filter.resourceType);
  }

  if (filter.startDate) {
    query += ' AND timestamp >= ?';
    params.push(filter.startDate);
  }

  if (filter.endDate) {
    query += ' AND timestamp <= ?';
    params.push(filter.endDate);
  }

  if (filter.severity) {
    query += ' AND severity = ?';
    params.push(filter.severity);
  }

  const result = db.prepare(query).get(...params) as { count: number };
  return result.count;
}

/**
 * Get recent suspicious activity
 * - Multiple failed logins
 * - Bulk data exports
 * - After-hours access
 * - Deletions
 */
export function getSuspiciousActivity(hours: number = 24) {
  const db = getDatabase();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  return db.prepare(`
    SELECT
      user_email,
      action,
      COUNT(*) as count,
      MAX(timestamp) as last_occurrence
    FROM audit_logs
    WHERE timestamp >= ?
      AND (
        action IN ('login_failed', 'lead_bulk_delete', 'lead_export', 'data_export')
        OR severity = 'critical'
      )
    GROUP BY user_email, action
    HAVING count > 5
    ORDER BY count DESC, last_occurrence DESC
  `).all(since);
}

/**
 * Helper to get client IP from request
 */
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * Audit log presets for common operations
 */
export const AuditPresets = {
  // Lead operations
  viewLead: (leadId: number) => ({
    action: 'lead_view_details' as AuditAction,
    resourceType: 'lead' as AuditResourceType,
    resourceId: leadId,
    severity: 'info' as AuditSeverity,
  }),

  createLead: (leadId: number, leadData: any) => ({
    action: 'lead_create' as AuditAction,
    resourceType: 'lead' as AuditResourceType,
    resourceId: leadId,
    details: { name: leadData.name, email: leadData.email },
    severity: 'info' as AuditSeverity,
  }),

  updateLead: (leadId: number, changes: any) => ({
    action: 'lead_update' as AuditAction,
    resourceType: 'lead' as AuditResourceType,
    resourceId: leadId,
    details: { changes },
    severity: 'info' as AuditSeverity,
  }),

  deleteLead: (leadId: number, leadName: string) => ({
    action: 'lead_delete' as AuditAction,
    resourceType: 'lead' as AuditResourceType,
    resourceId: leadId,
    details: { name: leadName },
    severity: 'warning' as AuditSeverity,
  }),

  bulkDeleteLeads: (count: number, ids: number[]) => ({
    action: 'lead_bulk_delete' as AuditAction,
    resourceType: 'lead' as AuditResourceType,
    details: { count, ids: ids.slice(0, 10) }, // Log first 10 IDs
    severity: 'critical' as AuditSeverity,
  }),

  exportLeads: (count: number, filters?: any) => ({
    action: 'lead_export' as AuditAction,
    resourceType: 'lead' as AuditResourceType,
    details: { count, filters },
    severity: 'warning' as AuditSeverity,
  }),

  // Authentication
  loginSuccess: (email: string) => ({
    action: 'login_success' as AuditAction,
    resourceType: 'system' as AuditResourceType,
    details: { email },
    severity: 'info' as AuditSeverity,
  }),

  loginFailed: (email: string) => ({
    action: 'login_failed' as AuditAction,
    resourceType: 'system' as AuditResourceType,
    details: { email },
    severity: 'warning' as AuditSeverity,
  }),
};
