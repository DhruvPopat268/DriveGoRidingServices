import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, Loader, Loader2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import apiClient from "../../../lib/axiosInterceptor";

interface DriverDetail {
  _id: string;
  mobile: string;
  status: string;
  ownership?: string;
  createdAt: string;
  selectedCategory?: {
    id: string;
    name: string;
  };
  personalInformation?: {
    aadhar?: string[];
    drivingLicense?: string[];
    fullName?: string;
    dateOfBirth?: string;
    gender?: string;
    mobileNumber?: string;
    alternateNumber?: string;
    email?: string;
    currentAddress?: string;
    permanentAddress?: string;
    panCard?: string;
    passportPhoto?: string;
    category?: {
      _id: string;
      name: string;
    };
    subCategory?: Array<{
      _id: string;
      name: string;
    }>;
  };
  drivingDetails?: {
    vehicleType?: Array<{ name: string }>;
    canDrive?: Array<{ vehicleName: string }>;
    drivingExperienceYears?: number;
    licenseType?: string;
    preferredWork?: string;
  };
  paymentAndSubscription?: {
    preferredPaymentCycle?: string;
    bankAccountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    oneTimeRegistrationFee?: number;
    subscriptionPlan?: string;
    upiQrCode?: string;
  };
  languageSkillsAndReferences?: {
    knownLanguages?: string[];
    references?: Array<{
      name: string;
      relationship: string;
      mobileNumber: string;
      _id: string;
    }>;
  };
  declaration?: {
    signedAt?: string;
    signature?: string;
  };
}

interface Ride {
  rideId: string;
  category: string;
  selectedDate: string;
  status: string;
}

interface DriverDetailPageProps {
  driverId: string;
  onBack: () => void;
  onNavigateToRideDetail?: (rideId: string) => void;
}

