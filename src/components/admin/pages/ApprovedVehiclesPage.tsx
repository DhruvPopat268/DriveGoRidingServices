import { useState, useEffect } from 'react';
import { Eye, X, Check, XCircle, Loader, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../lib/axiosInterceptor';

interface Category {
  _id: string;
  name: string;
}

type VehicleStatus = 'pending' | 'approved' | 'rejected';

interface Vehicle {
  _id: string;
  rcNumber: string;
  status: boolean;
  adminStatus: VehicleStatus;
  owner: {
    personalInformation: {
      fullName: string;
    };
    mobile: string;
    uniqueId: string;
    ownership: string;
  };
  category: {
    name: string;
  };
  assignedTo?: Array<{
    _id: string;
    personalInformation: {
      fullName: string;
    };
    mobile: string;
  }>;
  cabVehicleDetails?: any;
  parcelVehicleDetails?: any;
  createdAt: string;
  approvedDate?: string;
  rejectedDate?: string;
}

const STATUS_CONFIG: Record<VehicleStatus, { label: string; badgeClass: string }> = {
  pending:  { label: 'Pending',  badgeClass: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', badgeClass: 'bg-green-100 text-green-800'  },
  rejected: { label: 'Rejected', badgeClass: 'bg-red-100 text-red-800'     },
};

export default function VehiclesPage() {
  const navigate = useNavigate();
  // Draft filter states (what user is editing)
  const [filterStatus, setFilterStatus] = useState<VehicleStatus>('approved');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Applied filter states (what actually triggers the API call)
  const [appliedStatus, setAppliedStatus] = useState<VehicleStatus>('approved');
  const [appliedCategory, setAppliedCategory] = useState<string>('all');
  const [appliedSearch, setAppliedSearch] = useState<string>('');

  // Categories list for dropdown
  const [categories, setCategories] = useState<Category[]>([]);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [vehicleToAction, setVehicleToAction] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Re-fetch only when applied status, page, or limit changes
  useEffect(() => {
    fetchVehicles();
  }, [appliedStatus, appliedCategory, appliedSearch, currentPage, recordsPerPage]);

  // Fetch categories once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`);
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: appliedStatus,
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        ...(appliedCategory && appliedCategory !== 'all' && { categoryId: appliedCategory }),
        ...(appliedSearch && { search: appliedSearch }),
      });
      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/vehicles?${params}`
      );
      if (response.data.success) {
        setVehicles(response.data.data);
        setTotalPages(response.data.totalPages || 1);
        setTotalRecords(response.data.totalRecords || 0);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    setAppliedStatus(filterStatus);
    setAppliedCategory(filterCategory);
    setAppliedSearch(searchQuery);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterStatus('approved');
    setFilterCategory('all');
    setSearchQuery('');
    setAppliedStatus('approved');
    setAppliedCategory('all');
    setAppliedSearch('');
    setCurrentPage(1);
  };

  // Show Clear button when any filter differs from default
  const hasActiveFilters = filterStatus !== 'approved' || appliedStatus !== 'approved'
    || filterCategory !== 'all' || appliedCategory !== 'all'
    || searchQuery !== '' || appliedSearch !== '';

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const handleView = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVehicle(null);
  };

  const openApproveModal = (vehicle: Vehicle) => {
    setVehicleToAction(vehicle);
    setShowApproveModal(true);
  };

  const openRejectModal = (vehicle: Vehicle) => {
    setVehicleToAction(vehicle);
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    if (!vehicleToAction) return;
    try {
      setActionLoading(vehicleToAction._id);
      setError(null);
      const response = await apiClient.post(
        `${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/approve/${vehicleToAction._id}`
      );
      if (response.data.success) {
        setVehicles(vehicles.filter(v => v._id !== vehicleToAction._id));
        setTotalRecords(prev => prev - 1);
        setShowApproveModal(false);
        setVehicleToAction(null);
        setSuccess('Vehicle approved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.message || 'Failed to approve vehicle');
      }
    } catch {
      setError('Failed to approve vehicle');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!vehicleToAction) return;
    try {
      setActionLoading(vehicleToAction._id);
      setError(null);
      const response = await apiClient.post(
        `${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/reject/${vehicleToAction._id}`
      );
      if (response.data.success) {
        setVehicles(vehicles.filter(v => v._id !== vehicleToAction._id));
        setTotalRecords(prev => prev - 1);
        setShowRejectModal(false);
        setVehicleToAction(null);
        setSuccess('Vehicle rejected successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.message || 'Failed to reject vehicle');
      }
    } catch {
      setError('Failed to reject vehicle');
    } finally {
      setActionLoading(null);
    }
  };

  const dateColumn = appliedStatus === 'approved'
    ? 'Approved Date'
    : appliedStatus === 'rejected'
    ? 'Rejected Date'
    : null;

  const getDateValue = (vehicle: Vehicle) => {
    if (appliedStatus === 'approved') return vehicle.approvedDate ? new Date(vehicle.approvedDate).toLocaleDateString() : 'N/A';
    if (appliedStatus === 'rejected') return vehicle.rejectedDate ? new Date(vehicle.rejectedDate).toLocaleDateString() : 'N/A';
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Alerts */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Vehicle Management</h1>
        <p className="text-gray-600">Manage and review driver vehicles</p>
      </div>

      {/* Filter Card — same style as RideFilters */}
      <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search (Vehicle Model)</label>
            <input
              type="text"
              placeholder="Search by vehicle model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as VehicleStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Apply / Clear buttons — bottom right, same as RideFilters */}
        <div className="flex items-center justify-end space-x-2 mt-3">
          <Button variant="default" size="sm" onClick={applyFilters} className="text-xs h-8">
            <Search className="w-3 h-3 mr-1" />
            Apply
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs h-8">
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        {/* Records per page */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              Showing:{' '}
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_CONFIG[appliedStatus].badgeClass}`}>
                {STATUS_CONFIG[appliedStatus].label}
              </span>
            </span>
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

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-6 h-6 animate-spin mr-2 text-blue-600" />
            <span className="text-gray-600">Loading vehicles...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ownership</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RC Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {dateColumn && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{dateColumn}</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={dateColumn ? 12 : 11} className="px-6 py-10 text-center text-gray-500">
                      No {appliedStatus} vehicles found
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle, index) => (
                    <tr key={vehicle._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(currentPage - 1) * recordsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.owner?.personalInformation?.fullName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.owner?.mobile || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.owner?.ownership || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.category?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.rcNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.cabVehicleDetails?.vehicleType?.name
                          || vehicle.parcelVehicleDetails?.vehicleType?.name
                          || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.cabVehicleDetails?.modelType?.name
                          || vehicle.parcelVehicleDetails?.modelType?.name
                          || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vehicle.cabVehicleDetails?.modelType?.category?.name
                          || vehicle.parcelVehicleDetails?.modelType?.parcelCategory?.name
                          || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_CONFIG[appliedStatus].badgeClass}`}>
                          {STATUS_CONFIG[appliedStatus].label}
                        </span>
                      </td>
                      {dateColumn && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getDateValue(vehicle)}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(vehicle)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {appliedStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => openApproveModal(vehicle)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                title="Approve"
                                disabled={actionLoading === vehicle._id}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openRejectModal(vehicle)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Reject"
                                disabled={actionLoading === vehicle._id}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalRecords > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * recordsPerPage + 1, totalRecords)} to{' '}
              {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} entries
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
                  let pageNumber: number;
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
                      variant={currentPage === pageNumber ? 'default' : 'outline'}
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
      </Card>

      {/* View Details Modal */}
      {showModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Vehicle Details</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Owner Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Owner Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedVehicle.owner?.personalInformation?.fullName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mobile</p>
                    <p className="font-medium">{selectedVehicle.owner?.mobile || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unique ID</p>
                    <p className="font-medium">{selectedVehicle.owner?.uniqueId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ownership</p>
                    <p className="font-medium">{selectedVehicle.owner?.ownership || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">RC Number</p>
                    <p className="font-medium">{selectedVehicle.rcNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium">{selectedVehicle.category?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_CONFIG[selectedVehicle.adminStatus]?.badgeClass || ''}`}>
                      {STATUS_CONFIG[selectedVehicle.adminStatus]?.label || selectedVehicle.adminStatus}
                    </span>
                  </div>
                  {selectedVehicle.approvedDate && (
                    <div>
                      <p className="text-sm text-gray-600">Approved Date</p>
                      <p className="font-medium">{new Date(selectedVehicle.approvedDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedVehicle.rejectedDate && (
                    <div>
                      <p className="text-sm text-gray-600">Rejected Date</p>
                      <p className="font-medium">{new Date(selectedVehicle.rejectedDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cab Vehicle Details */}
              {selectedVehicle.cabVehicleDetails && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Cab Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Vehicle Type</p>
                      <p className="font-medium">{selectedVehicle.cabVehicleDetails.vehicleType?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Model Type</p>
                      <p className="font-medium">{selectedVehicle.cabVehicleDetails.modelType?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Vehicle Category</p>
                      <p className="font-medium">{selectedVehicle.cabVehicleDetails.modelType?.category?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Seat Capacity</p>
                      <p className="font-medium">{selectedVehicle.cabVehicleDetails.seatCapacity || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Color</p>
                      <p className="font-medium">{selectedVehicle.cabVehicleDetails.color || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fuel Type</p>
                      <p className="font-medium">{selectedVehicle.cabVehicleDetails.fuelType?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Parcel Vehicle Details */}
              {selectedVehicle.parcelVehicleDetails && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Parcel Vehicle Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Vehicle Type</p>
                      <p className="font-medium">{selectedVehicle.parcelVehicleDetails.vehicleType?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Model Type</p>
                      <p className="font-medium">{selectedVehicle.parcelVehicleDetails.modelType?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Vehicle Category</p>
                      <p className="font-medium">{selectedVehicle.parcelVehicleDetails.modelType?.parcelCategory?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dimensions (L x W x H)</p>
                      <p className="font-medium">
                        {`${selectedVehicle.parcelVehicleDetails.length || 'N/A'} x ${selectedVehicle.parcelVehicleDetails.width || 'N/A'} x ${selectedVehicle.parcelVehicleDetails.height || 'N/A'}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Weight Capacity</p>
                      <p className="font-medium">{selectedVehicle.parcelVehicleDetails.weightCapacity || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Color</p>
                      <p className="font-medium">{selectedVehicle.parcelVehicleDetails.color || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fuel Type</p>
                      <p className="font-medium">{selectedVehicle.parcelVehicleDetails.fuelType?.join(', ') || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Photos */}
              {(selectedVehicle.cabVehicleDetails?.vehiclePhotos || selectedVehicle.parcelVehicleDetails?.vehiclePhotos) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle Photos</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(selectedVehicle.cabVehicleDetails?.vehiclePhotos || selectedVehicle.parcelVehicleDetails?.vehiclePhotos)?.map(
                      (photo: string, index: number) => (
                        <img key={index} src={photo} alt={`Vehicle ${index + 1}`} className="w-full h-32 object-cover rounded" />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Drivers */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned Drivers</h3>
                {selectedVehicle.assignedTo && selectedVehicle.assignedTo.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedVehicle.assignedTo.map((driver, index) => (
                          <tr key={driver._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {driver.personalInformation?.fullName || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {driver.mobile || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={() => {
                                  closeModal();
                                  navigate(`/drivers/${driver._id}`);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="View driver details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No drivers assigned to this vehicle</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && vehicleToAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Approve Vehicle</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve vehicle{' '}
              <span className="font-semibold">{vehicleToAction.rcNumber}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowApproveModal(false); setVehicleToAction(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                disabled={actionLoading === vehicleToAction._id}
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={actionLoading === vehicleToAction._id}
              >
                {actionLoading === vehicleToAction._id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && vehicleToAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Reject Vehicle</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject vehicle{' '}
              <span className="font-semibold">{vehicleToAction.rcNumber}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowRejectModal(false); setVehicleToAction(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                disabled={actionLoading === vehicleToAction._id}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={actionLoading === vehicleToAction._id}
              >
                {actionLoading === vehicleToAction._id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
