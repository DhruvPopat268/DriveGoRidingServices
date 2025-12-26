import React, { useState, useEffect } from 'react';
import { Star, Filter, Search, Eye, Loader } from 'lucide-react';
import apiClient from '../../../lib/axiosInterceptor';

interface UserRating {
  _id: string;
  userId: string;
  driverId: string;
  rideId: string;
  rating: number;
  comment?: string;
  driverFeedback?: string[];
  cabFeedback?: string[];
  parcelFeedback?: {
    parcelCondition?: string[];
    deliveryExperience?: string[];
  };
  wouldChooseAgain?: boolean;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  mobile: string;
}

interface UserRatingsPageProps {
  onNavigateToRideDetail?: (rideId: string) => void;
}

const UserRatingsPage = ({ onNavigateToRideDetail }: UserRatingsPageProps) => {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchAllRatings();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rider-auth/completeProfile`);
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllRatings = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/user-rating/all`);
      if (response.data.success) {
        setRatings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRatings = async (userId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/user-rating/given-by-user`, {
        userId
      });
      if (response.data.success) {
        setRatings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserFilter = (userId: string) => {
    setSelectedUser(userId);
    if (userId) {
      fetchUserRatings(userId);
    } else {
      fetchAllRatings();
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading user ratings...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">User Ratings</h1>
        <p className="text-gray-600">Manage and view ratings given by users to drivers</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by User
            </label>
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
              <select
                value={selectedUser}
                onChange={(e) => handleUserFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Users</option>
                {filteredUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver 
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ride ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ratings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No ratings found
                  </td>
                </tr>
              ) : (
                ratings.map((rating) => (
                  <tr key={rating._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof rating.userId === 'object' ? rating.userId?.name || rating.userId?._id : rating.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof rating.driverId === 'object' ? rating.driverId?.personalInformation?.fullName || rating.driverId?._id : rating.driverId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rating.rideId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex">{renderStars(rating.rating)}</div>
                        <span className="text-sm text-gray-600">({rating.rating})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="space-y-1">
                        {rating.driverFeedback && rating.driverFeedback.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-blue-600">Driver:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rating.driverFeedback.map((feedback, idx) => (
                                <span key={idx} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {feedback}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {rating.cabFeedback && rating.cabFeedback.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-green-600">Cab:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rating.cabFeedback.map((feedback, idx) => (
                                <span key={idx} className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                  {feedback}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {rating.parcelFeedback && (
                          <div>
                            {rating.parcelFeedback.parcelCondition && rating.parcelFeedback.parcelCondition.length > 0 && (
                              <div className="mb-1">
                                <span className="text-xs font-medium text-purple-600">Parcel Condition:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rating.parcelFeedback.parcelCondition.map((feedback, idx) => (
                                    <span key={idx} className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                      {feedback}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {rating.parcelFeedback.deliveryExperience && rating.parcelFeedback.deliveryExperience.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-orange-600">Delivery:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rating.parcelFeedback.deliveryExperience.map((feedback, idx) => (
                                    <span key={idx} className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                      {feedback}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {!rating.driverFeedback?.length && !rating.cabFeedback?.length && 
                         !rating.parcelFeedback?.parcelCondition?.length && !rating.parcelFeedback?.deliveryExperience?.length && (
                          <span className="text-gray-400 text-xs">No feedback</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {rating.comment || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rating.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => onNavigateToRideDetail?.(rating.rideId)}
                        className="inline-flex items-center px-2 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserRatingsPage;