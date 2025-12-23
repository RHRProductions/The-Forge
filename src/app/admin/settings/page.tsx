'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'setter';
  agent_id?: number;
  created_at: string;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Lead vendor management state
  const [vendors, setVendors] = useState<any[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'setter',
    agent_id: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch vendors and users
  useEffect(() => {
    if ((session?.user as any)?.role === 'admin') {
      fetchVendors();
      fetchUsers();
    }
  }, [session]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/lead-vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/lead-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_name: newVendorName.trim() }),
      });

      if (response.ok) {
        setNewVendorName('');
        setShowVendorForm(false);
        setSuccess('Vendor added successfully!');
        fetchVendors();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add vendor');
      }
    } catch (error) {
      setError('Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/lead-vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setSuccess('Vendor deleted successfully!');
        fetchVendors();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete vendor');
      }
    } catch (error) {
      setError('Failed to delete vendor');
    } finally {
      setLoading(false);
    }
  };

  // User Management Functions
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const validatePasswordStrength = (password: string) => {
    if (!password) {
      setPasswordErrors([]);
      return;
    }

    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters long');
    if (!/[A-Z]/.test(password)) errors.push('Contains uppercase letter (A-Z)');
    if (!/[a-z]/.test(password)) errors.push('Contains lowercase letter (a-z)');
    if (!/[0-9]/.test(password)) errors.push('Contains number (0-9)');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Contains special character (!@#$%^&* etc.)');

    setPasswordErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      if (formData.role === 'setter' && formData.agent_id) {
        body.agent_id = parseInt(formData.agent_id);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchUsers();
        setShowAddForm(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', role: 'setter', agent_id: '' });
        setPasswordErrors([]);
        setSuccess('User saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        if (data.details && Array.isArray(data.details)) {
          setError(data.error + ': ' + data.details.join(', '));
        } else {
          setError(data.error || 'Failed to save user');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      agent_id: user.agent_id?.toString() || '',
    });
    setPasswordErrors([]);
    setShowAddForm(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
        setSuccess('User deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'setter', agent_id: '' });
    setError('');
    setPasswordErrors([]);
  };

  const handleResetAnalytics = async () => {
    const confirmMessage = `⚠️ WARNING: This will permanently delete ALL analytics data:

• All call/text/email activities
• All policy/sales records
• All contact attempt counts

This will also:
• Set leads without warm/hot temperature to 'cold'
• Preserve your follow-up dates
• Keep warm/hot leads as warm/hot

This will keep:
✓ Your leads and their categorization
✓ Calendar appointments
✓ User accounts

Type RESET to confirm:`;

    const userInput = prompt(confirmMessage);

    if (userInput !== 'RESET') {
      alert('Reset cancelled. You must type RESET exactly to proceed.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/reset-analytics', {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess('Analytics data has been reset successfully!');
        // Reload the page to reflect changes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reset analytics');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if ((session?.user as any)?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-8 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">⚙️ Admin Settings</h1>
            <NavigationMenu currentPage="admin-settings" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
          <h2 className="text-3xl font-black mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/admin/bulk-assign-leads')}
              className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
            >
              Bulk Assign Leads to Agents
            </button>
            <button
              onClick={() => router.push('/admin/platform-insights')}
              className="bg-gray-200 text-black px-6 py-3 rounded font-bold hover:bg-gray-300 transition-colors"
            >
              Platform Insights
            </button>
            <button
              onClick={() => router.push('/admin/audit-logs')}
              className="bg-gray-200 text-black px-6 py-3 rounded font-bold hover:bg-gray-300 transition-colors"
            >
              Audit Logs
            </button>
          </div>
        </div>

        {/* Lead Vendor Management */}
        <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
          <h2 className="text-3xl font-black mb-6">🏷️ Lead Vendor Management</h2>

          <div className="mb-6">
            <button
              onClick={() => setShowVendorForm(!showVendorForm)}
              className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
            >
              {showVendorForm ? 'Cancel' : '+ Add New Vendor'}
            </button>
          </div>

          {showVendorForm && (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Add New Vendor</h3>
              <form onSubmit={handleAddVendor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Vendor Name</label>
                  <input
                    type="text"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    placeholder="e.g., Marc Publishing Leads"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Adding...' : 'Add Vendor'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVendorForm(false)}
                    className="bg-gray-300 text-black px-6 py-3 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Vendors List */}
          <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left p-4 font-bold">Vendor Name</th>
                  <th className="text-left p-4 font-bold">Created</th>
                  <th className="text-left p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center p-8 text-gray-500">
                      No vendors yet. Click "Add New Vendor" to create one.
                    </td>
                  </tr>
                ) : (
                  vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-4 font-semibold">{vendor.vendor_name}</td>
                      <td className="p-4 text-gray-600">
                        {new Date(vendor.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleDeleteVendor(vendor.id, vendor.vendor_name)}
                          disabled={loading}
                          className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Management */}
        <div className="border-t-4 border-gray-300 my-8"></div>
        <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
          <h2 className="text-3xl font-black mb-6">👥 User Management</h2>

          {/* Action Buttons */}
          {!showAddForm && (
            <div className="mb-6 flex gap-3 flex-wrap">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
              >
                + Add New User
              </button>
              <button
                onClick={() => router.push('/admin/audit-logs')}
                className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700 transition-colors"
              >
                🔒 Audit Logs
              </button>
              <button
                onClick={() => router.push('/admin/bulk-source-update')}
                className="bg-purple-600 text-white px-6 py-3 rounded font-bold hover:bg-purple-700 transition-colors"
              >
                📊 Bulk Source Update
              </button>
              <button
                onClick={() => router.push('/admin/lead-sources')}
                className="bg-orange-600 text-white px-6 py-3 rounded font-bold hover:bg-orange-700 transition-colors"
              >
                🏷️ Lead Sources
              </button>
              <button
                onClick={() => router.push('/duplicates')}
                className="bg-yellow-600 text-white px-6 py-3 rounded font-bold hover:bg-yellow-700 transition-colors"
              >
                🔍 Find Duplicates
              </button>
              <button
                onClick={handleResetAnalytics}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                🔄 Reset Analytics Data
              </button>
            </div>
          )}

          {/* Add/Edit User Form */}
          {showAddForm && (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Password {editingUser && '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        validatePasswordStrength(e.target.value);
                      }}
                      required={!editingUser}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                    {formData.password && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Password Requirements:</p>
                        <ul className="text-xs space-y-1">
                          <li className={passwordErrors.includes('At least 8 characters long') ? 'text-red-600' : 'text-green-600'}>
                            {passwordErrors.includes('At least 8 characters long') ? '✗' : '✓'} At least 8 characters long
                          </li>
                          <li className={passwordErrors.includes('Contains uppercase letter (A-Z)') ? 'text-red-600' : 'text-green-600'}>
                            {passwordErrors.includes('Contains uppercase letter (A-Z)') ? '✗' : '✓'} Contains uppercase letter (A-Z)
                          </li>
                          <li className={passwordErrors.includes('Contains lowercase letter (a-z)') ? 'text-red-600' : 'text-green-600'}>
                            {passwordErrors.includes('Contains lowercase letter (a-z)') ? '✗' : '✓'} Contains lowercase letter (a-z)
                          </li>
                          <li className={passwordErrors.includes('Contains number (0-9)') ? 'text-red-600' : 'text-green-600'}>
                            {passwordErrors.includes('Contains number (0-9)') ? '✗' : '✓'} Contains number (0-9)
                          </li>
                          <li className={passwordErrors.includes('Contains special character (!@#$%^&* etc.)') ? 'text-red-600' : 'text-green-600'}>
                            {passwordErrors.includes('Contains special character (!@#$%^&* etc.)') ? '✗' : '✓'} Contains special character (!@#$%^&* etc.)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    >
                      <option value="setter">Setter</option>
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {formData.role === 'setter' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Assigned Agent (Optional)</label>
                      <select
                        value={formData.agent_id}
                        onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                      >
                        <option value="">No Agent Assigned</option>
                        {users.filter(u => u.role === 'agent' || u.role === 'admin').map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left p-4 font-bold">Name</th>
                  <th className="text-left p-4 font-bold">Email</th>
                  <th className="text-left p-4 font-bold">Role</th>
                  <th className="text-left p-4 font-bold">Assigned Agent</th>
                  <th className="text-left p-4 font-bold">Created</th>
                  <th className="text-left p-4 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        user.role === 'admin' ? 'bg-red-600 text-white' :
                        user.role === 'agent' ? 'bg-blue-600 text-white' :
                        'bg-green-600 text-white'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.agent_id ? users.find(a => a.id === user.agent_id)?.name || 'Unknown' : '-'}
                    </td>
                    <td className="p-4">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        {user.id !== (session.user as any).id && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
