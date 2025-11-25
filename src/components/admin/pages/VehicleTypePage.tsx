import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import axios from 'axios';

interface VehicleType {
  _id: string;
  name: string;
  description: string;
  status: boolean;
  createdAt: string;
}

interface VehicleTypeForm {
  name: string;
  description: string;
}

export const VehicleTypePage = () => {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicleType, setEditingVehicleType] = useState<VehicleType | null>(null);
  const [vehicleTypeForm, setVehicleTypeForm] = useState<VehicleTypeForm>({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchVehicleTypes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/cabVehicleTypes`);
      setVehicleTypes(response.data);
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingVehicleType) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/cabVehicleTypes/${editingVehicleType._id}`, vehicleTypeForm);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/cabVehicleTypes`, vehicleTypeForm);
      }
      await fetchVehicleTypes();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving vehicle type:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicleType: VehicleType) => {
    setEditingVehicleType(vehicleType);
    setVehicleTypeForm({
      name: vehicleType.name,
      description: vehicleType.description
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/cabVehicleTypes/${id}`);
      await fetchVehicleTypes();
    } catch (error) {
      console.error('Error deleting vehicle type:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/cabVehicleTypes/${id}/status`, {
        status: !currentStatus
      });
      await fetchVehicleTypes();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setEditingVehicleType(null);
    setVehicleTypeForm({
      name: '',
      description: ''
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vehicle Type Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-end mb-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Vehicle Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingVehicleType ? 'Edit' : 'Create'} Vehicle Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Vehicle Type Name"
                  value={vehicleTypeForm.name}
                  onChange={(e) => setVehicleTypeForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={vehicleTypeForm.description}
                  onChange={(e) => setVehicleTypeForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {editingVehicleType ? 'Update' : 'Add'} Vehicle Type
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading vehicle types...</span>
          </div>
        ) : vehicleTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No data found! Add first vehicle type.</p>
          </div>
        ) : (
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
              {vehicleTypes.map((vehicleType) => (
                <TableRow key={vehicleType._id}>
                  <TableCell className="font-medium">{vehicleType.name}</TableCell>
                  <TableCell>{vehicleType.description}</TableCell>
                  <TableCell>
                    <Switch
                      checked={vehicleType.status}
                      onCheckedChange={() => handleStatusToggle(vehicleType._id, vehicleType.status)}
                    />
                  </TableCell>
                  <TableCell>{new Date(vehicleType.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vehicleType)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(vehicleType._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};