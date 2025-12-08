import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Search, Ban, Eye } from 'lucide-react';

interface Driver {
  _id: string;
  personalInformation?: {
    fullName?: string;
  };
  mobile: string;
  status: string;
  createdAt: string;
  suspendFrom?: string;
  suspendTo?: string;
  suspendDescription?: string;
}

interface SuspendedDriversPageProps {
  onNavigateToDetail: (driverId: string) => void;
}

export const SuspendedDriversPage = ({ onNavigateToDetail }: SuspendedDriversPageProps) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuspendedDrivers();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDrivers(drivers);
    } else {
      const filtered = drivers.filter(driver =>
        driver.personalInformation?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.mobile.includes(searchTerm)
      );
      setFilteredDrivers(filtered);
    }
  }, [searchTerm, drivers]);

  const fetchSuspendedDrivers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/Suspended`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDrivers(data.data);
        setFilteredDrivers(data.data);
      }
    } catch (error) {
      console.error('Error fetching suspended drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading suspended drivers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ban className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold">Suspended Drivers</h1>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Total: {filteredDrivers.length}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suspended Drivers List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Suspend From</TableHead>
                  <TableHead>Suspend To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No suspended drivers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver._id}>
                      <TableCell className="font-medium">
                        {driver.personalInformation?.fullName || 'No Name'}
                      </TableCell>
                      <TableCell>{driver.mobile}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Suspended</Badge>
                      </TableCell>
                      <TableCell>
                        {driver.suspendFrom
                          ? new Date(driver.suspendFrom).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {driver.suspendTo
                          ? new Date(driver.suspendTo).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigateToDetail(driver._id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspendedDriversPage;
