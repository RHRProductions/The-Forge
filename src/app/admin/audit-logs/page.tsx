'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number;
  user_email: string;
  user_name: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  severity: string;
}

interface SuspiciousActivity {
  user_email: string;
  action: string;
  count: number;
  last_occurrence: string;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSuspicious, setShowSuspicious] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
    fetchSuspiciousActivity();
  }, [page, actionFilter, severityFilter, startDate, endDate]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (actionFilter) params.append('action', actionFilter);
      if (severityFilter) params.append('severity', severityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/admin/audit-logs?${params}`);

      if (response.status === 403) {
        router.push('/');
        return;
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspiciousActivity = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs?suspicious=true&hours=24');
      const data = await response.json();
      setSuspiciousActivity(data.suspiciousActivity || []);
    } catch (error) {
      console.error('Error fetching suspicious activity:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">🔒 Audit Logs</h1>
          <p className="text-gray-600 mt-2">Security and compliance tracking for all system operations</p>
        </div>

        {/* Suspicious Activity Alert */}
        {suspiciousActivity.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">Suspicious Activity Detected (Last 24 Hours)</h3>
                <div className="space-y-2">
                  {suspiciousActivity.map((activity, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-red-800">{activity.user_email}</span>
                          <span className="text-gray-600 ml-2">- {activity.action}</span>
                        </div>
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold">
                          {activity.count} times
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Last: {formatTimestamp(activity.last_occurrence)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">All Actions</option>
                <option value="lead_view_details">View Lead</option>
                <option value="lead_update">Update Lead</option>
                <option value="lead_delete">Delete Lead</option>
                <option value="lead_bulk_delete">Bulk Delete</option>
                <option value="lead_export">Export Data</option>
                <option value="data_import">Import Data</option>
                <option value="login_success">Login Success</option>
                <option value="login_failed">Login Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setActionFilter('');
                  setSeverityFilter('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Showing {logs.length} of {totalCount.toLocaleString()} total audit log entries
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => {
                    const details = parseDetails(log.details);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{log.user_name}</div>
                          <div className="text-xs text-gray-500">{log.user_email}</div>
                          <div className="text-xs text-gray-400">{log.user_role}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.resource_type}
                          {log.resource_id && (
                            <span className="text-gray-400"> #{log.resource_id}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs">
                          {details && (
                            <div className="text-xs text-gray-600 truncate">
                              {typeof details === 'object' ? (
                                Object.entries(details).slice(0, 2).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                                  </div>
                                ))
                              ) : (
                                details
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
