import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface WithdrawRequest {
  _id: string;
  riderId: {
    _id: string;
    name: string;
    mobile: string;
    email?: string;
  };
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

export const RiderApprovedWithdrawalPage = () => {
  const [requests, setRequests] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  const fetchApprovedRequests = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rider/withdraw/approved`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approved withdrawals');
      }

      const data = await response.json();
      setRequests(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading approved withdrawals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Approved Rider Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Payment Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead>Admin Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No approved withdrawal requests found
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell className="font-medium">
                      <div>
                        {request.riderId?.name || 'N/A'}
                        <div className="text-gray-500 text-sm">
                          {request.riderId?.email || 'No email available'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{request.riderId?.mobile || 'N/A'}</TableCell>
                    <TableCell>₹{request.amount}</TableCell>
                    <TableCell className="capitalize">{request.paymentMethod}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {request.paymentMethod === 'bank_transfer' && request.bankDetails && (
                          <>
                            <div><strong>Bank:</strong> {request.bankDetails.bankName || 'N/A'}</div>
                            <div><strong>A/C:</strong> {request.bankDetails.accountNumber || 'N/A'}</div>
                            <div><strong>IFSC:</strong> {request.bankDetails.ifscCode || 'N/A'}</div>
                            <div><strong>Holder:</strong> {request.bankDetails.bankAccountHolderName || 'N/A'}</div>
                          </>
                        )}
                        {request.paymentMethod === 'upi' && request.upiDetails && (
                          <div><strong>UPI ID:</strong> {request.upiDetails.upiId || 'N/A'}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(request.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-xs">
                        {request.adminNotes || 'No notes'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderApprovedWithdrawalPage;