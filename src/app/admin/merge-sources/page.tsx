'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface SourceCount {
  source: string;
  count: number;
}

export default function MergeSourcesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sources, setSources] = useState<SourceCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [targetSource, setTargetSource] = useState('');
  const [customTarget, setCustomTarget] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user && (session.user as any).role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  // Fetch lead sources
  useEffect(() => {
    if (session?.user && (session.user as any).role === 'admin') {
      fetchSources();
    }
  }, [session]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/lead-sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceSelection = (source: string) => {
    setSelectedSources(prev => {
      if (prev.includes(source)) {
        return prev.filter(s => s !== source);
      } else {
        return [...prev, source];
      }
    });
  };

  const handleMerge = async () => {
    const finalTarget = targetSource === 'custom' ? customTarget.trim() : targetSource;

    if (selectedSources.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one source to merge' });
      return;
    }

    if (!finalTarget) {
      setMessage({ type: 'error', text: 'Please select or enter a target source' });
      return;
    }

    // Filter out the target from selected sources (can't merge into itself)
    const sourcesToMerge = selectedSources.filter(s => s !== finalTarget);

    if (sourcesToMerge.length === 0) {
      setMessage({ type: 'error', text: 'No sources to merge (target cannot be merged into itself)' });
      return;
    }

    const totalLeads = sources
      .filter(s => sourcesToMerge.includes(s.source))
      .reduce((sum, s) => sum + s.count, 0);

    if (!confirm(`Merge ${sourcesToMerge.length} source(s) (${totalLeads} leads) into "${finalTarget}"?`)) {
      return;
    }

    try {
      setMerging(true);
      setMessage(null);

      const response = await fetch('/api/admin/merge-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcesToMerge,
          targetSource: finalTarget
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Successfully merged ${data.updated} leads into "${finalTarget}"` });
        setSelectedSources([]);
        setTargetSource('');
        setCustomTarget('');
        fetchSources(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to merge sources' });
      }
    } catch (error) {
      console.error('Error merging sources:', error);
      setMessage({ type: 'error', text: 'Error merging sources' });
    } finally {
      setMerging(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session?.user || (session.user as any).role !== 'admin') {
    return null;
  }

  const availableTargets = sources.filter(s => !selectedSources.includes(s.source) || selectedSources.length === 1);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black">Merge Lead Sources</h1>
              <p className="text-gray-400 mt-2 text-sm">
                Combine multiple lead sources into one
              </p>
            </div>
            <NavigationMenu currentPage="merge-sources" />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Step 1: Select sources to merge */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Step 1: Select Sources to Merge</h2>
          <p className="text-gray-600 mb-4">Click on sources you want to merge together:</p>

          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.source}
                onClick={() => toggleSourceSelection(source.source)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSources.includes(source.source)
                    ? 'border-red-600 bg-red-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{source.source}</span>
                  <span className="text-gray-500">{source.count.toLocaleString()} leads</span>
                </div>
              </div>
            ))}
          </div>

          {selectedSources.length > 0 && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <strong>Selected ({selectedSources.length}):</strong> {selectedSources.join(', ')}
            </div>
          )}
        </div>

        {/* Step 2: Choose target */}
        {selectedSources.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Step 2: Choose Target Source</h2>
            <p className="text-gray-600 mb-4">Select an existing source or create a new one:</p>

            <select
              value={targetSource}
              onChange={(e) => setTargetSource(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4"
            >
              <option value="">Select target source...</option>
              {availableTargets.map((source) => (
                <option key={source.source} value={source.source}>
                  {source.source} ({source.count.toLocaleString()} leads)
                </option>
              ))}
              <option value="custom">+ Create new source name...</option>
            </select>

            {targetSource === 'custom' && (
              <input
                type="text"
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                placeholder="Enter new source name"
                className="w-full p-3 border-2 border-gray-300 rounded-lg"
              />
            )}
          </div>
        )}

        {/* Step 3: Merge button */}
        {selectedSources.length > 0 && (targetSource || customTarget) && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <button
              onClick={handleMerge}
              disabled={merging}
              className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {merging ? 'Merging...' : `Merge ${selectedSources.filter(s => s !== (targetSource === 'custom' ? customTarget : targetSource)).length} Source(s)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
