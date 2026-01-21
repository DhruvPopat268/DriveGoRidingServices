import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Filter, Phone, Mail, Calendar, User, Star, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import apiClient from '../../../lib/axiosInterceptor';

interface User {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  gender: string;
  referralCode: string;
  referralEarning: {
    totalEarnings: number;
    currentBalance: number;
  };
  wallet: {
    totalDeposited: number;
    totalSpent: number;
    balance: number;
  };
  cancellationCharges: number;
  ratings: {
    avgRating: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface UsersPageProps {
  onNavigateToRiderDetail?: (riderId: string) => void;
}

export const UsersPage = ({ onNavigateToRiderDetail }: UsersPageProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileFilter, setProfileFilter] = useState('complete');
  const [sortOrder, setSortOrder] = useState('newest');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [profileFilter, currentPage, recordsPerPage, searchTerm, sortOrder, dateRange]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let endpoint = `/api/rider-auth/all`;
      
      if (profileFilter === 'complete') {
        endpoint = `/api/rider-auth/completeProfile`;
      } else if (profileFilter === 'incomplete') {
        endpoint = `/api/rider-auth/inCompleteProfile`;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        search: searchTerm,
        sort: sortOrder,
        ...(dateRange.from && { fromDate: dateRange.from }),
        ...(dateRange.to && { toDate: dateRange.to })
      });

      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}${endpoint}?${params}`);
      
      if (response.data.success) {
        const data = response.data;
        setUsers(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalRecords(data.totalRecords || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setProfileFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const clearDateRange = () => {
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProfileStatus = (user: User) => {
    const isComplete = user.name && user.name.trim() !== '' && user.gender && user.gender.trim() !== '';
    return isComplete ? 'Complete' : 'Incomplete';
  };

  const getProfileStatusColor = (user: User) => {
    const isComplete = user.name && user.name.trim() !== '' && user.gender && user.gender.trim() !== '';
    return isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  const handleViewRider = (riderId: string) => {
    onNavigateToRiderDetail?.(riderId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
          <p className="text-muted-foreground">Manage and view all registered users</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={profileFilter} onValueChange={handleFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Profile Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="complete">Complete Profile</SelectItem>
                <SelectItem value="incomplete">Incomplete Profile</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={dateRange.from}
              onChange={(e) => handleDateRangeChange('from', e.target.value)}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={dateRange.to}
              onChange={(e) => handleDateRangeChange('to', e.target.value)}
            />

            <div className="flex gap-2">
              <Button onClick={fetchUsers} variant="outline">
                Refresh
              </Button>
              {(dateRange.from || dateRange.to) && (
                <Button onClick={clearDateRange} variant="outline" size="sm">
                  Clear Dates
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Users ({totalRecords})
            </CardTitle>
            
            {/* Records per page selector */}
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Info</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Profile Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name || 'No Name'}</p>
                            <p className="text-sm text-muted-foreground capitalize">{user.gender || 'Not specified'}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                            {user.mobile}
                          </div>
                          {user.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                              {user.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge className={getProfileStatusColor(user)}>
                          {getProfileStatus(user)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span>{user.ratings?.avgRating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewRider(user._id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {users.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria
                </div>
              )}
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && users.length > 0 && (
            <div className="flex items-center justify-between mt-6">
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
    </div>
  );
};