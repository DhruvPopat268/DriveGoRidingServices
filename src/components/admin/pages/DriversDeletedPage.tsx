import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Loader } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from '../../../lib/axiosInterceptor';

interface Driver {
  _id: string;
  mobile: string;
  personalInformation: {
    fullName: string;
    currentAddress: string;
    permanentAddress: string;
    category?: {
      name: string;
    };
    subCategory?: Array<{
      name: string;
    }>;
  };
  ownership?: string;
  status: string;
  createdAt: string;
  deletedDate: string;
}

interface DriversDeletedPageProps {
  onNavigateToDetail?: (driverId: string) => void;
}

export const DriversDeletedPage = ({ onNavigateToDetail }: DriversDeletedPageProps) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/deleted`);
      const data = response.data;
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
          <CardTitle>Driver Registration Requests - Deleted</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Ownership</TableHead>
                <TableHead>Current Address</TableHead>
                <TableHead>Permanent Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Deleted At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                    No deleted drivers registration requests found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver, index) => (
                  <TableRow key={driver._id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {driver.personalInformation.fullName}
                    </TableCell>
                    <TableCell>{driver.mobile}</TableCell>
                    <TableCell>{driver.personalInformation.category?.name || "N/A"}</TableCell>
                    <TableCell>
                      {driver.personalInformation.subCategory?.map(sub => sub.name).join(", ") || "N/A"}
                    </TableCell>
                    <TableCell>{driver.ownership || "N/A"}</TableCell>
                    <TableCell>{driver.personalInformation.currentAddress}</TableCell>
                    <TableCell>{driver.personalInformation.permanentAddress}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{driver.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(driver.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {driver.deletedDate ? new Date(driver.deletedDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(driver._id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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