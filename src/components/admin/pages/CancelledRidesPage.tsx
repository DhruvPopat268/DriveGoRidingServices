import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, User, Phone, Calendar, Eye, Loader, ChevronLeft, ChevronRight } from "lucide-react";
import { RideFilters } from "../shared/RideFilters";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/axiosInterceptor";

interface SubCategory {
  _id: string;
  name: string;
  categoryId: string;
}

interface CancelledRidesPageProps {
  onNavigateToDetail?: (rideId: string) => void;
}

export const CancelledRidesPage = ({ onNavigateToDetail }: CancelledRidesPageProps) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);
  const [dateFilter, setDateFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const limit = recordsPerPage;

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
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides/cancelled?${params}`);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading cancelled rides...</span>
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">Cancelled Rides</h1>
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
            Cancelled Rides ({totalRides})
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
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '7%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Ride ID</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Rider Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Driver Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Route</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Service Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Driver Category</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Usage</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Date & Time</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Payment Method</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Booked By</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Staff Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Cancelled By</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride, index) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-mono text-sm text-blue-600">
                        {ride.bookingId || 'N/A'}
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
                        <div className="flex items-center space-x-1 text-sm">
                          <User className="w-3 h-3 text-gray-500" />
                          <span>{ride.driverInfo?.driverName}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3 text-gray-500" />
                          <span>{ride.driverInfo?.driverMobile}</span>
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
                      <div className="flex items-center space-x-1 text-sm font-semibold text-red-600">
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
                      <span className={`text-sm px-2 py-1 rounded-full text-xs font-medium ${
                        ride.whoCancel === 'Rider' ? 'bg-blue-100 text-blue-800' : 
                        ride.whoCancel === 'Driver' ? 'bg-orange-100 text-orange-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ride.whoCancel || 'N/A'}
                      </span>
                    </td>

                    <td className="p-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-3 text-xs"
                        onClick={() => onNavigateToDetail?.(ride._id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {dateFilter === 'today' ? 'No cancelled rides found for today' : 
               dateFilter === 'yesterday' ? 'No cancelled rides found for yesterday' : 
               'No cancelled rides found'}
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
    </div>
  );
};