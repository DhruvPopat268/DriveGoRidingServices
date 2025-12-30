import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Search, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

interface OfflineStaff {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  status: boolean;
  completedRides: any[];
  createdAt: string;
  updatedAt: string;
}

export const OfflineStaffPage = () => {
  const [staff, setStaff] = useState<OfflineStaff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<OfflineStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', email: '', mobile: '', password: '' });
  const [createData, setCreateData] = useState({ name: '', email: '', mobile: '', password: '' });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const API_URL = `${import.meta.env.VITE_API_URL}/api/offline-staff`;

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    const filtered = staff.filter(member => 
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStaff(filtered);
  }, [staff, searchTerm]);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(API_URL);
      setStaff(response.data.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch staff', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.name || !createData.email || !createData.mobile || !createData.password) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setCreateLoading(true);
    try {
      await axios.post(API_URL, createData);
      toast({ title: 'Success', description: 'Staff created successfully' });
      setCreateData({ name: '', email: '', mobile: '', password: '' });
      setDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to create staff', 
        variant: 'destructive' 
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${API_URL}/${id}/status`, { status: !currentStatus });
      toast({ title: 'Success', description: 'Status updated successfully' });
      fetchStaff();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleEdit = async (id: string) => {
    if (!editData.name || !editData.email || !editData.mobile) {
      toast({ title: 'Error', description: 'Name, email and mobile are required', variant: 'destructive' });
      return;
    }

    try {
      await axios.put(`${API_URL}/${id}`, editData);
      toast({ title: 'Success', description: 'Staff updated successfully' });
      setEditingId(null);
      setEditData({ name: '', email: '', mobile: '', password: '' });
      setEditDialogOpen(false);
      fetchStaff();
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.message || 'Failed to update staff', 
        variant: 'destructive' 
      });
    }
  };

  const startEdit = (staff: OfflineStaff) => {
    setEditingId(staff._id);
    setEditData({ name: staff.name, email: staff.email, mobile: staff.mobile, password: '' });
    setEditDialogOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '', email: '', mobile: '', password: '' });
    setEditDialogOpen(false);
  };

  const getStatusStats = () => {
    const active = staff.filter(s => s.status).length;
    const inactive = staff.filter(s => !s.status).length;
    return { active, inactive, total: staff.length };
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Offline Staff Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Staff</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  type="text"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-mobile">Mobile</Label>
                <Input
                  id="create-mobile"
                  type="tel"
                  value={createData.mobile}
                  onChange={(e) => setCreateData({ ...createData, mobile: e.target.value })}
                  placeholder="Enter mobile number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password</Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showCreatePassword ? "text" : "password"}
                    value={createData.password}
                    onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                    placeholder="Enter password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                  >
                    {showCreatePassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={createLoading} className="w-full">
                {createLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Staff
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Staff Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(editingId!); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile</Label>
              <Input
                id="edit-mobile"
                type="tel"
                value={editData.mobile}
                onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                placeholder="Enter mobile number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password (Optional)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? "text" : "password"}
                  value={editData.password}
                  onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                >
                  {showEditPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createLoading} className="flex-1">
                {createLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Staff
              </Button>
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">{stats.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">{stats.active}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Staff</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">{stats.inactive}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Members</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Completed Rides</TableHead>
                  <TableHead>Status</TableHead>

                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell>
                      <div className="font-medium">{member.name}</div>
                    </TableCell>
                    <TableCell>
                      <div>{member.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{member.mobile}</div>
                    </TableCell>
                   
                    <TableCell>
                      <Badge variant="outline">
                        {member.completedRides?.length || 0} rides
                      </Badge>
                    </TableCell>
                     <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={member.status}
                          onCheckedChange={() => handleStatusToggle(member._id, member.status)}
                        />
                        <Badge variant={member.status ? 'default' : 'secondary'}>
                          {member.status ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(member.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => startEdit(member)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStaff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No staff members found matching your search' : 'No staff members found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};