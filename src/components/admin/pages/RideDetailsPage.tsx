import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Car,
  CreditCard,
  FileText,
  Shield,
  Route,
  Timer,
  Loader,
  UserCheck
} from 'lucide-react';
import { RupeeIcon } from '@/components/ui/RupeeIcon';
import apiClient from '../../../lib/axiosInterceptor';

interface RideDetails {
  _id: string;
  riderId: string;
  riderInfo: {
    riderName: string;
    riderMobile: string;
  };
  driverInfo?: {
    driverName: string;
    driverMobile: string;
  };
  staffInfo?: {
    staffName: string;
    staffMobile: string;
  };
  bookedBy?: string;
  rescheduleRequest?: {
    status: string;
    requestedDate: string;
    requestedTime: string;
    requestedAt: string;
    respondedAt: string;
  };
  rideInfo: {
    categoryName: string;
    subcategoryName: string;
    subSubcategoryName?: string;
    carType: string;
    transmissionType: string;
    SelectedDays?: string;
    selectedDates?: string[];
    remainingDates?: string[];
    completedDates?: string[];
    vehicleType?: string;
    selectedParcelCategory?: string;
    fromLocation: {
      address: string;
      lat: number;
      lng: number;
    };
    toLocation?: {
      address: string;
      lat: number;
      lng: number;
    };
    selectedDate: string;
    selectedTime: string;
    selectedUsage: string;
    selectedCategory: string;
    includeInsurance: boolean;
    notes: string;
    driverReachTime?: string;
    rideStartTime?: string;
    rideEndTime?: string;
    driverCharges: number;
    pickCharges: number;
    peakCharges: number;
    nightCharges: number;
    insuranceCharges: number;
    cancellationCharges: number;
    discount: number;
    gstCharges: number;
    subtotal: number;
    adminCharges: number;
    extended?: boolean;
    extraKm?: number;
    extraMinutes?: number;
    extraKmCharges?: number;
    extraMinutesCharges?: number;
  };
  totalPayable: number;
  paymentType: string;
  status: string;
  referralEarning: boolean;
  referralBalance: number;
  isReferralEarningUsed?: boolean;
  referralEarningUsedAmount?: number;
  createdAt: string;
  updatedAt: string;
}

interface RideDetailsPageProps {
  rideId: string;
  onBack: () => void;
}

