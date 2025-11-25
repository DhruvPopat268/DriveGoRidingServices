import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import axios from 'axios';

interface ParcelCategory {
  _id: string;
  categoryName: string;
}

interface ParcelVehicleTypeRef {
  _id: string;
  name: string;
}

interface ParcelVehicle {
  _id: string;
  parcelCategory: ParcelCategory;
  parcelVehicleType: ParcelVehicleTypeRef;
  name: string;
  description: string;
  weight: number;
  status: boolean;
}

export const ParcelVehicleManagementPage = () => {
  const [parcelVehicles, setParcelVehicles] = useState<ParcelVehicle[]>([]);
  const [parcelCategories, setParcelCategories] = useState<ParcelCategory[]>([]);
  const [parcelVehicleTypes, setParcelVehicleTypes] = useState<ParcelVehicleTypeRef[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filteredVehicles, setFilteredVehicles] = useState<ParcelVehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState({
    parcelCategory: '',
    parcelVehicleType: '',
    name: '',
    description: '',
    weight: ''
  });
  const [editingVehicle, setEditingVehicle] = useState<ParcelVehicle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParcelVehicles();
    fetchParcelCategories();
    fetchParcelVehicleTypes();
  }, []);

  useEffect(() => {
    if (filterCategory === 'all') {
      setFilteredVehicles(parcelVehicles);
    } else {
      setFilteredVehicles(parcelVehicles.filter(vehicle => vehicle.parcelCategory._id === filterCategory));
    }
  }, [parcelVehicles, filterCategory]);

  const fetchParcelVehicles = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/parcelVehicles`);
      setParcelVehicles(res.data);
    } catch (err) {
      console.error('Failed to fetch parcel vehicles', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParcelVehicleTypes = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/parcelVehicleTypes`);
      setParcelVehicleTypes(res.data);
    } catch (err) {
      console.error('Failed to fetch parcel vehicle types', err);
    }
  };

  const fetchParcelCategories = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/parcel-categories`);
      setParcelCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch parcel categories', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      parcelCategory: vehicleForm.parcelCategory,
      parcelVehicleType: vehicleForm.parcelVehicleType,
      name: vehicleForm.name.trim(),
      description: vehicleForm.description.trim(),
      weight: parseFloat(vehicleForm.weight)
    };

    try {
      if (editingVehicle) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/parcelVehicles/${editingVehicle._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/parcelVehicles`, payload);
      }
      await fetchParcelVehicles();
      setDialogOpen(false);
      setEditingVehicle(null);
      setVehicleForm({ parcelCategory: '', parcelVehicleType: '', name: '', description: '', weight: '' });
    } catch (err) {
      console.error('Failed to save parcel vehicle', err);
    }
  };

  const handleEdit = (vehicle: ParcelVehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      parcelCategory: vehicle.parcelCategory._id,
      parcelVehicleType: vehicle.parcelVehicleType._id,
      name: vehicle.name,
      description: vehicle.description,
      weight: vehicle.weight.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/parcelVehicles/${id}`);
      fetchParcelVehicles();
    } catch (err) {
      console.error('Failed to delete parcel vehicle', err);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/parcelVehicles/${id}/status`, {
        status: !currentStatus
      });
      await fetchParcelVehicles();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setVehicleForm({ parcelCategory: '', parcelVehicleType: '', name: '', description: '', weight: '' });
  };



  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parcel Vehicle Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Parcel Vehicles</h2>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {parcelCategories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Edit Parcel Vehicle' : 'Create Parcel Vehicle'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  value={vehicleForm.parcelCategory}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, parcelCategory: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Parcel Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {parcelCategories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={vehicleForm.parcelVehicleType}
                  onValueChange={(value) => setVehicleForm({ ...vehicleForm, parcelVehicleType: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Parcel Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {parcelVehicleTypes.map((type) => (
                      <SelectItem key={type._id} value={type._id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Vehicle Name (e.g., Small Bike, Large Truck)"
                  value={vehicleForm.name}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Weight (kg)"
                  value={vehicleForm.weight}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, weight: e.target.value })}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={vehicleForm.description}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, description: e.target.value })}
                  required
                />
                <Button type="submit" className="w-full">
                  {editingVehicle ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Parcel Category</TableHead>
              <TableHead>Vehicle Type</TableHead>
              <TableHead>Vehicle Name</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading parcel vehicles...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  {parcelVehicles.length === 0 ? 'No parcel vehicles found. Create your first one!' : 'No vehicles found for selected category.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle, index) => (
                <TableRow key={vehicle._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{vehicle.parcelCategory.categoryName}</TableCell>
                  <TableCell>{vehicle.parcelVehicleType.name}</TableCell>
                  <TableCell>{vehicle.name}</TableCell>
                  <TableCell>{vehicle.weight} kg</TableCell>
                  <TableCell>{vehicle.description}</TableCell>
                  <TableCell>
                    <Switch
                      checked={vehicle.status}
                      onCheckedChange={() => handleStatusToggle(vehicle._id, vehicle.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(vehicle)}>
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
                              This will permanently delete the parcel vehicle. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vehicle._id)}>
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