import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';

interface VehicleCategory {
  _id: string;
  vehicleName: string;
  DriveVehicleType: {
    _id: string;
    name: string;
  };
  status: boolean;
}

interface DriverVehicleType {
  _id: string;
  name: string;
  status: boolean;
}

export const VehicleCategoryPage = () => {
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [driverVehicleTypes, setDriverVehicleTypes] = useState<DriverVehicleType[]>([]);
  const [loading, setLoading] = useState(false);
 

  const [vehicleCategoryForm, setVehicleCategoryForm] = useState({
    vehicleName: '',
    DriveVehicleType: ''
  });
  const [vehicleCategoryDialogOpen, setVehicleCategoryDialogOpen] = useState(false);
  const [editingVehicleCategory, setEditingVehicleCategory] = useState<VehicleCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, typesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/vehiclecategories`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes`)
        ]);
        setVehicleCategories(categoriesRes.data?.data || []);
        setDriverVehicleTypes(typesRes.data?.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleVehicleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vehicleCategoryForm.vehicleName.trim() && vehicleCategoryForm.DriveVehicleType) {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/vehiclecategories`, vehicleCategoryForm);
      setVehicleCategories([...vehicleCategories, res.data.data]);
      setVehicleCategoryForm({ vehicleName: '', DriveVehicleType: '' });
      setVehicleCategoryDialogOpen(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicleCategory && vehicleCategoryForm.vehicleName.trim() && vehicleCategoryForm.DriveVehicleType) {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/vehiclecategories/${editingVehicleCategory._id}`, vehicleCategoryForm);
      setVehicleCategories(
        vehicleCategories.map(vc => (vc._id === editingVehicleCategory._id ? res.data.data : vc))
      );
      setVehicleCategoryForm({ vehicleName: '', DriveVehicleType: '' });
      setEditDialogOpen(false);
      setEditingVehicleCategory(null);
    }
  };

  const handleEdit = (vehicleCategory: VehicleCategory) => {
    setEditingVehicleCategory(vehicleCategory);
    setVehicleCategoryForm({
      vehicleName: vehicleCategory.vehicleName,
      DriveVehicleType: typeof vehicleCategory.DriveVehicleType === 'object' ? vehicleCategory.DriveVehicleType._id : vehicleCategory.DriveVehicleType
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/vehiclecategories/${id}`);
    setVehicleCategories(vehicleCategories.filter(vc => vc._id !== id));
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/vehiclecategories/${id}`, { status: !currentStatus });
      setVehicleCategories(vehicleCategories.map(vc => vc._id === id ? res.data.data : vc));
    } catch (error) {
      console.error('Error updating status:', error);
    }
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
                <Input
                  placeholder="Vehicle name"
                  value={vehicleCategoryForm.vehicleName}
                  onChange={(e) =>
                    setVehicleCategoryForm({ ...vehicleCategoryForm, vehicleName: e.target.value })
                  }
                  required
                />
                <Select
                  value={vehicleCategoryForm.DriveVehicleType}
                  onValueChange={(value) =>
                    setVehicleCategoryForm({ ...vehicleCategoryForm, DriveVehicleType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Driver Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {driverVehicleTypes.filter(t => t.status === true).map((type) => (
                      <SelectItem key={type._id} value={type._id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Input
                placeholder="Vehicle name"
                value={vehicleCategoryForm.vehicleName}
                onChange={(e) =>
                  setVehicleCategoryForm({ ...vehicleCategoryForm, vehicleName: e.target.value })
                }
                required
              />
              <Select
                value={vehicleCategoryForm.DriveVehicleType}
                onValueChange={(value) =>
                  setVehicleCategoryForm({ ...vehicleCategoryForm, DriveVehicleType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Driver Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {driverVehicleTypes.filter(t => t.status === true).map((type) => (
                    <SelectItem key={type._id} value={type._id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <TableHead>#</TableHead>
              <TableHead>Vehicle Name</TableHead>
              <TableHead>Driver Vehicle Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading vehicle categories...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : vehicleCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No vehicle category found. Create your first vehicle category!
                </TableCell>
              </TableRow>
            ) : (
              vehicleCategories.map((vehicle,index) => (
                <TableRow key={vehicle._id}>
                  <TableCell>{index+1}</TableCell>
                  <TableCell>{vehicle.vehicleName}</TableCell>
                  <TableCell>
                    {typeof vehicle.DriveVehicleType === 'object' ? vehicle.DriveVehicleType.name : driverVehicleTypes.find(t => t._id === vehicle.DriveVehicleType)?.name || 'N/A'}
                  </TableCell>
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