export const RideDetailsPage = ({ rideId, onBack }: RideDetailsPageProps) => {
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rideId) {
      fetchRideDetails(rideId);
    }
  }, [rideId]);

  const fetchRideDetails = async (rideId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides/booking/${rideId}`);
      setRideDetails(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-600 text-white';
      case 'ongoing':
        return 'bg-blue-600 text-white';
      case 'booked':
        return 'bg-yellow-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      case 'confirmed':
        return 'bg-purple-600 text-white';
      case 'reached':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return amount % 1 === 0 ? `₹${amount}` : `₹${amount.toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return null;
    
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);
    if (mins > 0) parts.push(`${mins} ${mins === 1 ? 'Minute' : 'Minutes'}`);
    
    return parts.join(' ');
  };

  const parseAndFormatUsage = (usageString: string) => {
    if (!usageString) return null;
    
    // Parse "0Km & 120Mins" format
    const kmMatch = usageString.match(/(\d+)Km/);
    const minsMatch = usageString.match(/(\d+)Mins/);
    
    const km = kmMatch ? parseInt(kmMatch[1]) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
    
    const parts = [];
    
    // Add KM if > 0
    if (km > 0) {
      parts.push(`${km} Km`);
    }
    
    // Add formatted duration if > 0
    if (mins > 0) {
      const formattedDuration = formatDuration(mins);
      if (formattedDuration) {
        parts.push(formattedDuration);
      }
    }
    
    return parts.length > 0 ? parts.join(' & ') : null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading ride details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rides
        </Button>
      </div>
    );
  }

  if (!rideDetails) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-4">Ride not found</div>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rides
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ride Details</h1>
            <p className="text-gray-600">#{rideDetails._id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <Badge className={getStatusColor(rideDetails.status)}>
          {rideDetails.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rider Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Rider Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg">{rideDetails.riderInfo.riderName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Mobile</label>
                  <p className="text-lg flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    {rideDetails.riderInfo.riderMobile}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Staff Information */}
          {rideDetails.staffInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="w-5 h-5 mr-2" />
                  Staff Information
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {rideDetails.bookedBy || 'STAFF'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Staff Name</label>
                    <p className="text-lg">{rideDetails.staffInfo.staffName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Staff Mobile</label>
                    <p className="text-lg flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {rideDetails.staffInfo.staffMobile}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Driver Information */}
          {rideDetails.driverInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Driver Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-lg">{rideDetails.driverInfo.driverName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Mobile</label>
                    <p className="text-lg flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {rideDetails.driverInfo.driverMobile}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Route className="w-5 h-5 mr-2" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Service Type</label>
                  <p className="text-lg font-medium capitalize">{rideDetails.rideInfo.categoryName}</p>
                  <p className="text-sm text-gray-500 capitalize">{rideDetails.rideInfo.subcategoryName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Driver Category</label>
                  <p className="text-lg font-medium capitalize">{rideDetails.rideInfo.selectedCategory}</p>
                  {(rideDetails.rideInfo.carType || rideDetails.rideInfo.transmissionType) && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 capitalize">{rideDetails.rideInfo.carType}</p>
                      <p className="text-sm text-gray-500 capitalize">{rideDetails.rideInfo.transmissionType}</p>
                    </div>
                  )}
                  {rideDetails.rideInfo.categoryName?.toLowerCase() === 'parcel' && (
                    <div className="space-y-1 mt-2">
                      {rideDetails.rideInfo.vehicleType && (
                        <p className="text-sm text-gray-500">Vehicle: <span className="font-medium">{rideDetails.rideInfo.vehicleType}</span></p>
                      )}
                      {rideDetails.rideInfo.selectedParcelCategory && (
                        <p className="text-sm text-gray-500">Parcel Category: <span className="font-medium">{rideDetails.rideInfo.selectedParcelCategory}</span></p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                  <MapPin className="w-4 h-4 mr-1 text-green-500" />
                  Pickup Location
                </label>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">
                  {rideDetails.rideInfo.fromLocation.address}
                </p>
              </div>

              {rideDetails.rideInfo.toLocation && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center mb-2">
                    <MapPin className="w-4 h-4 mr-1 text-red-500" />
                    Drop Location
                  </label>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">
                    {rideDetails.rideInfo.toLocation.address}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Date
                  </label>
                  <p className="text-lg">{formatDate(rideDetails.rideInfo.selectedDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Time
                  </label>
                  <p className="text-lg">{rideDetails.rideInfo.selectedTime}</p>
                </div>
              </div>

              {(rideDetails.rideInfo.driverReachTime || rideDetails.rideInfo.rideStartTime || rideDetails.rideInfo.rideEndTime) && (
                <>
                  <Separator />
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Ride Timings</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {rideDetails.rideInfo.driverReachTime && (
                        <div>
                          <label className="text-xs font-medium text-gray-600">Driver Reach Time</label>
                          <p className="text-sm font-semibold text-gray-900">{rideDetails.rideInfo.driverReachTime}</p>
                        </div>
                      )}
                      {rideDetails.rideInfo.rideStartTime && (
                        <div>
                          <label className="text-xs font-medium text-gray-600">Ride Start Time</label>
                          <p className="text-sm font-semibold text-gray-900">{rideDetails.rideInfo.rideStartTime}</p>
                        </div>
                      )}
                      {rideDetails.rideInfo.rideEndTime && (
                        <div>
                          <label className="text-xs font-medium text-gray-600">Ride End Time</label>
                          <p className="text-sm font-semibold text-gray-900">{rideDetails.rideInfo.rideEndTime}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {rideDetails.rideInfo.selectedUsage && parseAndFormatUsage(rideDetails.rideInfo.selectedUsage) && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <Timer className="w-4 h-4 mr-1" />
                    Duration
                  </label>
                  <p className="text-lg">{parseAndFormatUsage(rideDetails.rideInfo.selectedUsage)}</p>
                </div>
              )}

              {rideDetails.rideInfo.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <FileText className="w-4 h-4 mr-1" />
                    Notes
                  </label>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{rideDetails.rideInfo.notes}</p>
                </div>
              )}

              {(rideDetails.rideInfo.subcategoryName?.toLowerCase() === 'weekly' || 
                rideDetails.rideInfo.subcategoryName?.toLowerCase() === 'monthly') && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Weekly/Monthly Details</h3>
                    
                    {rideDetails.rideInfo.SelectedDays && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Selected Days</label>
                        <p className="text-lg font-semibold">{rideDetails.rideInfo.SelectedDays} days</p>
                      </div>
                    )}

                    {rideDetails.rideInfo.selectedDates && rideDetails.rideInfo.selectedDates.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Selected Dates</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rideDetails.rideInfo.selectedDates.map((date, index) => (
                            <Badge key={index} variant="outline" className="bg-blue-50">
                              {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rideDetails.rideInfo.completedDates && rideDetails.rideInfo.completedDates.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Completed Dates</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rideDetails.rideInfo.completedDates.map((date, index) => (
                            <Badge key={index} variant="outline" className="bg-green-50 text-green-700">
                              {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rideDetails.rideInfo.remainingDates && rideDetails.rideInfo.remainingDates.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Remaining Dates</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rideDetails.rideInfo.remainingDates.map((date, index) => (
                            <Badge key={index} variant="outline" className="bg-yellow-50 text-yellow-700">
                              {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reschedule Request */}
          {rideDetails.rescheduleRequest && rideDetails.rescheduleRequest.status && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Reschedule Request
                  </span>
                  <Badge className={
                    rideDetails.rescheduleRequest.status === 'ACCEPTED' ? 'bg-green-600 text-white' :
                    rideDetails.rescheduleRequest.status === 'REJECTED' ? 'bg-red-600 text-white' :
                    'bg-yellow-600 text-white'
                  }>
                    {rideDetails.rescheduleRequest.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Requested Date</label>
                    <p className="text-lg">{formatDate(rideDetails.rescheduleRequest.requestedDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Requested Time</label>
                    <p className="text-lg">{rideDetails.rescheduleRequest.requestedTime}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Requested At</label>
                    <p className="text-sm">{formatDateTime(rideDetails.rescheduleRequest.requestedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Responded At</label>
                    <p className="text-sm">{formatDateTime(rideDetails.rescheduleRequest.respondedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Payment & Additional Info */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Driver Charges</span>
                <span>{formatCurrency(rideDetails.rideInfo.driverCharges)}</span>
              </div>
              {rideDetails.rideInfo.extraMinutesCharges > 0 && (
                <div className="flex justify-between">
                  <span>Extra Minutes Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.extraMinutesCharges)}</span>
                </div>
              )}
              {rideDetails.rideInfo.extraKmCharges > 0 && (
                <div className="flex justify-between">
                  <span>Extra KM Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.extraKmCharges)}</span>
                </div>
              )}
              {rideDetails.rideInfo.pickCharges > 0 && (
                <div className="flex justify-between">
                  <span>Pick Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.pickCharges)}</span>
                </div>
              )}
              {rideDetails.rideInfo.peakCharges > 0 && (
                <div className="flex justify-between">
                  <span>Peak Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.peakCharges)}</span>
                </div>
              )}
              {rideDetails.rideInfo.nightCharges > 0 && (
                <div className="flex justify-between">
                  <span>Night Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.nightCharges)}</span>
                </div>
              )}
              {rideDetails.rideInfo.insuranceCharges > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Insurance
                </span>
                <span>{formatCurrency(rideDetails.rideInfo.insuranceCharges)}</span>
              </div>
              )}
              {rideDetails.rideInfo.cancellationCharges > 0 && (
                <div className="flex justify-between">
                  <span>User Cancellation Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.cancellationCharges)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Admin Charges</span>
                <span>{formatCurrency(rideDetails.rideInfo.adminCharges)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST</span>
                <span>{formatCurrency(rideDetails.rideInfo.gstCharges)}</span>
              </div>
              {rideDetails.rideInfo.discount > 0 && (
                <div className="flex justify-between ">
                  <span>Discount</span>
                  <span>-{formatCurrency(rideDetails.rideInfo.discount)}</span>
                </div>
              )}
              {rideDetails.rideInfo?.adminAddedRideExtraCharges?.Charges > 0 && (
                <div className="flex justify-between ">
                  <span>Admin Added Ride Extra Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.adminAddedRideExtraCharges?.Charges)}</span>
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Payable</span>
                <span>{formatCurrency(rideDetails.totalPayable)}</span>
              </div>
              {rideDetails.isReferralEarningUsed && rideDetails.referralEarningUsedAmount > 0 && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">Referral Earning Used</span>
                    <span className="text-sm font-semibold text-green-700">{formatCurrency(rideDetails.referralEarningUsedAmount)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-600">Payment Method</span>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  <span className="capitalize">{rideDetails.paymentType}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Ride ID</label>
                <p className="font-mono text-sm">{rideDetails._id}</p>
              </div>
              {rideDetails.bookedBy && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Booked By</label>
                  <Badge variant="secondary" className="mt-1">
                    {rideDetails.bookedBy}
                  </Badge>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Created At</label>
                <p className="text-sm">{formatDate(rideDetails.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Last Updated</label>
                <p className="text-sm">{formatDate(rideDetails.updatedAt)}</p>
              </div>
              {rideDetails.referralEarning && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Referral Earning</label>
                  <p className="text-sm text-green-600">
                    Applied: {formatCurrency(rideDetails.referralBalance)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Insurance Included</label>
                <p className="text-sm">
                  {rideDetails.rideInfo.includeInsurance ? 'Yes' : 'No'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};