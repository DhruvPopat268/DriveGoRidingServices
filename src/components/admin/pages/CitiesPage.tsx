import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

interface State {
  _id: string;
  name: string;
}

interface City {
  _id: string;
  name: string;
  state: {
    _id: string;
    name: string;
  };
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: City | City[];
}

export const CitiesPage = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cityForm, setCityForm] = useState({ name: '', state: '' });
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchCities();
    fetchActiveStates();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/cities`);
      setCities(response.data || []);
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Fetch cities error:', err);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveStates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cities/active-states`);
      setStates(response.data || []);
    } catch (err) {
      console.error('Fetch active states error:', err);
      setStates([]);
    }
  };

  const resetForm = () => {
    setCityForm({ name: '', state: '' });
    setError(null);
  };

  const handleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityForm.name.trim() || !cityForm.state) return;

    try {
      setActionLoading({ create: true });
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/api/cities`, {
        name: cityForm.name.trim(),
        state: cityForm.state
      });

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        const newCity = result.data as City;
        setCities([newCity, ...cities]);
        resetForm();
        setCityDialogOpen(false);
        setSuccess('City created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to create city');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Create city error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity || !cityForm.name.trim() || !cityForm.state) return;

    try {
      setActionLoading({ [`edit-${editingCity._id}`]: true });
      setError(null);

      const response = await axios.put(`${API_BASE_URL}/api/cities/${editingCity._id}`, {
        name: cityForm.name.trim(),
        state: cityForm.state
      });

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        setCities(cities.map(city => 
          city._id === editingCity._id ? result.data as City : city
        ));
        resetForm();
        setEditDialogOpen(false);
        setEditingCity(null);
        setSuccess('City updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to update city');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Update city error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setCityForm({ name: city.name, state: city.state._id });
    setEditDialogOpen(true);
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      setActionLoading({ [`status-${id}`]: true });
      setError(null);

      const response = await axios.put(`${API_BASE_URL}/api/cities/${id}`, {
        status: !currentStatus
      });

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        setCities(cities.map(city => 
          city._id === id ? result.data as City : city
        ));
        setSuccess('City status updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to update city status');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Update city status error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading({ [`delete-${id}`]: true });
      setError(null);

      const response = await axios.delete(`${API_BASE_URL}/api/cities/${id}`);
      const result: ApiResponse = response.data;

      if (result.success) {
        setCities(cities.filter(city => city._id !== id));
        setSuccess('City deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to delete city');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Delete city error:', err);
    } finally {
      setActionLoading({});
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cities Management</h1>
        <Dialog open={cityDialogOpen} onOpenChange={(open) => {
          setCityDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button disabled={loading || actionLoading.create}>
              {actionLoading.create ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add City
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New City</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCitySubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">State *</label>
                <Select value={cityForm.state} onValueChange={(value) => setCityForm(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state._id} value={state._id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">City Name *</label>
                <Input
                  placeholder="Enter city name"
                  value={cityForm.name}
                  onChange={(e) => setCityForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={actionLoading.create}
                />
              </div>
              <Button type="submit" className="w-full" disabled={actionLoading.create}>
                {actionLoading.create ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create City'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Cities ({cities.length})</h2>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingCity(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit City</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">State *</label>
                <Select value={cityForm.state} onValueChange={(value) => setCityForm(prev => ({ ...prev, state: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state._id} value={state._id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">City Name *</label>
                <Input
                  placeholder="Enter city name"
                  value={cityForm.name}
                  onChange={(e) => setCityForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={editingCity ? actionLoading[`edit-${editingCity._id}`] : false}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={editingCity ? actionLoading[`edit-${editingCity._id}`] : false}
              >
                {editingCity && actionLoading[`edit-${editingCity._id}`] ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update City'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {loading && cities.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading cities...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>State</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No cities found. Create your first city!
                  </TableCell>
                </TableRow>
              ) : (
                cities.map((city, index) => (
                  <TableRow key={city._id}>
                    <TableCell className="font-mono text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{city.state.name}</TableCell>
                    <TableCell className="font-medium">{city.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={city.status}
                        onCheckedChange={() => handleStatusToggle(city._id, city.status)}
                        disabled={actionLoading[`status-${city._id}`]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(city)}
                          disabled={actionLoading[`edit-${city._id}`] || actionLoading[`delete-${city._id}`]}
                          title="Edit city"
                        >
                          {actionLoading[`edit-${city._id}`] ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Edit className="w-4 h-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading[`edit-${city._id}`] || actionLoading[`delete-${city._id}`]}
                              title="Delete city"
                            >
                              {actionLoading[`delete-${city._id}`] ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the city "{city.name}" from {city.state.name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={actionLoading[`delete-${city._id}`]}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(city._id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={actionLoading[`delete-${city._id}`]}
                              >
                                {actionLoading[`delete-${city._id}`] ? (
                                  <>
                                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete'
                                )}
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
        )}
      </Card>
    </div>
  );
};