import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import apiClient from '../../../lib/axiosInterceptor';

interface DriverVehicleType {
  _id: string;
  name: string;
  status: boolean;
}

export const DriverVehicleTypePage = () => {
  const [types, setTypes] = useState<DriverVehicleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DriverVehicleType | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes`);
        setTypes(res.data?.data || []);
      } catch (error) {
        console.error('Error fetching driver vehicle types:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim()) {
      const res = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes`, form);
      setTypes([...types, res.data.data]);
      setForm({ name: '' });
      setDialogOpen(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType && form.name.trim()) {
      const res = await apiClient.put(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes/${editingType._id}`, form);
      setTypes(types.map(t => (t._id === editingType._id ? res.data.data : t)));
      setForm({ name: '' });
      setEditDialogOpen(false);
      setEditingType(null);
    }
  };

  const handleEdit = (type: DriverVehicleType) => {
    setEditingType(type);
    setForm({ name: type.name });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes/${id}`);
    setTypes(types.filter(t => t._id !== id));
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await apiClient.put(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes/${id}`, { status: !currentStatus });
      setTypes(types.map(t => t._id === id ? res.data.data : t));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Driver Vehicle Type Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Driver Vehicle Types</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Driver Vehicle Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Driver Vehicle Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Button type="submit" className="w-full">Submit</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Driver Vehicle Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Button type="submit" className="w-full">Update</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : types.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No driver vehicle types found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              types.map((type, index) => (
                <TableRow key={type._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{type.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={type.status}
                      onCheckedChange={() => handleStatusToggle(type._id, type.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(type)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the driver vehicle type.
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
      </Card>
    </div>
  );
};
