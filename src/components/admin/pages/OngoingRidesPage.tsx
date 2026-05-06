import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, User, Phone, Calendar, Eye, Loader, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { RupeeIcon } from "@/components/ui/RupeeIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminExtraChargesDialog } from "../AdminExtraChargesDialog";
import { RideFilters } from "../shared/RideFilters";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/axiosInterceptor";
import { toast, Toaster } from "react-hot-toast";

interface SubCategory { _id: string; name: string; categoryId: string; }
interface OngoingRidesPageProps { onNavigateToDetail?: (rideId: string) => void; }

export const OngoingRidesPage = ({ onNavigateToDetail }: OngoingRidesPageProps) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRides, setTotalRides] = useState(0);
  const [dateFilter, setDateFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [showExtraChargesDialog, setShowExtraChargesDialog] = useState(false);
  const [selectedRideForCharges, setSelectedRideForCharges] = useState(null);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedRideForCancel, setSelectedRideForCancel] = useState(null);
  const [cancellingRide, setCancellingRide] = useState(false);

  const [appliedFilterCategory, setAppliedFilterCategory] = useState<string>('all');
  const [appliedFilterSubcategory, setAppliedFilterSubcategory] = useState<string>('all');
  const [appliedFilterCity, setAppliedFilterCity] = useState<string>('all');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>('');
  const [appliedDateRange, setAppliedDateRange] = useState({ from: '', to: '' });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState<SubCategory[]>([]);

  const { data: subCategories = [] } = useQuery({ queryKey: ["subcategories"], queryFn: async () => (await apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`)).data || [] });

  useEffect(() => { fetchRides(); }, [currentPage, dateFilter, appliedDateRange, recordsPerPage, appliedFilterCategory, appliedFilterSubcategory, appliedFilterCity, appliedSearchQuery]);
  useEffect(() => { if (filterCategory && filterCategory !== 'all') { setFilterSubcategoriesForFilter(subCategories.filter((s: SubCategory) => s.categoryId === filterCategory)); setFilterSubcategory('all'); } else { setFilterSubcategoriesForFilter([]); setFilterSubcategory('all'); } }, [filterCategory, subCategories]);

  const handleDateFilter = (f: string) => { setDateFilter(f === dateFilter ? '' : f); setDateRange({ from: '', to: '' }); setAppliedDateRange({ from: '', to: '' }); setCurrentPage(1); };
  const handleDateRangeChange = (field: 'from' | 'to', value: string) => { setDateRange(prev => ({ ...prev, [field]: value })); setDateFilter(''); setCurrentPage(1); };
  const applyFilters = () => { setAppliedFilterCategory(filterCategory); setAppliedFilterSubcategory(filterSubcategory); setAppliedFilterCity(filterCity); setAppliedSearchQuery(searchQuery); setAppliedDateRange(dateRange); setCurrentPage(1); };
  const clearFilters = () => { setFilterCategory('all'); setFilterSubcategory('all'); setFilterCity('all'); setSearchQuery(''); setDateFilter(''); setDateRange({ from: '', to: '' }); setAppliedFilterCategory('all'); setAppliedFilterSubcategory('all'); setAppliedFilterCity('all'); setAppliedSearchQuery(''); setAppliedDateRange({ from: '', to: '' }); setCurrentPage(1); };
  const handlePageChange = (p: number) => setCurrentPage(p);
  const handleRecordsPerPageChange = (v: string) => { setRecordsPerPage(parseInt(v)); setCurrentPage(1); };

  const fetchRides = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: recordsPerPage.toString(), ...(dateFilter && { date: dateFilter }), ...(appliedDateRange.from && { fromDate: appliedDateRange.from }), ...(appliedDateRange.to && { toDate: appliedDateRange.to }), ...(appliedFilterCategory !== 'all' && { categoryId: appliedFilterCategory }), ...(appliedFilterSubcategory !== 'all' && { subCategoryId: appliedFilterSubcategory }), ...(appliedFilterCity !== 'all' && { city: appliedFilterCity }), ...(appliedSearchQuery && { search: appliedSearchQuery }) });
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/rides/ongoing?${params}`);
      setRides(res.data.data); setTotalPages(res.data.totalPages); setTotalRides(res.data.totalRides);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatTime = (t) => t || 'N/A';
  const formatCurrency = (a) => `₹${a?.toFixed(2) || '0.00'}`;

  const handleCancelRide = (ride) => { setSelectedRideForCancel(ride); setShowCancelDialog(true); };
  const confirmCancelRide = async () => {
    if (!selectedRideForCancel) return;
    setCancellingRide(true);
    try { await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/cancel`, { rideId: selectedRideForCancel._id, reason: 'Cancelled by admin' }); setShowCancelDialog(false); setSelectedRideForCancel(null); toast.success('Ride cancelled successfully!'); fetchRides(); }
    catch (err) { toast.error(err?.response?.data?.message || 'Failed to cancel ride'); }
    finally { setCancellingRide(false); }
  };

  if (loading) return <div className="flex justify-center items-center py-8"><Loader className="w-6 h-6 animate-spin mr-2" /><span>Loading ongoing rides...</span></div>;
  if (error) return <div className="space-y-6 bg-white text-black p-6"><div className="flex justify-center items-center h-64"><div className="text-red-600">Error: {error}</div></div></div>;

  return (
    <div className="space-y-6 bg-white text-black p-6 overflow-x-hidden">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl font-bold text-black">Ongoing Rides</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchRides}>Refresh</Button>
          <Button variant={dateFilter === 'today' ? 'default' : 'outline'} onClick={() => handleDateFilter('today')}>Today's Rides</Button>
          <Button variant={dateFilter === 'yesterday' ? 'default' : 'outline'} onClick={() => handleDateFilter('yesterday')}>Yesterday's Rides</Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200">
        <CardHeader><CardTitle className="text-black">Ongoing Rides ({totalRides})</CardTitle></CardHeader>
        <div className="px-6">
          <RideFilters searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterSubcategory={filterSubcategory} setFilterSubcategory={setFilterSubcategory} filterCity={filterCity} setFilterCity={setFilterCity} dateRange={dateRange} handleDateRangeChange={handleDateRangeChange} clearFilters={clearFilters} applyFilters={applyFilters} dateFilter={dateFilter} filterSubcategoriesForFilter={filterSubcategoriesForFilter} />
          <div className="flex items-center justify-end mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}><SelectTrigger className="w-20"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select>
              <span className="text-sm text-gray-600">records</span>
            </div>
          </div>
        </div>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ minWidth: '1300px', width: '100%' }}>
              <thead>
                <tr className="border-b border-gray-200">
                  {['Ride ID','Rider Info','Driver Info','Route','Service Type','Driver Category','Usage','Date & Time','Amount','Payment','Booked By','Staff Info','Actions'].map(col => (
                    <th key={col} className="text-left p-3 font-semibold text-gray-700 whitespace-nowrap" style={{ minWidth: '120px' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rides.map((ride) => (
                  <tr key={ride._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3"><div className="font-mono text-sm text-blue-600">{ride.bookingId || 'N/A'}</div></td>
                    <td className="p-3"><div className="space-y-1"><div className="flex items-center space-x-1 text-sm"><User className="w-3 h-3 text-gray-500" /><span>{ride.riderInfo?.riderName}</span></div><div className="flex items-center space-x-1 text-sm text-gray-600"><Phone className="w-3 h-3 text-gray-500" /><span>{ride.riderInfo?.riderMobile}</span></div></div></td>
                    <td className="p-3"><div className="space-y-1"><div className="flex items-center space-x-1 text-sm"><User className="w-3 h-3 text-gray-500" /><span>{ride.driverInfo?.driverName}</span></div><div className="flex items-center space-x-1 text-sm text-gray-600"><Phone className="w-3 h-3 text-gray-500" /><span>{ride.driverInfo?.driverMobile}</span></div></div></td>
                    <td className="p-3" style={{ maxWidth: '150px' }}><div className="space-y-1"><div className="flex items-center space-x-1 text-sm truncate"><MapPin className="w-3 h-3 text-green-500 flex-shrink-0" /><span className="truncate" title={ride.rideInfo.fromLocation?.address}>{ride.rideInfo.fromLocation?.address || 'N/A'}</span></div>{ride.rideInfo.toLocation && <div className="flex items-center space-x-1 text-sm truncate"><MapPin className="w-3 h-3 text-red-500 flex-shrink-0" /><span className="truncate" title={ride.rideInfo.toLocation?.address}>{ride.rideInfo.toLocation?.address || 'N/A'}</span></div>}</div></td>
                    <td className="p-3"><div className="text-sm font-medium capitalize">{ride.rideInfo.categoryName}</div><div className="text-xs text-gray-600 capitalize">{ride.rideInfo.subcategoryName}</div>{ride.rideInfo?.subcategoryName?.toLowerCase() === 'outstation' && ride.rideInfo?.subSubcategoryName && (<div className="text-xs text-gray-500 capitalize">{ride.rideInfo.subSubcategoryName}</div>)}<div className="text-xs text-gray-600 capitalize">{ride.rideInfo.selectedCategory}</div>{(ride.rideInfo.carType || ride.rideInfo.transmissionType) && <div className="text-xs text-gray-600 capitalize">{ride.rideInfo.carType} {ride.rideInfo.transmissionType}</div>}</td>
                    <td className="p-3"><div className="text-sm font-medium capitalize">{ride.rideInfo.selectedCategory}</div>{(ride.rideInfo.carType || ride.rideInfo.transmissionType) && <div className="text-xs text-gray-600 capitalize">{ride.rideInfo.carType} {ride.rideInfo.transmissionType}</div>}</td>
                    <td className="p-3"><div className="text-sm text-gray-700">{ride.rideInfo.selectedUsage || 'N/A'}</div></td>
                    <td className="p-3"><div className="space-y-1"><div className="flex items-center space-x-1 text-sm"><Calendar className="w-3 h-3 text-gray-500" /><span>{formatDate(ride.rideInfo.selectedDate)}</span></div><div className="flex items-center space-x-1 text-sm text-gray-600"><Clock className="w-3 h-3 text-gray-500" /><span>{formatTime(ride.rideInfo.selectedTime)}</span></div></div></td>
                    <td className="p-3"><div className="text-sm font-semibold text-orange-600">{formatCurrency(ride.totalPayable)}</div></td>
                    <td className="p-3"><span className="text-sm capitalize">{ride.paymentType}</span></td>
                    <td className="p-3"><Badge variant={ride.bookedBy === 'STAFF' ? 'secondary' : 'default'} className="text-xs">{ride.bookedBy || 'USER'}</Badge></td>
                    <td className="p-3">{ride.staffInfo ? <div><div className="text-sm font-medium">{ride.staffInfo.staffName}</div><div className="text-xs text-gray-600">{ride.staffInfo.staffMobile}</div></div> : <span className="text-xs text-gray-400">N/A</span>}</td>
                    <td className="p-3">
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onNavigateToDetail?.(ride._id)} title="View Details"><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="secondary" className="h-8 px-2 text-xs" onClick={() => { setSelectedRideForCharges(ride); setShowExtraChargesDialog(true); }} title="Add Extra Charges"><RupeeIcon className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="h-8 px-2 text-xs bg-white" onClick={() => handleCancelRide(ride)} title="Cancel Ride"><XCircle className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rides.length === 0 && <div className="text-center py-8 text-gray-500">{dateFilter === 'today' ? 'No ongoing rides found for today' : dateFilter === 'yesterday' ? 'No ongoing rides found for yesterday' : 'No ongoing rides found'}</div>}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalRides)} to {Math.min(currentPage * recordsPerPage, totalRides)} of {totalRides} entries</div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" />Previous</Button>
              <div className="flex items-center space-x-1">{Array.from({ length: Math.min(5, totalPages) }, (_, i) => { let p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i; return <Button key={p} variant={currentPage === p ? "default" : "outline"} size="sm" onClick={() => handlePageChange(p)} className="w-8 h-8 p-0">{p}</Button>; })}</div>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next<ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Ride</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Are you sure you want to cancel ride <strong>#{selectedRideForCancel?.bookingId}</strong>?</p>
            <p className="text-xs text-gray-500">Rider: {selectedRideForCancel?.riderInfo?.riderName} ({selectedRideForCancel?.riderInfo?.riderMobile})</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCancelDialog(false)}>No, Keep it</Button><Button variant="destructive" onClick={confirmCancelRide} disabled={cancellingRide}>{cancellingRide ? 'Cancelling...' : 'Yes, Cancel Ride'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminExtraChargesDialog isOpen={showExtraChargesDialog} onClose={() => { setShowExtraChargesDialog(false); setSelectedRideForCharges(null); }} rideId={selectedRideForCharges?._id || ''} onSuccess={fetchRides} />
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#363636', color: '#fff' } }} />
    </div>
  );
};
