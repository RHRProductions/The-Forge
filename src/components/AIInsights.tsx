'use client';

import { useEffect, useState } from 'react';

interface Insight {
  type: 'power_hour' | 'top_source' | 'stale_warning' | 'lead_velocity' | 'best_day' | 'negative_roi';
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  action: string;
  icon: string;
  data?: any;
}

interface InsightsData {
  insights: Insight[];
  timeframe: string;
  generatedAt: string;
  hasEnoughData: boolean;
}

export default function AIInsights() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/insights?days=30');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
        setError(null);
      } else {
        setError('Failed to load insights');
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      setError('Error loading insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">💡</div>
          <h2 className="text-xl font-bold text-gray-800">AI Insights</h2>
        </div>
        <div className="text-gray-600">Analyzing your data...</div>
      </div>
    );
  }

  if (error || !insights || !insights.hasEnoughData) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">💡</div>
          <h2 className="text-xl font-bold text-gray-800">Data Insights</h2>
        </div>
        <div className="text-gray-600">
          {error ? (
            error
          ) : (
            <>
              <p className="mb-2">📊 Not enough data yet to generate insights.</p>
              <p className="text-sm">To see patterns and recommendations, you need:</p>
              <ul className="text-sm mt-2 ml-4 list-disc space-y-1">
                <li>At least 10 call activities in an hour to identify best calling times</li>
                <li>At least 20 calls on a day to identify best days of the week</li>
                <li>At least 10 leads from a source to analyze ROI</li>
              </ul>
              <p className="text-sm mt-3">Start logging your call activities to unlock insights!</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const priorityBorderColors = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-green-500'
  };

  const priorityBgColors = {
    high: 'bg-red-50',
    medium: 'bg-yellow-50',
    low: 'bg-green-50'
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-2xl">💡</div>
            <h2 className="text-xl font-bold text-gray-800">Data Insights</h2>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-600 hover:text-gray-800 font-semibold text-sm"
          >
            {collapsed ? '▼ Show' : '▲ Hide'}
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {insights.timeframe} • Updated {new Date(insights.generatedAt).toLocaleTimeString()}
          <button
            onClick={fetchInsights}
            className="ml-3 text-blue-600 hover:text-blue-800 font-semibold"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Insights List */}
      {!collapsed && (
        <div className="px-6 pb-6 space-y-3">
          {insights.insights.map((insight, index) => (
            <div
              key={index}
              className={`border-l-4 ${priorityBorderColors[insight.priority]} ${priorityBgColors[insight.priority]} rounded-r-lg p-4 shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">{insight.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-700 mb-2">{insight.detail}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">→</span>
                    <span className="text-sm font-semibold text-blue-700">{insight.action}</span>
                  </div>
                </div>
                {insight.priority === 'high' && (
                  <div className="flex-shrink-0">
                    <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                      HIGH
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="bg-white bg-opacity-50 px-6 py-3 border-t border-blue-200">
          <p className="text-xs text-gray-600 text-center">
            💡 These insights update automatically based on your team's activity data
          </p>
        </div>
      )}
    </div>
  );
}
