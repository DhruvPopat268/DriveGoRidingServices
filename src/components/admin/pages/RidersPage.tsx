
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, MapPin, Star, Phone, Mail, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import apiClient from '../../../lib/axiosInterceptor';

interface Rider {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  status: string;
  totalRides?: number;
  location?: string;
  paymentMethod?: string;
  rating?: number;
}

export const RidersPage = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rider-auth/completeProfile`);
      if (response.data.success) {
        setRiders(response.data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch riders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <span>Loading riders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black">Riders Management</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">Export Data</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {riders.map((rider) => (
          <Card key={rider._id} className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-black">{rider.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">{rider.rating || 'N/A'}</span>
                  </div>
                </div>
                <Badge 
                  variant={rider.status === 'active' ? 'default' : 'secondary'}
                  className={rider.status === 'active' ? 'bg-green-600' : ''}
                >
                  {rider.status || 'Unknown'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{rider.mobile}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{rider.email || 'No email'}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{rider.location || 'Unknown'}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">{rider.paymentMethod || 'Not set'}</span>
              </div>
              <div className="text-sm text-gray-500">
                Total Rides: {rider.totalRides || 0}
              </div>
              <div className="flex space-x-2 pt-2">
                <Button size="sm" variant="outline">Contact</Button>
                <Button size="sm" variant="outline">View History</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
