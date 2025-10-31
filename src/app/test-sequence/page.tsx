'use client';

import { useState } from 'react';

export default function TestSequencePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [sendingStep, setSendingStep] = useState<number | null>(null);

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
      const leadsResponse = await fetch('/api/leads?search=test&limit=10');
      const leadsData = await leadsResponse.json();

      if (!leadsData.leads || leadsData.leads.length === 0) {
        setError('No test lead found. Create a lead with "test" in the name first.');
        setLoading(false);
        return;
      }

      const testLead = leadsData.leads.find((lead: any) => lead.email && lead.email.includes('@'));

      if (!testLead) {
        setError('Test lead found but has no email address. Please add an email.');
        setLoading(false);
        return;
      }

      // Get the Medicare sequence (should be the first/only one)
      const sequencesResponse = await fetch('/api/sequences');
      const sequencesData = await sequencesResponse.json();

      if (!sequencesData.sequences || sequencesData.sequences.length === 0) {
        setError('No sequence found. Please create the sequence first (Step 1).');
        setLoading(false);
        return;
      }

      const medicareSequence = sequencesData.sequences.find((s: any) =>
        s.name === 'Medicare Cold Email Sequence'
      ) || sequencesData.sequences[0];

      const enrollResponse = await fetch(`/api/sequences/${medicareSequence.id}/enroll`, {
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

  const sendTestEmail = async (stepNumber: number) => {
    setSendingStep(stepNumber);
    setError('');
    setResult(null);

    try {
      // Get the test lead
      const leadsResponse = await fetch('/api/leads?search=test&limit=10');
      const leadsData = await leadsResponse.json();
      const testLead = leadsData.leads?.find((lead: any) => lead.email && lead.email.includes('@'));

      if (!testLead) {
        setError('No test lead found. Please create a lead first.');
        setSendingStep(null);
        return;
      }

      // Get the enrollment
      const enrollmentsResponse = await fetch(`/api/sequences/enrollments?lead_id=${testLead.id}`);
      const enrollmentsData = await enrollmentsResponse.json();

      if (!enrollmentsData.enrollments || enrollmentsData.enrollments.length === 0) {
        setError('No enrollment found. Please enroll a test lead first.');
        setSendingStep(null);
        return;
      }

      const enrollment = enrollmentsData.enrollments[0];

      // Send the specific step
      const response = await fetch('/api/sequences/send-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: enrollment.id,
          stepOrder: stepNumber
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to send email');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSendingStep(null);
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
          <h2 className="text-xl font-semibold mb-4">Step 3: Send Individual Test Emails</h2>
          <p className="text-gray-600 mb-4">
            Click to send each email individually to your test lead.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5].map((stepNum) => (
              <button
                key={stepNum}
                onClick={() => sendTestEmail(stepNum)}
                disabled={sendingStep === stepNum}
                className="bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700 disabled:bg-gray-300"
              >
                {sendingStep === stepNum ? 'Sending...' : `Send Email #${stepNum}`}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 4: Process Sequences (Send Next Due Email)</h2>
          <p className="text-gray-600 mb-4">
            Checks all enrollments and sends any due emails. Sends one email at a time.
          </p>
          <button
            onClick={processSequences}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 disabled:bg-gray-300"
          >
            {loading ? 'Processing...' : 'Send Next Due Email'}
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
