import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search, Eye, Loader } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import apiClient from '../../../lib/axiosInterceptor';

interface ParcelVehicleType {
  _id: string;
  name: string;
  description: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

const ParcelVehicleTypePage = () => {
  const [parcelVehicleTypes, setParcelVehicleTypes] = useState<ParcelVehicleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingParcelVehicleType, setEditingParcelVehicleType] = useState<ParcelVehicleType | null>(null);
  const [viewingParcelVehicleType, setViewingParcelVehicleType] = useState<ParcelVehicleType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchParcelVehicleTypes();
  }, []);

  const fetchParcelVehicleTypes = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/parcelVehicleTypes`);
      const data = response.data;
      setParcelVehicleTypes(data);
    } catch (error) {
      console.error('Error fetching parcel vehicle types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = editingParcelVehicleType 
        ? await apiClient.put(`${import.meta.env.VITE_API_URL}/api/parcelVehicleTypes/${editingParcelVehicleType._id}`, formData)
        : await apiClient.post(`${import.meta.env.VITE_API_URL}/api/parcelVehicleTypes`, formData);
      
      await fetchParcelVehicleTypes();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving parcel vehicle type:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (parcelVehicleType: ParcelVehicleType) => {
    setEditingParcelVehicleType(parcelVehicleType);
    setFormData({
      name: parcelVehicleType.name,
      description: parcelVehicleType.description
    });
    setDialogOpen(true);
  };

  const handleView = (parcelVehicleType: ParcelVehicleType) => {
    setViewingParcelVehicleType(parcelVehicleType);
    setViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/parcelVehicleTypes/${id}`);
      await fetchParcelVehicleTypes();
    } catch (error) {
      console.error('Error deleting parcel vehicle type:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`${import.meta.env.VITE_API_URL}/api/parcelVehicleTypes/${id}/status`, {
        status: !currentStatus
      });
      await fetchParcelVehicleTypes();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingParcelVehicleType(null);
  };

  const filteredParcelVehicleTypes = parcelVehicleTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Parcel Vehicle Type Management</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Parcel Vehicle Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingParcelVehicleType ? 'Edit Parcel Vehicle Type' : 'Add New Parcel Vehicle Type'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search parcel vehicle types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading parcel vehicle types...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredParcelVehicleTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-gray-500 text-lg">No data found! Add first parcel vehicle type.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredParcelVehicleTypes.map((type) => (
                  <TableRow key={type._id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.description}</TableCell>
                    <TableCell>
                      <Switch
                        checked={type.status}
                        onCheckedChange={() => handleStatusToggle(type._id, type.status)}
                      />
                    </TableCell>
                    <TableCell>{new Date(type.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(type)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(type)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={loading}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the parcel vehicle type.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(type._id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>View Parcel Vehicle Type</DialogTitle>
            </DialogHeader>
            {viewingParcelVehicleType && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-gray-600">{viewingParcelVehicleType.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-gray-600">{viewingParcelVehicleType.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-gray-600">
                    {viewingParcelVehicleType.status ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-gray-600">
                    {new Date(viewingParcelVehicleType.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Updated At</label>
                  <p className="text-sm text-gray-600">
                    {new Date(viewingParcelVehicleType.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default ParcelVehicleTypePage;