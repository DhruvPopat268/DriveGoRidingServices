import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/Onreview`);
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (driverId: string) => {
    onNavigateToDetail?.(driverId);
  };

  const handleApprove = async (driverId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/approve/${driverId}`, {
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
      console.error('Error approving driver:', error);
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
    return <div className="p-6">Loading...</div>;
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
                          onClick={() => handleApprove(driver._id)}
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


    </div>
  );
};