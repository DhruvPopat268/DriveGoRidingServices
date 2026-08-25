import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader, Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Wallet, Filter, X, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from '../../../lib/axiosInterceptor';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  paymentMethod: string;
  status: string;
  description: string;
  createdAt: string;
  driver: {
    _id: string;
    mobile: string;
    personalInformation: {
      fullName: string;
    };
  };
}

interface DriverTransactionsPageProps {
  preselectedDriverId?: string;
  onBack?: () => void;
}

export const DriverTransactionsPage = ({ preselectedDriverId, onBack }: DriverTransactionsPageProps = {}) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize filter states directly from preselectedDriverId to avoid double API call
  const [filterDriver, setFilterDriver] = useState(preselectedDriverId || 'all');
  const [filterTransactionType, setFilterTransactionType] = useState('all');
  const [driverSearch, setDriverSearch] = useState('');
  
  // Applied filter states — initialize with preselectedDriverId so only 1 API call fires
  const [appliedFilterDriver, setAppliedFilterDriver] = useState(preselectedDriverId || 'all');
  const [appliedFilterTransactionType, setAppliedFilterTransactionType] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    totalTransactions: 0,
    completedCount: 0,
    totalEarnings: 0,
    totalWithdrawals: 0
  });

  // Transaction types
  const TRANSACTION_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'ride_payment', label: 'Ride Payment' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'cancellation_charge', label: 'Cancellation Charge' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'incentive', label: 'Incentive' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'admin_ride_commission', label: 'Admin Ride Commission' },
  ];

  // Fetch drivers list
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-list", driverSearch],
    queryFn: async () => {
      const params = driverSearch ? `?search=${encodeURIComponent(driverSearch)}` : '';
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/admin/drivers-list${params}`);
      return response.data?.data || [];
    },
  });

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, recordsPerPage, appliedFilterDriver, appliedFilterTransactionType]);

  const fetchGlobalStats = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/transactions/stats`);
      if (response.data.success) {
        setGlobalStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        ...(appliedFilterDriver !== 'all' && { driverId: appliedFilterDriver }),
        ...(appliedFilterTransactionType !== 'all' && { transactionType: appliedFilterTransactionType }),
      });
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/transactions/paginated?${params}`);
      const data = response.data;
      setTransactions(Array.isArray(data.data) ? data.data : []);
      setTotalRecords(data.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeColor = (type: string) => {
    // Credit transactions (money added to wallet) - Green
    if (['ride_payment', 'refunded', 'incentive', 'deposit'].includes(type)) {
      return 'text-green-700 border-green-300 bg-green-50';
    }
    // Debit transactions (money deducted from wallet) - Red
    // withdrawal, cancellation_charge, admin_ride_commission
    return 'text-red-700 border-red-300 bg-red-50';
  };

  const getTypeIcon = (type: string) => {
    // Credit transactions - TrendingUp icon
    if (['ride_payment', 'refunded', 'incentive', 'deposit'].includes(type)) {
      return <TrendingUp className="w-3 h-3 mr-1 text-green-600" />;
    }
    // Debit transactions - TrendingDown icon
    return <TrendingDown className="w-3 h-3 mr-1 text-red-600" />;
  };



  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setAppliedFilterDriver(filterDriver);
    setAppliedFilterTransactionType(filterTransactionType);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterDriver('all');
    setFilterTransactionType('all');
    setAppliedFilterDriver('all');
    setAppliedFilterTransactionType('all');
    setDriverSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    appliedFilterDriver !== 'all' ||
    appliedFilterTransactionType !== 'all';

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      {onBack && (
        <Button variant="outline" onClick={() => onBack?.()} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{globalStats.totalTransactions}</p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{globalStats.completedCount}</p>
              </div>
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">₹{globalStats.totalEarnings.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Withdrawals</p>
                <p className="text-2xl font-bold text-red-600">₹{globalStats.totalWithdrawals.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              {/* Driver Filter */}
              <div className="w-64">
                <label className="block text-xs font-medium text-gray-600 mb-1">Driver</label>
                <Select value={filterDriver} onValueChange={setFilterDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Drivers" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        type="text"
                        placeholder="Search driver..."
                        value={driverSearch}
                        onChange={(e) => setDriverSearch(e.target.value)}
                        className="w-full text-xs h-8"
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers.map((driver: any) => (
                      <SelectItem key={driver._id} value={driver._id}>
                        <span className="font-medium">{driver.name || 'N/A'}</span>
                        <span className="text-gray-500 ml-1 text-xs">· {driver.mobile}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Type Filter */}
              <div className="w-64">
                <label className="block text-xs font-medium text-gray-600 mb-1">Transaction Type</label>
                <Select value={filterTransactionType} onValueChange={setFilterTransactionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={applyFilters}>
                <Search className="w-3 h-3 mr-1" />
                Apply
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Driver Transactions ({totalRecords})</CardTitle>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="w-6 h-6 animate-spin mr-2" />
              <span>Loading transactions...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[50px]">#</TableHead>
                      <TableHead className="min-w-[160px]">Driver Name</TableHead>
                      <TableHead className="min-w-[130px]">Mobile</TableHead>
                      <TableHead className="min-w-[150px]">Type</TableHead>
                      <TableHead className="min-w-[120px]">Amount</TableHead>
                      <TableHead className="min-w-[140px]">Payment Method</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[130px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction, index) => (
                        <TableRow key={transaction._id || index}>
                          <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {transaction.driver?.personalInformation?.fullName || 'N/A'}
                          </TableCell>
                          <TableCell>{transaction.driver?.mobile || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getTypeIcon(transaction.type)}
                              <Badge variant="outline" className={getTypeColor(transaction.type)}>
                                {transaction.type.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">₹{transaction.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {transaction.paymentMethod || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(transaction.status)} className="capitalize">
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate" title={transaction.description}>
                              {transaction.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{new Date(transaction.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              <span className="text-xs text-muted-foreground">{new Date(transaction.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {transactions.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {startRecord} to {endRecord} of {totalRecords} entries
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
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};