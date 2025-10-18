import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Loader, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Driver {
  _id: string;
  personalInformation: {
    fullName: string;
    currentAddress: string;
    permanentAddress: string;
  };
  status: string;
  createdAt: string;
}

interface DriversOnReviewPageProps {
  onNavigateToDetail?: (driverId: string) => void;
}

export const DriversOnReviewPage = ({ onNavigateToDetail }: DriversOnReviewPageProps) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/Onreview`);
      const data = await response.json();
      console.log(data)
      setDrivers(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (driverId: string) => {
    onNavigateToDetail?.(driverId);
  };

  const handleApprove = async () => {
    if (!selectedDriverId) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/approve/${selectedDriverId}`, {
        method: 'POST'
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : { success: true };
        if (data.success) {
          fetchDrivers();
          setShowApproveDialog(false);
          setSelectedDriverId(null);
        }
      }
    } catch (error) {
      console.error('Error approving driver:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (driverId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/reject/${driverId}`, {
        method: 'POST'
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : { success: true };
        if (data.success) {
          fetchDrivers();
        }
      }
    } catch (error) {
      console.error('Error rejecting driver:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading drivers...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Driver Registration Requests - OnReview</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Current Address</TableHead>
                <TableHead>Permanent Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No drivers registration requests found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver, index) => (
                  <TableRow key={driver._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {driver.personalInformation.fullName}
                    </TableCell>
                    <TableCell>{driver.personalInformation.currentAddress}</TableCell>
                    <TableCell>{driver.personalInformation.permanentAddress}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{driver.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(driver.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(driver._id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedDriverId(driver._id);
                            setShowApproveDialog(true);
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(driver._id)}
                        >
                          <X className="w-4 h-4" />
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
            <DialogTitle>Approve Driver Application</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to approve this driver application?</p>
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
    </div>
  );
};