import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Users, Ban, CheckCircle, XCircle, Plus, History, Calendar } from 'lucide-react';
import apiClient from '../../../lib/axiosInterceptor';

interface Driver {
  _id: string;
  personalInformation?: {
    fullName?: string;
  };
  mobile: string;
  status: string;
}

interface SuspendResult {
  driverId: string;
  success: boolean;
  error?: string;
}

interface SuspendHistory {
  _id: string;
  drivers: {
    _id: string;
    personalInformation?: {
      fullName?: string;
    };
    mobile: string;
  }[];
  suspendFrom: string;
  suspendTo: string;
  description: string;
  createdAt: string;
}

const SuspendDriverPage = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suspendFrom, setSuspendFrom] = useState('');
  const [suspendTo, setSuspendTo] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SuspendResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [suspendHistory, setSuspendHistory] = useState<SuspendHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDriversDialog, setShowDriversDialog] = useState(false);
  const [selectedSuspendDrivers, setSelectedSuspendDrivers] = useState<SuspendHistory['drivers']>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
    fetchSuspendHistory();
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

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/driver');
      const data = response.data;
      setDrivers(data);
      setFilteredDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspendHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await apiClient.get('/api/driver/admin/suspend-history');
      const data = response.data;
      setSuspendHistory(data.data);
    } catch (error) {
      console.error('Error fetching suspend history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedDrivers.length === filteredDrivers.length) {
      setSelectedDrivers([]);
    } else {
      setSelectedDrivers(filteredDrivers.map(driver => driver._id));
    }
  };

  const handleDriverSelect = (driverId: string) => {
    setSelectedDrivers(prev => 
      prev.includes(driverId) 
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const handleSuspendDrivers = async () => {
    if (selectedDrivers.length === 0) {
      setError('Please select at least one driver');
      return;
    }

    if (!suspendFrom || !suspendTo) {
      setError('Please select suspend duration');
      return;
    }

    if (new Date(suspendTo) <= new Date(suspendFrom)) {
      setError('Suspend To date must be after Suspend From date');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post('/api/driver/admin/suspend-drivers', {
        driverIds: selectedDrivers,
        suspendFrom,
        suspendTo,
        description: description.trim()
      });

      const data = response.data;
      setResults(data.results);
        setShowResults(true);
        setShowCreateDialog(false);
        setSelectedDrivers([]);
        setSuspendFrom('');
        setSuspendTo('');
        setDescription('');
        fetchSuspendHistory();
        fetchDrivers();
        setSuccess('Drivers suspended successfully!');
        setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error suspending drivers:', error);
      setError('Failed to suspend drivers');
    } finally {
      setSubmitting(false);
    }
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d._id === driverId);
    return driver?.personalInformation?.fullName || driver?.mobile || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ban className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold">Suspend Driver Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Suspend Drivers</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Suspend Drivers</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Driver Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Select Drivers</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search drivers by name or mobile..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex items-center space-x-2 p-2 border rounded bg-gray-50">
                    <Checkbox
                      checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label className="font-medium">
                      Select All ({filteredDrivers.length} drivers)
                    </label>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredDrivers.map((driver) => (
                      <div key={driver._id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                        <Checkbox
                          checked={selectedDrivers.includes(driver._id)}
                          onCheckedChange={() => handleDriverSelect(driver._id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {driver.personalInformation?.fullName || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">{driver.mobile}</div>
                        </div>
                        <Badge variant="outline">{driver.status}</Badge>
                      </div>
                    ))}
                  </div>

                  {filteredDrivers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No drivers found
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suspend Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Suspend Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Selected Drivers: {selectedDrivers.length}
                    </label>
                    <div className="text-sm text-gray-600">
                      {selectedDrivers.length > 0 && (
                        <div className="max-h-32 overflow-y-auto p-2 border rounded bg-gray-50">
                          {selectedDrivers.map(driverId => (
                            <div key={driverId} className="text-xs">
                              {getDriverName(driverId)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Suspend From
                    </label>
                    <Input
                      type="date"
                      value={suspendFrom}
                      onChange={(e) => setSuspendFrom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Suspend To
                    </label>
                    <Input
                      type="date"
                      value={suspendTo}
                      onChange={(e) => setSuspendTo(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <Textarea
                      placeholder="Enter suspension reason..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {selectedDrivers.length > 0 && suspendFrom && suspendTo && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="text-sm font-medium text-red-800">
                        {selectedDrivers.length} driver(s) will be suspended
                      </div>
                      <div className="text-xs text-red-600">
                        From: {new Date(suspendFrom).toLocaleDateString()} to {new Date(suspendTo).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSuspendDrivers}
                    disabled={submitting || selectedDrivers.length === 0 || !suspendFrom || !suspendTo || !description.trim()}
                    className="w-full"
                  >
                    {submitting ? 'Suspending...' : 'Suspend Drivers'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Suspension Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span>{getDriverName(result.driverId)}</span>
                  {result.success ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <Button 
              onClick={() => setShowResults(false)} 
              className="mt-4"
              variant="outline"
            >
              Close Results
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suspend History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Suspension History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg">Loading history...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drivers Count</TableHead>
                    <TableHead>Suspend From</TableHead>
                    <TableHead>Suspend To</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Suspended At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspendHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No suspension history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    suspendHistory.map((suspend, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {suspend.drivers.length} drivers
                        </TableCell>
                        <TableCell>
                          {new Date(suspend.suspendFrom).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          {new Date(suspend.suspendTo).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={suspend.description}>
                          {suspend.description}
                        </TableCell>
                        <TableCell>
                          {new Date(suspend.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedSuspendDrivers(suspend.drivers);
                              setShowDriversDialog(true);
                            }}
                          >
                            View Drivers
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Drivers Dialog */}
      <Dialog open={showDriversDialog} onOpenChange={setShowDriversDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Suspended Drivers</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Mobile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSuspendDrivers.map((driver, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {driver.personalInformation?.fullName || 'No Name'}
                      </TableCell>
                      <TableCell>{driver.mobile}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setShowDriversDialog(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuspendDriverPage;
