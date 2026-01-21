import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Eye, UserPlus, UserMinus, Loader, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { RideFilters } from '@/components/admin/shared/RideFilters';
import { AdminExtraChargesDialog } from '@/components/admin/AdminExtraChargesDialog';
import toast, { Toaster } from 'react-hot-toast';

export const AllRidesPage = ({ onNavigateToDetail }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubcategory, setFilterSubcategory] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Applied filter states
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedFilterCategory, setAppliedFilterCategory] = useState('all');
  const [appliedFilterSubcategory, setAppliedFilterSubcategory] = useState('all');
  const [appliedFilterCity, setAppliedFilterCity] = useState('all');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });
  
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
  
  // Filter subcategories based on selected category
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState([]);

  useEffect(() => {
    fetchRides();
  }, [currentPage, recordsPerPage, dateFilter, appliedSearchQuery, appliedFilterCategory, appliedFilterSubcategory, appliedFilterCity, appliedDateRange]);

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
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterSubcategory('all');
    setFilterCity('all');
    setDateFilter('');
    setDateRange({ from: '', to: '' });
    setAppliedFilterCategory('all');
    setAppliedFilterSubcategory('all');
    setAppliedFilterCity('all');
    setAppliedSearchQuery('');
    setAppliedDateRange({ from: '', to: '' });
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
        ...(appliedSearchQuery && { search: appliedSearchQuery })
      });
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides?${params}`);
      const data = response.data;
      setRides(data.data);
      setTotalPages(data.totalPages);
      setTotalRides(data.totalRides);
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

  const handleRemoveDriver = (ride) => {
    if (!ride.driverInfo) {
      toast.error('No driver assigned to this ride');
      return;
    }
    setSelectedRideForRemoval(ride);
    setShowRemoveDriverDialog(true);
  };

  const confirmDriverRemoval = async () => {
    if (!selectedRideForRemoval) return;
    setRemovingDriver(true);
    try {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/cancel`, {
        rideId: selectedRideForRemoval._id,
        reason: 'Driver removed by admin'
      });
      setShowRemoveDriverDialog(false);
      setSelectedRideForRemoval(null);
      toast.success('Driver removed successfully!');
      fetchRides();
    } catch (err) {
      console.error('Error removing driver:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to remove driver';
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
    <div className="space-y-6 bg-white text-black p-6">
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
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">All Rides</h1>
        <div className="flex space-x-2">
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
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '7%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Ride ID</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Rider Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Driver Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Staff Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Route</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Service Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Usage</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Date & Time</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Payment</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Booked By</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Cancelled By</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride, index) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="text-sm font-mono text-blue-600">
                        {ride.bookingId || 'N/A'}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{ride.riderInfo?.riderName || 'N/A'}</div>
                        <div className="text-xs text-gray-600">{ride.riderInfo?.riderMobile || 'N/A'}</div>
                      </div>
                    </td>

                    <td className="p-3">
                      {ride.driverInfo ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{ride.driverInfo.driverName}</div>
                          <div className="text-xs text-gray-600">{ride.driverInfo.driverMobile}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not Assigned</span>
                      )}
                    </td>

                    <td className="p-3">
                      {ride.staffInfo ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{ride.staffInfo.staffName}</div>
                          <div className="text-xs text-gray-600">{ride.staffInfo.staffMobile}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 truncate" title={ride.rideInfo?.fromLocation?.address}>
                          From: {ride.rideInfo?.fromLocation?.address?.substring(0, 30) || 'N/A'}
                        </div>
                        {ride.rideInfo?.toLocation?.address && (
                          <div className="text-xs text-gray-600 truncate" title={ride.rideInfo.toLocation.address}>
                            To: {ride.rideInfo.toLocation.address.substring(0, 30)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {ride.rideInfo?.categoryName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {ride.rideInfo?.subcategoryName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          {ride.rideInfo.selectedCategory}
                        </div>

                        {(ride.rideInfo.carType || ride.rideInfo.transmissionType) && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600 capitalize">
                              {ride.rideInfo.carType}
                            </div>
                            <div className="text-xs text-gray-600 capitalize">
                              {ride.rideInfo.transmissionType}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-sm text-gray-700">
                        {ride.rideInfo.selectedUsage || 'N/A'}
                      </div>
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
                      <div className="flex items-center space-x-1 text-sm font-semibold text-yellow-600">
                        <span>{formatCurrency(ride.totalPayable)}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="text-sm capitalize">{ride.paymentType}</span>
                    </td>

                    <td className="p-3">
                      <Badge variant={ride.bookedBy === 'STAFF' ? 'secondary' : 'default'} className="text-xs">
                        {ride.bookedBy || 'USER'}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <Badge variant={getStatusBadgeVariant(ride.status)} className="text-xs">
                        {ride.status}
                      </Badge>
                    </td>

                    <td className="p-3">
                      {ride.status === 'CANCELLED' ? (
                        <Badge 
                          variant={ride.whoCancel === 'Admin' ? 'destructive' : ride.whoCancel === 'Driver' ? 'secondary' : 'default'} 
                          className="text-xs"
                        >
                          {ride.whoCancel || 'N/A'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => onNavigateToDetail?.(ride._id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {ride.status === 'BOOKED' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-3 text-xs"
                            onClick={() => handleAssignDriver(ride)}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        {ride.status === 'CONFIRMED' && ride.driverInfo && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 px-3 text-xs"
                            onClick={() => handleRemoveDriver(ride)}
                            title={`Remove driver: ${ride.driverInfo.driverName}`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                        {ride.status !== 'CANCELLED' && ride.status !== 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-3 text-xs"
                            onClick={() => {
                              setSelectedRideForCharges(ride);
                              setShowExtraChargesDialog(true);
                            }}
                          >
                            <DollarSign className="w-4 h-4" />
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

      <Dialog open={showRemoveDriverDialog} onOpenChange={setShowRemoveDriverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Driver from Ride</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to remove driver <strong>{selectedRideForRemoval?.driverInfo?.driverName}</strong> from this ride?
            </p>
            <p className="text-xs text-gray-500">
              This will cancel the current ride and create a new booking for reassignment.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDriverDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDriverRemoval} disabled={removingDriver}>
              {removingDriver ? 'Removing...' : 'Remove Driver'}
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