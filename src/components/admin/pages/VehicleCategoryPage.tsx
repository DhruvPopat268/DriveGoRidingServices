import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import axios from 'axios';

interface VehicleCategory {
  _id: string;
  image: string;
  vehicleName: string;
  perKmCharge: number;
  perMinuteCharge: number;
}

export const VehicleCategoryPage = () => {
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
 

  const [vehicleCategoryForm, setVehicleCategoryForm] = useState({
    image: '',
    vehicleName: '',
    perKmCharge: '',
    perMinuteCharge: ''
  });
  const [vehicleCategoryDialogOpen, setVehicleCategoryDialogOpen] = useState(false);
  const [editingVehicleCategory, setEditingVehicleCategory] = useState<VehicleCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // ✅ Fetch all vehicle categories on mount
  useEffect(() => {
    const fetchVehicleCategories = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/vehiclecategories`);
        setVehicleCategories(res.data?.data || []);
      } catch (error) {
        console.error('Error fetching vehicle categories:', error);
      }
    };

    fetchVehicleCategories();
  }, [import.meta.env.VITE_API_URL]);

  const handleVehicleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      vehicleCategoryForm.vehicleName.trim() &&
      vehicleCategoryForm.perKmCharge &&
      vehicleCategoryForm.perMinuteCharge
    ) {
      const payload = {
        image: vehicleCategoryForm.image || '/placeholder.svg',
        vehicleName: vehicleCategoryForm.vehicleName.trim(),
        perKmCharge: parseFloat(vehicleCategoryForm.perKmCharge),
        perMinuteCharge: parseFloat(vehicleCategoryForm.perMinuteCharge)
      };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/vehiclecategories`, payload);
      setVehicleCategories([...vehicleCategories, res.data.data]);
      setVehicleCategoryForm({ image: '', vehicleName: '', perKmCharge: '', perMinuteCharge: '' });
      setVehicleCategoryDialogOpen(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      editingVehicleCategory &&
      vehicleCategoryForm.vehicleName.trim() &&
      vehicleCategoryForm.perKmCharge &&
      vehicleCategoryForm.perMinuteCharge
    ) {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/vehiclecategories/${editingVehicleCategory._id}`, {
        image: vehicleCategoryForm.image,
        vehicleName: vehicleCategoryForm.vehicleName,
        perKmCharge: parseFloat(vehicleCategoryForm.perKmCharge),
        perMinuteCharge: parseFloat(vehicleCategoryForm.perMinuteCharge)
      });
      setVehicleCategories(
        vehicleCategories.map(vc => (vc._id === editingVehicleCategory._id ? res.data.data : vc))
      );
      setVehicleCategoryForm({ image: '', vehicleName: '', perKmCharge: '', perMinuteCharge: '' });
      setEditDialogOpen(false);
      setEditingVehicleCategory(null);
    }
  };

  const handleEdit = (vehicleCategory: VehicleCategory) => {
    setEditingVehicleCategory(vehicleCategory);
    setVehicleCategoryForm({
      image: vehicleCategory.image,
      vehicleName: vehicleCategory.vehicleName,
      perKmCharge: vehicleCategory.perKmCharge.toString(),
      perMinuteCharge: vehicleCategory.perMinuteCharge.toString()
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/vehiclecategories/${id}`);
    setVehicleCategories(vehicleCategories.filter(vc => vc._id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Vehicle Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Vehicle Categories</h2>
          <Dialog open={vehicleCategoryDialogOpen} onOpenChange={setVehicleCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Vehicle Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Vehicle Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleVehicleCategorySubmit} className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVehicleCategoryForm({ ...vehicleCategoryForm, image: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Vehicle name"
                  value={vehicleCategoryForm.vehicleName}
                  onChange={(e) =>
                    setVehicleCategoryForm({ ...vehicleCategoryForm, vehicleName: e.target.value })
                  }
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Per km charge"
                  value={vehicleCategoryForm.perKmCharge}
                  onChange={(e) =>
                    setVehicleCategoryForm({ ...vehicleCategoryForm, perKmCharge: e.target.value })
                  }
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Per minute charge"
                  value={vehicleCategoryForm.perMinuteCharge}
                  onChange={(e) =>
                    setVehicleCategoryForm({ ...vehicleCategoryForm, perMinuteCharge: e.target.value })
                  }
                  required
                />
                <Button type="submit" className="w-full">
                  Submit
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vehicle Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setVehicleCategoryForm({ ...vehicleCategoryForm, image: e.target.value })}
                />
              </div>
              <Input
                placeholder="Vehicle name"
                value={vehicleCategoryForm.vehicleName}
                onChange={(e) =>
                  setVehicleCategoryForm({ ...vehicleCategoryForm, vehicleName: e.target.value })
                }
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Per km charge"
                value={vehicleCategoryForm.perKmCharge}
                onChange={(e) =>
                  setVehicleCategoryForm({ ...vehicleCategoryForm, perKmCharge: e.target.value })
                }
                required
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Per minute charge"
                value={vehicleCategoryForm.perMinuteCharge}
                onChange={(e) =>
                  setVehicleCategoryForm({ ...vehicleCategoryForm, perMinuteCharge: e.target.value })
                }
                required
              />
              <Button type="submit" className="w-full">
                Update
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Table of Vehicle Categories */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Vehicle Name</TableHead>
              <TableHead>Per Km Charge</TableHead>
              <TableHead>Per Minute Charge</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicleCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No vehicle category found. Create your first vehicle category!
                </TableCell>
              </TableRow>
            ) : (
              vehicleCategories.map((vehicle) => (
                <TableRow key={vehicle._id}>
                  <TableCell>{vehicle._id}</TableCell>
                  <TableCell>
                    <img
                      src={vehicle.image || '/placeholder.svg'}
                      alt={vehicle.vehicleName}
                      className="w-10 h-10 rounded object-cover"
                    />
                  </TableCell>
                  <TableCell>{vehicle.vehicleName}</TableCell>
                  <TableCell>₹{vehicle.perKmCharge}</TableCell>
                  <TableCell>₹{vehicle.perMinuteCharge}</TableCell>
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
                              This action cannot be undone. This will permanently delete the vehicle category.
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