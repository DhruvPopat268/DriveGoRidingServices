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
  DollarSign,
  FileText,
  Shield,
  Route,
  Timer,
  Loader
} from 'lucide-react';

interface RideDetails {
  _id: string;
  riderId: string;
  riderInfo: {
    riderName: string;
    riderMobile: string;
  };
  rideInfo: {
    categoryName: string;
    subcategoryName: string;
    subSubcategoryName?: string;
    carType: string;
    transmissionType: string;
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rides/booking/${rideId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch ride details');
      }

      const data = await response.json();
      setRideDetails(data.data);
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

  const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return amount % 1 === 0 ? `₹${amount}` : `₹${amount.toFixed(2)}`;
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
            Back to Rides
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

              {rideDetails.rideInfo.selectedUsage && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center">
                    <Timer className="w-4 h-4 mr-1" />
                    Duration
                  </label>
                  <p className="text-lg">{rideDetails.rideInfo.selectedUsage} hours</p>
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
            </CardContent>
          </Card>
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
              <div className="flex justify-between">
                <span className="flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Insurance
                </span>
                <span>{formatCurrency(rideDetails.rideInfo.insuranceCharges)}</span>
              </div>
              {rideDetails.rideInfo.cancellationCharges > 0 && (
                <div className="flex justify-between">
                  <span>Cancellation Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.cancellationCharges)}</span>
                </div>
              )}
              {Number(rideDetails.rideInfo.extraKmCharges) > 0 && (
                <div className="flex justify-between">
                  <span>Extra KM Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.extraKmCharges)}</span>
                </div>
              )}

              {Number(rideDetails.rideInfo.extraMinutesCharges) > 0 && (
                <div className="flex justify-between">
                  <span>Extra Time Charges</span>
                  <span>{formatCurrency(rideDetails.rideInfo.extraMinutesCharges)}</span>
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
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(rideDetails.rideInfo.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Payable</span>
                <span>{formatCurrency(rideDetails.totalPayable)}</span>
              </div>
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