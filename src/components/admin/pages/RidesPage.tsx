import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, User, Car, Phone, Calendar, CreditCard, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import apiClient from '../../../lib/axiosInterceptor';

interface RidesPageProps {
  onNavigateToDetail?: (rideId: string) => void;
}

export const RidesPage = ({ onNavigateToDetail }: RidesPageProps) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);
  const [dateFilter, setDateFilter] = useState('');
  const limit = 10;

  useEffect(() => {
    fetchRides();
  }, [currentPage, dateFilter]);

  const handleTodayFilter = () => {
    setDateFilter(dateFilter === 'today' ? '' : 'today');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const fetchRides = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(dateFilter && { date: dateFilter })
      });
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides?${params}`);
      setRides(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalRides(response.data.totalRides);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-600 text-white';
      case 'ongoing':
      case 'active':
        return 'bg-blue-600 text-white';
      case 'booked':
        return 'bg-yellow-600 text-white';
      case 'cancelled':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
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
      <div className="space-y-6 bg-white text-black p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading rides...</div>
        </div>
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {totalRides}
            </div>
            <div className="text-sm text-gray-600">Total Rides</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(rides.reduce((sum, ride) => sum + ride.totalPayable, 0))}
            </div>
            <div className="text-sm text-gray-600">Page Revenue</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {rides.filter(ride => ride.status === 'BOOKED').length}
            </div>
            <div className="text-sm text-gray-600">Booked (Page)</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(rides.reduce((sum, ride) => sum + ride.totalPayable, 0) / rides.length || 0)}
            </div>
            <div className="text-sm text-gray-600">Average Fare</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">Rides Management</h1>
        <div className="flex space-x-2">
          <Button
            variant={dateFilter === 'today' ? "default" : "outline"}
            onClick={handleTodayFilter}
            className={dateFilter === 'today' ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {dateFilter === 'today' ? "Show All" : "Today Rides"}
          </Button>
          <Button variant="outline" onClick={fetchRides}>
            Refresh
          </Button>
          <Button variant="outline">Filter</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Export</Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-black">
            {dateFilter === 'today' ? `Today's Rides (${totalRides})` : `All Rides (${totalRides})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-3 font-semibold text-gray-700">Ride ID</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Rider Info</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Route</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Service Type</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Date & Time</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Amount</th>
                  <th className="text-left p-3 font-semibold text-gray-700 w-32">Payment Method</th>
                  <th className="text-left p-3 font-semibold text-gray-700 w-24">Status</th>
                  <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((ride, index) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-mono text-sm text-blue-600">
                        #{ride._id.slice(-6).toUpperCase()}
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
                          <MapPin className="w-3 h-3 text-green-500" />
                          <span className="capitalize">{ride.rideInfo.fromLocation?.address || "N/A"}</span>
                        </div>
                        {ride.rideInfo.toLocation && (
                          <div className="flex items-center space-x-1 text-sm">
                            <MapPin className="w-3 h-3 text-red-500" />
                            <span className="capitalize">{ride.rideInfo.toLocation?.address || "N/A"}</span>
                          </div>
                        )}
                        {!ride.rideInfo.toLocation && (
                          <div className="text-xs text-gray-500">
                            {ride.rideInfo.selectedUsage}h booking
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium capitalize">
                          {ride.rideInfo.selectedCategory}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          {ride.rideInfo.subcategoryName}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {ride.rideInfo.carType} • {ride.rideInfo.transmissionType}
                        </div>
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
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(ride.createdAt)}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm font-semibold text-green-600">
                          
                          <span>{formatCurrency(ride.totalPayable)}</span>
                        </div>


                      </div>
                    </td>

                    <td className="p-3 w-32">
                      <span className="text-sm capitalize">{ride.paymentType}</span>
                    </td>

                    <td className="p-3 w-24">
                      <Badge className={getStatusColor(ride.status)}>
                        {ride.status}
                      </Badge>

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
              {dateFilter === 'today' ? "No rides found for today" : "No rides found"}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({totalRides} total rides)
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};