import { useState, useEffect } from 'react';
import { Eye, X, Check, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../../ui/alert';

interface Vehicle {
  _id: string;
  rcNumber: string;
  status: boolean;
  adminStatus: boolean;
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

export default function PendingVehiclesPage() {
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

  useEffect(() => {
    fetchPendingVehicles();
  }, []);

  const fetchPendingVehicles = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setVehicles(data.data);
      }
    } catch (error) {
      console.error('Error fetching pending vehicles:', error);
    } finally {
      setLoading(false);
    }
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
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/approve/${vehicleToAction._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setVehicles(vehicles.filter(v => v._id !== vehicleToAction._id));
        setShowApproveModal(false);
        setVehicleToAction(null);
        setSuccess('Vehicle approved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to approve vehicle');
      }
    } catch (error) {
      console.error('Error approving vehicle:', error);
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
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/vehicles/admin/reject/${vehicleToAction._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setVehicles(vehicles.filter(v => v._id !== vehicleToAction._id));
        setShowRejectModal(false);
        setVehicleToAction(null);
        setSuccess('Vehicle rejected successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to reject vehicle');
      }
    } catch (error) {
      console.error('Error rejecting vehicle:', error);
      setError('Failed to reject vehicle');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50 mb-6">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50 mb-6">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pending Vehicles</h1>
        <p className="text-gray-600">Vehicles awaiting admin approval</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RC Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No pending vehicles found
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle, index) => (
                  <tr key={vehicle._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index+1}
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
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(vehicle)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View details"
                          disabled={actionLoading === vehicle._id}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Pending
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

      {/* Approve Modal */}
      {showApproveModal && vehicleToAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Approve Vehicle</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve vehicle <span className="font-semibold">{vehicleToAction.rcNumber}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setVehicleToAction(null);
                }}
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

      {/* Reject Modal */}
      {showRejectModal && vehicleToAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Reject Vehicle</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject vehicle <span className="font-semibold">{vehicleToAction.rcNumber}</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setVehicleToAction(null);
                }}
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
