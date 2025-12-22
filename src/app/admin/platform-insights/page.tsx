'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface PlatformInsightsData {
  timeOfDay: { hour: number; dials: number; contacts: number; appointments: number }[];
  geoPerformance: { city: string; state: string; totalLeads: number; contacted: number; appointments: number; sales: number }[];
  dialingPatterns: { attempts: number; leads: number; contacted: number; appointments: number }[];
  dayOfWeek: { dayOfWeek: number; dials: number; contacts: number; appointments: number }[];
  ageGroupPerformance: { ageGroup: string; totalLeads: number; contacted: number; answeredNoAppt: number; appointments: number; sales: number }[];
  powerHours: { dayOfWeek: number; hour: number; dials: number; contacts: number; appointments: number }[];
}

export default function PlatformInsightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [insights, setInsights] = useState<PlatformInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [showLocations, setShowLocations] = useState(false);
  const [showPowerHours, setShowPowerHours] = useState(false);
  const [showAgeGroups, setShowAgeGroups] = useState(false);
  const [showBestTimes, setShowBestTimes] = useState(false);
  const [showBestDays, setShowBestDays] = useState(false);
  const [showDialingAttempts, setShowDialingAttempts] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/'); // Redirect non-admins
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user && (session?.user as any)?.role === 'admin') {
      fetchInsights();
    }
  }, [session, timeFilter]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?period=${timeFilter}`);
      if (response.ok) {
        const data = await response.json();
        if (data.aggregateInsights) {
          setInsights({
            timeOfDay: data.aggregateInsights.timeOfDay || [],
            geoPerformance: data.aggregateInsights.geoPerformance || [],
            dialingPatterns: data.aggregateInsights.dialingPatterns || [],
            dayOfWeek: data.aggregateInsights.dayOfWeek || [],
            ageGroupPerformance: data.aggregateInsights.ageGroupPerformance || [],
            powerHours: data.aggregateInsights.powerHours || [],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching platform insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">🔍 Platform Insights</h1>
            <NavigationMenu currentPage="platform-insights" />
          </div>
          <p className="text-gray-300 mt-2">Aggregate data across all users and activities</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Time Filter Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              timeFilter === 'today' ? 'bg-red-600 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              timeFilter === 'week' ? 'bg-red-600 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              timeFilter === 'month' ? 'bg-red-600 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              timeFilter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Best Times to Call */}
        <div className="mb-8">
          <div
            onClick={() => setShowBestTimes(!showBestTimes)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
          >
            <h3 className="text-2xl font-bold">📞 Best Times to Call</h3>
            <span className="text-2xl font-bold">
              {showBestTimes ? '▼' : '▶'}
            </span>
          </div>
          {showBestTimes && insights.timeOfDay.length > 0 && (
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="p-3 text-left">Hour</th>
                    <th className="p-3 text-center">Dials</th>
                    <th className="p-3 text-center">Contacts</th>
                    <th className="p-3 text-center">Appointments</th>
                    <th className="p-3 text-center">Contact Rate</th>
                    <th className="p-3 text-center">Appt Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.timeOfDay
                    .filter(t => t.dials > 0)
                    .sort((a, b) => {
                      const aRate = a.dials > 0 ? (a.contacts / a.dials) : 0;
                      const bRate = b.dials > 0 ? (b.contacts / b.dials) : 0;
                      return bRate - aRate;
                    })
                    .map((timeSlot, index) => {
                      const contactRate = timeSlot.dials > 0 ? (timeSlot.contacts / timeSlot.dials) * 100 : 0;
                      const apptRate = timeSlot.dials > 0 ? (timeSlot.appointments / timeSlot.dials) * 100 : 0;
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-3 font-bold">{formatHour(timeSlot.hour)}</td>
                          <td className="p-3 text-center">{timeSlot.dials}</td>
                          <td className="p-3 text-center">{timeSlot.contacts}</td>
                          <td className="p-3 text-center">{timeSlot.appointments}</td>
                          <td className="p-3 text-center">
                            <span className={contactRate >= 20 ? 'text-green-600 font-bold' : ''}>
                              {contactRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={apptRate >= 5 ? 'text-green-600 font-bold' : ''}>
                              {apptRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Best Days of the Week */}
        <div className="mb-8">
          <div
            onClick={() => setShowBestDays(!showBestDays)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
          >
            <h3 className="text-2xl font-bold">Best Days of the Week</h3>
            <span className="text-2xl font-bold">
              {showBestDays ? '▼' : '▶'}
            </span>
          </div>
          {showBestDays && insights.dayOfWeek.length > 0 && (
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="p-3 text-left">Day</th>
                    <th className="p-3 text-center">Dials</th>
                    <th className="p-3 text-center">Contacts</th>
                    <th className="p-3 text-center">Appointments</th>
                    <th className="p-3 text-center">Contact Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.dayOfWeek.map((day, index) => {
                    const contactRate = day.dials > 0 ? (day.contacts / day.dials) * 100 : 0;
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-3 font-bold">{getDayName(day.dayOfWeek)}</td>
                        <td className="p-3 text-center">{day.dials}</td>
                        <td className="p-3 text-center">{day.contacts}</td>
                        <td className="p-3 text-center">{day.appointments}</td>
                        <td className="p-3 text-center">
                          <span className={contactRate >= 20 ? 'text-green-600 font-bold' : ''}>
                            {contactRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Performing Locations */}
        {insights.geoPerformance.length > 0 && (
          <div className="mb-8">
            <div
              onClick={() => setShowLocations(!showLocations)}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
            >
              <h3 className="text-2xl font-bold">Top Performing Locations</h3>
              <span className="text-2xl font-bold">
                {showLocations ? '▼' : '▶'}
              </span>
            </div>
            {showLocations && (
              <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="p-3 text-left">City, State</th>
                      <th className="p-3 text-center">Total Leads</th>
                      <th className="p-3 text-center">Contacted</th>
                      <th className="p-3 text-center">Appointments</th>
                      <th className="p-3 text-center">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.geoPerformance.map((location, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-3 font-bold">{location.city}, {location.state}</td>
                        <td className="p-3 text-center">{location.totalLeads}</td>
                        <td className="p-3 text-center">
                          {location.contacted} ({location.totalLeads > 0 ? ((location.contacted / location.totalLeads) * 100).toFixed(1) : 0}%)
                        </td>
                        <td className="p-3 text-center">
                          {location.appointments} ({location.totalLeads > 0 ? ((location.appointments / location.totalLeads) * 100).toFixed(1) : 0}%)
                        </td>
                        <td className="p-3 text-center font-bold text-green-600">
                          {location.sales} ({location.totalLeads > 0 ? ((location.sales / location.totalLeads) * 100).toFixed(1) : 0}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Optimal Dialing Attempts */}
        <div className="mb-8">
          <div
            onClick={() => setShowDialingAttempts(!showDialingAttempts)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
          >
            <h3 className="text-2xl font-bold">Optimal Dialing Attempts</h3>
            <span className="text-2xl font-bold">
              {showDialingAttempts ? '▼' : '▶'}
            </span>
          </div>
          {showDialingAttempts && insights.dialingPatterns.length > 0 && (
            <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="p-3 text-left">Attempts</th>
                    <th className="p-3 text-center">Leads</th>
                    <th className="p-3 text-center">Contacted</th>
                    <th className="p-3 text-center">Contact Rate</th>
                    <th className="p-3 text-center">Appointments</th>
                    <th className="p-3 text-center">Appt Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.dialingPatterns.map((pattern, index) => {
                    const contactRate = pattern.leads > 0 ? (pattern.contacted / pattern.leads) * 100 : 0;
                    const apptRate = pattern.leads > 0 ? (pattern.appointments / pattern.leads) * 100 : 0;
                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-3 font-bold">{pattern.attempts} attempt{pattern.attempts !== 1 ? 's' : ''}</td>
                        <td className="p-3 text-center">{pattern.leads}</td>
                        <td className="p-3 text-center">{pattern.contacted}</td>
                        <td className="p-3 text-center">
                          <span className={contactRate >= 30 ? 'text-green-600 font-bold' : ''}>
                            {contactRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">{pattern.appointments}</td>
                        <td className="p-3 text-center">
                          <span className={apptRate >= 10 ? 'text-green-600 font-bold' : ''}>
                            {apptRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance by Age Group */}
        {insights.ageGroupPerformance && insights.ageGroupPerformance.length > 0 && (
          <div className="mb-8">
            <div
              onClick={() => setShowAgeGroups(!showAgeGroups)}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
            >
              <h3 className="text-2xl font-bold">🎯 Performance by Age Group</h3>
              <span className="text-2xl font-bold">
                {showAgeGroups ? '▼' : '▶'}
              </span>
            </div>
            {showAgeGroups && (
              <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="p-3 text-left">Age Group</th>
                      <th className="p-3 text-center">Total Leads</th>
                      <th className="p-3 text-center">Contacted</th>
                      <th className="p-3 text-center">Answered (No Appt)</th>
                      <th className="p-3 text-center">Appointments</th>
                      <th className="p-3 text-center">Sales</th>
                      <th className="p-3 text-center">Close Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.ageGroupPerformance.map((group, index) => {
                      const closeRate = group.totalLeads > 0 ? (group.sales / group.totalLeads) * 100 : 0;
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-3 font-bold">{group.ageGroup}</td>
                          <td className="p-3 text-center">{group.totalLeads}</td>
                          <td className="p-3 text-center">
                            {group.contacted} ({group.totalLeads > 0 ? ((group.contacted / group.totalLeads) * 100).toFixed(1) : 0}%)
                          </td>
                          <td className="p-3 text-center">{group.answeredNoAppt}</td>
                          <td className="p-3 text-center">
                            {group.appointments} ({group.totalLeads > 0 ? ((group.appointments / group.totalLeads) * 100).toFixed(1) : 0}%)
                          </td>
                          <td className="p-3 text-center font-bold text-green-600">{group.sales}</td>
                          <td className="p-3 text-center">
                            <span className={closeRate >= 5 ? 'text-green-600 font-bold' : ''}>
                              {closeRate.toFixed(1)}%
                            </span>
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

        {/* Power Hours - Best Day & Time Combinations */}
        {insights.powerHours && insights.powerHours.length > 0 && (
          <div className="mb-8">
            <div
              onClick={() => setShowPowerHours(!showPowerHours)}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors mb-4"
            >
              <h3 className="text-2xl font-bold">⚡ Power Hours - Best Day & Time Combinations</h3>
              <span className="text-2xl font-bold">
                {showPowerHours ? '▼' : '▶'}
              </span>
            </div>
            {showPowerHours && (
              <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                <p className="p-4 bg-blue-50 text-sm text-gray-700">
                  These are the day/time combinations with the highest contact rates (minimum 5 dials required).
                </p>
                <table className="w-full">
                  <thead className="bg-black text-white">
                    <tr>
                      <th className="p-3 text-left">Day & Time</th>
                      <th className="p-3 text-center">Dials</th>
                      <th className="p-3 text-center">Contacts</th>
                      <th className="p-3 text-center">Appointments</th>
                      <th className="p-3 text-center">Contact Rate</th>
                      <th className="p-3 text-center">Appt Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.powerHours.map((slot, index) => {
                      const contactRate = slot.dials > 0 ? (slot.contacts / slot.dials) * 100 : 0;
                      const apptRate = slot.dials > 0 ? (slot.appointments / slot.dials) * 100 : 0;
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="p-3 font-bold">
                            {getDayName(slot.dayOfWeek)} @ {formatHour(slot.hour)}
                          </td>
                          <td className="p-3 text-center">{slot.dials}</td>
                          <td className="p-3 text-center">{slot.contacts}</td>
                          <td className="p-3 text-center">{slot.appointments}</td>
                          <td className="p-3 text-center">
                            <span className="text-green-600 font-bold">
                              {contactRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={apptRate >= 5 ? 'text-green-600 font-bold' : ''}>
                              {apptRate.toFixed(1)}%
                            </span>
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
      </div>
    </div>
  );
}
