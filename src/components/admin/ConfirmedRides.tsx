import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, User, Phone, Calendar, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../lib/axiosInterceptor";

export const ConfirmedRides = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides/confirmed?page=1&limit=3`);
      const data = response.data;
      setRides(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
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
      <Card className="bg-white border border-gray-300 shadow-md">
        <CardHeader>
          <CardTitle className="text-black flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Confirmed Rides</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-gray-300 shadow-md">
        <CardHeader>
          <CardTitle className="text-black flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Confirmed Rides</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-center py-8">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-black flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Confirmed Rides</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rides.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No confirmed rides found
          </div>
        ) : (
          rides.map((ride) => (
            <div key={ride._id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-black font-medium text-sm">{ride.riderInfo?.riderName}</p>
                  <p className="text-gray-600 text-xs">
                    Driver: {ride.driverInfo?.driverName}
                  </p>
                </div>
                <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs">Confirmed</Badge>
              </div>

              <div className="flex items-center space-x-2 text-xs text-gray-700 mb-2">
                <MapPin className="w-3 h-3 text-green-500" />
                <span className="truncate">
                  {ride.rideInfo?.fromLocation?.address || 'N/A'}
                </span>
              </div>
              
              {ride.rideInfo?.toLocation && (
                <div className="flex items-center space-x-2 text-xs text-gray-700 mb-2">
                  <MapPin className="w-3 h-3 text-red-500" />
                  <span className="truncate">
                    {ride.rideInfo.toLocation.address}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center space-x-1 text-gray-600">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(ride.rideInfo?.selectedDate)}</span>
                  <Clock className="w-3 h-3 ml-2" />
                  <span>{formatTime(ride.rideInfo?.selectedTime)}</span>
                </div>
                <div className="flex items-center space-x-1 text-green-600 font-semibold">
                  <span>{formatCurrency(ride.totalPayable)}</span>
                </div>
              </div>
            </div>
          ))
        )}
        
        <div className="pt-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate('/confirmed-rides')}
          >
            View All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};