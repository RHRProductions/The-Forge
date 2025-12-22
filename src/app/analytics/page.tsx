'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface AnalyticsData {
  personal: {
    totalDials: number;
    totalContacts: number;
    totalAppointments: number;
    appointmentsSeen: number;
    totalSales: number;
    salesFromSeenAppointments: number;
    totalRevenue: number;
    contactRate: number;
    appointmentRate: number;
    saleRate: number;
    avgDialsPerContact: number;
    avgContactsPerAppointment: number;
    avgDialsPerSale: number;
    showRate: number;
    firstVisitCloseRate: number;
  };
  team?: {
    userId: number;
    userName: string;
    totalDials: number;
    totalContacts: number;
    totalAppointments: number;
    totalSales: number;
    totalRevenue: number;
  }[];
  timeSeriesData: {
    date: string;
    dials: number;
    contacts: number;
    appointments: number;
    sales: number;
  }[];
  aggregateInsights?: {
    timeOfDay: { hour: number; dials: number; contacts: number; appointments: number }[];
    sourcePerformance: { source: string; totalLeads: number; totalDials: number; totalTexts: number; totalEmails: number; contacted: number; appointments: number; disconnected: number; sales: number; avgCost: number; totalRevenue: number; wrongInfo: number }[];
    geoPerformance: { city: string; zip_code: string; state: string; totalLeads: number; contacted: number; appointments: number; sales: number }[];
    dialingPatterns: { attempts: number; leads: number; contacted: number; appointments: number }[];
    dayOfWeek: { dayOfWeek: number; dials: number; contacts: number; appointments: number }[];
    temperaturePerformance: { lead_temperature: string; totalLeads: number; appointments: number; sales: number }[];
  };
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [showSourcePerformance, setShowSourcePerformance] = useState(false);
  const [showTemperature, setShowTemperature] = useState(false);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [showDailyActivity, setShowDailyActivity] = useState(false);
  const [emailStats, setEmailStats] = useState<{ leadsWithEmails: number; leadsWithoutEmails: number; percentage: number; totalLeads: number }>({ leadsWithEmails: 0, leadsWithoutEmails: 0, percentage: 0, totalLeads: 0 });
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAnalytics();
      fetchEmailStats();
    }
  }, [session, timeFilter]);

  // Load collapsible section states from localStorage on mount
  useEffect(() => {
    // Check if we need to reset old values (one-time migration)
    const hasResetSections = localStorage.getItem('analytics_sections_reset_v4');
    if (!hasResetSections) {
      // Clear ALL section values and old reset flags
      localStorage.removeItem('analytics_showLocations');
      localStorage.removeItem('analytics_showPowerHours');
      localStorage.removeItem('analytics_showAgeGroups');
      localStorage.removeItem('analytics_showSourcePerformance');
      localStorage.removeItem('analytics_showBestTimes');
      localStorage.removeItem('analytics_showBestDays');
      localStorage.removeItem('analytics_showDialingAttempts');
      localStorage.removeItem('analytics_showTemperature');
      localStorage.removeItem('analytics_showOutcomes');
      localStorage.removeItem('analytics_showDailyActivity');
      localStorage.removeItem('analytics_sections_reset_v1');
      localStorage.removeItem('analytics_sections_reset_v2');
      localStorage.removeItem('analytics_sections_reset_v3');
      localStorage.setItem('analytics_sections_reset_v4', 'true');
      // All sections will remain at their default state (false/collapsed)
      return;
    }

    // Load saved states from localStorage
    const loadShowSourcePerformance = localStorage.getItem('analytics_showSourcePerformance');
    if (loadShowSourcePerformance !== null) {
      setShowSourcePerformance(JSON.parse(loadShowSourcePerformance));
    }

    const loadShowTemperature = localStorage.getItem('analytics_showTemperature');
    if (loadShowTemperature !== null) {
      setShowTemperature(JSON.parse(loadShowTemperature));
    }

    const loadShowOutcomes = localStorage.getItem('analytics_showOutcomes');
    if (loadShowOutcomes !== null) {
      setShowOutcomes(JSON.parse(loadShowOutcomes));
    }

    const loadShowDailyActivity = localStorage.getItem('analytics_showDailyActivity');
    if (loadShowDailyActivity !== null) {
      setShowDailyActivity(JSON.parse(loadShowDailyActivity));
    }

    // Mark that we've finished loading from storage
    setHasLoadedFromStorage(true);
  }, []);

  // Persist collapsible section states to localStorage (only after initial load)
  useEffect(() => {
    if (hasLoadedFromStorage) {
      localStorage.setItem('analytics_showSourcePerformance', JSON.stringify(showSourcePerformance));
    }
  }, [showSourcePerformance, hasLoadedFromStorage]);

  useEffect(() => {
    if (hasLoadedFromStorage) {
      localStorage.setItem('analytics_showTemperature', JSON.stringify(showTemperature));
    }
  }, [showTemperature, hasLoadedFromStorage]);

  useEffect(() => {
    if (hasLoadedFromStorage) {
      localStorage.setItem('analytics_showOutcomes', JSON.stringify(showOutcomes));
    }
  }, [showOutcomes, hasLoadedFromStorage]);

  useEffect(() => {
    if (hasLoadedFromStorage) {
      localStorage.setItem('analytics_showDailyActivity', JSON.stringify(showDailyActivity));
    }
  }, [showDailyActivity, hasLoadedFromStorage]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics?period=${timeFilter}`);
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

  const fetchEmailStats = async () => {
    try {
      const response = await fetch('/api/leads/email-stats');
      if (response.ok) {
        const data = await response.json();
        setEmailStats({
          leadsWithEmails: data.leadsWithEmails,
          leadsWithoutEmails: data.leadsWithoutEmails,
          percentage: data.percentage,
          totalLeads: data.totalLeads
        });
      }
    } catch (error) {
      console.error('Error fetching email stats:', error);
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

  const userRole = (session.user as any).role;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">📊 Analytics</h1>
            <NavigationMenu currentPage="analytics" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Time Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-4 py-2 rounded font-bold ${
              timeFilter === 'today' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-4 py-2 rounded font-bold ${
              timeFilter === 'week' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-4 py-2 rounded font-bold ${
              timeFilter === 'month' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-4 py-2 rounded font-bold ${
              timeFilter === 'all' ? 'bg-black text-white' : 'bg-gray-200'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Personal Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Performance</h2>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500 text-white p-6 rounded-lg border-4 border-blue-700">
              <div className="text-sm font-bold uppercase opacity-90">Total Dials</div>
              <div className="text-4xl font-black mt-2">{analytics.personal.totalDials}</div>
            </div>
            <div className="bg-green-500 text-white p-6 rounded-lg border-4 border-green-700">
              <div className="text-sm font-bold uppercase opacity-90">Contacts Made</div>
              <div className="text-4xl font-black mt-2">{analytics.personal.totalContacts}</div>
              <div className="text-sm mt-2">
                {analytics.personal.contactRate.toFixed(1)}% contact rate
              </div>
            </div>
            <div className="bg-purple-500 text-white p-6 rounded-lg border-4 border-purple-700">
              <div className="text-sm font-bold uppercase opacity-90">Appointments Set</div>
              <div className="text-4xl font-black mt-2">{analytics.personal.totalAppointments}</div>
              <div className="text-sm mt-2">
                {analytics.personal.appointmentRate.toFixed(1)}% set rate
              </div>
            </div>
            <div className="bg-red-500 text-white p-6 rounded-lg border-4 border-red-700">
              <div className="text-sm font-bold uppercase opacity-90">Sales Closed</div>
              <div className="text-4xl font-black mt-2">{analytics.personal.totalSales}</div>
              <div className="text-sm mt-2">
                {analytics.personal.saleRate.toFixed(1)}% close rate
              </div>
            </div>
          </div>

          {/* Efficiency Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
              <div className="text-sm font-bold text-gray-600 uppercase">Avg Dials per Contact</div>
              <div className="text-3xl font-black mt-2">
                {analytics.personal.avgDialsPerContact.toFixed(1)}
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
              <div className="text-sm font-bold text-gray-600 uppercase">Avg Contacts per Appt</div>
              <div className="text-3xl font-black mt-2">
                {analytics.personal.avgContactsPerAppointment.toFixed(1)}
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
              <div className="text-sm font-bold text-gray-600 uppercase">Appointments Shown</div>
              <div className="text-3xl font-black mt-2">
                {analytics.personal.appointmentsSeen}
              </div>
              <div className="text-sm mt-2 text-gray-600">
                {analytics.personal.showRate.toFixed(1)}% show rate
              </div>
            </div>
            <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
              <div className="text-sm font-bold text-gray-600 uppercase">First Visit Close Rate</div>
              <div className="text-3xl font-black mt-2 text-green-600">
                {analytics.personal.firstVisitCloseRate.toFixed(1)}%
              </div>
              <div className="text-sm mt-2 text-gray-600">
                {analytics.personal.salesFromSeenAppointments} of {analytics.personal.appointmentsSeen} shown
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Conversion Funnel</h2>
          <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
            <div className="space-y-4">
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Total Dials</span>
                  <span className="text-2xl font-black">{analytics.personal.totalDials}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div className="bg-blue-500 h-8 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Contacts</span>
                  <span className="text-2xl font-black">
                    {analytics.personal.totalContacts} ({analytics.personal.contactRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-green-500 h-8 rounded-full"
                    style={{ width: `${analytics.personal.contactRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Appointments Set</span>
                  <span className="text-2xl font-black">
                    {analytics.personal.totalAppointments} ({analytics.personal.appointmentRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-purple-500 h-8 rounded-full"
                    style={{ width: `${analytics.personal.appointmentRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Appointments Shown</span>
                  <span className="text-2xl font-black">
                    {analytics.personal.appointmentsSeen} ({analytics.personal.showRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-orange-500 h-8 rounded-full"
                    style={{ width: `${analytics.personal.showRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Sales</span>
                  <span className="text-2xl font-black">
                    {analytics.personal.totalSales} ({analytics.personal.saleRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-red-500 h-8 rounded-full"
                    style={{ width: `${analytics.personal.saleRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance (for agents and admins - to see their setters) */}
        {(userRole === 'agent' || userRole === 'admin') && analytics.team && analytics.team.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Team Performance</h2>
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="p-3 text-left">Team Member</th>
                    <th className="p-3 text-center">Dials</th>
                    <th className="p-3 text-center">Contacts</th>
                    <th className="p-3 text-center">Appointments</th>
                    <th className="p-3 text-center">Sales</th>
                    <th className="p-3 text-center">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.team.map((member, index) => (
                    <tr key={member.userId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-3 font-bold">{member.userName}</td>
                      <td className="p-3 text-center">{member.totalDials}</td>
                      <td className="p-3 text-center">{member.totalContacts}</td>
                      <td className="p-3 text-center">{member.totalAppointments}</td>
                      <td className="p-3 text-center">{member.totalSales}</td>
                      <td className="p-3 text-center font-bold text-green-600">
                        ${member.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Platform Insights (Admin Only) */}
        {userRole === 'admin' && analytics.aggregateInsights && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-6 text-red-600">📈 Platform Insights</h2>
            </div>

            {/* Lead Source Performance */}
            {analytics.aggregateInsights.sourcePerformance.length > 0 && (
              <div className="mb-8">
                <div
                  onClick={() => setShowSourcePerformance(!showSourcePerformance)}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
                >
                  <h3 className="text-2xl font-bold">Lead Source Performance</h3>
                  <span className="text-2xl font-bold">
                    {showSourcePerformance ? '▼' : '▶'}
                  </span>
                </div>
                {showSourcePerformance && (
                  <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-black text-white">
                        <tr>
                          <th className="p-3 text-left">Source</th>
                          <th className="p-3 text-center">Total Leads</th>
                          <th className="p-3 text-center">Calls</th>
                          <th className="p-3 text-center">Texts</th>
                          <th className="p-3 text-center">Emails</th>
                          <th className="p-3 text-center">Contacted</th>
                          <th className="p-3 text-center">Appointments</th>
                          <th className="p-3 text-center">Disconnected</th>
                          <th className="p-3 text-center">Wrong Info</th>
                          <th className="p-3 text-center">Sales</th>
                          <th className="p-3 text-center">Avg Cost</th>
                          <th className="p-3 text-center">Revenue</th>
                          <th className="p-3 text-center">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.aggregateInsights.sourcePerformance.map((source, index) => {
                          const totalCost = source.totalLeads * (source.avgCost || 0);
                          const roi = totalCost > 0 ? ((source.totalRevenue - totalCost) / totalCost) * 100 : 0;
                          const totalContactAttempts = (source.totalDials || 0) + (source.totalTexts || 0) + (source.totalEmails || 0);
                          const contactRate = totalContactAttempts > 0 ? ((source.contacted / totalContactAttempts) * 100) : 0;
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="p-3 font-bold">{source.source}</td>
                              <td className="p-3 text-center">{source.totalLeads}</td>
                              <td className="p-3 text-center">{source.totalDials || 0}</td>
                              <td className="p-3 text-center">{source.totalTexts || 0}</td>
                              <td className="p-3 text-center">{source.totalEmails || 0}</td>
                              <td className="p-3 text-center">
                                {source.contacted} ({contactRate.toFixed(1)}%)
                              </td>
                              <td className="p-3 text-center">
                                {source.appointments} ({source.totalLeads > 0 ? ((source.appointments / source.totalLeads) * 100).toFixed(1) : 0}%)
                              </td>
                              <td className="p-3 text-center text-red-600">
                                {source.disconnected} ({source.totalLeads > 0 ? ((source.disconnected / source.totalLeads) * 100).toFixed(1) : 0}%)
                              </td>
                              <td className="p-3 text-center text-yellow-600">
                                {source.wrongInfo || 0} ({source.totalLeads > 0 ? (((source.wrongInfo || 0) / source.totalLeads) * 100).toFixed(1) : 0}%)
                              </td>
                              <td className="p-3 text-center">
                                {source.sales} ({source.totalLeads > 0 ? ((source.sales / source.totalLeads) * 100).toFixed(1) : 0}%)
                              </td>
                              <td className="p-3 text-center">${(source.avgCost || 0).toFixed(2)}</td>
                              <td className="p-3 text-center font-bold text-green-600">${source.totalRevenue.toLocaleString()}</td>
                              <td className={`p-3 text-center font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {roi.toFixed(0)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Lead Temperature Performance */}
            <div className="mb-8">
              <div
                onClick={() => setShowTemperature(!showTemperature)}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
                >
                  <h3 className="text-2xl font-bold">Lead Temperature Conversion</h3>
                  <span className="text-2xl font-bold">
                    {showTemperature ? '▼' : '▶'}
                  </span>
                </div>
                {showTemperature && analytics.aggregateInsights.temperaturePerformance.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics.aggregateInsights.temperaturePerformance.map((temp, index) => {
                    const apptRate = temp.totalLeads > 0 ? (temp.appointments / temp.totalLeads) * 100 : 0;
                    const closeRate = temp.totalLeads > 0 ? (temp.sales / temp.totalLeads) * 100 : 0;
                    const bgColor = temp.lead_temperature === 'hot' ? 'bg-red-500' : temp.lead_temperature === 'warm' ? 'bg-orange-500' : 'bg-blue-500';

                    return (
                      <div key={index} className={`${bgColor} text-white p-6 rounded-lg border-4 ${bgColor.replace('bg-', 'border-')}`}>
                        <div className="text-sm font-bold uppercase opacity-90">{temp.lead_temperature || 'Unset'} Leads</div>
                        <div className="text-4xl font-black mt-2">{temp.totalLeads}</div>
                        <div className="mt-4 space-y-2">
                          <div>
                            <div className="text-sm opacity-90">Appointment Rate</div>
                            <div className="text-2xl font-bold">{apptRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-sm opacity-90">Close Rate</div>
                            <div className="text-2xl font-bold">{closeRate.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
            </div>

            {/* Outcome Analysis */}
            <div className="mb-8">
              <div
                onClick={() => setShowOutcomes(!showOutcomes)}
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
              >
                <h3 className="text-2xl font-bold">📊 Call Outcome Breakdown</h3>
                <span className="text-2xl font-bold">
                  {showOutcomes ? '▼' : '▶'}
                </span>
              </div>
              {showOutcomes && analytics.aggregateInsights.outcomeAnalysis && analytics.aggregateInsights.outcomeAnalysis.length > 0 && (
                  <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {analytics.aggregateInsights.outcomeAnalysis.map((outcome:any, index:number) => {
                      const total = analytics.aggregateInsights!.outcomeAnalysis.reduce((sum:number, o:any) => sum + o.count, 0);
                      const percentage = total > 0 ? (outcome.count / total) * 100 : 0;

                      const colors:{[key:string]: {bg: string, text: string, icon: string}} = {
                        'Answered - Appointment Set': { bg: 'bg-green-500', text: 'text-green-700', icon: '✅' },
                        'Answered - No Appointment': { bg: 'bg-orange-500', text: 'text-orange-700', icon: '📞' },
                        'No Answer': { bg: 'bg-gray-500', text: 'text-gray-700', icon: '❌' },
                        'Disconnected': { bg: 'bg-red-500', text: 'text-red-700', icon: '🚫' },
                      };

                      const color = colors[outcome.outcomeCategory] || { bg: 'bg-blue-500', text: 'text-blue-700', icon: '📋' };

                      return (
                        <div key={index} className={`${color.bg} text-white p-6 rounded-lg border-4 ${color.bg.replace('bg-', 'border-')}`}>
                          <div className="text-3xl mb-2">{color.icon}</div>
                          <div className="text-sm font-bold uppercase opacity-90">{outcome.outcomeCategory}</div>
                          <div className="text-4xl font-black mt-2">{outcome.count}</div>
                          <div className="mt-2 text-sm opacity-90">
                            {percentage.toFixed(1)}% of all calls
                          </div>
                          <div className="mt-1 text-xs opacity-75">
                            {outcome.uniqueLeads} unique leads
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4">
                    <p className="text-sm text-yellow-900">
                      <strong>Insight:</strong> Track the "Answered - No Appointment" category to identify opportunities for improving your booking skills and script!
                    </p>
                  </div>
                  </div>
                )}
            </div>
          </>
        )}

        {/* Daily Activity Chart */}
        <div className="mb-8">
          <div
            onClick={() => setShowDailyActivity(!showDailyActivity)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
          >
            <h2 className="text-2xl font-bold">Daily Activity</h2>
            <span className="text-2xl font-bold">
              {showDailyActivity ? '▼' : '▶'}
            </span>
          </div>
          {showDailyActivity && (
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
            {(() => {
              const hasAnyData = analytics.timeSeriesData.some(d => d.dials > 0 || d.contacts > 0 || d.appointments > 0 || d.sales > 0);

              if (!hasAnyData) {
                return (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-lg font-semibold mb-2">No activity data yet</p>
                    <p className="text-sm">Start logging calls, contacts, appointments, and sales to see your daily activity chart!</p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <div className="flex gap-3 min-w-max pb-4">
                    {analytics.timeSeriesData.map((day, index) => {
                      // Calculate max for scaling (use overall max across all metrics)
                      const maxValue = Math.max(
                        ...analytics.timeSeriesData.flatMap(d => [d.dials, d.contacts, d.appointments, d.sales]),
                        1
                      );

                      const hasData = day.dials > 0 || day.contacts > 0 || day.appointments > 0 || day.sales > 0;

                      // Skip days with no data to save space
                      if (!hasData) return null;

                      return (
                        <div key={index} className="flex flex-col items-center min-w-[100px]">
                          <div className="text-xs text-center mb-2 font-bold text-gray-700">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>

                          {/* Grouped bars with fixed height container */}
                          <div className="flex gap-1 items-end w-full px-2" style={{ height: '200px' }}>
                            {/* Dials bar */}
                            <div className="flex-1 flex flex-col justify-end items-center group relative h-full">
                              {day.dials > 0 && (
                                <div
                                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                                  style={{
                                    height: `${Math.max((day.dials / maxValue) * 100, 8)}%`,
                                    minHeight: '8px'
                                  }}
                                >
                                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    Dials: {day.dials}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Contacts bar */}
                            <div className="flex-1 flex flex-col justify-end items-center group relative h-full">
                              {day.contacts > 0 && (
                                <div
                                  className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                                  style={{
                                    height: `${Math.max((day.contacts / maxValue) * 100, 8)}%`,
                                    minHeight: '8px'
                                  }}
                                >
                                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    Contacts: {day.contacts}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Appointments bar */}
                            <div className="flex-1 flex flex-col justify-end items-center group relative h-full">
                              {day.appointments > 0 && (
                                <div
                                  className="w-full bg-purple-500 rounded-t hover:bg-purple-600 transition-colors cursor-pointer"
                                  style={{
                                    height: `${Math.max((day.appointments / maxValue) * 100, 8)}%`,
                                    minHeight: '8px'
                                  }}
                                >
                                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    Appointments: {day.appointments}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sales bar */}
                            <div className="flex-1 flex flex-col justify-end items-center group relative h-full">
                              {day.sales > 0 && (
                                <div
                                  className="w-full bg-red-500 rounded-t hover:bg-red-600 transition-colors cursor-pointer"
                                  style={{
                                    height: `${Math.max((day.sales / maxValue) * 100, 8)}%`,
                                    minHeight: '8px'
                                  }}
                                >
                                  <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    Sales: {day.sales}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Show count below for primary metric */}
                          <div className="text-xs text-center mt-2 font-bold text-blue-600">
                            {day.dials} dials
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 justify-center mt-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Dials</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Contacts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span>Appointments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>Sales</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
