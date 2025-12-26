import React, { useState, useEffect } from 'react';
import { Edit, Trash2, } from 'lucide-react';
import { DeleteConfirmation } from '@/components/ui/delete-confirmation';
import apiClient from '../../../lib/axiosInterceptor';


interface ReferralRule {
  _id: string;
  commission: number;
  MaxReferrals: number;
  allowCommissionToUsed: number;
  status: boolean;
  createdAt: string;
}

const ReferEarnPage: React.FC = () => {
  const [rules, setRules] = useState<ReferralRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ReferralRule | null>(null);
  const [formData, setFormData] = useState({
    commission: '',
    MaxReferrals: '',
    allowCommissionToUsed: '',
    status: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/referral-rules`);
      setRules(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (error) {
      console.error('Error fetching rules:', error);
      setError('Failed to fetch rules');
      setRules([]); // Ensure rules is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await apiClient.put(`${import.meta.env.VITE_API_URL}/api/referral-rules/${editingRule._id}`, formData);
      } else {
        await apiClient.post(`${import.meta.env.VITE_API_URL}/api/referral-rules`, formData);
      }
      setShowForm(false);
      setEditingRule(null);
      setFormData({ commission: '', MaxReferrals: '', allowCommissionToUsed: '', status: true });
      fetchRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      setError('Failed to save rule');
    }
  };

  const handleEdit = (rule: ReferralRule) => {
    setEditingRule(rule);
    setFormData({
      commission: rule.commission.toString(),
      MaxReferrals: rule.MaxReferrals.toString(),
      allowCommissionToUsed: rule.allowCommissionToUsed.toString(),
      status: rule.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/referral-rules/${id}`);
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      setError('Failed to delete rule');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({ commission: '', MaxReferrals: '', allowCommissionToUsed: '', status: true });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading rules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white text-black">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">Refer & Earn</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Create Rules
        </button>
      </div>
      <h4 className="text-red-600 mb-4">***commission is context to admin charges</h4>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white border shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Index
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Referral Commission (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Max Referrals
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Allowed Commission Usage (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-900">
            {rules && rules.length > 0 ? (
              rules.map((rule, index) => (
                <tr key={rule._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{rule.commission}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{rule.MaxReferrals}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{rule.allowCommissionToUsed}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiClient.put(`${import.meta.env.VITE_API_URL}/api/referral-rules/${rule._id}`, {
                            ...rule,
                            status: !rule.status
                          });
                          fetchRules();
                        } catch (error) {
                          console.error('Error updating status:', error);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rule.status ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${rule.status ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(rule.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <div className="inline-block">
                      <DeleteConfirmation
                        onDelete={() => handleDelete(rule._id)}
                        itemName="rule"
                        buttonSize="sm"
                        buttonVariant="outline"
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No referral rules found. Click "Create Rules" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-medium mb-2"
                  htmlFor="commission"
                >
                  Referral Commission (%)
                </label>
                <input
                  type="number"
                  id="commission"
                  name="commission"
                  value={formData.commission}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-medium mb-2"
                  htmlFor="MaxReferrals"
                >
                  Max Referrals
                </label>
                <input
                  type="number"
                  id="MaxReferrals"
                  name="MaxReferrals"
                  value={formData.MaxReferrals}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-medium mb-2"
                  htmlFor="allowCommissionToUsed"
                >
                  Allowed Commission Usage (%)
                </label>
                <input
                  type="number"
                  id="allowCommissionToUsed"
                  name="allowCommissionToUsed"
                  value={formData.allowCommissionToUsed}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2">Status</label>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, status: !formData.status})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.status ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.status ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-700">{formData.status ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

};

export default ReferEarnPage;