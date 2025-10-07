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
import axios from 'axios';

interface State {
  _id: string;
  name: string;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: State | State[];
}

export const StatesPage = () => {
  const [states, setStates] = useState<State[]>([]);
  const [stateForm, setStateForm] = useState({ name: '' });
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/states`);
      setStates(response.data || []);
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Fetch states error:', err);
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStateForm({ name: '' });
    setError(null);
  };

  const handleStateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stateForm.name.trim()) return;

    try {
      setActionLoading({ create: true });
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/api/states`, {
        name: stateForm.name.trim()
      });

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        const newState = result.data as State;
        setStates([newState, ...states]);
        resetForm();
        setStateDialogOpen(false);
        setSuccess('State created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to create state');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Create state error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingState || !stateForm.name.trim()) return;

    try {
      setActionLoading({ [`edit-${editingState._id}`]: true });
      setError(null);

      const response = await axios.put(`${API_BASE_URL}/api/states/${editingState._id}`, {
        name: stateForm.name.trim()
      });

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        setStates(states.map(state => 
          state._id === editingState._id ? result.data as State : state
        ));
        resetForm();
        setEditDialogOpen(false);
        setEditingState(null);
        setSuccess('State updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to update state');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Update state error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleEdit = (state: State) => {
    setEditingState(state);
    setStateForm({ name: state.name });
    setEditDialogOpen(true);
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      setActionLoading({ [`status-${id}`]: true });
      setError(null);

      const response = await axios.put(`${API_BASE_URL}/api/states/${id}`, {
        status: !currentStatus
      });

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        setStates(states.map(state => 
          state._id === id ? result.data as State : state
        ));
        setSuccess('State status updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to update state status');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Update state status error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading({ [`delete-${id}`]: true });
      setError(null);

      const response = await axios.delete(`${API_BASE_URL}/api/states/${id}`);
      const result: ApiResponse = response.data;

      if (result.success) {
        setStates(states.filter(state => state._id !== id));
        setSuccess('State deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to delete state');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
      console.error('Delete state error:', err);
    } finally {
      setActionLoading({});
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">States Management</h1>
        <Dialog open={stateDialogOpen} onOpenChange={(open) => {
          setStateDialogOpen(open);
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
                  Add State
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New State</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleStateSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">State Name *</label>
                <Input
                  placeholder="Enter state name"
                  value={stateForm.name}
                  onChange={(e) => setStateForm({ name: e.target.value })}
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
                  'Create State'
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
          <h2 className="text-xl font-semibold">States ({states.length})</h2>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingState(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit State</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">State Name *</label>
                <Input
                  placeholder="Enter state name"
                  value={stateForm.name}
                  onChange={(e) => setStateForm({ name: e.target.value })}
                  required
                  disabled={editingState ? actionLoading[`edit-${editingState._id}`] : false}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={editingState ? actionLoading[`edit-${editingState._id}`] : false}
              >
                {editingState && actionLoading[`edit-${editingState._id}`] ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update State'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {loading && states.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading states...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {states.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No states found. Create your first state!
                  </TableCell>
                </TableRow>
              ) : (
                states.map((state, index) => (
                  <TableRow key={state._id}>
                    <TableCell className="font-mono text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{state.name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={state.status}
                        onCheckedChange={() => handleStatusToggle(state._id, state.status)}
                        disabled={actionLoading[`status-${state._id}`]}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(state)}
                          disabled={actionLoading[`edit-${state._id}`] || actionLoading[`delete-${state._id}`]}
                          title="Edit state"
                        >
                          {actionLoading[`edit-${state._id}`] ? (
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
                              disabled={actionLoading[`edit-${state._id}`] || actionLoading[`delete-${state._id}`]}
                              title="Delete state"
                            >
                              {actionLoading[`delete-${state._id}`] ? (
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
                                This action cannot be undone. This will permanently delete the state "{state.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={actionLoading[`delete-${state._id}`]}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(state._id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={actionLoading[`delete-${state._id}`]}
                              >
                                {actionLoading[`delete-${state._id}`] ? (
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