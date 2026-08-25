import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader, ChevronLeft, ChevronRight, Calendar, Filter, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from '../../../lib/axiosInterceptor';

interface DriverInfo {
  name: string;
  mobile: string;
  currentAddress: string;
  permanentAddress: string;
}

interface StatusLog {
  _id: string;
  driverId: string;
  status: "online" | "offline";
  timestamp: string;
  timestampISO: string;
  createdAt: string;
  updatedAt: string;
}

interface LogsResponse {
  success: boolean;
  driverInfo: DriverInfo;
  logs: StatusLog[];
  totalLogs: number;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  filterDate: string;
  driverId: string;
}

export const DriverOnlineLogsPage = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  useEffect(() => {
    fetchLogs();
  }, [driverId, currentPage, recordsPerPage]);

  const fetchLogs = async (fromDateFilter?: string, toDateFilter?: string, isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      let url = `${import.meta.env.VITE_API_URL}/api/driver/online-status?driverId=${driverId}&page=${currentPage}&limit=${recordsPerPage}`;
      
      if (fromDateFilter && toDateFilter) {
        url += `&fromDate=${fromDateFilter}&toDate=${toDateFilter}`;
      }
      
      const response = await apiClient.get(url);
      setLogsData(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogsData(null);
    } finally {
      setLoading(false);
      setIsFiltering(false);
      setIsRefreshing(false);
    }
  };

  const handleFilter = () => {
    if (!fromDate || !toDate) {
      alert("Please select both from and to dates");
      return;
    }
    
    if (new Date(fromDate) > new Date(toDate)) {
      alert("From date cannot be later than to date");
      return;
    }
    
    setIsFiltering(true);
    setCurrentPage(1);
    fetchLogs(fromDate, toDate);
  };

  const handleClearFilter = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    fetchLogs();
  };

  const handleRefresh = () => {
    if (fromDate && toDate) {
      fetchLogs(fromDate, toDate, true);
    } else {
      fetchLogs(undefined, undefined, true);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const getStatusBadgeVariant = (status: string) => {
    return status === "online" ? "default" : "secondary";
  };

  if (loading && !logsData) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading driver logs...</span>
      </div>
    );
  }

  if (!logsData) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Driver Online/Offline Logs</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              Failed to load driver logs. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Driver Online/Offline Logs</h1>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Driver Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Name</Label>
              <p className="text-sm">{logsData.driverInfo.name || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Mobile</Label>
              <p className="text-sm">{logsData.driverInfo.mobile || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Current Address</Label>
              <p className="text-sm">{logsData.driverInfo.currentAddress || "N/A"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Permanent Address</Label>
              <p className="text-sm">{logsData.driverInfo.permanentAddress || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleFilter} 
                disabled={isFiltering || isRefreshing}
                className="flex items-center"
              >
                {isFiltering ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Apply Filter
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearFilter}
                disabled={isFiltering || isRefreshing}
              >
                Clear
              </Button>
            </div>
          </div>
          {logsData.filterDate !== "All dates" && (
            <div className="mt-2 text-sm text-gray-600">
              Showing logs for: <span className="font-medium">{logsData.filterDate}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Online/Offline Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Records per page selector */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Total Records: <span className="font-medium">{logsData.totalRecords}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
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
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || isRefreshing ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <span>Loading logs...</span>
                  </TableCell>
                </TableRow>
              ) : logsData.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No activity logs found for the selected criteria
                  </TableCell>
                </TableRow>
              ) : (
                logsData.logs.map((log, index) => {
                  const date = new Date(log.timestampISO);
                  return (
                    <TableRow key={log._id}>
                      <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(log.status)}>
                          {log.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                      <TableCell>{date.toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{date.toLocaleTimeString('en-IN')}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {logsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * recordsPerPage + 1, logsData.totalRecords)} to {Math.min(currentPage * recordsPerPage, logsData.totalRecords)} of {logsData.totalRecords} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!logsData.hasPrev || loading || isRefreshing}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, logsData.totalPages) }, (_, i) => {
                    let pageNumber;
                    if (logsData.totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= logsData.totalPages - 2) {
                      pageNumber = logsData.totalPages - 4 + i;
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
                        disabled={loading || isRefreshing}
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
                  disabled={!logsData.hasNext || loading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};