export const DriverDetailPage = ({ driverId, onBack, onNavigateToRideDetail }: DriverDetailPageProps) => {
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [ridesCurrentPage, setRidesCurrentPage] = useState(1);
  const [ridesPerPage] = useState(10);

  const stepOptions = [
    { step: 1, label: "Personal Information" },
    { step: 2, label: "Driving Details" },
    { step: 3, label: "Payment & Subscription" },
    { step: 4, label: "Language Skills & References" },
    { step: 5, label: "Declaration" }
  ];

  useEffect(() => {
    fetchDriverDetail();
  }, [driverId]);

  const fetchDriverDetail = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/driver/${driverId}`);
      if (response.data.success) {
        setDriver(response.data.driver);
        setRides(response.data.rides || []);
      } else {
        setDriver(response.data);
        setRides([]);
      }
    } catch (error) {
      console.error('Error fetching driver detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await apiClient.post(`${import.meta.env.VITE_API_URL}/api/driver/approve/${driverId}`);
      onBack();
    } catch (error) {
      console.error('Error approving driver:', error);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(`${import.meta.env.VITE_API_URL}/api/driver/reject/${driverId}`, {
        steps: selectedSteps
      });
      setShowRejectDialog(false);
      setSelectedSteps([]);
      onBack();
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

  const handleViewRide = (rideId: string) => {
    if (onNavigateToRideDetail) {
      onNavigateToRideDetail(rideId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRidesPaginated = () => {
    const startIndex = (ridesCurrentPage - 1) * ridesPerPage;
    const endIndex = startIndex + ridesPerPage;
    return rides.slice(startIndex, endIndex);
  };

  const getTotalRidesPages = () => {
    return Math.ceil(rides.length / ridesPerPage);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading driver details...</span>
      </div>
    );
  }

  if (!driver) {
    return <div className="p-6">Driver not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Badge variant="secondary" className="text-sm">{driver.status}</Badge>
        </div>
        {driver.status === "Onreview" && (
          <div className="flex space-x-2">
            <Button onClick={handleApprove}>
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
              <X className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Full Name</p>
                <p>{driver.personalInformation?.fullName || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Gender</p>
                <p>{driver.personalInformation?.gender || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Category</p>
                <p>{driver.personalInformation?.category?.name || driver.selectedCategory?.name || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Ownership</p>
                <p>{driver.ownership || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Subcategories</p>
              <div className="flex flex-wrap gap-2">
                {driver.personalInformation?.subCategory?.length ? (
                  driver.personalInformation.subCategory.map((sub) => (
                    <Badge key={sub._id} variant="outline">{sub.name}</Badge>
                  ))
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Date of Birth</p>
                <p>{driver.personalInformation?.dateOfBirth ? new Date(driver.personalInformation.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Mobile Number</p>
                <p>{driver.mobile || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Alternate Number</p>
                <p>{driver.personalInformation?.alternateNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <p>{driver.personalInformation?.email || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Current Address</p>
              <p>{driver.personalInformation?.currentAddress || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-semibold">Permanent Address</p>
              <p>{driver.personalInformation?.permanentAddress || 'Not provided'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Passport Photo</p>
                {driver.personalInformation?.passportPhoto ? (
                  <img
                    src={driver.personalInformation.passportPhoto}
                    alt="Passport"
                    className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(driver.personalInformation.passportPhoto)}
                  />
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
              <div>
                <p className="font-semibold">PAN Card</p>
                {driver.personalInformation?.panCard ? (
                  <img
                    src={driver.personalInformation.panCard}
                    alt="PAN"
                    className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(driver.personalInformation.panCard)}
                  />
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold">Aadhar Documents</p>
              <div className="flex space-x-2">
                {driver.personalInformation?.aadhar?.length ? (
                  driver.personalInformation.aadhar.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Aadhar ${index + 1}`}
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewImage(url)}
                    />
                  ))
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold">Driving License</p>
              <div className="flex space-x-2">
                {driver.personalInformation?.drivingLicense?.length ? (
                  driver.personalInformation.drivingLicense.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`License ${index + 1}`}
                      className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewImage(url)}
                    />
                  ))
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Driving Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-semibold text-sm">License Type</p>
                  <p className="text-sm">{driver.drivingDetails?.licenseType || 'Not provided'}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Experience</p>
                  <p className="text-sm">{driver.drivingDetails?.drivingExperienceYears ? `${driver.drivingDetails.drivingExperienceYears} years` : 'Not provided'}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Preferred Work</p>
                  <p className="text-sm">{driver.drivingDetails?.preferredWork || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Vehicle Types</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {driver.drivingDetails?.vehicleType?.length ? (
                    driver.drivingDetails.vehicleType.map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{type.name}</Badge>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Not provided</p>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Can Drive</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {driver.drivingDetails?.canDrive?.length ? (
                    driver.drivingDetails.canDrive.map((vehicle, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{vehicle.vehicleName}</Badge>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Not provided</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment & Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-sm">Payment Cycle</p>
                  <p className="text-sm">{driver.paymentAndSubscription?.preferredPaymentCycle || 'Not provided'}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Registration Fee</p>
                  <p className="text-sm">{driver.paymentAndSubscription?.oneTimeRegistrationFee ? `₹${driver.paymentAndSubscription.oneTimeRegistrationFee}` : 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Bank Account Holder</p>
                <p className="text-sm">{driver.paymentAndSubscription?.bankAccountHolderName || 'Not provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-sm">Bank Name</p>
                  <p className="text-sm">{driver.paymentAndSubscription?.bankName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">Account Number</p>
                  <p className="text-sm">{driver.paymentAndSubscription?.accountNumber || 'Not provided'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-semibold text-sm">IFSC Code</p>
                  <p className="text-sm">{driver.paymentAndSubscription?.ifscCode || 'Not provided'}</p>
                </div>
                <div>
                  <p className="font-semibold text-sm">UPI ID</p>
                  <p className="text-sm">{driver.paymentAndSubscription?.upiId || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">UPI QR Code</p>
                {driver.paymentAndSubscription?.upiQrCode ? (
                  <img
                    src={driver.paymentAndSubscription.upiQrCode}
                    alt="UPI QR code"
                    className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 mt-1"
                    onClick={() => setPreviewImage(driver.paymentAndSubscription.upiQrCode)}
                  />
                ) : (
                  <p className="text-gray-500 text-sm">Not provided</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Declaration & Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-sm">Signed At</p>
                    <p className="text-sm">{driver.declaration?.signedAt ? new Date(driver.declaration.signedAt).toLocaleString() : 'Not signed'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Created At</p>
                    <p className="text-sm">{driver.createdAt ? new Date(driver.createdAt).toLocaleString() : 'Not available'}</p>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm">Signature</p>
                  {driver.declaration?.signature ? (
                    <img
                      src={driver.declaration.signature}
                      alt="Signature"
                      className="w-32 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                      onClick={() => setPreviewImage(driver.declaration.signature)}
                    />
                  ) : (
                    <p className="text-gray-500 text-sm">Not provided</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Languages & References</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">Known Languages</p>
              <div className="flex flex-wrap gap-2">
                {driver.languageSkillsAndReferences?.knownLanguages?.length ? (
                  driver.languageSkillsAndReferences.knownLanguages.map((lang, index) => (
                    <Badge key={index} variant="outline">{lang}</Badge>
                  ))
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold">References</p>
              <div className="space-y-2">
                {driver.languageSkillsAndReferences?.references?.length ? (
                  driver.languageSkillsAndReferences.references.map((ref, index) => (
                    <div key={index} className="p-3 border rounded">
                      <p><strong>Name:</strong> {ref.name}</p>
                      <p><strong>Relationship:</strong> {ref.relationship}</p>
                      <p><strong>Mobile:</strong> {ref.mobileNumber}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No references provided</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

{/* Rides History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rides History ({rides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rides.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ride ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getRidesPaginated().map((ride) => (
                      <TableRow key={ride.rideId}>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {ride.rideId}
                          </code>
                        </TableCell>
                        <TableCell>{ride.category}</TableCell>
                        <TableCell>{formatDate(ride.selectedDate)}</TableCell>
                        <TableCell>
                          <Badge className={
                            ride.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            ride.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                            ride.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {ride.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewRide(ride.rideId)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Rides Pagination */}
                {getTotalRidesPages() > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {Math.min((ridesCurrentPage - 1) * ridesPerPage + 1, rides.length)} to {Math.min(ridesCurrentPage * ridesPerPage, rides.length)} of {rides.length} rides
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRidesCurrentPage(ridesCurrentPage - 1)}
                        disabled={ridesCurrentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: getTotalRidesPages() }, (_, i) => (
                          <Button
                            key={i + 1}
                            variant={ridesCurrentPage === i + 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRidesCurrentPage(i + 1)}
                            className="w-8 h-8 p-0"
                          >
                            {i + 1}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRidesCurrentPage(ridesCurrentPage + 1)}
                        disabled={ridesCurrentPage === getTotalRidesPages()}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No rides found for this driver
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 bg-black">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300"
          >
            <X className="w-8 h-8" />
          </button>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          )}
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
              {stepOptions.map(({ step, label }) => (
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