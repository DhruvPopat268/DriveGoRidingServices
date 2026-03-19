import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Ban, Eye, ChevronLeft, ChevronRight, Unlock, Loader } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import apiClient from '../../../lib/axiosInterceptor';

interface Driver {
  _id: string;
  personalInformation?: {
    fullName?: string;
    category?: {
      name: string;
    };
    subCategory?: Array<{
      name: string;
    }>;
  };
  mobile: string;
  ownership?: string;
  status: string;
  createdAt: string;
  suspendFrom?: string;
  suspendTo?: string;
  suspendDescription?: string;
}

interface SuspendedDriversPageProps {
  onNavigateToDetail: (driverId: string) => void;
}

export const SuspendedDriversPage = ({ onNavigateToDetail }: SuspendedDriversPageProps) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [unsuspending, setUnsuspending] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchSuspendedDrivers();
  }, [currentPage, recordsPerPage]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredDrivers(drivers);
    } else {
      const filtered = drivers.filter(driver =>
        driver.personalInformation?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.mobile.includes(searchTerm)
      );
      setFilteredDrivers(filtered);
    }
  }, [searchTerm, drivers]);

  const fetchSuspendedDrivers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/Suspended?page=${currentPage}&limit=${recordsPerPage}`);
      const data = response.data;
      setDrivers(data.data);
      setFilteredDrivers(data.data);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching suspended drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleUnsuspend = async (driverId: string) => {
    setUnsuspending(driverId);
    try {
      await apiClient.post(`${import.meta.env.VITE_API_URL}/api/driver/admin/unsuspend-driver/${driverId}`);
      toast({
        title: "Success",
        description: "Driver unsuspended successfully",
      });
      fetchSuspendedDrivers(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to unsuspend driver",
        variant: "destructive",
      });
    } finally {
      setUnsuspending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading suspended drivers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ban className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold">Suspended Drivers</h1>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Total: {filteredDrivers.length}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suspended Drivers List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">records</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Suspend From</TableHead>
                  <TableHead>Suspend To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No suspended drivers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver._id}>
                      <TableCell className="font-medium">
                        {driver.personalInformation?.fullName || 'No Name'}
                      </TableCell>
                      <TableCell>{driver.mobile}</TableCell>
                      <TableCell>{driver.personalInformation?.category?.name || "N/A"}</TableCell>
                      <TableCell>
                        {driver.personalInformation?.subCategory?.map(sub => sub.name).join(", ") || "N/A"}
                      </TableCell>
                      <TableCell>{driver.ownership || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Suspended</Badge>
                      </TableCell>
                      <TableCell>
                        {driver.suspendFrom
                          ? new Date(driver.suspendFrom).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {driver.suspendTo
                          ? new Date(driver.suspendTo).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex space-x-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onNavigateToDetail(driver._id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Driver Details</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      disabled={unsuspending === driver._id}
                                    >
                                      {unsuspending === driver._id ? (
                                        <Loader className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Unlock className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Unsuspend Driver</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to unsuspend this driver? 
                                        This action will change the driver's status from "Suspended" to "Approved" and they will be able to take rides again.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleUnsuspend(driver._id)}>
                                        Unsuspend Driver
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Unsuspend Driver</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalRecords)} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspendedDriversPage;
