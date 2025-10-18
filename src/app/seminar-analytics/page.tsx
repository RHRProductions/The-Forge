'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface SeminarAnalytics {
  overall: {
    total_seminars: number;
    total_invited: number;
    total_opened: number;
    total_clicked: number;
    total_registered: number;
    total_attended: number;
    total_appointments: number;
    total_conversions: number;
    total_revenue: number;
    total_commission: number;
    rates: {
      invite_to_open: string;
      open_to_click: string;
      click_to_register: string;
      register_to_attend: string;
      attend_to_appt: string;
      appt_to_conversion: string;
      invite_to_conversion: string;
    };
  };
  seminars: Array<{
    id: number;
    title: string;
    event_date: string;
    event_time: string;
    status: string;
    total_invited: number;
    total_opened: number;
    total_clicked: number;
    total_registered: number;
    total_attended: number;
    total_appointments: number;
    total_conversions: number;
    total_revenue: number;
    total_commission: number;
    rates: {
      invite_to_open: string;
      open_to_click: string;
      click_to_register: string;
      register_to_attend: string;
      attend_to_appt: string;
      appt_to_conversion: string;
      invite_to_conversion: string;
    };
  }>;
}

export default function SeminarAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<SeminarAnalytics | null>(null);
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
      const response = await fetch('/api/analytics/seminars');
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

  const { overall, seminars } = analytics;

  // Calculate average revenue per conversion
  const avgRevenuePerConversion = overall.total_conversions > 0
    ? (overall.total_revenue / overall.total_conversions).toFixed(2)
    : '0.00';

  const avgCommissionPerConversion = overall.total_conversions > 0
    ? (overall.total_commission / overall.total_conversions).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">🎯 Seminar Performance</h1>
            <NavigationMenu currentPage="seminar-analytics" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Overall Stats */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Overall Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{overall.total_seminars}</div>
              <div className="text-sm text-gray-600 font-semibold">Total Seminars</div>
            </div>

            <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{overall.total_conversions}</div>
              <div className="text-sm text-gray-600 font-semibold">Policies Sold</div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">
                ${overall.total_revenue.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-semibold">Total Revenue</div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-600">
                ${overall.total_commission.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-semibold">Total Commission</div>
            </div>
          </div>
        </div>

        {/* Conversion Funnel Visualization */}
        <div className="mb-8 bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Conversion Funnel</h2>

          <div className="space-y-4">
            {/* Stage 1: Invited */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">1. Invited</span>
                <span className="text-gray-600">{overall.total_invited} people</span>
              </div>
              <div className="w-full h-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                100%
              </div>
            </div>

            {/* Stage 2: Opened */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">2. Opened Email</span>
                <span className="text-gray-600">
                  {overall.total_opened} ({overall.rates.invite_to_open}%)
                </span>
              </div>
              <div
                className="h-12 bg-green-600 rounded flex items-center justify-center text-white font-bold"
                style={{ width: `${overall.rates.invite_to_open}%`, minWidth: '80px' }}
              >
                {overall.rates.invite_to_open}%
              </div>
            </div>

            {/* Stage 3: Clicked */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">3. Clicked Link</span>
                <span className="text-gray-600">
                  {overall.total_clicked} ({overall.rates.open_to_click}% of opens)
                </span>
              </div>
              <div
                className="h-12 bg-purple-600 rounded flex items-center justify-center text-white font-bold"
                style={{
                  width: `${(overall.total_clicked / overall.total_invited * 100).toFixed(1)}%`,
                  minWidth: '80px'
                }}
              >
                {(overall.total_clicked / overall.total_invited * 100).toFixed(1)}%
              </div>
            </div>

            {/* Stage 4: Registered */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">4. Registered</span>
                <span className="text-gray-600">
                  {overall.total_registered} ({overall.rates.click_to_register}% of clicks)
                </span>
              </div>
              <div
                className="h-12 bg-orange-600 rounded flex items-center justify-center text-white font-bold"
                style={{
                  width: `${(overall.total_registered / overall.total_invited * 100).toFixed(1)}%`,
                  minWidth: '80px'
                }}
              >
                {(overall.total_registered / overall.total_invited * 100).toFixed(1)}%
              </div>
            </div>

            {/* Stage 5: Attended */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">5. Attended</span>
                <span className="text-gray-600">
                  {overall.total_attended} ({overall.rates.register_to_attend}% of registered)
                </span>
              </div>
              <div
                className="h-12 bg-teal-600 rounded flex items-center justify-center text-white font-bold"
                style={{
                  width: `${(overall.total_attended / overall.total_invited * 100).toFixed(1)}%`,
                  minWidth: '80px'
                }}
              >
                {(overall.total_attended / overall.total_invited * 100).toFixed(1)}%
              </div>
            </div>

            {/* Stage 6: Booked Appointment */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">6. Booked Appointment</span>
                <span className="text-gray-600">
                  {overall.total_appointments} ({overall.rates.attend_to_appt}% of attendees)
                </span>
              </div>
              <div
                className="h-12 bg-yellow-600 rounded flex items-center justify-center text-white font-bold"
                style={{
                  width: `${(overall.total_appointments / overall.total_invited * 100).toFixed(1)}%`,
                  minWidth: '80px'
                }}
              >
                {(overall.total_appointments / overall.total_invited * 100).toFixed(1)}%
              </div>
            </div>

            {/* Stage 7: Converted */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">7. Converted (Policy Sold)</span>
                <span className="text-gray-600">
                  {overall.total_conversions} ({overall.rates.appt_to_conversion}% of appointments)
                </span>
              </div>
              <div
                className="h-12 bg-red-600 rounded flex items-center justify-center text-white font-bold"
                style={{
                  width: `${overall.rates.invite_to_conversion}%`,
                  minWidth: '80px'
                }}
              >
                {overall.rates.invite_to_conversion}%
              </div>
            </div>
          </div>

          {/* Overall Conversion Rate */}
          <div className="mt-6 p-4 bg-green-50 border-2 border-green-600 rounded-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {overall.rates.invite_to_conversion}%
              </div>
              <div className="text-sm text-gray-600 font-semibold mt-1">
                Overall Invite-to-Conversion Rate
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {overall.total_conversions} conversions from {overall.total_invited} invitations
              </div>
            </div>
          </div>
        </div>

        {/* ROI Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">ROI Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">${avgRevenuePerConversion}</div>
              <div className="text-sm text-gray-600 font-semibold">Avg Revenue/Conversion</div>
            </div>

            <div className="bg-purple-50 border-2 border-purple-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">${avgCommissionPerConversion}</div>
              <div className="text-sm text-gray-600 font-semibold">Avg Commission/Conversion</div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">
                ${overall.total_invited > 0 ? (overall.total_revenue / overall.total_invited).toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-gray-600 font-semibold">Revenue per Invite</div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-600 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-600">
                ${overall.total_attended > 0 ? (overall.total_revenue / overall.total_attended).toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-gray-600 font-semibold">Revenue per Attendee</div>
            </div>
          </div>
        </div>

        {/* Individual Seminar Performance */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Seminar Breakdown</h2>
          {seminars.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No seminars yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {seminars.map((seminar) => (
                <div
                  key={seminar.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-red-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{seminar.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(seminar.event_date).toLocaleDateString()} at {seminar.event_time}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded font-bold ${
                      seminar.total_conversions > 0 ? 'bg-green-100 text-green-800' :
                      seminar.total_attended > 0 ? 'bg-blue-100 text-blue-800' :
                      seminar.total_registered > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {seminar.total_conversions} {seminar.total_conversions === 1 ? 'Sale' : 'Sales'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-center text-sm mb-4">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="font-bold text-blue-600">{seminar.total_invited}</div>
                      <div className="text-xs text-gray-600">Invited</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-600">{seminar.total_opened}</div>
                      <div className="text-xs text-gray-600">Opened</div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <div className="font-bold text-purple-600">{seminar.total_clicked}</div>
                      <div className="text-xs text-gray-600">Clicked</div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded">
                      <div className="font-bold text-orange-600">{seminar.total_registered}</div>
                      <div className="text-xs text-gray-600">Registered</div>
                    </div>
                    <div className="p-2 bg-teal-50 rounded">
                      <div className="font-bold text-teal-600">{seminar.total_attended}</div>
                      <div className="text-xs text-gray-600">Attended</div>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                      <div className="font-bold text-yellow-600">{seminar.total_appointments}</div>
                      <div className="text-xs text-gray-600">Appts</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <div className="font-bold text-red-600">{seminar.total_conversions}</div>
                      <div className="text-xs text-gray-600">Converted</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div className="text-gray-600">
                      Conversion Rate: <span className="font-bold">{seminar.rates.invite_to_conversion}%</span>
                    </div>
                    <div className="text-gray-600">
                      Revenue: <span className="font-bold">${seminar.total_revenue.toLocaleString()}</span>
                    </div>
                    <div className="text-gray-600">
                      Commission: <span className="font-bold">${seminar.total_commission.toLocaleString()}</span>
                    </div>
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
