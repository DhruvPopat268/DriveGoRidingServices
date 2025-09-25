import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

interface ParcelVehicle {
  _id: string;
  vehicleName: string;
}

export const ParcelVehiclePage = () => {
  const [parcelVehicles, setParcelVehicles] = useState<ParcelVehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleName: ''
  });
  const [editingVehicle, setEditingVehicle] = useState<ParcelVehicle | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchParcelVehicles();
  }, []);

  const fetchParcelVehicles = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/parcel-vehicles`);
      setParcelVehicles(res.data);
    } catch (err) {
      console.error('Failed to fetch parcel vehicles', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      vehicleName: vehicleForm.vehicleName.trim()
    };

    try {
      if (editingVehicle) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/parcel-vehicles/${editingVehicle._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/parcel-vehicles`, payload);
      }
      await fetchParcelVehicles();
      setDialogOpen(false);
      setEditingVehicle(null);
      setVehicleForm({ vehicleName: '' });
    } catch (err) {
      console.error('Failed to save parcel vehicle', err);
    }
  };

  const handleEdit = (vehicle: ParcelVehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      vehicleName: vehicle.vehicleName
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/parcel-vehicles/${id}`);
      fetchParcelVehicles();
    } catch (err) {
      console.error('Failed to delete vehicle', err);
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setVehicleForm({ vehicleName: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parcel Vehicle Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Parcel Vehicles</h2>

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
                <Input
                  placeholder="Vehicle Name (e.g., Motorcycle, Van, Truck)"
                  value={vehicleForm.vehicleName}
                  onChange={(e) => setVehicleForm({ vehicleName: e.target.value })}
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
              <TableHead>Vehicle Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No parcel vehicles found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              parcelVehicles.map((vehicle) => (
                <TableRow key={vehicle._id}>
                  <TableCell className="font-medium">{vehicle.vehicleName}</TableCell>
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