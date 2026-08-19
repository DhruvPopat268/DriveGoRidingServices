import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Eye, UserPlus, UserMinus, Loader, ChevronLeft, ChevronRight, XCircle, CalendarClock, MapPin } from 'lucide-react';
import { RupeeIcon } from '@/components/ui/RupeeIcon';
import { apiClient } from '@/lib/apiClient';
import { RideFilters } from '@/components/admin/shared/RideFilters';
import { AdminExtraChargesDialog } from '@/components/admin/AdminExtraChargesDialog';
import toast, { Toaster } from 'react-hot-toast';

export const AllRidesPage = ({ onNavigateToDetail, onNavigateToRiderDetail, onNavigateToDriverDetail }) => {
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
  
  // Driver assignment states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  
  // Extra charges dialog states
  const [showExtraChargesDialog, setShowExtraChargesDialog] = useState(false);
  const [selectedRideForCharges, setSelectedRideForCharges] = useState(null);
  
  // Remove driver dialog states
  const [showRemoveDriverDialog, setShowRemoveDriverDialog] = useState(false);
  const [selectedRideForRemoval, setSelectedRideForRemoval] = useState(null);
  const [removingDriver, setRemovingDriver] = useState(false);

  // Cancel ride dialog states
  const [showCancelRideDialog, setShowCancelRideDialog] = useState(false);
  const [selectedRideForCancel, setSelectedRideForCancel] = useState(null);
  const [cancellingRide, setCancellingRide] = useState(false);

  // Reschedule dialog states
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showRescheduleConfirmDialog, setShowRescheduleConfirmDialog] = useState(false);
  const [selectedRideForReschedule, setSelectedRideForReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  
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
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides?${params}`);
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

  const handleAssignDriver = async (ride) => {
    if (ride.status !== 'BOOKED') {
      toast.error('Only booked rides can be assigned to drivers');
      return;
    }
    setSelectedRide(ride);
    setShowAssignDialog(true);
    try {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/eligible-drivers`, {
        rideId: ride._id
      });
      const data = response.data;
      setEligibleDrivers(data.drivers || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setEligibleDrivers([]);
    }
  };

  const confirmDriverAssignment = async () => {
    if (!selectedDriver || !selectedRide) return;
    setAssigningDriver(true);
    try {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/driver/confirm`, {
        rideId: selectedRide._id, 
        driverId: selectedDriver
      });
      setShowAssignDialog(false);
      setSelectedDriver('');
      toast.success('Driver assigned successfully!');
      fetchRides();
    } catch (err) {
      console.error('Error assigning driver:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign driver';
      toast.error(errorMessage);
    } finally {
      setAssigningDriver(false);
    }
  };

  const handleRemoveDriver = async (ride) => {
    if (!ride.driverInfo) {
      toast.error('No driver assigned to this ride');
      return;
    }
    setSelectedRideForRemoval(ride);
    setShowRemoveDriverDialog(true);
    try {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/eligible-drivers`, {
        rideId: ride._id
      });
      setEligibleDrivers(response.data.drivers || []);
    } catch (err) {
      setEligibleDrivers([]);
    }
  };

  const handleReschedule = (ride) => {
    setSelectedRideForReschedule(ride);
    setRescheduleDate('');
    setRescheduleTime('');
    setShowRescheduleDialog(true);
  };

  const proceedToRescheduleConfirm = () => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error('Please select both date and time');
      return;
    }
    setShowRescheduleDialog(false);
    setShowRescheduleConfirmDialog(true);
  };

  const confirmReschedule = async () => {
    if (!selectedRideForReschedule) return;
    setRescheduling(true);
    try {
      await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/reschedule`, {
        rideId: selectedRideForReschedule._id,
        selectedDate: rescheduleDate,
        selectedTime: rescheduleTime
      });
      setShowRescheduleConfirmDialog(false);
      setSelectedRideForReschedule(null);
      toast.success('Ride rescheduled successfully!');
      fetchRides();
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to reschedule ride';
      toast.error(errorMessage);
    } finally {
      setRescheduling(false);
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

  const confirmDriverRemoval = async () => {
    if (!selectedRideForRemoval || !selectedDriver) return;
    setRemovingDriver(true);
    try {
      await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/reassign-driver`, {
        rideId: selectedRideForRemoval._id,
        newDriverId: selectedDriver
      });
      setShowRemoveDriverDialog(false);
      setSelectedRideForRemoval(null);
      setSelectedDriver('');
      toast.success('Driver reassigned successfully!');
      fetchRides();
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to reassign driver';
      toast.error(errorMessage);
    } finally {
      setRemovingDriver(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading all rides...</span>
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
        <h1 className="text-2xl font-bold text-black">All Rides</h1>
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
            All Rides ({totalRides})
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
                {rides.map((ride, index) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
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

                    <td className="p-3">
                      <div className="text-sm font-medium capitalize">{ride.rideInfo?.categoryName || 'N/A'}</div>
                    </td>

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

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-700">
                          {ride.rideInfo.selectedUsage || 'N/A'}
                        </div>
                        <div className="text-sm font-semibold text-yellow-600">
                          {formatCurrency(ride.totalPayable)}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{ride.paymentType}</div>
                      </div>
                    </td>

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

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span>{formatDate(ride.rideInfo.selectedDate)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span>{formatTime(ride.rideInfo.selectedTime)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <Badge variant={getStatusBadgeVariant(ride.status)} className="text-xs">
                        {ride.status}
                      </Badge>
                    </td>

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
                        {ride.status === 'BOOKED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs w-full justify-start bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            onClick={() => handleAssignDriver(ride)}
                          >
                            Assign Driver
                          </Button>
                        )}
                        {ride.status === 'CONFIRMED' && ride.driverInfo && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs w-full justify-start bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                            onClick={() => handleRemoveDriver(ride)}
                          >
                            Reassign Driver
                          </Button>
                        )}
                        {ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED' && ride.status !== 'ONGOING' && ride.status !== 'EXTENDED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs w-full justify-start bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                            onClick={() => handleReschedule(ride)}
                          >
                            Reschedule
                          </Button>
                        )}
                        {ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs w-full justify-start bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                            onClick={() => { setSelectedRideForCharges(ride); setShowExtraChargesDialog(true); }}
                          >
                            Extra Charges
                          </Button>
                        )}
                        {ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs w-full justify-start bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            onClick={() => handleCancelRide(ride)}
                          >
                            Cancel Ride
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {dateFilter === 'today' ? 'No rides found for today' :
                dateFilter === 'yesterday' ? 'No rides found for yesterday' :
                  'No rides found'}
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
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver to Ride</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Driver</label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDrivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span>{driver.name} - {driver.mobile}</span>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">₹{driver.currentBalance}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {eligibleDrivers.length === 0 && (
              <p className="text-sm text-gray-500">No eligible drivers available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={confirmDriverAssignment} disabled={!selectedDriver || assigningDriver}>
              {assigningDriver ? 'Assigning...' : 'Assign Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Date/Time Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Ride #{selectedRideForReschedule?.bookingId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Current: {selectedRideForReschedule?.rideInfo?.selectedDate ? new Date(selectedRideForReschedule.rideInfo.selectedDate).toLocaleDateString('en-IN') : 'N/A'} at {selectedRideForReschedule?.rideInfo?.selectedTime || 'N/A'}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Time</label>
              <input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>Cancel</Button>
            <Button onClick={proceedToRescheduleConfirm} disabled={!rescheduleDate || !rescheduleTime}>Next</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Confirmation Dialog */}
      <Dialog open={showRescheduleConfirmDialog} onOpenChange={setShowRescheduleConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reschedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Are you sure you want to reschedule ride <strong>#{selectedRideForReschedule?.bookingId}</strong>?
            </p>
            <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
              <p className="text-gray-500">From: <span className="text-gray-800">{selectedRideForReschedule?.rideInfo?.selectedDate ? new Date(selectedRideForReschedule.rideInfo.selectedDate).toLocaleDateString('en-IN') : 'N/A'} at {selectedRideForReschedule?.rideInfo?.selectedTime || 'N/A'}</span></p>
              <p className="text-gray-500">To: <span className="font-medium text-gray-800">{rescheduleDate ? new Date(rescheduleDate).toLocaleDateString('en-IN') : ''} at {rescheduleTime}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRescheduleConfirmDialog(false); setShowRescheduleDialog(true); }}>Back</Button>
            <Button onClick={confirmReschedule} disabled={rescheduling}>
              {rescheduling ? 'Rescheduling...' : 'Yes, Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={showRemoveDriverDialog} onOpenChange={setShowRemoveDriverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Driver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Current driver: <strong>{selectedRideForRemoval?.driverInfo?.driverName}</strong>
            </p>
            <div>
              <label className="text-sm font-medium">Select New Driver</label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a driver" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleDrivers.map((driver) => (
                    <SelectItem key={driver._id} value={driver._id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${driver.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span>{driver.name} - {driver.mobile}</span>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">₹{driver.currentBalance}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {eligibleDrivers.length === 0 && (
              <p className="text-sm text-gray-500">No eligible drivers available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDriverDialog(false)}>Cancel</Button>
            <Button variant="default" onClick={confirmDriverRemoval} disabled={!selectedDriver || removingDriver}>
              {removingDriver ? 'Reassigning...' : 'Reassign Driver'}
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