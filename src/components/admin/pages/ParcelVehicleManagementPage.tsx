import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface ParcelVehicleType {
  _id: string;
  parcelCategory: ParcelCategory;
  name: string;
  description: string;
  weight: number;
}

export const ParcelVehicleManagementPage = () => {
  const navigate = useNavigate();
  const [parcelVehicleTypes, setParcelVehicleTypes] = useState<ParcelVehicleType[]>([]);
  const [parcelCategories, setParcelCategories] = useState<ParcelCategory[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filteredVehicleTypes, setFilteredVehicleTypes] = useState<ParcelVehicleType[]>([]);
  const [vehicleTypeForm, setVehicleTypeForm] = useState({
    parcelCategory: '',
    name: '',
    description: '',
    weight: ''
  });
  const [editingVehicleType, setEditingVehicleType] = useState<ParcelVehicleType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParcelVehicleTypes();
    fetchParcelCategories();
  }, []);

  useEffect(() => {
    if (filterCategory === 'all') {
      setFilteredVehicleTypes(parcelVehicleTypes);
    } else {
      setFilteredVehicleTypes(parcelVehicleTypes.filter(vehicle => vehicle.parcelCategory._id === filterCategory));
    }
  }, [parcelVehicleTypes, filterCategory]);

  const fetchParcelVehicleTypes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/parcel-vehicle-types`);
      setParcelVehicleTypes(res.data);
    } catch (err) {
      console.error('Failed to fetch parcel vehicle types', err);
    } finally {
      setLoading(false);
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
      parcelCategory: vehicleTypeForm.parcelCategory,
      name: vehicleTypeForm.name.trim(),
      description: vehicleTypeForm.description.trim(),
      weight: parseFloat(vehicleTypeForm.weight)
    };

    try {
      if (editingVehicleType) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/parcel-vehicle-types/${editingVehicleType._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/parcel-vehicle-types`, payload);
      }
      await fetchParcelVehicleTypes();
      setDialogOpen(false);
      setEditingVehicleType(null);
      setVehicleTypeForm({ parcelCategory: '', name: '', description: '', weight: '' });
    } catch (err) {
      console.error('Failed to save parcel vehicle type', err);
    }
  };

  const handleEdit = (vehicleType: ParcelVehicleType) => {
    setEditingVehicleType(vehicleType);
    setVehicleTypeForm({
      parcelCategory: vehicleType.parcelCategory._id,
      name: vehicleType.name,
      description: vehicleType.description,
      weight: vehicleType.weight.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/parcel-vehicle-types/${id}`);
      fetchParcelVehicleTypes();
    } catch (err) {
      console.error('Failed to delete vehicle type', err);
    }
  };

  const resetForm = () => {
    setEditingVehicleType(null);
    setVehicleTypeForm({ parcelCategory: '', name: '', description: '', weight: '' });
  };

  const handleViewDrivers = (vehicleType: ParcelVehicleType) => {
    navigate(`/admin/category-assignment/parcel/${vehicleType._id}`);
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
                <DialogTitle>{editingVehicleType ? 'Edit Parcel Vehicle' : 'Create Parcel Vehicle'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  value={vehicleTypeForm.parcelCategory}
                  onValueChange={(value) => setVehicleTypeForm({ ...vehicleTypeForm, parcelCategory: value })}
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
                <Input
                  placeholder="Vehicle Name (e.g., Small Bike, Large Truck)"
                  value={vehicleTypeForm.name}
                  onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, name: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Weight (kg)"
                  value={vehicleTypeForm.weight}
                  onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, weight: e.target.value })}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={vehicleTypeForm.description}
                  onChange={(e) => setVehicleTypeForm({ ...vehicleTypeForm, description: e.target.value })}
                  required
                />
                <Button type="submit" className="w-full">
                  {editingVehicleType ? 'Update' : 'Create'}
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
              <TableHead>Vehicle Name</TableHead>
              <TableHead>Weight (kg)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading parcel vehicles...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredVehicleTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  {parcelVehicleTypes.length === 0 ? 'No parcel vehicles found. Create your first one!' : 'No vehicles found for selected category.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicleTypes.map((vehicleType,index) => (
                <TableRow key={vehicleType._id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{vehicleType.parcelCategory.categoryName}</TableCell>
                  <TableCell>{vehicleType.name}</TableCell>
                  <TableCell>{vehicleType.weight} kg</TableCell>
                  <TableCell>{vehicleType.description}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDrivers(vehicleType)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(vehicleType)}>
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
                            <AlertDialogAction onClick={() => handleDelete(vehicleType._id)}>
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