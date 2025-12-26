import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Filter, Phone, Mail, Calendar, User, Star } from 'lucide-react';
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

export const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    fetchUsers();
  }, [profileFilter]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, sortOrder]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/rider-auth/all';
      
      if (profileFilter === 'complete') {
        endpoint = '/api/rider-auth/completeProfile';
      } else if (profileFilter === 'incomplete') {
        endpoint = '/api/rider-auth/inCompleteProfile';
      }

      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}${endpoint}`);
      
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.mobile.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort by createdAt
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredUsers(filtered);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Profile Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="complete">Complete Profile</SelectItem>
                <SelectItem value="incomplete">Incomplete Profile</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchUsers} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Users ({filteredUsers.length})
          </CardTitle>
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
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Referral Earnings</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
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
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {user.referralCode}
                        </code>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <p>Deposited: ₹{user.wallet?.totalDeposited || 0}</p>
                          <p>Spent: ₹{user.wallet?.totalSpent || 0}</p>
                          <p className="font-medium">Balance: ₹{user.wallet?.balance || 0}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <p>Total: ₹{user.referralEarning?.totalEarnings || 0}</p>
                          <p className="font-medium">Balance: ₹{user.referralEarning?.currentBalance || 0}</p>
                        </div>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};