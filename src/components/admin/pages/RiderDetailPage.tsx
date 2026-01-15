import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Phone, Mail, Calendar, Star, ChevronLeft, ChevronRight, Eye, Copy } from 'lucide-react';
import apiClient from '../../../lib/axiosInterceptor';

interface RiderDetail {
  _id: string;
  mobile: string;
  name: string;
  gender: string;
  email: string;
  profilePhoto: string;
  oneSignalPlayerId: string;
  status: string;
  referredBy: string | null;
  cancellationCharges: number;
  unclearedCancellationCharges: number;
  referrals: any[];
  createdAt: string;
  updatedAt: string;
  referralCode: string;
  completedRides: string[];
  referralEarning: {
    totalEarnings: number;
    currentBalance: number;
    history: any[];
  };
  ratings: {
    ratingHistory: number[];
    avgRating: number;
  };
  wallet: {
    totalDeposited: number;
    totalSpent: number;
    balance: number;
  };
}

interface Ride {
  rideId: string;
  category: string;
  selectedDate: string;
  status: string;
}

interface RiderDetailPageProps {
  riderId: string;
  onBack: () => void;
  onNavigateToRideDetail?: (rideId: string) => void;
}

export const RiderDetailPage = ({ riderId, onBack, onNavigateToRideDetail }: RiderDetailPageProps) => {
  const [rider, setRider] = useState<RiderDetail | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [ridesCurrentPage, setRidesCurrentPage] = useState(1);
  const [ridesPerPage] = useState(10);
  const [referralCurrentPage, setReferralCurrentPage] = useState(1);
  const [referralPerPage] = useState(5);

  useEffect(() => {
    if (riderId) {
      fetchRiderDetails();
    }
  }, [riderId]);

  const fetchRiderDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rider-auth/admin/rider-rides`, {
        riderId
      });
      
      if (response.data.success) {
        setRider(response.data.rider);
        setRides(response.data.rides);
      }
    } catch (error) {
      console.error('Error fetching rider details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRidesPaginated = () => {
    const startIndex = (ridesCurrentPage - 1) * ridesPerPage;
    const endIndex = startIndex + ridesPerPage;
    return rides.slice(startIndex, endIndex);
  };

  const getTotalRidesPages = () => {
    return Math.ceil(rides.length / ridesPerPage);
  };

  const getReferralHistoryPaginated = () => {
    const history = rider?.referralEarning?.history || [];
    const startIndex = (referralCurrentPage - 1) * referralPerPage;
    const endIndex = startIndex + referralPerPage;
    return history.slice(startIndex, endIndex);
  };

  const getTotalReferralPages = () => {
    const history = rider?.referralEarning?.history || [];
    return Math.ceil(history.length / referralPerPage);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleViewRide = (rideId: string) => {
    console.log('Navigating to ride:', rideId);
    if (onNavigateToRideDetail) {
      onNavigateToRideDetail(rideId);
    } else {
      console.warn('onNavigateToRideDetail callback not provided');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-4">Rider not found</div>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Rider Details</h1>
            <p className="text-gray-600">{rider.name || 'No Name'}</p>
          </div>
        </div>
        <Badge className={rider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {rider.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Rider Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm">{rider.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mobile</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-sm">{rider.mobile}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-sm">{rider.email || 'Not provided'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-sm capitalize">{rider.gender || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rating</label>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-sm">{rider.ratings?.avgRating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Completed Rides</label>
                  <p className="text-sm">{rider.completedRides?.length || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Joined Date</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-sm">{formatDate(rider.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Deposited</label>
                  <p className="text-lg font-semibold text-green-600">₹{rider.wallet?.totalDeposited || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Spent</label>
                  <p className="text-lg font-semibold text-red-600">₹{rider.wallet?.totalSpent || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Balance</label>
                  <p className="text-lg font-semibold text-blue-600">₹{rider.wallet?.balance || 0}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-500">Cancellation Charges</label>
                  <p className="text-sm">₹{rider.cancellationCharges || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rides History */}
          <Card>
            <CardHeader>
              <CardTitle>Rides History ({rides.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {rides.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ride ID</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getRidesPaginated().map((ride) => (
                        <TableRow key={ride.rideId}>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {ride.rideId}
                            </code>
                          </TableCell>
                          <TableCell>{ride.category}</TableCell>
                          <TableCell>{formatDate(ride.selectedDate)}</TableCell>
                          <TableCell>
                            <Badge className={
                              ride.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              ride.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                              ride.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {ride.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewRide(ride.rideId)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Rides Pagination */}
                  {getTotalRidesPages() > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        Showing {Math.min((ridesCurrentPage - 1) * ridesPerPage + 1, rides.length)} to {Math.min(ridesCurrentPage * ridesPerPage, rides.length)} of {rides.length} rides
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRidesCurrentPage(ridesCurrentPage - 1)}
                          disabled={ridesCurrentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: getTotalRidesPages() }, (_, i) => (
                            <Button
                              key={i + 1}
                              variant={ridesCurrentPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setRidesCurrentPage(i + 1)}
                              className="w-8 h-8 p-0"
                            >
                              {i + 1}
                            </Button>
                          ))}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRidesCurrentPage(ridesCurrentPage + 1)}
                          disabled={ridesCurrentPage === getTotalRidesPages()}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No rides found for this rider
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Referral Info */}
        <div className="space-y-6">
          {/* Referral Information */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Referral Code</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {rider.referralCode}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(rider.referralCode)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Total Referrals</label>
                <p className="text-lg font-semibold">{rider.referrals?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Referral Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Earnings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Total Earnings</label>
                <p className="text-lg font-semibold text-green-600">
                  ₹{rider.referralEarning?.totalEarnings || 0}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Current Balance</label>
                <p className="text-lg font-semibold text-blue-600">
                  ₹{rider.referralEarning?.currentBalance || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Referral History */}
          <Card>
            <CardHeader>
              <CardTitle>Referral History ({rider.referralEarning?.history?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {rider.referralEarning?.history && rider.referralEarning.history.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {getReferralHistoryPaginated().map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{item.description || 'Referral Earning'}</p>
                          <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
                        </div>
                        <p className="text-sm font-semibold text-green-600">+₹{item.amount}</p>
                      </div>
                    ))}
                  </div>

                  {/* Referral Pagination */}
                  {getTotalReferralPages() > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-600">
                        {Math.min((referralCurrentPage - 1) * referralPerPage + 1, rider.referralEarning.history.length)} - {Math.min(referralCurrentPage * referralPerPage, rider.referralEarning.history.length)} of {rider.referralEarning.history.length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReferralCurrentPage(referralCurrentPage - 1)}
                          disabled={referralCurrentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: getTotalReferralPages() }, (_, i) => (
                            <Button
                              key={i + 1}
                              variant={referralCurrentPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setReferralCurrentPage(i + 1)}
                              className="w-8 h-8 p-0"
                            >
                              {i + 1}
                            </Button>
                          ))}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReferralCurrentPage(referralCurrentPage + 1)}
                          disabled={referralCurrentPage === getTotalReferralPages()}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No referral history found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};