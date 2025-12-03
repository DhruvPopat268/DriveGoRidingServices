import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Plus, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface MinHoldBalanceEntry {
  _id: string;
  minHoldBalance: number;
  minWithdrawAmount: number;
  minDepositAmount: number;
  updatedBy: string;
  createdAt: string;
}

const MinWithdrawBalancePage = () => {
  const [minHoldBalance, setMinHoldBalance] = useState('');
  const [minWithdrawAmount, setMinWithdrawAmount] = useState('');
  const [minDepositAmount, setMinDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<MinHoldBalanceEntry[]>([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/driver/admin/min-withdraw-balance/all`);
      if (response.data.success) {
        setEntries(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch entries');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minHoldBalance || !minWithdrawAmount || !minDepositAmount || parseFloat(minHoldBalance) < 0 || parseFloat(minWithdrawAmount) < 0 || parseFloat(minDepositAmount) < 0) {
      setMessage({ type: 'error', text: 'Please enter valid amounts' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/driver/admin/min-withdraw-balance`, {
        minHoldBalance: parseFloat(minHoldBalance),
        minWithdrawAmount: parseFloat(minWithdrawAmount),
        minDepositAmount: parseFloat(minDepositAmount)
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'New configuration created successfully!' });
        setMinHoldBalance('');
        setMinWithdrawAmount('');
        setMinDepositAmount('');
        fetchEntries();
        setTimeout(() => {
          setIsDialogOpen(false);
          setMessage({ type: '', text: '' });
        }, 1500);
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to create entry' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Driver Wallet Configuration</h1>
            <p className="text-gray-500 text-sm mt-1">Manage hold balance and minimum withdrawal amount settings</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Create New Minimum Balance Entry
              </DialogTitle>
              <DialogDescription>
                Set a new minimum balance requirement for driver withdrawals.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="minHoldBalance">Minimum Hold Balance (₹)</Label>
                <Input
                  id="minHoldBalance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minHoldBalance}
                  onChange={(e) => setMinHoldBalance(e.target.value)}
                  placeholder="Enter minimum hold balance"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minWithdrawAmount">Minimum Withdraw Amount (₹)</Label>
                <Input
                  id="minWithdrawAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minWithdrawAmount}
                  onChange={(e) => setMinWithdrawAmount(e.target.value)}
                  placeholder="Enter minimum withdraw amount"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minDepositAmount">Minimum Deposit Amount (₹)</Label>
                <Input
                  id="minDepositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={minDepositAmount}
                  onChange={(e) => setMinDepositAmount(e.target.value)}
                  placeholder="Enter minimum deposit amount"
                />
              </div>

              {message.text && (
                <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setMinHoldBalance('');
                    setMinWithdrawAmount('');
                    setMinDepositAmount('');
                    setMessage({ type: '', text: '' });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Entry'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Minimum Balance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hold Balance</TableHead>
                  <TableHead>Min Withdraw Amount</TableHead>
                  <TableHead>Min Deposit Amount</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No entries found. Create your first configuration.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell className="font-medium">₹{entry.minHoldBalance}</TableCell>
                      <TableCell className="font-medium">₹{entry.minWithdrawAmount}</TableCell>
                      <TableCell className="font-medium">₹{entry.minDepositAmount}</TableCell>
                      <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MinWithdrawBalancePage;