import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
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
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const RiderRejectedWithdrawalPage: React.FC = () => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRejectedRequests();
  }, []);

  const fetchRejectedRequests = async () => {
    try {
      const response = await fetch('/api/rider/withdraw?status=rejected');
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Rejected Rider Withdrawal Requests</h1>
      
      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request._id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>₹{request.amount}</span>
                <Badge variant="destructive">{request.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Rider ID:</strong> {request.riderId}</p>
                  <p><strong>Payment Method:</strong> {request.paymentMethod}</p>
                  <p><strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                  <p><strong>Rejected:</strong> {new Date(request.updatedAt).toLocaleDateString()}</p>
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
              
              {request.adminNotes && (
                <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                  <p><strong>Rejection Reason:</strong> {request.adminNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p>No rejected withdrawal requests found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RiderRejectedWithdrawalPage;