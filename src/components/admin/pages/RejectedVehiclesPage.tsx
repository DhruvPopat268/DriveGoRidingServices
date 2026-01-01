import { useState, useEffect } from 'react';
import { Eye, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '../../../lib/axiosInterceptor';

interface Vehicle {
  _id: string;
  rcNumber: string;
  status: boolean;
  adminStatus: string;
  owner: {
    personalInformation: {
      fullName: string;
    };
    mobile: string;
    uniqueId: string;
  };
  category: {
    name: string;
  };
  cabVehicleDetails?: any;
  parcelVehicleDetails?: any;
  createdAt: string;
  approvedDate?: string;
  rejectedDate?: string;
}

export default function RejectedVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchRejectedVehicles();
  }, [currentPage, recordsPerPage]);

  const fetchRejectedVehicles = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/rejected?page=${currentPage}&limit=${recordsPerPage}`);
      if (response.data.success) {
        setVehicles(response.data.data);
        setTotalPages(response.data.totalPages || 1);
        setTotalRecords(response.data.totalRecords || 0);
      }
    } catch (error) {
      console.error('Error fetching rejected vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVehicle(null);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center items-center py-8">
          <Loader className="w-6 h-6 animate-spin mr-2" />
          <span>Loading rejected vehicles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rejected Vehicles</h1>
      </div>

      <Card className="p-6">
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
              <TableHead>#</TableHead>
              <TableHead>RC Number</TableHead>
              <TableHead>Owner Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Unique ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rejected Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-gray-500 text-lg">No rejected vehicles found</p>
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle, index) => (
                  <tr key={vehicle._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(currentPage - 1) * recordsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vehicle.rcNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.owner?.personalInformation?.fullName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.owner?.mobile || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.owner?.uniqueId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.category?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Rejected
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.rejectedDate ? new Date(vehicle.rejectedDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleView(vehicle)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalRecords > 0 && (
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
        )}
      </Card>

      {/* Modal */}
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
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Rejected
                    </span>
                  </div>
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
                      <p className="text-sm text-gray-600">Dimensions (L x W x H)</p>
                      <p className="font-medium">{`${selectedVehicle.parcelVehicleDetails.length || 'N/A'} x ${selectedVehicle.parcelVehicleDetails.width || 'N/A'} x ${selectedVehicle.parcelVehicleDetails.height || 'N/A'}`}</p>
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
                    {(selectedVehicle.cabVehicleDetails?.vehiclePhotos || selectedVehicle.parcelVehicleDetails?.vehiclePhotos)?.map((photo: string, index: number) => (
                      <img key={index} src={photo} alt={`Vehicle ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
