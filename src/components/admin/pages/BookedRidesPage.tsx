import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, User, Phone, Calendar, Eye, Loader, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { RupeeIcon } from "@/components/ui/RupeeIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminExtraChargesDialog } from "../AdminExtraChargesDialog";
import { RideFilters } from "../shared/RideFilters";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/axiosInterceptor";

interface SubCategory {
  _id: string;
  name: string;
  categoryId: string;
}

interface BookedRidesPageProps {
  onNavigateToDetail?: (rideId: string) => void;
}

export const BookedRidesPage = ({ onNavigateToDetail }: BookedRidesPageProps) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);
  const [dateFilter, setDateFilter] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const limit = recordsPerPage;
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [showExtraChargesDialog, setShowExtraChargesDialog] = useState(false);
  const [selectedRideForCharges, setSelectedRideForCharges] = useState(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter states (applied filters)
  const [appliedFilterCategory, setAppliedFilterCategory] = useState<string>('all');
  const [appliedFilterSubcategory, setAppliedFilterSubcategory] = useState<string>('all');
  const [appliedFilterCity, setAppliedFilterCity] = useState<string>('all');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>('');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });

  // Filter states (UI states - not applied until Apply is clicked)
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState<SubCategory[]>([]);

  // Fetch subcategories
  const { data: subCategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);
      return response.data || [];
    },
  });

  useEffect(() => {
    fetchRides();
  }, [currentPage, dateFilter, appliedDateRange, recordsPerPage, appliedFilterCategory, appliedFilterSubcategory, appliedFilterCity, appliedSearchQuery]);

  // Filter subcategories for filter dropdown
  useEffect(() => {
    if (filterCategory && filterCategory !== 'all') {
      const filtered = subCategories.filter((sub: SubCategory) => sub.categoryId === filterCategory);
      setFilterSubcategoriesForFilter(filtered);
      setFilterSubcategory('all');
    } else {
      setFilterSubcategoriesForFilter([]);
      setFilterSubcategory('all');
    }
  }, [filterCategory, subCategories]);

  const handleDateFilter = (filter: string) => {
    setDateFilter(filter === dateFilter ? '' : filter);
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setDateFilter('');
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setAppliedFilterCategory(filterCategory);
    setAppliedFilterSubcategory(filterSubcategory);
    setAppliedFilterCity(filterCity);
    setAppliedSearchQuery(searchQuery);
    setAppliedDateRange(dateRange);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterSubcategory('all');
    setFilterCity('all');
    setSearchQuery('');
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
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides/booked?${params}`);
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

  const handleAssignDriver = async (ride) => {
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
      setSuccess('Driver assigned successfully!');
      setTimeout(() => setSuccess(null), 3000);
      fetchRides();
    } catch (err) {
      console.error('Error assigning driver:', err);
      setError('Failed to assign driver');
      setTimeout(() => setError(null), 3000);
    } finally {
      setAssigningDriver(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading booked rides...</span>
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
        <h1 className="text-2xl font-bold text-black">Booked Rides</h1>
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
            Booked Rides ({totalRides})
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
                <col style={{ width: '3%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">#</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Ride ID</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Rider Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Route</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Service Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Driver Category</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Date & Time</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Payment Method</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Booked By</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Staff Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride, index) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-mono text-sm ">
                        {index + 1 + (currentPage - 1) * limit}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-mono text-xs text-gray-600">
                        {ride._id}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm">
                          <User className="w-3 h-3 text-gray-500" />
                          <span>{ride.riderInfo?.riderName}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span>{ride.riderInfo?.riderMobile}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm truncate">
                          <MapPin className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="capitalize truncate" title={ride.rideInfo.fromLocation?.address}>
                            {ride.rideInfo.fromLocation?.address || "N/A"}
                          </span>
                        </div>
                        {ride.rideInfo.toLocation && (
                          <div className="flex items-center space-x-1 text-sm truncate">
                            <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                            <span className="capitalize truncate" title={ride.rideInfo.toLocation?.address}>
                              {ride.rideInfo.toLocation?.address || "N/A"}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium capitalize">
                          {ride.rideInfo.categoryName}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          {ride.rideInfo.subcategoryName}
                        </div>

                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-sm font-medium capitalize">
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
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => onNavigateToDetail?.(ride._id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 px-3 text-xs"
                          onClick={() => handleAssignDriver(ride)}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => {
                            setSelectedRideForCharges(ride);
                            setShowExtraChargesDialog(true);
                          }}
                        >
                          <RupeeIcon className="w-4 h-4" />
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
              {dateFilter === 'today' ? 'No booked rides found for today' :
                dateFilter === 'yesterday' ? 'No booked rides found for yesterday' :
                  'No booked rides found'}
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
                      {driver.name} - {driver.mobile}
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

      <AdminExtraChargesDialog
        isOpen={showExtraChargesDialog}
        onClose={() => {
          setShowExtraChargesDialog(false);
          setSelectedRideForCharges(null);
        }}
        rideId={selectedRideForCharges?._id || ''}
        onSuccess={fetchRides}
      />
    </div>
  );
};