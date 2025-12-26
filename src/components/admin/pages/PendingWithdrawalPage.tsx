import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, Loader } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import apiClient from '../../../lib/axiosInterceptor';

interface WithdrawalRequest {
  _id: string;
  driverId: {
    personalInformation: {
      fullName: string;
      currentAddress: string;
    };
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
}

export const PendingWithdrawalPage = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  const fetchPendingWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/rides/withdrawals/pending');
      setWithdrawals(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const response = await apiClient.post('/api/driver/admin/withdrawal/complete', { requestId: selectedRequest });

      toast({ title: "Success", description: "Withdrawal request approved successfully" });
      setShowApproveDialog(false);
      setSelectedRequest(null);
      fetchPendingWithdrawals();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to approve withdrawal', variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const response = await apiClient.post('/api/driver/admin/withdrawal/reject', { requestId: selectedRequest, adminRemarks: rejectRemarks });

      toast({ title: "Success", description: "Withdrawal request rejected successfully" });
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectRemarks("");
      fetchPendingWithdrawals();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Failed to reject withdrawal', variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading pending withdrawals...</span>
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
          <CardTitle>Pending Withdrawal Requests</CardTitle>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No pending withdrawal requests found
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
                        <div><strong>UPI:</strong> {withdrawal.bankDetails?.upiId || 'N/A'}</div>
                        <div><strong>Holder:</strong> {withdrawal.bankDetails?.bankAccountHolderName || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => {
                            setSelectedRequest(withdrawal._id);
                            setShowApproveDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedRequest(withdrawal._id);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to approve this withdrawal request?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to reject this withdrawal request?</p>
            <div>
              <label className="text-sm font-medium">Remarks (Required)</label>
              <Textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectRemarks("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={actionLoading || !rejectRemarks.trim()}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};