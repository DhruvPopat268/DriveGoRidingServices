import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Eye, Loader, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { RideFilters } from '@/components/admin/shared/RideFilters';
import { AdminExtraChargesDialog } from '@/components/admin/AdminExtraChargesDialog';
import toast, { Toaster } from 'react-hot-toast';

export const ExtendedRidesPage = ({ onNavigateToDetail, onNavigateToRiderDetail, onNavigateToDriverDetail }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState('');
  const [riderStats, setRiderStats] = useState<Record<string, { completed: number; cancelled: number }>>({});
  const [driverStats, setDriverStats] = useState<Record<string, { completed: number; cancelled: number }>>({}); 

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubcategory, setFilterSubcategory] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filterRider, setFilterRider] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');

  // Applied filter states
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedFilterCategory, setAppliedFilterCategory] = useState('all');
  const [appliedFilterSubcategory, setAppliedFilterSubcategory] = useState('all');
  const [appliedFilterCity, setAppliedFilterCity] = useState('all');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });
  const [appliedFilterRider, setAppliedFilterRider] = useState('all');
  const [appliedFilterDriver, setAppliedFilterDriver] = useState('all');

  // Extra charges dialog states
  const [showExtraChargesDialog, setShowExtraChargesDialog] = useState(false);
  const [selectedRideForCharges, setSelectedRideForCharges] = useState(null);

  // Cancel ride dialog states
  const [showCancelRideDialog, setShowCancelRideDialog] = useState(false);
  const [selectedRideForCancel, setSelectedRideForCancel] = useState(null);
  const [cancellingRide, setCancellingRide] = useState(false);

  // Filter subcategories based on selected category
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState([]);

  useEffect(() => {
    fetchRides();
  }, [currentPage, recordsPerPage, dateFilter, appliedSearchQuery, appliedFilterCategory, appliedFilterSubcategory, appliedFilterCity, appliedDateRange, appliedFilterRider, appliedFilterDriver]);

  const handleDateFilter = (filter) => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedFilterCategory(filterCategory);
    setAppliedFilterSubcategory(filterSubcategory);
    setAppliedFilterCity(filterCity);
    setAppliedDateRange(dateRange);
    setAppliedFilterRider(filterRider);
    setAppliedFilterDriver(filterDriver);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterSubcategory('all');
    setFilterCity('all');
    setDateFilter('');
    setDateRange({ from: '', to: '' });
    setFilterRider('all');
    setFilterDriver('all');
    setAppliedFilterCategory('all');
    setAppliedFilterSubcategory('all');
    setAppliedFilterCity('all');
    setAppliedSearchQuery('');
    setAppliedDateRange({ from: '', to: '' });
    setAppliedFilterRider('all');
    setAppliedFilterDriver('all');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const fetchRides = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        ...(dateFilter && { date: dateFilter }),
        ...(appliedDateRange.from && { fromDate: appliedDateRange.from }),
        ...(appliedDateRange.to && { toDate: appliedDateRange.to }),
        ...(appliedFilterCategory && appliedFilterCategory !== 'all' && { categoryId: appliedFilterCategory }),
        ...(appliedFilterSubcategory && appliedFilterSubcategory !== 'all' && { subCategoryId: appliedFilterSubcategory }),
        ...(appliedFilterCity && appliedFilterCity !== 'all' && { city: appliedFilterCity }),
        ...(appliedSearchQuery && { search: appliedSearchQuery }),
        ...(appliedFilterRider && appliedFilterRider !== 'all' && { userId: appliedFilterRider }),
        ...(appliedFilterDriver && appliedFilterDriver !== 'all' && { driverId: appliedFilterDriver })
      });
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides/extended?${params}`);
      const data = response.data;
      setRides(data.data);
      setTotalPages(data.totalPages);
      setTotalRides(data.totalRides);
      setRiderStats(data.riderStats || {});
      setDriverStats(data.driverStats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString || 'N/A';
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toFixed(2) || '0.00'}`;
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'BOOKED': return 'secondary';
      case 'CONFIRMED': return 'default';
      case 'ONGOING': return 'default';
      case 'REACHED': return 'default';
      case 'EXTENDED': return 'default';
      case 'COMPLETED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleCancelRide = (ride) => {
    if (['CANCELLED', 'COMPLETED'].includes(ride.status)) {
      toast.error('This ride cannot be cancelled');
      return;
    }
    setSelectedRideForCancel(ride);
    setShowCancelRideDialog(true);
  };

  const confirmCancelRide = async () => {
    if (!selectedRideForCancel) return;
    setCancellingRide(true);
    try {
      await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/cancel`, {
        rideId: selectedRideForCancel._id,
        reason: 'Cancelled by admin'
      });
      setShowCancelRideDialog(false);
      setSelectedRideForCancel(null);
      toast.success('Ride cancelled successfully!');
      fetchRides();
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to cancel ride';
      toast.error(errorMessage);
    } finally {
      setCancellingRide(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading extended rides...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 bg-white text-black p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white text-black p-6 overflow-x-hidden">
      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl font-bold text-black">Extended Rides</h1>
        <div className="flex flex-wrap space-x-2 gap-2">
          <Button variant="outline" onClick={fetchRides}>
            Refresh
          </Button>
          <Button
            variant={dateFilter === 'today' ? 'default' : 'outline'}
            onClick={() => handleDateFilter('today')}
          >
            Today's Rides
          </Button>
          <Button
            variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
            onClick={() => handleDateFilter('yesterday')}
          >
            Yesterday's Rides
          </Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-black">
            Extended Rides ({totalRides})
          </CardTitle>
        </CardHeader>
        <div className="px-6">
          {/* Filter Section */}
          <RideFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            filterSubcategory={filterSubcategory}
            setFilterSubcategory={setFilterSubcategory}
            filterCity={filterCity}
            setFilterCity={setFilterCity}
            dateRange={dateRange}
            handleDateRangeChange={handleDateRangeChange}
            clearFilters={clearFilters}
            applyFilters={applyFilters}
            dateFilter={dateFilter}
            filterSubcategoriesForFilter={filterSubcategoriesForFilter}
            filterRider={filterRider}
            setFilterRider={setFilterRider}
            filterDriver={filterDriver}
            setFilterDriver={setFilterDriver}
          />

          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">records</span>
            </div>
          </div>
        </div>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: '1400px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  {['Ride ID','Rider Info','Route','Category','Service Type','Usage','Partner Details','Date & Time','Status','Actions'].map(col => (
                    <th key={col} className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    {/* Ride ID */}
                    <td className="p-3">
                      <div className="text-sm font-mono text-blue-600">
                        {ride.bookingId || 'N/A'}
                      </div>
                      <Badge variant={ride.bookedBy === 'STAFF' ? 'secondary' : 'default'} className="text-xs mt-1">
                        {ride.bookedBy || 'USER'}
                      </Badge>
                      {ride.city && (
                        <div className="text-xs text-gray-500 mt-0.5">{ride.city}</div>
                      )}
                    </td>

                    {/* Rider Info */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{ride.riderInfo?.riderName || 'N/A'}</div>
                        <div className="text-xs text-gray-600">{ride.riderInfo?.riderMobile || 'N/A'}</div>
                        {ride.riderId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs mt-1"
                            onClick={() => onNavigateToRiderDetail?.(ride.riderId)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        )}
                        <div className="text-xs text-green-600">Completed - {riderStats[ride.riderId?.toString()]?.completed || 0}</div>
                        <div className="text-xs text-red-500">Cancelled - {riderStats[ride.riderId?.toString()]?.cancelled || 0}</div>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="p-3" style={{ maxWidth: '160px' }}>
                      <div className="space-y-1">
                        <div className="flex items-start gap-1">
                          {ride.rideInfo?.fromLocation?.address ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ride.rideInfo.fromLocation.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open in Google Maps: ${ride.rideInfo.fromLocation.address}`}
                              className="flex-shrink-0 mt-0.5"
                            >
                              <MapPin className="w-3 h-3 text-green-600 hover:text-green-800" />
                            </a>
                          ) : null}
                          <div className="text-xs text-gray-600 truncate" title={ride.rideInfo?.fromLocation?.address}>
                            From: {ride.rideInfo?.fromLocation?.address?.substring(0, 28) || 'N/A'}
                          </div>
                        </div>
                        {ride.rideInfo?.toLocation?.address && (
                          <div className="flex items-start gap-1">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ride.rideInfo.toLocation.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Open in Google Maps: ${ride.rideInfo.toLocation.address}`}
                              className="flex-shrink-0 mt-0.5"
                            >
                              <MapPin className="w-3 h-3 text-red-500 hover:text-red-700" />
                            </a>
                            <div className="text-xs text-gray-600 truncate" title={ride.rideInfo.toLocation.address}>
                              To: {ride.rideInfo.toLocation.address.substring(0, 28)}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-3">
                      <div className="text-sm font-medium capitalize">{ride.rideInfo?.categoryName || 'N/A'}</div>
                    </td>

                    {/* Service Type */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 capitalize">{ride.rideInfo?.subcategoryName || 'N/A'}</div>
                        {ride.rideInfo?.subcategoryName?.toLowerCase() === 'outstation' && ride.rideInfo?.subSubcategoryName && (
                          <div className="text-xs text-gray-500 capitalize">{ride.rideInfo.subSubcategoryName}</div>
                        )}
                        <div className="text-xs text-gray-600 capitalize">{ride.rideInfo?.selectedCategory}</div>
                        {(ride.rideInfo?.carType || ride.rideInfo?.transmissionType) && (
                          <div className="text-xs text-gray-600 capitalize">{ride.rideInfo.carType} {ride.rideInfo.transmissionType}</div>
                        )}
                      </div>
                    </td>

                    {/* Usage */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-700">
                          {ride.rideInfo?.selectedUsage || 'N/A'}
                        </div>
                        <div className="text-sm font-semibold text-yellow-600">
                          {formatCurrency(ride.totalPayable)}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{ride.paymentType}</div>
                      </div>
                    </td>

                    {/* Partner Details */}
                    <td className="p-3">
                      {ride.driverInfo ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{ride.driverInfo.driverName}</div>
                          <div className="text-xs text-gray-600">{ride.driverInfo.driverMobile}</div>
                          {ride.driverId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs mt-1"
                              onClick={() => onNavigateToDriverDetail?.(ride.driverId)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                          <div className="text-xs text-green-600">Completed - {driverStats[ride.driverId?.toString()]?.completed || 0}</div>
                          <div className="text-xs text-red-500">Cancelled - {driverStats[ride.driverId?.toString()]?.cancelled || 0}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not Assigned</span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span>{formatDate(ride.rideInfo?.selectedDate)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span>{formatTime(ride.rideInfo?.selectedTime)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <Badge variant={getStatusBadgeVariant(ride.status)} className="text-xs">
                        {ride.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs w-full justify-start bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          onClick={() => onNavigateToDetail?.(ride._id)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs w-full justify-start bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                          onClick={() => { setSelectedRideForCharges(ride); setShowExtraChargesDialog(true); }}
                        >
                          Extra Charges
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs w-full justify-start bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          onClick={() => handleCancelRide(ride)}
                        >
                          Cancel Ride
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {dateFilter === 'today' ? 'No extended rides found for today' :
                dateFilter === 'yesterday' ? 'No extended rides found for yesterday' :
                  'No extended rides found'}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalRides)} to {Math.min(currentPage * recordsPerPage, totalRides)} of {totalRides} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Ride Dialog */}
      <Dialog open={showCancelRideDialog} onOpenChange={setShowCancelRideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Ride</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel ride <strong>#{selectedRideForCancel?.bookingId}</strong>?
            </p>
            <p className="text-xs text-gray-500">
              Rider: {selectedRideForCancel?.riderInfo?.riderName} ({selectedRideForCancel?.riderInfo?.riderMobile})
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelRideDialog(false)}>No, Keep it</Button>
            <Button variant="destructive" onClick={confirmCancelRide} disabled={cancellingRide}>
              {cancellingRide ? 'Cancelling...' : 'Yes, Cancel Ride'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminExtraChargesDialog
        isOpen={showExtraChargesDialog}
        onClose={() => {
          setShowExtraChargesDialog(false);
          setSelectedRideForCharges(null);
        }}
        rideId={selectedRideForCharges?._id || ''}
        onSuccess={fetchRides}
      />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
    </div>
  );
};
