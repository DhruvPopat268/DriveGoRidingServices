import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader, Search, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export const DriverTransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [globalStats, setGlobalStats] = useState({
    totalTransactions: 0,
    completedCount: 0,
    totalEarnings: 0,
    totalWithdrawals: 0
  });

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    fetchTransactions(currentPage, recordsPerPage, searchTerm);
  }, [currentPage, recordsPerPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchTransactions(1, recordsPerPage, searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

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

  const fetchTransactions = async (page = 1, limit = 10, search = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
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
    if (type === 'ride_payment' || type === 'refunded') {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'ride_payment' || type === 'refunded') {
      return <TrendingUp className="w-3 h-3 mr-1" />;
    }
    return <TrendingDown className="w-3 h-3 mr-1" />;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading transactions...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm hover:shadow-md transition-shadow border-purple-200">
            <CardContent className="pt-6">
              <div className="text-sm text-purple-700 font-medium mb-1">Total Transactions</div>
              <div className="text-3xl font-bold text-purple-700">{globalStats.totalTransactions}</div>
              <div className="text-xs text-purple-600 mt-1">All transaction records</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm hover:shadow-md transition-shadow border-blue-200">
            <CardContent className="pt-6">
              <div className="text-sm text-blue-700 font-medium mb-1">Completed</div>
              <div className="text-3xl font-bold text-blue-700">{globalStats.completedCount}</div>
              <div className="text-xs text-blue-600 mt-1">Successfully completed</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 shadow-sm hover:shadow-md transition-shadow border-green-200">
            <CardContent className="pt-6">
              <div className="text-sm text-green-700 font-medium mb-1 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Total Earnings
              </div>
              <div className="text-3xl font-bold text-green-700">₹{globalStats.totalEarnings.toLocaleString()}</div>
              <div className="text-xs text-green-600 mt-1">From completed ride payments</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 shadow-sm hover:shadow-md transition-shadow border-red-200">
            <CardContent className="pt-6">
              <div className="text-sm text-red-700 font-medium mb-1 flex items-center">
                <TrendingDown className="w-4 h-4 mr-1" />
                Total Withdrawals
              </div>
              <div className="text-3xl font-bold text-red-700">₹{globalStats.totalWithdrawals.toLocaleString()}</div>
              <div className="text-xs text-red-600 mt-1">From completed withdrawals</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table Card */}
        <Card className="bg-white shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold text-gray-800">Driver Transactions</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, mobile, type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Records per page selector */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="text-sm text-gray-600">
                Showing {startRecord} to {endRecord} of {totalRecords} entries
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
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Driver Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="text-gray-400">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-lg font-medium">No transactions found</p>
                          <p className="text-sm mt-1">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction, index) => (
                      <tr key={transaction._id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-600">{(currentPage - 1) * recordsPerPage + index + 1}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {transaction.driver?.personalInformation?.fullName || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{transaction.driver?.mobile || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTypeColor(transaction.type)}`}>
                            {getTypeIcon(transaction.type)}
                            {transaction.type.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{transaction.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                            {transaction.paymentMethod || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(transaction.status)} className="capitalize">
                            {transaction.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate text-gray-600 text-sm" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(transaction.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalRecords > 0 && (
              <div className="flex items-center justify-between p-4 border-t">
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};