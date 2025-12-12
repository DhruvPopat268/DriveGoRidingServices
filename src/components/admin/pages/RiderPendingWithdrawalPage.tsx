import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { toast } from '../../ui/use-toast';

interface WithdrawRequest {
  _id: string;
  riderId: string;
  amount: number;
  paymentMethod: string;
  bankDetails?: {
    bankAccountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  upiDetails?: {
    upiId: string;
    upiQrCode?: string;
  };
  status: string;
  createdAt: string;
}

const RiderPendingWithdrawalPage: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawRequest | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/rider/withdraw?status=pending');
      const data = await response.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/rider/withdraw/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminNotes })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: data.message });
        fetchPendingRequests();
        setAdminNotes('');
        setSelectedRequest(null);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Rider Withdrawal Requests</h1>
      
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request._id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>₹{request.amount}</span>
                <Badge variant="secondary">{request.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p><strong>Rider ID:</strong> {request.riderId}</p>
                  <p><strong>Payment Method:</strong> {request.paymentMethod}</p>
                  <p><strong>Date:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  {request.paymentMethod === 'bank_transfer' && request.bankDetails && (
                    <div>
                      <p><strong>Account Holder:</strong> {request.bankDetails.bankAccountHolderName}</p>
                      <p><strong>Account Number:</strong> {request.bankDetails.accountNumber}</p>
                      <p><strong>IFSC:</strong> {request.bankDetails.ifscCode}</p>
                      <p><strong>Bank:</strong> {request.bankDetails.bankName}</p>
                    </div>
                  )}
                  {request.paymentMethod === 'upi' && request.upiDetails && (
                    <div>
                      <p><strong>UPI ID:</strong> {request.upiDetails.upiId}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="default" 
                      onClick={() => setSelectedRequest(request)}
                    >
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve Withdrawal Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Amount: ₹{request.amount}</p>
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                      <Button 
                        onClick={() => handleAction(request._id, 'approve')}
                        disabled={actionLoading === request._id}
                        className="w-full"
                      >
                        {actionLoading === request._id ? 'Processing...' : 'Confirm Approval'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      onClick={() => setSelectedRequest(request)}
                    >
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Withdrawal Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>Amount: ₹{request.amount}</p>
                      <Textarea
                        placeholder="Reason for rejection"
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                      <Button 
                        onClick={() => handleAction(request._id, 'reject')}
                        disabled={actionLoading === request._id}
                        variant="destructive"
                        className="w-full"
                      >
                        {actionLoading === request._id ? 'Processing...' : 'Confirm Rejection'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p>No pending withdrawal requests found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiderPendingWithdrawalPage;