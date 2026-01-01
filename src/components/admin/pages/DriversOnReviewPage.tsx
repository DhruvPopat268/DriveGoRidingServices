import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Check, X, Loader, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from '../../../lib/axiosInterceptor';

interface Driver {
  _id: string;
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
  selectedCategory: {
    id: string;
    name: string;
  };
  ownership?: string;
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
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const getStepOptions = (category: string) => {
    if (category === "Cab") {
      return [
        { step: 1, label: "Personal Information" },
        { step: 2, label: "Cab Vehicle Details" },
        { step: 3, label: "Driving Details" },
        { step: 4, label: "Payment & Subscription" },
        { step: 5, label: "Language Skills & References" },
        { step: 6, label: "Declaration" }
      ];
    } else if (category === "Parcel") {
      return [
        { step: 1, label: "Personal Information" },
        { step: 2, label: "Parcel Vehicle Details" },
        { step: 3, label: "Driving Details" },
        { step: 4, label: "Payment & Subscription" },
        { step: 5, label: "Language Skills & References" },
        { step: 6, label: "Declaration" }
      ];
    } else {
      return [
        { step: 1, label: "Personal Information" },
        { step: 2, label: "Driving Details" },
        { step: 3, label: "Payment & Subscription" },
        { step: 4, label: "Language Skills & References" },
        { step: 5, label: "Declaration" }
      ];
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [currentPage, recordsPerPage]);

  const fetchDrivers = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/Onreview?page=${currentPage}&limit=${recordsPerPage}`);
      const data = response.data;
      setDrivers(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.totalPages || Math.ceil((data.data?.length || 0) / recordsPerPage) || 1);
      setTotalRecords(data.totalRecords || data.data?.length || 0);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
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

  const handleView = (driverId: string) => {
    onNavigateToDetail?.(driverId);
  };

  const handleApprove = async () => {
    if (!selectedDriverId) return;
    
    try {
      setActionLoading(true);
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/driver/approve/${selectedDriverId}`);
      const data = response.data;
      if (data.success) {
        fetchDrivers();
        setShowApproveDialog(false);
        setSelectedDriverId(null);
      }
    } catch (error) {
      console.error('Error approving driver:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDriverId) return;
    
    try {
      setActionLoading(true);
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/driver/reject/${selectedDriverId}`, { steps: selectedSteps });
      const data = response.data;
      if (data.success) {
        fetchDrivers();
        setShowRejectDialog(false);
        setSelectedDriverId(null);
        setSelectedSteps([]);
      }
    } catch (error) {
      console.error('Error rejecting driver:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStepToggle = (step: number) => {
    setSelectedSteps(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
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
          {/* Records per page selector */}
          <div className="flex items-center justify-end mb-4">
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Ownership</TableHead>
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
                  <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                    No drivers registration requests found
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver, index) => (
                  <TableRow key={driver._id}>
                    <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {driver.personalInformation.fullName}
                    </TableCell>
                    <TableCell>{driver.personalInformation.category?.name || "N/A"}</TableCell>
                    <TableCell>
                      {driver.personalInformation.subCategory?.map(sub => sub.name).join(", ") || "N/A"}
                    </TableCell>
                    <TableCell>{driver.ownership || "N/A"}</TableCell>
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
                          onClick={() => {
                            setSelectedDriverId(driver._id);
                            setSelectedDriver(driver);
                            setShowRejectDialog(true);
                          }}
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

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Driver Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Select which steps to clear from the driver's profile:</p>
            <div className="space-y-3">
              {selectedDriver && getStepOptions(selectedDriver.selectedCategory?.name || "Driver").map(({ step, label }) => (
                <div key={step} className="flex items-center space-x-2">
                  <Checkbox
                    id={`step-${step}`}
                    checked={selectedSteps.includes(step)}
                    onCheckedChange={() => handleStepToggle(step)}
                  />
                  <label htmlFor={`step-${step}`} className="text-sm font-medium">
                    Step {step}: {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setSelectedSteps([]);
              setSelectedDriver(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};