'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface EmailCampaign {
  id: number;
  name: string;
  subject_line: string;
  body_html: string;
  from_name: string;
  from_email: string;
  status: string;
  created_at: string;
  sent_at?: string;
  total_sent?: number;
  total_opened?: number;
  total_clicked?: number;
}

export default function EmailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<EmailCampaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject_line: '',
    body_html: '',
    from_name: 'Right Hand Retirement',
    from_email: 'marcanthony@righthandretirement.com',
    reply_to_email: 'marcanthony@righthandretirement.com',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch campaigns
  useEffect(() => {
    if (session?.user) {
      fetchCampaigns();
    }
  }, [session]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/emails/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/emails/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCampaigns();
        setShowCreateForm(false);
        setFormData({
          name: '',
          subject_line: '',
          body_html: '',
          from_name: 'Right Hand Retirement',
          from_email: 'marcanthony@righthandretirement.com',
          reply_to_email: 'marcanthony@righthandretirement.com',
        });
      } else {
        alert('Failed to create campaign');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (campaignId: number, campaignName: string) => {
    if (!session?.user?.email) {
      alert('No email address found for your account');
      return;
    }

    const confirmed = confirm(
      `Send test email to ${session.user.email}?\n\nThis will send a preview of "${campaignName}" to your email address.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/emails/campaigns/${campaignId}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Test email sent successfully to ${session.user.email}!`);
      } else {
        alert(`Failed to send test email: ${data.error}`);
      }
    } catch (error) {
      alert('An error occurred while sending test email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaignId: number, campaignName: string) => {
    const confirmed = confirm(
      `Are you sure you want to send "${campaignName}" to all leads?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/emails/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `Campaign sent successfully!\n\n` +
          `Total Recipients: ${data.totalRecipients}\n` +
          `Successful: ${data.successCount}\n` +
          `Failed: ${data.failureCount}`
        );
        await fetchCampaigns();
      } else {
        alert(`Failed to send campaign: ${data.error}`);
      }
    } catch (error) {
      alert('An error occurred while sending campaign');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-4xl font-black">📧 Email Campaigns</h1>
            <NavigationMenu currentPage="emails" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Action Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Your Email Campaigns</h2>
            <p className="text-gray-600 mt-1">
              Create and manage email campaigns to engage your leads
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-black text-white px-6 py-3 rounded font-bold hover:bg-gray-800 transition-colors"
          >
            + Create Campaign
          </button>
        </div>

        {/* SendGrid Setup Warning */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-yellow-800">SendGrid Setup Required</h3>
              <p className="text-yellow-700 mt-1">
                To send emails, you need to complete SendGrid setup and add your API key to the environment variables.
                Once DNS propagation is complete, add <code className="bg-yellow-100 px-2 py-1 rounded">SENDGRID_API_KEY</code> to your <code className="bg-yellow-100 px-2 py-1 rounded">.env.local</code> file.
              </p>
            </div>
          </div>
        </div>

        {/* Create Campaign Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-red-600 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Create Email Campaign</h2>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., September Medicare Seminar Invite"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Subject Line</label>
                  <input
                    type="text"
                    value={formData.subject_line}
                    onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                    required
                    placeholder="e.g., Join Our Free Medicare Seminar This Thursday"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email Body (HTML)</label>
                  <textarea
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    required
                    rows={12}
                    placeholder="Write your email content here. You can use HTML for formatting."
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Use HTML for formatting. Unsubscribe link will be automatically added.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">From Name</label>
                    <input
                      type="text"
                      value={formData.from_name}
                      onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">From Email</label>
                    <input
                      type="email"
                      value={formData.from_email}
                      onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reply-To Email</label>
                  <input
                    type="email"
                    value={formData.reply_to_email}
                    onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({
                        name: '',
                        subject_line: '',
                        body_html: '',
                        from_name: 'Right Hand Retirement',
                        from_email: 'marc@righthandretirement.com',
                        reply_to_email: 'marc@righthandretirement.com',
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

        {/* Preview Modal */}
        {previewCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-blue-600 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Email Preview</h2>
                  <p className="text-gray-600 mt-1">Campaign: {previewCampaign.name}</p>
                  <p className="text-sm text-gray-500 mt-1">Subject: {previewCampaign.subject_line}</p>
                  <p className="text-sm text-gray-500">From: {previewCampaign.from_name} &lt;{previewCampaign.from_email}&gt;</p>
                </div>
                <button
                  onClick={() => setPreviewCampaign(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded font-bold"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 border-2 border-gray-300 rounded overflow-auto bg-white">
                <iframe
                  srcDoc={previewCampaign.body_html}
                  className="w-full h-full min-h-[500px]"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    handleSendTestEmail(previewCampaign.id, previewCampaign.name);
                    setPreviewCampaign(null);
                  }}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700 disabled:bg-gray-400"
                >
                  Send Test to Me
                </button>
                <button
                  onClick={() => setPreviewCampaign(null)}
                  className="flex-1 bg-gray-300 text-black px-6 py-2 rounded font-bold hover:bg-gray-400"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No campaigns yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-red-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{campaign.name}</h3>
                    <p className="text-gray-600 mt-1">Subject: {campaign.subject_line}</p>
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className={`px-3 py-1 rounded font-bold ${
                        campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {campaign.status.toUpperCase()}
                      </span>
                      {campaign.total_sent && (
                        <span className="text-gray-600">
                          Sent to {campaign.total_sent} recipients
                        </span>
                      )}
                      {campaign.total_opened && (
                        <span className="text-gray-600">
                          {campaign.total_opened} opens ({Math.round((campaign.total_opened / (campaign.total_sent || 1)) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewCampaign(campaign)}
                      className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleSendTestEmail(campaign.id, campaign.name)}
                      disabled={loading}
                      className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      Send Test
                    </button>
                    {campaign.status === 'draft' && (
                      <button
                        onClick={() => handleSendCampaign(campaign.id, campaign.name)}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 disabled:bg-gray-400"
                      >
                        Send to All
                      </button>
                    )}
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
