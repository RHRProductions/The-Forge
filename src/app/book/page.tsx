'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Agent {
  id: number;
  name: string;
  email: string;
}

interface TimeSlot {
  date: string;
  time: string;
  datetime: string;
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const leadId = searchParams?.get('lead');

  const [lead, setLead] = useState<Lead | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (leadId) {
      fetchBookingData();
    } else {
      setError('Invalid booking link. Please use the link from your email.');
      setLoading(false);
    }
  }, [leadId]);

  const fetchBookingData = async () => {
    try {
      const response = await fetch(`/api/booking/slots?lead=${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setLead(data.lead);
        setAgent(data.agent);
        setAvailableSlots(data.availableSlots);
      } else {
        setError('Unable to load booking information. Please contact us directly.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot || !leadId) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: parseInt(leadId),
          datetime: selectedSlot.datetime,
          notes: 'Booked via email link'
        })
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to book appointment. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available times...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Great! Your Medicare consultation is scheduled for:
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="font-semibold text-lg text-gray-900">{selectedSlot?.date}</p>
            <p className="text-gray-600">{selectedSlot?.time}</p>
            <p className="text-sm text-gray-500 mt-2">With {agent?.name}</p>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            A confirmation email has been sent to <strong>{lead?.email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            We'll call you at {lead?.phone} if we need to reach you before the appointment.
          </p>
        </div>
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="mailto:marcanthony@righthandretirement.com" className="text-red-600 hover:text-red-700 font-medium">
            Contact us for help
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-1" style={{ fontFamily: 'Vollkorn, serif' }}>
            Right Hand Retirement
          </h1>
          <p className="text-gray-600 text-sm">Your right hand man for all of your retirement needs.</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Hi {lead?.first_name}! 👋
            </h2>
            <p className="text-gray-600">
              Let's get your free Medicare consultation scheduled with <strong>{agent?.name}</strong>.
            </p>
          </div>

          {/* Time Slot Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Your Preferred Time
            </h3>

            {availableSlots.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800">
                  No available slots at the moment. Please contact us directly.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedSlot?.datetime === slot.datetime
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{slot.date}</div>
                    <div className="text-sm text-gray-600">{slot.time}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Book Button */}
          <button
            onClick={handleBookAppointment}
            disabled={!selectedSlot || submitting}
            className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-all ${
              !selectedSlot || submitting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? 'Booking...' : 'Confirm Appointment'}
          </button>

          {/* Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>📞 Questions? Call us at 720-447-4966</p>
            <p className="mt-1">✉️ Or email marcanthony@righthandretirement.com</p>
          </div>
        </div>

        {/* What to Expect */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What to Expect
          </h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>15-30 minute call</strong> - We'll review your Medicare options</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>No pressure</strong> - Just honest guidance and answers</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">✓</span>
              <span><strong>Completely free</strong> - No cost, no obligation</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
