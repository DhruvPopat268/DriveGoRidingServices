import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RideCost {
  _id?: string;
  modelName: string;
  baseFare: number;
  minKmIncluded: number;
  extraPerKm: number;
  includedMinutes: number;
  extraPerMin: number;
  pickCharges: number;
  nightCharges: number;
  cancellationFee: number;
  insurance: number;
  extraChargesFromAdmin: number;
  gst: number;
  discount: number;
  peakHoursChargePerKm: number;
  peakHoursChargePerMin: number;
  peakDateChargePerKm: number;
  peakDateChargePerMin: number;
}

export const RideCostPage = () => {
  const [rideCosts, setRideCosts] = useState<RideCost[]>([]);
  const [rideCostForm, setRideCostForm] = useState<any>({});
  const [rideCostDialogOpen, setRideCostDialogOpen] = useState(false);
  const [editingRideCost, setEditingRideCost] = useState<RideCost | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewingRideCost, setViewingRideCost] = useState<RideCost | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  

  useEffect(() => {
    fetchRideCosts();
  }, []);

  const fetchRideCosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ride-costs`);
      setRideCosts(res.data);
    } catch (error) {
      console.error('Error fetching ride costs:', error);
      alert('Failed to fetch ride costs');
    } finally {
      setLoading(false);
    }
  };

  const handleRideCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const payload = Object.fromEntries(
        Object.entries(rideCostForm).map(([key, value]) => {
          return [
            key,
            key === 'modelName' ? String(value || '') : parseFloat(String(value || '0'))
          ];
        })
      );

      payload['modelName'] = String(rideCostForm.modelName || '');

      await axios.post(`${import.meta.env.VITE_API_URL}/api/ride-costs`, payload);
      fetchRideCosts();
      setRideCostDialogOpen(false);
      setRideCostForm({});
      alert('Ride cost model created successfully!');
    } catch (error) {
      console.error('Error creating ride cost:', error);
      alert('Failed to create ride cost model');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRideCost?._id) return;
    
    try {
      setLoading(true);
      const payload = Object.fromEntries(
        Object.entries(rideCostForm).map(([key, value]) => [
          key, 
          key === 'modelName' ? String(value || '') : parseFloat(String(value || '0'))
        ])
      );
      payload['modelName'] = String(rideCostForm.modelName || '');

      await axios.put(`${import.meta.env.VITE_API_URL}/api/ride-costs/${editingRideCost._id}`, payload);
      fetchRideCosts();
      setEditDialogOpen(false);
      setEditingRideCost(null);
      setRideCostForm({});
      alert('Ride cost model updated successfully!');
    } catch (error) {
      console.error('Error updating ride cost:', error);
      alert('Failed to update ride cost model');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rideCost: RideCost) => {
    setEditingRideCost(rideCost);
    const newForm: any = {};
    Object.entries(rideCost).forEach(([key, value]) => {
      if (typeof value !== 'undefined') newForm[key] = value.toString();
    });
    setRideCostForm(newForm);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    
    try {
      setLoading(true);
      // Fixed: Added '/api' prefix to match other API calls
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/ride-costs/${id}`);
      fetchRideCosts();
      alert('Ride cost model deleted successfully!');
    } catch (error) {
      console.error('Error deleting ride cost:', error);
      alert('Failed to delete ride cost model');
    } finally {
      setLoading(false);
    }
  };

  const formFields = [
    { key: 'modelName', label: 'Model Name', type: 'text' },
    { key: 'baseFare', label: 'Base Fare', type: 'number' },
    { key: 'minKmIncluded', label: 'Min Km Included', type: 'number' },
    { key: 'extraPerKm', label: 'Extra Per Km', type: 'number' },
    { key: 'includedMinutes', label: 'Included Minutes', type: 'number' },
    { key: 'extraPerMin', label: 'Extra Per Minute', type: 'number' },
    { key: 'pickCharges', label: 'Pick Charges', type: 'number' },
    { key: 'nightCharges', label: 'Night Charges', type: 'number' },
    { key: 'cancellationFee', label: 'Cancellation Fee', type: 'number' },
    { key: 'insurance', label: 'Insurance', type: 'number' },
    { key: 'extraChargesFromAdmin', label: 'Extra Charges from Admin in %', type: 'number' },
    { key: 'gst', label: 'GST in %', type: 'number' }, // Fixed: Changed from 'GST' to 'gst'
    { key: 'discount', label: 'Discount', type: 'number' },
    { key: 'peakHoursChargePerKm', label: 'Peak Hours Charge Per Km', type: 'number' },
    { key: 'peakHoursChargePerMin', label: 'Peak Hours Charge Per Minute', type: 'number' },
    { key: 'peakDateChargePerKm', label: 'Peak Date Charge Per Km', type: 'number' },
    { key: 'peakDateChargePerMin', label: 'Peak Date Charge Per Minute', type: 'number' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ride Cost Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Ride Cost Models</h2>
          <Dialog open={rideCostDialogOpen} onOpenChange={setRideCostDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setRideCostForm({})} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ride Cost Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Ride Cost Model</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRideCostSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {formFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1">{field.label}</label>
                      <Input
                        type={field.type}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={rideCostForm[field.key] || ''}
                        onChange={(e) =>
                          setRideCostForm((prev: any) => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))
                        }
                        required={field.key === 'modelName'}
                      />
                    </div>
                  ))}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating...' : 'Submit'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Ride Cost Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                    <Input
                      type={field.type}
                      value={rideCostForm[field.key] || ''}
                      onChange={(e) =>
                        setRideCostForm((prev: any) => ({
                          ...prev,
                          [field.key]: e.target.value
                        }))
                      }
                      required={field.key === 'modelName'}
                    />
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rideCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                    {loading ? 'Loading...' : 'No ride cost model found. Add your first one!'}
                  </TableCell>
                </TableRow>
              ) : (
                rideCosts.map((rideCost) => (
                  <TableRow key={rideCost._id}>
                    <TableCell>{rideCost.modelName}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setViewingRideCost(rideCost);
                            setViewDialogOpen(true);
                          }}
                          disabled={loading}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(rideCost)}
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
                                This will delete the ride cost permanently. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(rideCost._id)}
                                disabled={loading}
                              >
                                {loading ? 'Deleting...' : 'Delete'}
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

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Ride Cost Model</DialogTitle>
            </DialogHeader>
            {viewingRideCost && (
              <div className="grid grid-cols-2 gap-4">
                {formFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                    <Input value={viewingRideCost[field.key as keyof RideCost]?.toString() || ''} readOnly />
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};