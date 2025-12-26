import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '../../../lib/axiosInterceptor';
import { useToast } from "@/components/ui/use-toast";


interface RegistrationFee {
  _id: string;
  fee: number;
  status: boolean;
  createdAt: string;
}

interface SubscriptionPlan {
  _id: string;
  name: string;
  duration: 'weekly' | 'monthly' | 'yearly';
  days: number;
  description?: string;
  amount: number;
  status: boolean;
  createdAt: string;
}

export const DriverSubscriptionPage = () => {
  const [registrationFees, setRegistrationFees] = useState<RegistrationFee[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const { toast } = useToast();


  // Registration Fee Form
  const [feeForm, setFeeForm] = useState({ fee: '' });
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);

  // Subscription Plan Form
  const [planForm, setPlanForm] = useState({
    name: '',
    duration: '' as 'weekly' | 'monthly' | 'yearly' | '',
    days: 0,
    description: '',
    amount: '',
    customDays: false
  });
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [feesResponse, plansResponse] = await Promise.all([
        apiClient.get(`${API_BASE_URL}/api/registration-fees`),
        apiClient.get(`${API_BASE_URL}/api/subscription-plans`)
      ]);

      setRegistrationFees(feesResponse.data || []);
      setSubscriptionPlans(plansResponse.data || []);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Registration Fee Functions
  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.fee || parseFloat(feeForm.fee) < 0) return;

    try {
      setActionLoading({ createFee: true });
      setError(null);

      const response = await apiClient.post(`${API_BASE_URL}/api/registration-fees`, {
        fee: parseFloat(feeForm.fee)
      });

      if (response.data.success) {
        setRegistrationFees([response.data.data, ...registrationFees]);
        setFeeForm({ fee: '' });
        setFeeDialogOpen(false);
        setSuccess('Registration fee added successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to add registration fee');
    } finally {
      setActionLoading({});
    }
  };

  const toggleFeeStatus = async (id: string, status: boolean) => {
    try {
      setActionLoading({ [`fee-${id}`]: true });

      const response = await apiClient.put(`${API_BASE_URL}/api/registration-fees/${id}/status`, {
        status: !status
      });

      if (response.data.success) {
        setRegistrationFees(registrationFees.map(fee =>
          fee._id === id ? { ...fee, status: !status } : fee
        ));
      }
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setActionLoading({});
    }
  };

  const deleteFee = async (id: string) => {
    try {
      setActionLoading({ [`delete-fee-${id}`]: true });

      const response = await apiClient.delete(`${API_BASE_URL}/api/registration-fees/${id}`);

      if (response.data.success) {
        setRegistrationFees(registrationFees.filter(fee => fee._id !== id));
        setSuccess('Registration fee deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete registration fee');
    } finally {
      setActionLoading({});
    }
  };

  // Subscription Plan Functions
  const getDaysForDuration = (duration: string) => {
    switch (duration) {
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'yearly': return 365;
      default: return 0;
    }
  };

  const handleDurationChange = (duration: 'weekly' | 'monthly' | 'yearly') => {
    setPlanForm(prev => ({
      ...prev,
      duration,
      days: getDaysForDuration(duration),
      customDays: false
    }));
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name || !planForm.duration || planForm.days <= 0 || !planForm.amount) return;

    try {
      setActionLoading({ createPlan: true });
      setError(null);

      const response = await apiClient.post(`${API_BASE_URL}/api/subscription-plans`, {
        name: planForm.name,
        duration: planForm.duration,
        days: planForm.days,
        description: planForm.description,
        amount: parseFloat(planForm.amount)
      });

      if (response.data.success) {
        setSubscriptionPlans([response.data.data, ...subscriptionPlans]);
        setPlanForm({ name: '', duration: '', days: 0, description: '', amount: '', customDays: false });
        setPlanDialogOpen(false);
        setSuccess('Subscription plan created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to create subscription plan');
    } finally {
      setActionLoading({});
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      duration: plan.duration,
      days: plan.days,
      description: plan.description || '',
      amount: plan.amount.toString(),
      customDays: plan.days !== getDaysForDuration(plan.duration)
    });
    setEditPlanDialogOpen(true);
  };

  const handleEditPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !planForm.name || !planForm.duration || planForm.days <= 0 || !planForm.amount) return;

    try {
      setActionLoading({ [`edit-${editingPlan._id}`]: true });
      setError(null);

      const response = await apiClient.put(`${API_BASE_URL}/api/subscription-plans/${editingPlan._id}`, {
        name: planForm.name,
        duration: planForm.duration,
        days: planForm.days,
        description: planForm.description,
        amount: parseFloat(planForm.amount)
      });

      if (response.data.success) {
        setSubscriptionPlans(subscriptionPlans.map(plan =>
          plan._id === editingPlan._id ? response.data.data : plan
        ));
        setPlanForm({ name: '', duration: '', days: 0, description: '', amount: '', customDays: false });
        setEditPlanDialogOpen(false);
        setEditingPlan(null);
        setSuccess('Subscription plan updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to update subscription plan');
    } finally {
      setActionLoading({});
    }
  };

  const togglePlanStatus = async (id: string, status: boolean) => {
    try {
      setActionLoading({ [`plan-${id}`]: true });

      const response = await apiClient.put(`${API_BASE_URL}/api/subscription-plans/${id}/status`, {
        status: !status
      });

      if (response.data.success) {
        setSubscriptionPlans(subscriptionPlans.map(plan =>
          plan._id === id ? { ...plan, status: !status } : plan
        ));
      }
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setActionLoading({});
    }
  };

  const deletePlan = async (id: string) => {
    try {
      setActionLoading({ [`delete-plan-${id}`]: true });

      const response = await apiClient.delete(`${API_BASE_URL}/api/subscription-plans/${id}`);

      if (response.data.success) {
        setSubscriptionPlans(subscriptionPlans.filter(plan => plan._id !== id));
        setSuccess('Subscription plan deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to delete subscription plan');
    } finally {
      setActionLoading({});
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Driver Subscription & Registration fee Management</h1>
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

      {/* Registration Fee Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Registration Fee ({registrationFees.length})</h2>
          <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={loading || actionLoading.createFee}>
                {actionLoading.createFee ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Registration Fee
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Registration Fee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFeeSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Registration Fee (INR) *</label>
                  <Input
                    type="number"
                    placeholder="Enter registration fee"
                    value={feeForm.fee}
                    onChange={(e) => setFeeForm({ fee: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    disabled={actionLoading.createFee}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={actionLoading.createFee}>
                  {actionLoading.createFee ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Fee'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registration Fee (INR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrationFees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No registration fees found. Add your first registration fee!
                </TableCell>
              </TableRow>
            ) : (
              registrationFees.map((fee) => (
                <TableRow key={fee._id}>
                  <TableCell className="font-medium">₹{fee.fee}</TableCell>
                  <TableCell>
                    <Switch
                      checked={fee.status}
                      onCheckedChange={() => toggleFeeStatus(fee._id, fee.status)}
                      disabled={actionLoading[`fee-${fee._id}`]}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(fee.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading[`delete-fee-${fee._id}`]}
                        >
                          {actionLoading[`delete-fee-${fee._id}`] ? (
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
                            This will permanently delete the registration fee of ₹{fee.fee}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteFee(fee._id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Subscription Plans Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Subscription Plans ({subscriptionPlans.length})</h2>
          <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={loading || actionLoading.createPlan}>
                {actionLoading.createPlan ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Plan
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Subscription Plan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePlanSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Plan Name *</label>
                  <Input
                    placeholder="Enter plan name"
                    value={planForm.name}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    disabled={actionLoading.createPlan}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Duration *</label>
                  <Select
                    value={planForm.duration}
                    onValueChange={handleDurationChange}
                    disabled={actionLoading.createPlan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Days *</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPlanForm(prev => ({ ...prev, customDays: !prev.customDays }))}
                      disabled={!planForm.duration || actionLoading.createPlan}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <Input
                    type="number"
                    value={planForm.days}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                    disabled={!planForm.customDays || actionLoading.createPlan}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Amount (INR) *</label>
                  <Input
                    type="number"
                    placeholder="Enter plan amount"
                    value={planForm.amount}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    min="0"
                    step="0.01"
                    disabled={actionLoading.createPlan}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    placeholder="Enter plan description"
                    value={planForm.description}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                    disabled={actionLoading.createPlan}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={actionLoading.createPlan}>
                  {actionLoading.createPlan ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Plan'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Plan Dialog */}
        <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditPlanSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Plan Name *</label>
                <Input
                  placeholder="Enter plan name"
                  value={planForm.name}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration *</label>
                <Select
                  value={planForm.duration}
                  onValueChange={handleDurationChange}
                  disabled={editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Days *</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPlanForm(prev => ({ ...prev, customDays: !prev.customDays }))}
                    disabled={!planForm.duration || (editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
                <Input
                  type="number"
                  value={planForm.days}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                  disabled={!planForm.customDays || (editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false)}
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Amount (INR) *</label>
                <Input
                  type="number"
                  placeholder="Enter plan amount"
                  value={planForm.amount}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  min="0"
                  step="0.01"
                  disabled={editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Enter plan description"
                  value={planForm.description}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                  disabled={editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={editingPlan ? actionLoading[`edit-${editingPlan._id}`] : false}
              >
                {editingPlan && actionLoading[`edit-${editingPlan._id}`] ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Plan'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Amount (INR)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptionPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No subscription plans found. Create your first plan!
                </TableCell>
              </TableRow>
            ) : (
              subscriptionPlans.map((plan) => (
                <TableRow key={plan._id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="capitalize">{plan.duration}</TableCell>
                  <TableCell>{plan.days}</TableCell>
                  <TableCell className="font-medium">₹{plan.amount}</TableCell>
                  <TableCell className="max-w-xs">
                    {plan.description ? (
                      <div className="truncate" title={plan.description}>
                        {plan.description.length > 50
                          ? plan.description.substring(0, 50) + '...'
                          : plan.description}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No description</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={plan.status}
                      onCheckedChange={() => togglePlanStatus(plan._id, plan.status)}
                      disabled={actionLoading[`plan-${plan._id}`]}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPlan(plan)}
                        disabled={actionLoading[`edit-${plan._id}`] || actionLoading[`delete-plan-${plan._id}`]}
                      >
                        {actionLoading[`edit-${plan._id}`] ? (
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
                            disabled={actionLoading[`edit-${plan._id}`] || actionLoading[`delete-plan-${plan._id}`]}
                          >
                            {actionLoading[`delete-plan-${plan._id}`] ? (
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
                              This will permanently delete the subscription plan "{plan.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePlan(plan._id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
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