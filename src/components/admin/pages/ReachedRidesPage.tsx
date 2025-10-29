import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, User, Phone, Calendar, Eye, Loader } from "lucide-react";
import { useState, useEffect } from "react";

interface ReachedRidesPageProps {
  onNavigateToDetail?: (rideId: string) => void;
}

export const ReachedRidesPage = ({ onNavigateToDetail }: ReachedRidesPageProps) => {
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

  const handleDateFilter = (filter: string) => {
    setDateFilter(filter === dateFilter ? '' : filter);
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rides/reached?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reached rides');
      }
      const data = await response.json();
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
        <span>Loading reached rides...</span>
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
        <h1 className="text-2xl font-bold text-black">Reached Rides</h1>
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
            Reached Rides ({totalRides})
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
                  <th className="text-left p-3 font-semibold text-gray-700">Payment Method</th>
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
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1 text-sm font-semibold text-teal-600">
                        <span>{formatCurrency(ride.totalPayable)}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="text-sm capitalize">{ride.paymentType}</span>
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
              {dateFilter === 'today' ? 'No reached rides found for today' : 
               dateFilter === 'yesterday' ? 'No reached rides found for yesterday' : 
               'No reached rides found'}
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