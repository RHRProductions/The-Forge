'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavigationMenu from '@/components/NavigationMenu';

interface PendingPolicy {
  id: number;
  lead_id: number;
  policy_number: string;
  policy_type: string;
  coverage_amount: number;
  premium_amount: number;
  commission_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  notes: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_2: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  date_of_birth: string;
  age: number;
}

export default function PendingPoliciesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [policies, setPolicies] = useState<PendingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PendingPolicy | null>(null);
  const [issuingPolicy, setIssuingPolicy] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPolicies();
    }
  }, [status]);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pending-policies');
      if (response.ok) {
        const data = await response.json();
        setPolicies(data.policies);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatName = (name: string) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleIssuePolicy = async () => {
    if (!selectedPolicy) return;

    if (!confirm(`Mark this policy as issued and create client record for ${formatName(selectedPolicy.first_name)} ${formatName(selectedPolicy.last_name)}?`)) {
      return;
    }

    setIssuingPolicy(true);
    try {
      const response = await fetch(`/api/policies/${selectedPolicy.id}/issue`, {
        method: 'POST'
      });

      if (response.ok) {
        setSelectedPolicy(null);
        await fetchPolicies(); // Refresh the list
        alert('Policy issued successfully! Client record created.');
      } else {
        alert('Failed to issue policy');
      }
    } catch (error) {
      console.error('Error issuing policy:', error);
      alert('Error issuing policy');
    } finally {
      setIssuingPolicy(false);
    }
  };

  const handleMarkPolicyStatus = async (newStatus: string, statusLabel: string) => {
    if (!selectedPolicy) return;

    if (!confirm(`Mark this policy as ${statusLabel}? The lead will be returned to the hot leads pool for follow-up.`)) {
      return;
    }

    setIssuingPolicy(true);
    try {
      const response = await fetch(`/api/leads/${selectedPolicy.lead_id}/policies/${selectedPolicy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_type: selectedPolicy.policy_type,
          policy_number: selectedPolicy.policy_number,
          coverage_amount: selectedPolicy.coverage_amount,
          premium_amount: selectedPolicy.premium_amount,
          commission_amount: selectedPolicy.commission_amount,
          start_date: selectedPolicy.start_date,
          end_date: selectedPolicy.end_date,
          status: newStatus,
          notes: selectedPolicy.notes
        })
      });

      if (response.ok) {
        setSelectedPolicy(null);
        await fetchPolicies(); // Refresh the list
        alert(`Policy marked as ${statusLabel}. Lead has been returned to the hot leads pool.`);
      } else {
        alert(`Failed to mark policy as ${statusLabel}`);
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      alert('Error updating policy');
    } finally {
      setIssuingPolicy(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="bg-black text-white p-6 border-b-4 border-red-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-black">⏳ Pending Policies</h1>
            <NavigationMenu currentPage="pending-policies" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="mb-6 bg-gray-100 p-4 rounded">
          <div className="text-2xl font-bold">Total Pending: {policies.length}</div>
          <div className="text-sm text-gray-600 mt-1">
            Policies awaiting completion and issue
          </div>
        </div>

        {/* Policy Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border-4 border-black">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Name</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Phone</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Policy Type</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Premium</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Commission</th>
                  <th className="p-2 sm:p-4 text-left text-sm sm:text-base">Start Date</th>
                </tr>
              </thead>
              <tbody>
                {policies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-black">
                      No pending policies. All caught up! 🎉
                    </td>
                  </tr>
                ) : (
                  policies.map((policy) => (
                    <tr
                      key={policy.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPolicy(policy)}
                    >
                      <td className="p-2 sm:p-4">
                        <div>
                          <div className="font-medium text-xs sm:text-base">
                            {formatName(policy.first_name)} {formatName(policy.last_name)}
                          </div>
                          {policy.age && (
                            <div className="text-xs text-gray-500">Age: {policy.age}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium">{formatPhoneNumber(policy.phone)}</div>
                          {policy.phone_2 && (
                            <div className="text-gray-500">{formatPhoneNumber(policy.phone_2)}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm font-medium">
                          {policy.policy_type}
                        </div>
                        {policy.policy_number && (
                          <div className="text-xs text-gray-500">#{policy.policy_number}</div>
                        )}
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm font-medium">
                          {formatCurrency(policy.premium_amount)}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm font-bold text-green-700">
                          {formatCurrency(policy.commission_amount)}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm">
                          {policy.start_date ? new Date(policy.start_date).toLocaleDateString() : 'TBD'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Policy Detail Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {formatName(selectedPolicy.first_name)} {formatName(selectedPolicy.last_name)}
              </h2>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded p-4 mb-6">
              <h3 className="font-bold text-lg mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {selectedPolicy.phone && (
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="font-semibold">📞 {formatPhoneNumber(selectedPolicy.phone)}</div>
                  </div>
                )}
                {selectedPolicy.phone_2 && (
                  <div>
                    <div className="text-xs text-gray-500">Phone 2</div>
                    <div className="font-semibold">📞 {formatPhoneNumber(selectedPolicy.phone_2)}</div>
                  </div>
                )}
                {selectedPolicy.email && (
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-semibold">✉️ {selectedPolicy.email}</div>
                  </div>
                )}
                {selectedPolicy.city && selectedPolicy.state && (
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="font-semibold">📍 {selectedPolicy.city}, {selectedPolicy.state}</div>
                  </div>
                )}
                {selectedPolicy.date_of_birth && (
                  <div>
                    <div className="text-xs text-gray-500">Date of Birth</div>
                    <div className="font-semibold">
                      {new Date(selectedPolicy.date_of_birth).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {selectedPolicy.age && (
                  <div>
                    <div className="text-xs text-gray-500">Age</div>
                    <div className="font-semibold">{selectedPolicy.age}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Policy Details */}
            <div className="bg-blue-50 rounded p-4 mb-6">
              <h3 className="font-bold text-lg mb-3">Policy Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Policy Type</div>
                  <div className="font-semibold">{selectedPolicy.policy_type}</div>
                </div>
                {selectedPolicy.policy_number && (
                  <div>
                    <div className="text-xs text-gray-500">Policy Number</div>
                    <div className="font-semibold">{selectedPolicy.policy_number}</div>
                  </div>
                )}
                {selectedPolicy.coverage_amount && (
                  <div>
                    <div className="text-xs text-gray-500">Coverage Amount</div>
                    <div className="font-semibold">{formatCurrency(selectedPolicy.coverage_amount)}</div>
                  </div>
                )}
                {selectedPolicy.premium_amount && (
                  <div>
                    <div className="text-xs text-gray-500">Premium Amount</div>
                    <div className="font-semibold">{formatCurrency(selectedPolicy.premium_amount)}</div>
                  </div>
                )}
                {selectedPolicy.commission_amount && (
                  <div>
                    <div className="text-xs text-gray-500">Commission</div>
                    <div className="font-semibold text-green-700">{formatCurrency(selectedPolicy.commission_amount)}</div>
                  </div>
                )}
                {selectedPolicy.start_date && (
                  <div>
                    <div className="text-xs text-gray-500">Start Date</div>
                    <div className="font-semibold">{new Date(selectedPolicy.start_date).toLocaleDateString()}</div>
                  </div>
                )}
                {selectedPolicy.end_date && (
                  <div>
                    <div className="text-xs text-gray-500">End Date</div>
                    <div className="font-semibold">{new Date(selectedPolicy.end_date).toLocaleDateString()}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-semibold">
                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                      {selectedPolicy.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedPolicy.notes && (
              <div className="bg-gray-50 rounded p-4 mb-6">
                <h3 className="font-bold text-lg mb-3">Notes</h3>
                <div className="whitespace-pre-wrap">{selectedPolicy.notes}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t pt-4">
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2 text-gray-700">Policy Fell Off?</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleMarkPolicyStatus('cancelled', 'Cancelled')}
                    disabled={issuingPolicy}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Cancelled
                  </button>
                  <button
                    onClick={() => handleMarkPolicyStatus('not_approved', 'Not Approved')}
                    disabled={issuingPolicy}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Not Approved
                  </button>
                  <button
                    onClick={() => handleMarkPolicyStatus('declined', 'Declined')}
                    disabled={issuingPolicy}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Declined
                  </button>
                  <button
                    onClick={() => handleMarkPolicyStatus('lapsed', 'Lapsed')}
                    disabled={issuingPolicy}
                    className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    Lapsed
                  </button>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setSelectedPolicy(null)}
                  disabled={issuingPolicy}
                  className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-black rounded font-bold transition-colors disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={handleIssuePolicy}
                  disabled={issuingPolicy}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition-colors disabled:opacity-50"
                >
                  {issuingPolicy ? '⏳ Processing...' : '✅ Mark as Issued'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
