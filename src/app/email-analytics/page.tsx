'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface AnalyticsData {
  overall: {
    total_campaigns: number;
    total_sent: number;
    total_delivered: number;
    total_opened: number;
    total_clicked: number;
    total_bounced: number;
    total_unsubscribed: number;
    delivery_rate: string;
    open_rate: string;
    click_rate: string;
    bounce_rate: string;
    unsubscribe_rate: string;
  };
  campaigns: Array<{
    id: number;
    name: string;
    subject_line: string;
    sent_at: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    delivery_rate: string;
    open_rate: string;
    click_rate: string;
    bounce_rate: string;
  }>;
  recentEvents: Array<{
    event_type: string;
    created_at: string;
    email_address: string;
    campaign_name: string;
  }>;
}

export default function EmailAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch analytics
  useEffect(() => {
    if (session?.user) {
      fetchAnalytics();
    }
  }, [session]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/email');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  if (!session || !analytics) {
    return null;
  }

  const { overall, campaigns, recentEvents } = analytics;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">📊 Email Analytics</h1>
            <NavigationMenu currentPage="email-analytics" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Overall Stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Overall Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{overall.total_campaigns}</div>
              <div className="text-sm text-gray-600 font-semibold">Total Campaigns</div>
            </div>

            <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{overall.total_sent.toLocaleString()}</div>
              <div className="text-sm text-gray-600 font-semibold">Emails Sent</div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{overall.open_rate}%</div>
              <div className="text-sm text-gray-600 font-semibold">Open Rate</div>
              <div className="text-xs text-gray-500 mt-1">{overall.total_opened} opens</div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-600">{overall.click_rate}%</div>
              <div className="text-sm text-gray-600 font-semibold">Click Rate</div>
              <div className="text-xs text-gray-500 mt-1">{overall.total_clicked} clicks</div>
            </div>

            <div className="bg-teal-50 border-2 border-teal-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-teal-600">{overall.delivery_rate}%</div>
              <div className="text-sm text-gray-600 font-semibold">Delivery Rate</div>
              <div className="text-xs text-gray-500 mt-1">{overall.total_delivered} delivered</div>
            </div>

            <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-600">{overall.bounce_rate}%</div>
              <div className="text-sm text-gray-600 font-semibold">Bounce Rate</div>
              <div className="text-xs text-gray-500 mt-1">{overall.total_bounced} bounced</div>
            </div>

            <div className="bg-gray-50 border-2 border-gray-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-gray-600">{overall.unsubscribe_rate}%</div>
              <div className="text-sm text-gray-600 font-semibold">Unsubscribe Rate</div>
              <div className="text-xs text-gray-500 mt-1">{overall.total_unsubscribed} unsubscribed</div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-yellow-600">
                {overall.total_clicked > 0
                  ? ((overall.total_clicked / overall.total_opened) * 100).toFixed(1)
                  : '0'}%
              </div>
              <div className="text-sm text-gray-600 font-semibold">Click-to-Open</div>
              <div className="text-xs text-gray-500 mt-1">Engagement quality</div>
            </div>
          </div>
        </div>

        {/* Campaign Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Campaign Performance</h2>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No campaigns sent yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-3 border-b-2 border-gray-200 font-bold">Campaign</th>
                    <th className="text-left p-3 border-b-2 border-gray-200 font-bold">Sent Date</th>
                    <th className="text-right p-3 border-b-2 border-gray-200 font-bold">Sent</th>
                    <th className="text-right p-3 border-b-2 border-gray-200 font-bold">Delivered</th>
                    <th className="text-right p-3 border-b-2 border-gray-200 font-bold">Opened</th>
                    <th className="text-right p-3 border-b-2 border-gray-200 font-bold">Clicked</th>
                    <th className="text-right p-3 border-b-2 border-gray-200 font-bold">Open Rate</th>
                    <th className="text-right p-3 border-b-2 border-gray-200 font-bold">Click Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="p-3 border-b border-gray-200">
                        <div className="font-semibold">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.subject_line}</div>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-sm">
                        {new Date(campaign.sent_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 border-b border-gray-200 text-right">{campaign.sent}</td>
                      <td className="p-3 border-b border-gray-200 text-right">{campaign.delivered}</td>
                      <td className="p-3 border-b border-gray-200 text-right">{campaign.opened}</td>
                      <td className="p-3 border-b border-gray-200 text-right">{campaign.clicked}</td>
                      <td className="p-3 border-b border-gray-200 text-right">
                        <span className={`px-2 py-1 rounded font-bold ${
                          parseFloat(campaign.open_rate) > 20 ? 'bg-green-100 text-green-800' :
                          parseFloat(campaign.open_rate) > 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {campaign.open_rate}%
                        </span>
                      </td>
                      <td className="p-3 border-b border-gray-200 text-right">
                        <span className={`px-2 py-1 rounded font-bold ${
                          parseFloat(campaign.click_rate) > 5 ? 'bg-green-100 text-green-800' :
                          parseFloat(campaign.click_rate) > 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {campaign.click_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Industry Benchmarks */}
        <div className="mb-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-3">📈 Industry Benchmarks (Insurance)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold text-blue-800">Open Rate</div>
              <div className="text-blue-600">15-25% is good</div>
            </div>
            <div>
              <div className="font-semibold text-blue-800">Click Rate</div>
              <div className="text-blue-600">2-5% is good</div>
            </div>
            <div>
              <div className="font-semibold text-blue-800">Bounce Rate</div>
              <div className="text-blue-600">Below 2% is good</div>
            </div>
            <div>
              <div className="font-semibold text-blue-800">Unsubscribe</div>
              <div className="text-blue-600">Below 0.5% is good</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          {recentEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No recent activity.</p>
            </div>
          ) : (
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              {recentEvents.slice(0, 20).map((event, idx) => (
                <div key={idx} className="p-4 border-b border-gray-200 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${
                      event.event_type === 'open' ? 'bg-purple-100 text-purple-800' :
                      event.event_type === 'click' ? 'bg-orange-100 text-orange-800' :
                      event.event_type === 'bounce' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.event_type}
                    </span>
                    <span className="font-semibold">{event.email_address}</span>
                    <span className="text-gray-500 text-sm ml-2">• {event.campaign_name}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
