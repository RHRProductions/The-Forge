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

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Admin-only state
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Lead vendor management state
  const [vendors, setVendors] = useState<any[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  // 2FA State (available to all users)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpInput, setTotpInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch user's 2FA status (all users)
  useEffect(() => {
    if (session?.user) {
      fetchTwoFactorStatus();
    }
  }, [session]);

  // Fetch users (admin only)
  useEffect(() => {
    if ((session?.user as any)?.role === 'admin') {
      fetchUsers();
      fetchVendors();
    }
  }, [session]);

  const fetchTwoFactorStatus = async () => {
    try {
      const response = await fetch('/api/users/' + (session?.user as any)?.id);
      if (response.ok) {
        const user = await response.json();
        setTwoFactorEnabled(user.two_factor_enabled === 1);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

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

    try {
      const response = await fetch('/api/admin/lead-vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_name: newVendorName.trim() }),
      });

      if (response.ok) {
        setNewVendorName('');
        setShowVendorForm(false);
        fetchVendors();
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
    try {
      const response = await fetch('/api/admin/lead-vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        fetchVendors();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete vendor');
      }
    } catch (error) {
      alert('Failed to delete vendor');
    } finally {
      setLoading(false);
    }
  };

  // 2FA Functions (available to all users)
  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setBackupCodes(data.backupCodes);
        setShowSetup(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to initialize 2FA setup');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret,
          token: totpInput,
          backupCodes,
        }),
      });

      if (response.ok) {
        setSuccess('Two-factor authentication enabled successfully!');
        setTwoFactorEnabled(true);
        setShowSetup(false);
        setTotpInput('');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordInput,
        }),
      });

      if (response.ok) {
        setSuccess('Two-factor authentication disabled successfully.');
        setTwoFactorEnabled(false);
        setPasswordInput('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-forge-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setSuccess('Backup codes copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Admin-only functions
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
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
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

This action CANNOT be undone.

Type "RESET" to confirm:`;

    const userConfirmation = prompt(confirmMessage);

    if (userConfirmation !== 'RESET') {
      if (userConfirmation !== null) {
        alert('Reset cancelled. You must type "RESET" exactly to confirm.');
      }
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/reset-analytics', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Analytics reset successfully!\n\n${result.details.activitiesDeleted} activities deleted\n${result.details.policiesDeleted} policies deleted\nAll leads reset to 0 contact attempts`);
        router.push('/');
      } else {
        const error = await response.json();
        alert(`Failed to reset analytics: ${error.error}`);
      }
    } catch (error) {
      console.error('Error resetting analytics:', error);
      alert('An error occurred while resetting analytics. Please try again.');
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

  const isAdmin = (session?.user as any)?.role === 'admin';
  const agentsAndAdmins = users.filter(u => u.role === 'agent' || u.role === 'admin');

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-8 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">⚙️ Settings</h1>
            <NavigationMenu currentPage="settings" />
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

        {/* 2FA Section - Available to ALL users */}
        <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Two-Factor Authentication</h2>

          {/* 2FA Disabled State */}
          {!twoFactorEnabled && !showSetup && (
            <div>
              <p className="text-gray-700 mb-4">
                Add an extra layer of security to your account by requiring a verification code from your authenticator app when you sign in.
              </p>
              <button
                onClick={handleStartSetup}
                disabled={loading}
                className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Enable Two-Factor Authentication'}
              </button>
            </div>
          )}

          {/* 2FA Setup Flow */}
          {showSetup && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-2">Step 1: Scan QR Code</h3>
                <p className="text-gray-700 mb-4">
                  Use an authenticator app (Google Authenticator, Authy, 1Password, etc.) to scan this QR code:
                </p>
                {qrCode && (
                  <div className="bg-white p-4 rounded inline-block border-2 border-gray-300">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-2">
                  Can't scan? Enter this code manually: <code className="bg-gray-100 px-2 py-1 rounded font-mono">{secret}</code>
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2">Step 2: Save Backup Codes</h3>
                <p className="text-gray-700 mb-4">
                  These codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
                </p>
                <div className="bg-gray-100 p-4 rounded border-2 border-gray-300 mb-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="bg-white px-3 py-2 rounded border border-gray-300">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={downloadBackupCodes}
                    className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition-colors"
                  >
                    📥 Download Codes
                  </button>
                  <button
                    onClick={copyBackupCodes}
                    className="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 transition-colors"
                  >
                    📋 Copy Codes
                  </button>
                </div>
              </div>

              <form onSubmit={handleVerifySetup}>
                <h3 className="text-xl font-bold mb-2">Step 3: Verify</h3>
                <p className="text-gray-700 mb-4">
                  Enter the 6-digit code from your authenticator app to confirm setup:
                </p>
                <input
                  type="text"
                  value={totpInput}
                  onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none font-mono text-2xl text-center tracking-widest mb-4"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || totpInput.length !== 6}
                    className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSetup(false);
                      setTotpInput('');
                      setQrCode('');
                      setSecret('');
                      setBackupCodes([]);
                    }}
                    className="bg-gray-300 text-black px-6 py-3 rounded font-bold hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2FA Enabled State */}
          {twoFactorEnabled && !showSetup && (
            <div>
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                ✓ Two-factor authentication is <strong>ENABLED</strong>
              </div>
              <p className="text-gray-700 mb-4">
                Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when you sign in.
              </p>

              <form onSubmit={handleDisable2FA} className="mt-4">
                <h3 className="text-lg font-bold mb-2">Disable Two-Factor Authentication</h3>
                <p className="text-gray-700 mb-4">
                  Enter your password to disable 2FA:
                </p>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none mb-4"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Show backup codes after successful setup */}
        {twoFactorEnabled && backupCodes.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-2">⚠️ Save Your Backup Codes</h3>
            <p className="text-gray-700 mb-4">
              Make sure you've saved these backup codes in a secure location. They won't be shown again!
            </p>
            <div className="bg-white p-4 rounded border-2 border-gray-300 mb-4">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, i) => (
                  <div key={i} className="bg-gray-50 px-3 py-2 rounded border border-gray-300">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadBackupCodes}
                className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition-colors"
              >
                📥 Download Codes
              </button>
              <button
                onClick={copyBackupCodes}
                className="bg-gray-600 text-white px-4 py-2 rounded font-bold hover:bg-gray-700 transition-colors"
              >
                📋 Copy Codes
              </button>
              <button
                onClick={() => setBackupCodes([])}
                className="bg-gray-300 text-black px-4 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
              >
                I've Saved Them
              </button>
            </div>
          </div>
        )}

        {/* ADMIN-ONLY SECTION - Lead Vendor Management */}
        {isAdmin && (
          <>
            <div className="border-t-4 border-gray-300 my-8"></div>
            <h2 className="text-3xl font-black mb-6">🏷️ Lead Vendor Management (Admin Only)</h2>

            <div className="mb-6">
              <button
                onClick={() => setShowVendorForm(!showVendorForm)}
                className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
              >
                {showVendorForm ? 'Cancel' : '+ Add New Vendor'}
              </button>
            </div>

            {showVendorForm && (
              <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Add New Vendor</h3>
                <form onSubmit={handleAddVendor} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Vendor Name</label>
                    <input
                      type="text"
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      placeholder="e.g., ABC Leads"
                      className="w-full p-3 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
                      required
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-red-100 text-red-800 rounded">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                    >
                      {loading ? 'Adding...' : 'Add Vendor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVendorForm(false);
                        setNewVendorName('');
                        setError('');
                      }}
                      className="bg-gray-300 text-black px-6 py-3 rounded font-bold hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {vendors.length > 0 && (
              <div className="bg-white border-2 border-black rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b-2 border-black">
                    <tr>
                      <th className="text-left p-4 font-bold">Vendor Name</th>
                      <th className="text-right p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-4 font-semibold">{vendor.vendor_name}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteVendor(vendor.id, vendor.vendor_name)}
                            disabled={loading}
                            className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {vendors.length === 0 && !showVendorForm && (
              <div className="bg-gray-100 p-6 rounded text-center text-gray-600">
                No vendors configured. Add your first vendor to get started.
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>💡 Tip:</strong> These vendor names will appear in the CSV upload dropdown to ensure consistent vendor naming across all users.
              </p>
            </div>
          </>
        )}

        {/* ADMIN-ONLY SECTION - User Management */}
        {isAdmin && (
          <>
            <div className="border-t-4 border-gray-300 my-8"></div>
            <h2 className="text-3xl font-black mb-6">👥 User Management (Admin Only)</h2>

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
              <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
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
                          {agentsAndAdmins.map(agent => (
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
            <div className="bg-white border-2 border-red-600 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Role</th>
                    <th className="text-left p-4">Assigned Agent</th>
                    <th className="text-left p-4">Created</th>
                    <th className="text-left p-4">Actions</th>
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
                        {user.agent_id ? agentsAndAdmins.find(a => a.id === user.agent_id)?.name || 'Unknown' : '-'}
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
          </>
        )}
      </div>
    </div>
  );
}
