import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Search, Filter, Phone, Mail, Calendar, User, Star, ChevronLeft, ChevronRight, Plus, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import apiClient from '../../../lib/axiosInterceptor';

interface User {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  gender: string;
  referralCode: string;
  status: string;
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
  rideStats: {
    completedRides: number;
    cancelledRides: number;
    totalRides: number;
  };
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    mobile: '',
    email: '',
    gender: '',
    status: 'active',
    profilePhoto: null as File | null,
    profilePhotoPreview: ''
  });

  // Edit user dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    _id: '',
    name: '',
    email: '',
    gender: '',
    status: 'active',
    profilePhoto: null as File | null,
    profilePhotoPreview: '',
    existingPhoto: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchUsers();
  }, [profileFilter, statusFilter, currentPage, recordsPerPage, searchTerm, sortOrder, dateRange]);

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
        ...(statusFilter !== 'all' && { status: statusFilter }),
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

  const handleToggleActive = async (riderId: string, currentStatus: boolean) => {
    try {
      setTogglingId(riderId);
      const response = await apiClient.patch(`${import.meta.env.VITE_API_URL}/api/rider-auth/toggle-active`, {
        riderId,
        isActive: !currentStatus
      });
      if (response.data.success) {
        setUsers(prev =>
          prev.map(u => u._id === riderId ? { ...u, status: !currentStatus ? 'active' : 'inactive' } : u)
        );
      }
    } catch (error) {
      console.error('Error toggling rider status:', error);
    } finally {
      setTogglingId(null);
    }
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

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
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

  const clearAllFilters = () => {
    setSearchTerm('');
    setProfileFilter('complete');
    setStatusFilter('all');
    setSortOrder('newest');
    setDateRange({ from: '', to: '' });
    setCurrentPage(1);
  };

  const handleCreateFormChange = (field: string, value: string) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
    setCreateError('');
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateForm(prev => ({
      ...prev,
      profilePhoto: file,
      profilePhotoPreview: URL.createObjectURL(file)
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({ name: '', mobile: '', email: '', gender: '', status: 'active', profilePhoto: null, profilePhotoPreview: '' });
    setCreateError('');
  };

  const handleCreateUser = async () => {
    if (!createForm.mobile) {
      setCreateError('Mobile number is required');
      return;
    }
    if (!/^\d{10}$/.test(createForm.mobile)) {
      setCreateError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('mobile', createForm.mobile);
      if (createForm.name) formData.append('name', createForm.name);
      if (createForm.email) formData.append('email', createForm.email);
      if (createForm.gender) formData.append('gender', createForm.gender);
      formData.append('status', createForm.status);
      if (createForm.profilePhoto) formData.append('profilePhoto', createForm.profilePhoto);

      const response = await apiClient.post(
        `${import.meta.env.VITE_API_URL}/api/rider-auth/admin/create-user`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setCreateOpen(false);
        resetCreateForm();
        fetchUsers();
      } else {
        setCreateError(response.data.message || 'Failed to create user');
      }
    } catch (error: any) {
      setCreateError(error.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditForm({
      _id: user._id,
      name: user.name || '',
      email: user.email || '',
      gender: user.gender || '',
      status: user.status || 'active',
      profilePhoto: null,
      profilePhotoPreview: '',
      existingPhoto: (user as any).profilePhoto || ''
    });
    setEditError('');
    setEditOpen(true);
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setEditError('');
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditForm(prev => ({
      ...prev,
      profilePhoto: file,
      profilePhotoPreview: URL.createObjectURL(file)
    }));
  };

  const handleEditUser = async () => {
    try {
      setEditing(true);
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('email', editForm.email);
      formData.append('gender', editForm.gender);
      formData.append('status', editForm.status);
      if (editForm.profilePhoto) formData.append('profilePhoto', editForm.profilePhoto);

      const response = await apiClient.put(
        `${import.meta.env.VITE_API_URL}/api/rider-auth/admin/edit-user/${editForm._id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setUsers(prev =>
          prev.map(u => u._id === editForm._id ? { ...u, ...response.data.data } : u)
        );
        setEditOpen(false);
      } else {
        setEditError(response.data.message || 'Failed to update user');
      }
    } catch (error: any) {
      setEditError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = async (riderId: string) => {
    try {
      setDeletingId(riderId);
      const response = await apiClient.patch(
        `${import.meta.env.VITE_API_URL}/api/rider-auth/admin/delete-user/${riderId}`
      );
      if (response.data.success) {
        setUsers(prev =>
          prev.map(u => u._id === riderId ? { ...u, status: 'deleted' } : u)
        );
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getProfileStatus = (user: User) => {
    const isComplete = user.name && user.name.trim() !== '';
    return isComplete ? 'Complete' : 'Incomplete';
  };

  const getProfileStatusColor = (user: User) => {
    const isComplete = user.name && user.name.trim() !== '';
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
        <Button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create User
        </Button>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {createForm.profilePhotoPreview ? (
                  <img src={createForm.profilePhotoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <Label htmlFor="profilePhotoInput" className="cursor-pointer flex items-center gap-1 text-sm text-primary hover:underline">
                <Upload className="w-4 h-4" />
                Upload Photo
              </Label>
              <input id="profilePhotoInput" type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoChange} />
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Enter name" value={createForm.name} onChange={(e) => handleCreateFormChange('name', e.target.value)} />
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <Label>Mobile <span className="text-red-500">*</span></Label>
              <Input placeholder="10-digit mobile number" value={createForm.mobile} onChange={(e) => handleCreateFormChange('mobile', e.target.value)} maxLength={10} />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input placeholder="Enter email" type="email" value={createForm.email} onChange={(e) => handleCreateFormChange('email', e.target.value)} />
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={createForm.gender} onValueChange={(v) => handleCreateFormChange('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status toggle */}
            <div className="flex items-center justify-between">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.status === 'active'}
                  onCheckedChange={(checked) => handleCreateFormChange('status', checked ? 'active' : 'inactive')}
                />
                <span className={`text-sm font-medium ${createForm.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                  {createForm.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {createError && <p className="text-sm text-red-500">{createError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); setEditError(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {editForm.profilePhotoPreview ? (
                  <img src={editForm.profilePhotoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
                ) : editForm.existingPhoto ? (
                  <img src={editForm.existingPhoto} alt="Profile" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <Label htmlFor="editPhotoInput" className="cursor-pointer flex items-center gap-1 text-sm text-primary hover:underline">
                <Upload className="w-4 h-4" />
                Change Photo
              </Label>
              <input id="editPhotoInput" type="file" accept="image/*" className="hidden" onChange={handleEditPhotoChange} />
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Enter name" value={editForm.name} onChange={(e) => handleEditFormChange('name', e.target.value)} />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input placeholder="Enter email" type="email" value={editForm.email} onChange={(e) => handleEditFormChange('email', e.target.value)} />
            </div>

            {/* Gender */}
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={editForm.gender} onValueChange={(v) => handleEditFormChange('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status toggle */}
            <div className="flex items-center justify-between">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.status === 'active'}
                  onCheckedChange={(checked) => handleEditFormChange('status', checked ? 'active' : 'inactive')}
                />
                <span className={`text-sm font-medium ${editForm.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                  {editForm.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {editError && <p className="text-sm text-red-500">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={editing}>
              {editing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
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

            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
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
              <Button onClick={clearAllFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Completed Rides</TableHead>
                    <TableHead>Cancelled Rides</TableHead>
                    <TableHead>Total Rides</TableHead>
                    <TableHead>Last Active</TableHead>
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
                        {user.status === 'deleted' ? (
                          <Badge className="bg-red-100 text-red-700">Deleted</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.status === 'active'}
                              disabled={togglingId === user._id}
                              onCheckedChange={() => handleToggleActive(user._id, user.status === 'active')}
                            />
                            <span className={`text-sm font-medium ${user.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                              {togglingId === user._id ? 'Updating...' : user.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          <span>{user.ratings?.avgRating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium text-green-600">{user.rideStats?.completedRides ?? 0}</span>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium text-red-500">{user.rideStats?.cancelledRides ?? 0}</span>
                      </TableCell>

                      <TableCell>
                        <span className="font-medium">{user.rideStats?.totalRides ?? 0}</span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {user.lastActiveAt ? formatDate(user.lastActiveAt) : <span className="text-muted-foreground">Never</span>}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {formatDate(user.createdAt)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewRider(user._id)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(user)}
                          >
                            Edit
                          </Button>
                          {user.status !== 'deleted' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-400 text-red-500 hover:bg-red-50"
                                  disabled={deletingId === user._id}
                                >
                                  {deletingId === user._id ? 'Deleting...' : 'Delete'}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete "{user.name || user.mobile}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={deletingId === user._id}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user._id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    disabled={deletingId === user._id}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
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