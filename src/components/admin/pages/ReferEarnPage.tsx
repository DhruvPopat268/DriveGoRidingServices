import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ReferralRule {
  _id: string;
  commission: number;
  MaxReferrals : number;
  createdAt: string;
}

const ReferEarnPage: React.FC = () => {
  const [rules, setRules] = useState<ReferralRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ReferralRule | null>(null);
  const [formData, setFormData] = useState({
    commission: '',
    MaxReferrals: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/referral-rules`);
      // Ensure we always have an array, even if response.data is not
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/referral-rules/${editingRule._id}`, formData);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/referral-rules`, formData);
      }
      setShowForm(false);
      setEditingRule(null);
      setFormData({ commission: '', MaxReferrals: '' });
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
      MaxReferrals: rule.MaxReferrals.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await axios.delete(`/api/referral-rules/${id}`);
        fetchRules();
      } catch (error) {
        console.error('Error deleting rule:', error);
        setError('Failed to delete rule');
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({ commission: '', MaxReferrals: '' });
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Refer & Earn</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Create Rules
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-[#1f2937] shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Index
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Referral Commission (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Max Referrals 
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 text-gray-100">
            {rules && rules.length > 0 ? (
              rules.map((rule, index) => (
                <tr key={rule._id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{rule.commission}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{rule.MaxReferrals}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(rule.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rule._id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-400">
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
          <div className="bg-[#1f2937] rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-gray-100">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4">
              <div className="mb-4">
                <label
                  className="block text-gray-300 text-sm font-medium mb-2"
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
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="mb-6">
                <label
                  className="block text-gray-300 text-sm font-medium mb-2"
                  htmlFor="MaxReferrals"
                >
                  Number of max Referrals 
                </label>
                <input
                  type="number"
                  id="MaxReferrals"
                  name="MaxReferrals"
                  value={formData.MaxReferrals}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
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