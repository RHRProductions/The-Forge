'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface Seminar {
  id: number;
  title: string;
  description: string;
  seminar_type: string;
  event_date: string;
  event_time: string;
  timezone: string;
  duration_minutes: number;
  platform: string;
  meeting_link: string;
  meeting_id: string;
  meeting_password: string;
  max_attendees: number;
  status: string;
  created_at: string;
  total_invited?: number;
  total_registered?: number;
  total_attended?: number;
}

export default function SeminarsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [seminars, setSeminars] = useState<Seminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [emailStats, setEmailStats] = useState<{ leadsWithEmails: number; percentage: number; totalLeads: number }>({ leadsWithEmails: 0, percentage: 0, totalLeads: 0 });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    seminar_type: 'medicare',
    event_date: '',
    event_time: '18:00',
    timezone: 'America/Denver',
    duration_minutes: 60,
    platform: 'zoom',
    meeting_link: '',
    meeting_id: '',
    meeting_password: '',
    max_attendees: 100,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch seminars
  useEffect(() => {
    if (session?.user) {
      fetchSeminars();
      fetchEmailStats();
    }
  }, [session]);

  const fetchSeminars = async () => {
    try {
      const response = await fetch('/api/seminars');
      if (response.ok) {
        const data = await response.json();
        setSeminars(data);
      }
    } catch (error) {
      console.error('Error fetching seminars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailStats = async () => {
    try {
      const response = await fetch('/api/leads/email-stats');
      if (response.ok) {
        const data = await response.json();
        setEmailStats({
          leadsWithEmails: data.leadsWithEmails,
          percentage: data.percentage,
          totalLeads: data.totalLeads
        });
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
    }
  };

  const handleCreateSeminar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/seminars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchSeminars();
        setShowCreateForm(false);
        setFormData({
          title: '',
          description: '',
          seminar_type: 'medicare',
          event_date: '',
          event_time: '18:00',
          timezone: 'America/Denver',
          duration_minutes: 60,
          platform: 'zoom',
          meeting_link: '',
          meeting_id: '',
          meeting_password: '',
          max_attendees: 100,
        });
        alert('Seminar created successfully!');
      } else {
        alert('Failed to create seminar');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestInvitation = async (seminarId: number, seminarTitle: string) => {
    if (!session?.user?.email) {
      alert('No email address found for your account');
      return;
    }

    const confirmed = confirm(
      `Send test invitation to ${session.user.email}?\n\nThis will send a preview of the "${seminarTitle}" invitation to your email address.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/seminars/${seminarId}/send-test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Test invitation sent successfully to ${session.user.email}!\n\nCheck your inbox.`);
      } else {
        alert(`Failed to send test invitation: ${data.error}`);
      }
    } catch (error) {
      alert('An error occurred while sending test invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitations = async (seminarId: number, seminarTitle: string) => {
    const confirmed = confirm(
      `Send invitations for "${seminarTitle}" to all Medicare leads?\n\nThis will create and send an email campaign.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/seminars/${seminarId}/send-invitations`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Invitations sent successfully!\n\n` +
          `Total Recipients: ${data.totalRecipients}\n` +
          `Successful: ${data.successCount}\n` +
          `Failed: ${data.failureCount}`
        );
        await fetchSeminars();
      } else {
        alert(`Failed to send invitations: ${data.error}`);
      }
    } catch (error) {
      alert('An error occurred while sending invitations');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">🎥 Medicare Seminars</h1>
            <NavigationMenu currentPage="seminars" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Action Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Your Livestream Events</h2>
            <p className="text-gray-600 mt-1">
              Create and manage Medicare seminar livestreams
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
          >
            + Create Seminar
          </button>
        </div>

        {/* Email Stats Info Box */}
        <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📧</span>
              <div>
                <h3 className="font-bold text-blue-800">Seminar Invitation Reach</h3>
                <p className="text-blue-700 mt-1">
                  <span className="font-bold text-xl">{emailStats.leadsWithEmails}</span> leads with valid email addresses
                  <span className="text-sm ml-2">({emailStats.percentage}% of {emailStats.totalLeads} total leads)</span>
                </p>
                <p className="text-blue-600 text-sm mt-1">
                  Invitations are sent to Medicare and T65 leads with email addresses
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Seminar Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-red-600 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Create Medicare Seminar</h2>

              <form onSubmit={handleCreateSeminar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Seminar Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Medicare 101: Understanding Your Options"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Brief description of what will be covered..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Event Date *</label>
                    <input
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Event Time *</label>
                    <input
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      min="15"
                      max="240"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Max Attendees</label>
                    <input
                      type="number"
                      value={formData.max_attendees}
                      onChange={(e) => setFormData({ ...formData, max_attendees: parseInt(e.target.value) })}
                      min="1"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Zoom Meeting Link *</label>
                  <input
                    type="url"
                    value={formData.meeting_link}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                    required
                    placeholder="https://zoom.us/j/..."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Meeting ID (Optional)</label>
                    <input
                      type="text"
                      value={formData.meeting_id}
                      onChange={(e) => setFormData({ ...formData, meeting_id: e.target.value })}
                      placeholder="123 456 7890"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Meeting Password (Optional)</label>
                    <input
                      type="text"
                      value={formData.meeting_password}
                      onChange={(e) => setFormData({ ...formData, meeting_password: e.target.value })}
                      placeholder="Password"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Creating...' : 'Create Seminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({
                        title: '',
                        description: '',
                        seminar_type: 'medicare',
                        event_date: '',
                        event_time: '18:00',
                        timezone: 'America/Denver',
                        duration_minutes: 60,
                        platform: 'zoom',
                        meeting_link: '',
                        meeting_id: '',
                        meeting_password: '',
                        max_attendees: 100,
                      });
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

        {/* Seminars List */}
        {seminars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No seminars yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {seminars.map((seminar) => (
              <div
                key={seminar.id}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-red-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{seminar.title}</h3>
                    <p className="text-gray-600 mt-1">{seminar.description}</p>
                    <div className="flex gap-4 mt-3 text-sm flex-wrap">
                      <span className="px-3 py-1 rounded font-bold bg-blue-100 text-blue-800">
                        📅 {formatDate(seminar.event_date)}
                      </span>
                      <span className="px-3 py-1 rounded font-bold bg-green-100 text-green-800">
                        🕐 {formatTime(seminar.event_time)} {seminar.timezone.split('/')[1]}
                      </span>
                      <span className="px-3 py-1 rounded font-bold bg-purple-100 text-purple-800">
                        ⏱️ {seminar.duration_minutes} min
                      </span>
                      {seminar.total_invited !== undefined && seminar.total_invited > 0 && (
                        <>
                          <span className="text-gray-600">
                            📧 {seminar.total_invited} invited
                          </span>
                          {seminar.total_registered !== undefined && seminar.total_registered > 0 && (
                            <span className="text-gray-600">
                              ✅ {seminar.total_registered} registered
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {seminar.meeting_link && (
                      <div className="mt-3">
                        <a
                          href={seminar.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          🔗 {seminar.meeting_link}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleSendTestInvitation(seminar.id, seminar.title)}
                      disabled={loading}
                      className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      🧪 Send Test to Me
                    </button>
                    <button
                      onClick={() => handleSendInvitations(seminar.id, seminar.title)}
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap"
                    >
                      📧 Send to All Leads
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
