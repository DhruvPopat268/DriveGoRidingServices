import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Loader, ChevronLeft, ChevronRight, Search, X, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from '../../../lib/axiosInterceptor';
import { useQuery } from "@tanstack/react-query";

interface Driver {
  _id: string;
  mobile: string;
  personalInformation: {
    fullName: string;
    currentAddress: string;
    permanentAddress: string;
    category?: { _id: string; name: string };
    subCategory?: Array<{ _id: string; name: string }>;
  };
  ownership?: string;
  status: string;
  createdAt: string;
  approvedDate: string;
  ratings?: { avgRating: number };
  completedRides: number;
  statusDate: string | null;
}

interface AllDriversPageProps {
  onNavigateToDetail?: (driverId: string) => void;
  onNavigateToLogs?: (driverId: string) => void;
}

const DRIVER_STATUSES = [
  { value: 'Pending',          label: 'Pending' },
  { value: 'Onreview',         label: 'On Review' },
  { value: 'Approved',         label: 'Approved' },
  { value: 'Rejected',         label: 'Rejected' },
  { value: 'PendingForPayment',label: 'Pending For Payment' },
  { value: 'Suspended',        label: 'Suspended' },
  { value: 'deleted',          label: 'Deleted' },
];

const OWNERSHIP_OPTIONS = [
  { value: 'Driver',            label: 'Driver' },
  { value: 'Owner',             label: 'Owner' },
  { value: 'Owner_With_Vehicle',label: 'Owner With Vehicle' },
];

export const AllDriversPage = ({ onNavigateToDetail, onNavigateToLogs }: AllDriversPageProps) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Pending (uncommitted) filter states
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubcategory, setFilterSubcategory] = useState('all');
  const [filterOwnership, setFilterOwnership] = useState('all');
  const [filterStatus, setFilterStatus] = useState('Approved');

  // Applied (committed) filter states
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('all');
  const [appliedSubcategory, setAppliedSubcategory] = useState('all');
  const [appliedOwnership, setAppliedOwnership] = useState('all');
  const [appliedStatus, setAppliedStatus] = useState('Approved');

  // Subcategories filtered by selected category
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      return res.data || [];
    }
  });

  // Fetch all subcategories once
  const { data: allSubcategories = [] } = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);
      return res.data || [];
    }
  });

  // Filter subcategories when category changes
  useEffect(() => {
    if (filterCategory && filterCategory !== 'all') {
      setFilteredSubcategories(allSubcategories.filter((s: any) => s.categoryId === filterCategory));
      setFilterSubcategory('all');
    } else {
      setFilteredSubcategories([]);
      setFilterSubcategory('all');
    }
  }, [filterCategory, allSubcategories]);

  useEffect(() => {
    fetchDrivers();
  }, [currentPage, recordsPerPage, appliedSearch, appliedCategory, appliedSubcategory, appliedOwnership, appliedStatus]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        ...(appliedSearch && { search: appliedSearch }),
        ...(appliedCategory !== 'all' && { category: appliedCategory }),
        ...(appliedSubcategory !== 'all' && { subcategoryId: appliedSubcategory }),
        ...(appliedOwnership !== 'all' && { ownership: appliedOwnership }),
        ...(appliedStatus !== 'all' && { status: appliedStatus }),
      });
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/admin/all-drivers?${params}`);
      const data = response.data;
      setDrivers(Array.isArray(data.data) ? data.data : []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setAppliedSearch(search);
    setAppliedCategory(filterCategory);
    setAppliedSubcategory(filterSubcategory);
    setAppliedOwnership(filterOwnership);
    setAppliedStatus(filterStatus);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterCategory('all');
    setFilterSubcategory('all');
    setFilterOwnership('all');
    setFilterStatus('Approved');
    setAppliedSearch('');
    setAppliedCategory('all');
    setAppliedSubcategory('all');
    setAppliedOwnership('all');
    setAppliedStatus('Approved');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    appliedSearch ||
    appliedCategory !== 'all' ||
    appliedSubcategory !== 'all' ||
    appliedOwnership !== 'all' ||
    appliedStatus !== 'all';

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':          return 'default';
      case 'Pending':           return 'secondary';
      case 'Onreview':          return 'outline';
      case 'Rejected':          return 'destructive';
      case 'PendingForPayment': return 'secondary';
      case 'Suspended':         return 'destructive';
      case 'deleted':           return 'destructive';
      default:                  return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, mobile, email, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
              <Select
                value={filterSubcategory}
                onValueChange={setFilterSubcategory}
                disabled={filterCategory === 'all'}
              >
                <SelectTrigger><SelectValue placeholder="All Subcategories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {filteredSubcategories.map((sub: any) => (
                    <SelectItem key={sub._id || sub.id} value={sub._id || sub.id}>{sub.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ownership */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ownership</label>
              <Select value={filterOwnership} onValueChange={setFilterOwnership}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {OWNERSHIP_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {DRIVER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <div className="flex items-center justify-end space-x-2 mt-4">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-3 h-3 mr-1" />
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Drivers ({totalRecords})</CardTitle>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="w-6 h-6 animate-spin mr-2" />
              <span>Loading drivers...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ownership</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avg Rating</TableHead>
                    <TableHead>Completed Rides</TableHead>
                    <TableHead>Joined At</TableHead>
                    <TableHead>Status Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No drivers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    drivers.map((driver, index) => (
                      <TableRow key={driver._id}>
                        <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {driver.personalInformation?.fullName || 'N/A'}
                        </TableCell>
                        <TableCell>{driver.mobile}</TableCell>
                        <TableCell>{driver.personalInformation?.category?.name || 'N/A'}</TableCell>
                        <TableCell>{driver.ownership?.replace('_', ' ') || 'N/A'}</TableCell>
                        <TableCell>{driver.personalInformation?.permanentAddress || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(driver.status)}>{driver.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="text-yellow-500 mr-1">★</span>
                            <span>{driver.ratings?.avgRating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">{driver.completedRides ?? 0}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{new Date(driver.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <span className="text-xs text-muted-foreground">{new Date(driver.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver.statusDate ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-muted-foreground mb-0.5">
                                {driver.status === 'Approved' && 'Approved On'}
                                {driver.status === 'Rejected' && 'Rejected On'}
                                {driver.status === 'deleted' && 'Deleted On'}
                                {driver.status === 'Suspended' && 'Suspended On'}
                              </span>
                              <span>{new Date(driver.statusDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              <span className="text-xs text-muted-foreground">{new Date(driver.statusDate).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs w-full justify-start bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              onClick={() => onNavigateToDetail?.(driver._id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            {['Approved', 'Suspended', 'deleted'].includes(driver.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs w-full justify-start bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                onClick={() => onNavigateToLogs?.(driver._id)}
                              >
                                Check Online/Offline Logs
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && drivers.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalRecords)} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) pageNumber = i + 1;
                    else if (currentPage <= 3) pageNumber = i + 1;
                    else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i;
                    else pageNumber = currentPage - 2 + i;
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
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
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
