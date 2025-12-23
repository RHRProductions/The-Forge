'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA State (available to all users)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpInput, setTotpInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [success, setSuccess] = useState('');

  // Team management state (for agents and admins)
  const [setters, setSetters] = useState<any[]>([]);
  const [showSetterForm, setShowSetterForm] = useState(false);
  const [setterName, setSetterName] = useState('');
  const [setterEmail, setSetterEmail] = useState('');
  const [newSetterPassword, setNewSetterPassword] = useState('');

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


  // Fetch setters (agents and admins)
  useEffect(() => {
    const userRole = (session?.user as any)?.role;
    if (userRole === 'agent' || userRole === 'admin') {
      fetchSetters();
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

  // Team Management Functions (for agents and admins)
  const fetchSetters = async () => {
    try {
      const response = await fetch('/api/users/my-setters');
      if (response.ok) {
        const data = await response.json();
        setSetters(data);
      }
    } catch (error) {
      console.error('Error fetching setters:', error);
    }
  };

  const handleAddSetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setterName.trim() || !setterEmail.trim()) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setNewSetterPassword('');

    try {
      const response = await fetch('/api/users/create-setter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setterName.trim(),
          email: setterEmail.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSetterName('');
        setSetterEmail('');
        setShowSetterForm(false);
        setNewSetterPassword(data.tempPassword);
        setSuccess(`Setter created successfully! Temporary password: ${data.tempPassword}`);
        fetchSetters();
      } else {
        setError(data.error || 'Failed to create setter');
      }
    } catch (error) {
      setError('Failed to create setter');
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const isAdmin = (session?.user as any)?.role === 'admin';

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

        {/* MY TEAM SECTION - For Agents and Admins */}
        {((session?.user as any)?.role === 'agent' || (session?.user as any)?.role === 'admin') && (
          <>
            <div className="border-t-4 border-gray-300 my-8"></div>
            <h2 className="text-3xl font-black mb-6">👥 My Team</h2>

            <div className="mb-6">
              <button
                onClick={() => setShowSetterForm(!showSetterForm)}
                className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
              >
                {showSetterForm ? 'Cancel' : '+ Add Setter / Assistant'}
              </button>
            </div>

            {showSetterForm && (
              <div className="bg-white border-2 border-red-600 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Add New Setter / Assistant</h3>
                <form onSubmit={handleAddSetter} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                      type="text"
                      value={setterName}
                      onChange={(e) => setSetterName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={setterEmail}
                      onChange={(e) => setSetterEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded focus:border-red-600 focus:outline-none"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="bg-yellow-50 border border-yellow-300 p-3 rounded">
                    <p className="text-sm text-yellow-800">
                      A temporary password will be generated automatically. You'll need to share it with the setter so they can log in and change it.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                    >
                      {loading ? 'Creating...' : 'Create Setter'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSetterForm(false)}
                      className="bg-gray-300 text-black px-6 py-3 rounded font-bold hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Display new setter password if just created */}
            {newSetterPassword && (
              <div className="bg-green-50 border-2 border-green-600 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold mb-2 text-green-800">Setter Created Successfully!</h3>
                <p className="text-sm text-green-700 mb-4">
                  Share this temporary password with your new setter. They will need to change it on first login.
                </p>
                <div className="bg-white p-4 rounded border-2 border-green-600">
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-mono font-bold">{newSetterPassword}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newSetterPassword);
                        alert('Password copied to clipboard!');
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition-colors ml-4"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setNewSetterPassword('')}
                  className="mt-4 bg-gray-300 text-black px-4 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                >
                  I've Saved It
                </button>
              </div>
            )}

            {/* List of Setters */}
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left p-4 font-bold">Name</th>
                    <th className="text-left p-4 font-bold">Email</th>
                    <th className="text-left p-4 font-bold">Role</th>
                    <th className="text-left p-4 font-bold">Created</th>
                    {isAdmin && <th className="text-left p-4 font-bold">Agent</th>}
                  </tr>
                </thead>
                <tbody>
                  {setters.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="text-center p-8 text-gray-500">
                        No setters yet. Click "Add Setter / Assistant" to create one.
                      </td>
                    </tr>
                  ) : (
                    setters.map((setter) => (
                      <tr key={setter.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-4">{setter.name}</td>
                        <td className="p-4 text-gray-600">{setter.email}</td>
                        <td className="p-4">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {setter.role}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">
                          {new Date(setter.created_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-gray-600">{setter.agent_name || 'N/A'}</td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
