'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AIInsights from '../../components/AIInsights';

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
    sourcePerformance: { source: string; totalLeads: number; contacted: number; appointments: number; disconnected: number; sales: number; avgCost: number; totalRevenue: number }[];
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
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAnalytics();
    }
  }, [session, timeFilter]);

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
            <button
              onClick={() => router.push('/')}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Time Filter */}
        <div className="flex gap-2 mb-6">
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

        {/* AI Insights Panel */}
        <div className="mb-6">
          <AIInsights />
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
                <h3 className="text-2xl font-bold mb-4">Lead Source Performance</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="p-3 text-left">Source</th>
                        <th className="p-3 text-center">Total Leads</th>
                        <th className="p-3 text-center">Contacted</th>
                        <th className="p-3 text-center">Appointments</th>
                        <th className="p-3 text-center">Disconnected</th>
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
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="p-3 font-bold">{source.source}</td>
                            <td className="p-3 text-center">{source.totalLeads}</td>
                            <td className="p-3 text-center">
                              {source.contacted} ({source.totalLeads > 0 ? ((source.contacted / source.totalLeads) * 100).toFixed(1) : 0}%)
                            </td>
                            <td className="p-3 text-center">
                              {source.appointments} ({source.totalLeads > 0 ? ((source.appointments / source.totalLeads) * 100).toFixed(1) : 0}%)
                            </td>
                            <td className="p-3 text-center text-red-600">
                              {source.disconnected} ({source.totalLeads > 0 ? ((source.disconnected / source.totalLeads) * 100).toFixed(1) : 0}%)
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
              </div>
            )}

            {/* Best Times to Call */}
            {analytics.aggregateInsights.timeOfDay.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4">Best Times to Call</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  <div className="flex gap-2 items-end h-64">
                    {analytics.aggregateInsights.timeOfDay.map((hour) => {
                      const maxContacts = Math.max(...analytics.aggregateInsights!.timeOfDay.map(h => h.contacts));
                      const height = maxContacts > 0 ? (hour.contacts / maxContacts) * 100 : 0;
                      const contactRate = hour.dials > 0 ? (hour.contacts / hour.dials) * 100 : 0;

                      return (
                        <div key={hour.hour} className="flex-1 flex flex-col justify-end items-center group relative">
                          <div
                            className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t hover:from-green-700 hover:to-green-500 transition-colors"
                            style={{ height: `${height}%` }}
                            title={`${hour.hour}:00 - ${hour.contacts} contacts (${contactRate.toFixed(1)}% rate)`}
                          >
                            <div className="hidden group-hover:block absolute bottom-full mb-2 bg-black text-white text-xs p-2 rounded whitespace-nowrap">
                              {hour.hour % 12 || 12}:00 {hour.hour >= 12 ? 'PM' : 'AM'}<br/>
                              Dials: {hour.dials}<br/>
                              Contacts: {hour.contacts}<br/>
                              Rate: {contactRate.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-xs mt-2 font-bold">{hour.hour % 12 || 12}{hour.hour >= 12 ? 'P' : 'A'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Day of Week Performance */}
            {analytics.aggregateInsights.dayOfWeek.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4">Best Days of the Week</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  <div className="grid grid-cols-7 gap-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => {
                      const dayData = analytics.aggregateInsights!.dayOfWeek.find(d => d.dayOfWeek === index) || { dials: 0, contacts: 0, appointments: 0 };
                      const contactRate = dayData.dials > 0 ? (dayData.contacts / dayData.dials) * 100 : 0;

                      return (
                        <div key={index} className="text-center">
                          <div className="font-bold mb-2">{dayName}</div>
                          <div className="bg-gray-100 p-4 rounded border-2 border-gray-300">
                            <div className="text-2xl font-black text-blue-600">{dayData.dials}</div>
                            <div className="text-xs text-gray-600">dials</div>
                            <div className="text-lg font-bold text-green-600 mt-2">{contactRate.toFixed(0)}%</div>
                            <div className="text-xs text-gray-600">contact rate</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Geographic Performance */}
            {analytics.aggregateInsights.geoPerformance.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4">Top Performing Locations</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="p-3 text-left">City</th>
                        <th className="p-3 text-left">Zip</th>
                        <th className="p-3 text-left">State</th>
                        <th className="p-3 text-center">Total Leads</th>
                        <th className="p-3 text-center">Contact Rate</th>
                        <th className="p-3 text-center">Appt Rate</th>
                        <th className="p-3 text-center">Close Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.aggregateInsights.geoPerformance.map((location, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-3 font-bold">{location.city}</td>
                          <td className="p-3">{location.zip_code}</td>
                          <td className="p-3">{location.state}</td>
                          <td className="p-3 text-center">{location.totalLeads}</td>
                          <td className="p-3 text-center">
                            {location.totalLeads > 0 ? ((location.contacted / location.totalLeads) * 100).toFixed(1) : 0}%
                          </td>
                          <td className="p-3 text-center">
                            {location.totalLeads > 0 ? ((location.appointments / location.totalLeads) * 100).toFixed(1) : 0}%
                          </td>
                          <td className="p-3 text-center font-bold text-green-600">
                            {location.totalLeads > 0 ? ((location.sales / location.totalLeads) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dialing Patterns */}
            {analytics.aggregateInsights.dialingPatterns.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4">Optimal Dialing Attempts</h3>
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  <div className="space-y-3">
                    {analytics.aggregateInsights.dialingPatterns.map((pattern) => {
                      const contactRate = pattern.leads > 0 ? (pattern.contacted / pattern.leads) * 100 : 0;
                      const apptRate = pattern.leads > 0 ? (pattern.appointments / pattern.leads) * 100 : 0;

                      return (
                        <div key={pattern.attempts} className="flex items-center gap-4">
                          <div className="w-24 font-bold text-right">{pattern.attempts} {pattern.attempts === 1 ? 'attempt' : 'attempts'}</div>
                          <div className="flex-1">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <div className="text-xs text-gray-600 mb-1">Contact Rate</div>
                                <div className="bg-gray-200 rounded-full h-6">
                                  <div
                                    className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${contactRate}%` }}
                                  >
                                    <span className="text-xs font-bold text-white">{contactRate.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-gray-600 mb-1">Appt Rate</div>
                                <div className="bg-gray-200 rounded-full h-6">
                                  <div
                                    className="bg-purple-500 h-6 rounded-full flex items-center justify-end pr-2"
                                    style={{ width: `${apptRate}%` }}
                                  >
                                    <span className="text-xs font-bold text-white">{apptRate.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="w-32 text-right text-sm text-gray-600">{pattern.leads} leads</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Lead Temperature Performance */}
            {analytics.aggregateInsights.temperaturePerformance.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4">Lead Temperature Conversion</h3>
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
              </div>
            )}
          </>
        )}

        {/* Daily Activity Chart */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Daily Activity</h2>
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
                  <div className="flex gap-2 min-w-max">
                    {analytics.timeSeriesData.map((day, index) => {
                      const maxValue = Math.max(
                        ...analytics.timeSeriesData.map(d => Math.max(d.dials, d.contacts, d.appointments, d.sales))
                      );
                      return (
                        <div key={index} className="flex-1 min-w-[80px]">
                          <div className="text-xs text-center mb-2 font-bold">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="h-40 flex flex-col justify-end gap-1 bg-gray-50 rounded relative">
                            {(day.dials > 0 || day.contacts > 0 || day.appointments > 0 || day.sales > 0) ? (
                              <>
                                {day.dials > 0 && (
                                  <div
                                    className="bg-blue-500 rounded"
                                    style={{ height: `${(day.dials / maxValue) * 100}%` }}
                                    title={`Dials: ${day.dials}`}
                                  ></div>
                                )}
                                {day.contacts > 0 && (
                                  <div
                                    className="bg-green-500 rounded"
                                    style={{ height: `${(day.contacts / maxValue) * 100}%` }}
                                    title={`Contacts: ${day.contacts}`}
                                  ></div>
                                )}
                                {day.appointments > 0 && (
                                  <div
                                    className="bg-purple-500 rounded"
                                    style={{ height: `${(day.appointments / maxValue) * 100}%` }}
                                    title={`Appointments: ${day.appointments}`}
                                  ></div>
                                )}
                                {day.sales > 0 && (
                                  <div
                                    className="bg-red-500 rounded"
                                    style={{ height: `${(day.sales / maxValue) * 100}%` }}
                                    title={`Sales: ${day.sales}`}
                                  ></div>
                                )}
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-end justify-center pb-1 text-gray-300 text-xs">-</div>
                            )}
                          </div>
                          <div className="text-xs text-center mt-2 space-y-1">
                            {(day.dials > 0 || day.contacts > 0 || day.appointments > 0 || day.sales > 0) && (
                              <div className="text-blue-600 font-semibold">{day.dials}</div>
                            )}
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
        </div>
      </div>
    </div>
  );
}
