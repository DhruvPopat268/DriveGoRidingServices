import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Loader } from "lucide-react";

interface WithdrawalRequest {
  _id: string;
  driverId: {
    name: string;
    mobile: string;
  };
  amount: number;
  paymentMethod: string;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  status: string;
  createdAt: string;
  completedAt?: string;
}

export const CompletedWithdrawalPage = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletedWithdrawals();
  }, []);

  const fetchCompletedWithdrawals = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rides/withdrawals/completed`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completed withdrawals');
      }

      const result = await response.json();
      setWithdrawals(Array.isArray(result.data) ? result.data : []);
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
        <span>Loading completed withdrawals...</span>
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
          <CardTitle>Completed Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Request Date</TableHead>
                {/* <TableHead>Completed Date</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No completed withdrawal requests found
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal._id}>
                    <TableCell className="font-medium">
                      <div>
                        {withdrawal.driverId?.personalInformation?.fullName || 'N/A'}
                        <div className="text-gray-500 text-sm">
                          {withdrawal.driverId?.personalInformation?.currentAddress || 'No address available'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>{withdrawal.driverId?.mobile || 'N/A'}</TableCell>
                    <TableCell>₹{withdrawal.amount}</TableCell>
                    <TableCell className="capitalize">{withdrawal.paymentMethod}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div><strong>Bank:</strong> {withdrawal.bankDetails?.bankName || 'N/A'}</div>
                        <div><strong>A/C:</strong> {withdrawal.bankDetails?.accountNumber || 'N/A'}</div>
                        <div><strong>IFSC:</strong> {withdrawal.bankDetails?.ifscCode || 'N/A'}</div>
                        <div><strong>Holder:</strong> {withdrawal.bankDetails?.bankAccountHolderName || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </TableCell>
                    {/* <TableCell>
                      {withdrawal.completedAt ? new Date(withdrawal.completedAt).toLocaleDateString() : 'N/A'}
                    </TableCell> */}
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