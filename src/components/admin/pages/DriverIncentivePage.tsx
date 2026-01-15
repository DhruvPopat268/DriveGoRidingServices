import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Alert, AlertDescription } from '../../ui/alert';
import { Search, Users, Gift, CheckCircle, XCircle, Plus, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { RupeeIcon } from "@/components/ui/RupeeIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import apiClient from '../../../lib/axiosInterceptor';

interface Driver {
  _id: string;
  personalInformation?: {
    fullName?: string;
    category?: string;
    subCategory?: string[];
  };
  mobile: string;
  status: string;
  eligibleRides?: number;
}

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id?: string;
  id?: string;
  name: string;
  categoryId: string;
}

interface IncentiveResult {
  driverId: string;
  success: boolean;
  error?: string;
}

interface IncentiveHistory {
  _id: string;
  drivers: {
    _id: string;
    personalInformation?: {
      fullName?: string;
    };
    mobile: string;
  }[];
  amount: number;
  description: string;
  createdAt: string;
}

const DriverIncentivePage = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<IncentiveResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [incentiveHistory, setIncentiveHistory] = useState<IncentiveHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDriversDialog, setShowDriversDialog] = useState(false);
  const [selectedIncentiveDrivers, setSelectedIncentiveDrivers] = useState<IncentiveHistory['drivers']>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Category and Subcategory states
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

  // Filter criteria states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minRides, setMinRides] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');

  // Pagination states for history
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch all approved drivers and incentive history
  useEffect(() => {
    fetchIncentiveHistory();
    fetchCategories();
  }, [currentPage, recordsPerPage]);

  // Filter subcategories when category changes
  useEffect(() => {
    if (selectedCategory) {
      const filtered = subcategories.filter(sub => sub.categoryId === selectedCategory);
      setFilteredSubcategories(filtered);
      setSelectedSubcategory('');
    } else {
      setFilteredSubcategories([]);
      setSelectedSubcategory('');
    }
  }, [selectedCategory, subcategories]);

  // Filter drivers based on search term only (other filters applied via API)
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
      const params: any = {};
      
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedSubcategory && selectedSubcategory !== 'all') params.subcategory = selectedSubcategory;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (minRides) params.minRides = minRides;
      if (minRating) params.minRating = minRating;
      if (maxRating) params.maxRating = maxRating;

      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/filter-for-incentive`, { params });
      if (response.status === 200) {
        const mappedDrivers = response.data.drivers.map((d: any) => ({
          _id: d._id,
          personalInformation: { fullName: d.fullName },
          mobile: d.mobile,
          status: 'Approved',
          eligibleRides: d.eligibleRides
        }));
        setDrivers(mappedDrivers);
        setFilteredDrivers(mappedDrivers);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`)
      ]);
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchIncentiveHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/admin/incentive-history?page=${currentPage}&limit=${recordsPerPage}`);
      if (response.status === 200) {
        const data = response.data;
        setIncentiveHistory(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalRecords(data.totalRecords || 0);
      }
    } catch (error) {
      console.error('Error fetching incentive history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setStartDate('');
    setEndDate('');
    setMinRides('');
    setMinRating('');
    setMaxRating('');
    setSearchTerm('');
    setDrivers([]);
    setFilteredDrivers([]);
  };

  const handleFindDrivers = () => {
    fetchDrivers();
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

  const handleCreateIncentive = async () => {
    if (selectedDrivers.length === 0) {
      setError('Please select at least one driver');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid incentive amount');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/driver/admin/create-incentive`, {
        driverIds: selectedDrivers,
        amount: parseFloat(amount),
        description: description.trim()
      });

      const data = response.data;

      if (response.status === 200) {
        setResults(data.results);
        setShowResults(true);
        setShowCreateDialog(false);
        // Reset form
        setSelectedDrivers([]);
        setAmount('');
        setDescription('');
        // Refresh history
        fetchIncentiveHistory();
        setSuccess('Incentive created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to create incentive');
      }
    } catch (error) {
      console.error('Error creating incentive:', error);
      setError('Failed to create incentive');
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
          <Gift className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Driver Incentive Management</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create Incentive</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Driver Incentive</DialogTitle>
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
                  <div className="grid grid-cols-2 gap-4">
                    {/* Category Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subcategory Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Subcategory</label>
                      <Select 
                        value={selectedSubcategory} 
                        onValueChange={setSelectedSubcategory}
                        disabled={!selectedCategory || selectedCategory === 'all'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Subcategories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subcategories</SelectItem>
                          {filteredSubcategories.map((sub) => (
                            <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                      />
                    </div>

                    {/* Number of Rides */}
                   

                    {/* Rating Range */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Min. Rating</label>
                      <Input
                        type="number"
                        placeholder="e.g., 3.5"
                        value={minRating}
                        onChange={(e) => setMinRating(e.target.value)}
                        min="0"
                        max="5"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Max. Rating</label>
                      <Input
                        type="number"
                        placeholder="e.g., 5.0"
                        value={maxRating}
                        onChange={(e) => setMaxRating(e.target.value)}
                        min={minRating || "0"}
                        max="5"
                        step="0.1"
                      />
                    </div>

                     <div>
                      <label className="block text-sm font-medium mb-2">Min. Rides</label>
                      <Input
                        type="number"
                        placeholder="e.g., 20"
                        value={minRides}
                        onChange={(e) => setMinRides(e.target.value)}
                        min="0"
                      />
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <label className="block text-sm font-medium mb-2">Search</label>
                      <Search className="absolute left-3 bottom-3 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Filter Buttons */}
                    <div className="col-span-2 flex space-x-2">
                      <Button 
                        onClick={handleFindDrivers}
                        className="flex-1"
                        disabled={loading}
                      >
                        {loading ? 'Finding...' : 'Find Drivers'}
                      </Button>
                      <Button 
                        onClick={handleClearFilters}
                        variant="outline"
                        className="flex-1"
                      >
                        Clear All Filters
                      </Button>
                    </div>

                    {/* Active Filters Summary */}
                    {(selectedCategory || startDate || minRides || minRating) && (
                      <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-xs font-medium text-blue-800 mb-1">Active Filters:</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedCategory && selectedCategory !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                              Category: {categories.find(c => c._id === selectedCategory)?.name}
                            </Badge>
                          )}
                          {selectedSubcategory && selectedSubcategory !== 'all' && (
                            <Badge variant="secondary" className="text-xs">
                              Subcategory: {filteredSubcategories.find(s => (s.id || s._id) === selectedSubcategory)?.name}
                            </Badge>
                          )}
                          {startDate && endDate && (
                            <Badge variant="secondary" className="text-xs">
                              Date: {startDate} to {endDate}
                            </Badge>
                          )}
                          {minRides && (
                            <Badge variant="secondary" className="text-xs">
                              Min Rides: {minRides}
                            </Badge>
                          )}
                          {minRating && maxRating && (
                            <Badge variant="secondary" className="text-xs">
                              Rating: {minRating} - {maxRating}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Select All */}
                  {filteredDrivers.length > 0 && (
                    <div className="flex items-center space-x-2 p-2 border rounded bg-gray-50">
                      <Checkbox
                        checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <label className="font-medium">
                        Select All ({filteredDrivers.length} drivers)
                      </label>
                    </div>
                  )}

                  {/* Driver List */}
                  {loading ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading drivers...
                    </div>
                  ) : filteredDrivers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Click "Find Drivers" to search
                    </div>
                  ) : (
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
                  )}
                </CardContent>
              </Card>

              {/* Incentive Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RupeeIcon className="w-5 h-5" />
                    <span>Incentive Details</span>
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
                      Incentive Amount (₹)
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <Textarea
                      placeholder="Enter incentive description..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {selectedDrivers.length > 0 && amount && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm font-medium text-blue-800">
                        Total Amount: ₹{(parseFloat(amount || '0') * selectedDrivers.length).toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600">
                        ₹{amount} × {selectedDrivers.length} drivers
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateIncentive}
                    disabled={submitting || selectedDrivers.length === 0 || !amount || !description.trim()}
                    className="w-full"
                  >
                    {submitting ? 'Creating Incentive...' : 'Create Incentive'}
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
              <span>Incentive Results</span>
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

      {/* Incentive History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Incentive History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Records per page selector */}
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
                    <TableHead>Amount (Per Driver)</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incentiveHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No incentive history found
                      </TableCell>
                    </TableRow>
                  ) : (
                    incentiveHistory.map((incentive, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {incentive.drivers.length} drivers
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ₹{incentive.amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          ₹{(incentive.amount * incentive.drivers.length).toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={incentive.description}>
                          {incentive.description}
                        </TableCell>
                        <TableCell>
                          {new Date(incentive.createdAt).toLocaleDateString('en-IN', {
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
                              setSelectedIncentiveDrivers(incentive.drivers);
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

          {/* Pagination Controls */}
          {!historyLoading && incentiveHistory.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalRecords)} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} entries
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
          )}
        </CardContent>
      </Card>

      {/* View Drivers Dialog */}
      <Dialog open={showDriversDialog} onOpenChange={setShowDriversDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incentive Recipients</DialogTitle>
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
                  {selectedIncentiveDrivers.map((driver, index) => (
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

export default DriverIncentivePage;