'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check rate limit before attempting login
      const rateLimitResponse = await fetch('/api/auth/check-rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const rateLimitData = await rateLimitResponse.json();

      if (!rateLimitResponse.ok) {
        setError(rateLimitData.message || 'Too many login attempts. Please try again later.');
        setLoading(false);
        return;
      }

      // Proceed with login
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
      } else {
        // Reset rate limit on successful login
        await fetch('/api/auth/check-rate-limit', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    // Validation
    if (!resetEmail || !resetCode || !newPassword || !confirmPassword) {
      setResetError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setResetError('Password must be at least 4 characters');
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          resetCode: resetCode,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          setShowResetModal(false);
          setResetEmail('');
          setResetCode('');
          setNewPassword('');
          setConfirmPassword('');
          setResetSuccess('');
          setEmail(resetEmail);
        }, 2000);
      } else {
        setResetError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setResetError('An error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-2xl border-4 border-red-600 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-5xl">🔥</span>
            <h1 className="text-5xl font-black text-black whitespace-nowrap">
              The Forge
            </h1>
            <span className="text-5xl">🔥</span>
          </div>
          <p className="text-gray-600">Sign in to access your leads</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-black"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-black"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="text-sm text-red-600 hover:text-red-800 underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          Don't have an account? Contact your administrator.
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border-4 border-red-600 p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-black">Reset Password</h2>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetError('');
                  setResetSuccess('');
                  setResetEmail('');
                  setResetCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Enter your email, admin reset code, and new password below.
            </p>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              {resetError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-sm">
                  {resetSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-black"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Reset Code
                </label>
                <input
                  type="password"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-black"
                  placeholder="Enter reset code"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contact your administrator for the reset code
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-black"
                  placeholder="New password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none text-black"
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                >
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError('');
                    setResetSuccess('');
                    setResetEmail('');
                    setResetCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
