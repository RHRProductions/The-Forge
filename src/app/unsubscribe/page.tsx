'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const leadId = searchParams.get('lead');

  const [loading, setLoading] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleUnsubscribe = async () => {
    if (!email) {
      setError('Invalid unsubscribe link');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, leadId }),
      });

      const data = await response.json();

      if (response.ok) {
        setUnsubscribed(true);
      } else {
        setError(data.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-red-600 rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
          <p className="text-gray-600">
            This unsubscribe link is invalid. Please use the link provided in your email.
          </p>
        </div>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-green-600 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            You've Been Unsubscribed
          </h1>
          <p className="text-gray-600 mb-4">
            <strong>{email}</strong> has been removed from our mailing list.
          </p>
          <p className="text-gray-600 text-sm">
            You will no longer receive marketing emails from Right Hand Retirement.
            If you unsubscribed by mistake, please contact us directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-gray-300 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Unsubscribe from Emails
        </h1>

        <p className="text-gray-600 mb-6 text-center">
          Are you sure you want to unsubscribe <strong>{email}</strong> from all future emails?
        </p>

        <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Please note:</strong> Unsubscribing will remove you from:
          </p>
          <ul className="text-sm text-yellow-800 mt-2 ml-4 list-disc">
            <li>Medicare seminar invitations</li>
            <li>Educational content about insurance</li>
            <li>Important policy updates and reminders</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full bg-red-600 text-white px-6 py-3 rounded font-bold hover:bg-red-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Yes, Unsubscribe Me'}
          </button>

          <button
            onClick={() => window.close()}
            className="w-full bg-gray-300 text-gray-800 px-6 py-3 rounded font-bold hover:bg-gray-400 transition-colors"
          >
            No, Keep Me Subscribed
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          If you're having trouble, please contact us at marcanthony@righthandretirement.com
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
