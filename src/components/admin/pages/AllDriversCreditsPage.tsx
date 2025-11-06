import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Skeleton } from '../../ui/skeleton';
import { Users, Calendar, MapPin, Phone, CreditCard } from 'lucide-react';

interface DriverCredit {
  driverName: string;
  mobile: string;
  currentAddress: string;
  cancellationRideCredits: number;
  createdAt: string;
}

export const AllDriversCreditsPage = () => {
  const [drivers, setDrivers] = useState<DriverCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriverCredits();
  }, []);

  const fetchDriverCredits = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/cancellation-credits`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch driver credits');
      }

      const data = await response.json();
      if (data.success) {
        setDrivers(data.data);
      } else {
        throw new Error('API returned error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCreditsBadgeColor = (credits: number) => {
    if (credits === 0) return 'destructive';
    if (credits <= 2) return 'secondary';
    return 'default';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-2">Error loading data</div>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={fetchDriverCredits}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Cancellation Credits</h1>
        <p className="text-gray-600">Manage and monitor driver cancellation credits across all approved drivers</p>
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{drivers.length}</div>
                <div className="text-sm text-gray-600">Total Drivers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {drivers.filter(d => d.cancellationRideCredits > 0).length}
                </div>
                <div className="text-sm text-gray-600">With Credits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {drivers.filter(d => d.cancellationRideCredits === 0).length}
                </div>
                <div className="text-sm text-gray-600">No Credits</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {drivers.map((driver, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-lg">{driver.driverName}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{driver.mobile}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {formatDate(driver.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{driver.currentAddress}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Credits</span>
                  </div>
                  <Badge 
                    variant={getCreditsBadgeColor(driver.cancellationRideCredits)}
                    className="text-lg px-3 py-1"
                  >
                    {driver.cancellationRideCredits}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {drivers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drivers Found</h3>
            <p className="text-gray-600">No approved drivers with cancellation credits data available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};