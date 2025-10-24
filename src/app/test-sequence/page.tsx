'use client';

import { useState } from 'react';

export default function TestSequencePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const initializeSequence = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/sequences/seed', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to initialize sequence');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const enrollTestLead = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // First get a test lead
      const leadsResponse = await fetch('/api/leads?limit=1');
      const leadsData = await leadsResponse.json();

      if (!leadsData.leads || leadsData.leads.length === 0) {
        setError('No leads found. Create a test lead first.');
        setLoading(false);
        return;
      }

      const testLead = leadsData.leads[0];

      // Enroll the lead in sequence ID 1
      const enrollResponse = await fetch('/api/sequences/1/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: [testLead.id]
        })
      });

      const enrollData = await enrollResponse.json();

      if (enrollResponse.ok) {
        setResult({
          message: 'Lead enrolled!',
          lead: testLead,
          enrollment: enrollData
        });
      } else {
        setError(enrollData.error || 'Failed to enroll lead');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const processSequences = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/sequences/process', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to process sequences');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const viewBookingPage = () => {
    // Open booking page with first lead
    fetch('/api/leads?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.leads && data.leads.length > 0) {
          window.open(`/book?lead=${data.leads[0].id}`, '_blank');
        } else {
          setError('No leads found');
        }
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Email Sequence Testing</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Initialize Sequence</h2>
          <p className="text-gray-600 mb-4">
            Creates the 5-email Medicare cold email sequence with your templates.
          </p>
          <button
            onClick={initializeSequence}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Creating...' : 'Create Sequence'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Enroll Test Lead</h2>
          <p className="text-gray-600 mb-4">
            Enrolls your first lead into the sequence.
          </p>
          <button
            onClick={enrollTestLead}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            {loading ? 'Enrolling...' : 'Enroll First Lead'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 3: Process Sequences (Send Emails)</h2>
          <p className="text-gray-600 mb-4">
            Checks all enrollments and sends any due emails. Will send Email #1 immediately.
          </p>
          <button
            onClick={processSequences}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 disabled:bg-gray-300"
          >
            {loading ? 'Processing...' : 'Send Due Emails'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 4: Test Booking Page</h2>
          <p className="text-gray-600 mb-4">
            Opens the appointment booking page for your first lead.
          </p>
          <button
            onClick={viewBookingPage}
            className="bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700"
          >
            View Booking Page
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold mb-2">Success!</p>
            <pre className="text-sm bg-white p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
