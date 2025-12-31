import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X, Loader, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
    vehicleType?: string[];
    canDrive?: string[];
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

interface DriverDetailPageProps {
  driverId: string;
  onBack: () => void;
}

export const DriverDetailPage = ({ driverId, onBack }: DriverDetailPageProps) => {
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

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
      setDriver(response.data);
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

        <Card>
          <CardHeader>
            <CardTitle>Driving Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">License Type</p>
              <p>{driver.drivingDetails?.licenseType || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-semibold">Driving Experience</p>
              <p>{driver.drivingDetails?.drivingExperienceYears ? `${driver.drivingDetails.drivingExperienceYears} years` : 'Not provided'}</p>
            </div>
            <div>
              <p className="font-semibold">Preferred Work</p>
              <p>{driver.drivingDetails?.preferredWork || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-semibold">Vehicle Types</p>
              <div className="flex flex-wrap gap-2">
                {driver.drivingDetails?.vehicleType?.length ? (
                  driver.drivingDetails.vehicleType.map((type, index) => (
                    <Badge key={index} variant="outline">{type.name}</Badge>
                  ))
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold">Can Drive</p>
              <div className="flex flex-wrap gap-2">
                {driver.drivingDetails?.canDrive?.length ? (
                  driver.drivingDetails.canDrive.map((vehicle, index) => (
                    <Badge key={index} variant="outline">{vehicle.vehicleName}</Badge>
                  ))
                ) : (
                  <p className="text-gray-500">Not provided</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment & Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Payment Cycle</p>
                <p>{driver.paymentAndSubscription?.preferredPaymentCycle || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Registration Fee</p>
                <p>{driver.paymentAndSubscription?.oneTimeRegistrationFee ? `₹${driver.paymentAndSubscription.oneTimeRegistrationFee}` : 'Not provided'}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Bank Account Holder</p>
              <p>{driver.paymentAndSubscription?.bankAccountHolderName || 'Not provided'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Bank Name</p>
                <p>{driver.paymentAndSubscription?.bankName || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">Account Number</p>
                <p>{driver.paymentAndSubscription?.accountNumber || 'Not provided'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">IFSC Code</p>
                <p>{driver.paymentAndSubscription?.ifscCode || 'Not provided'}</p>
              </div>
              <div>
                <p className="font-semibold">UPI ID</p>
                <p>{driver.paymentAndSubscription?.upiId || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <p className="font-semibold">UPI Qr code</p>
              {driver.paymentAndSubscription?.upiQrCode ? (
                <img
                  src={driver.paymentAndSubscription.upiQrCode}
                  alt="upi Qr code"
                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                  onClick={() => setPreviewImage(driver.paymentAndSubscription.upiQrCode)}
                />
              ) : (
                <p className="text-gray-500">Not provided</p>
              )}
            </div>
          </CardContent>
        </Card>

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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Declaration & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="font-semibold">Signed At</p>
                <p>{driver.declaration?.signedAt ? new Date(driver.declaration.signedAt).toLocaleString() : 'Not signed'}</p>
              </div>
              <div>
                <p className="font-semibold">Created At</p>
                <p>{driver.createdAt ? new Date(driver.createdAt).toLocaleString() : 'Not available'}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Signature</p>
              {driver.declaration?.signature ? (
                <img
                  src={driver.declaration.signature}
                  alt="Signature"
                  className="w-32 h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                  onClick={() => setPreviewImage(driver.declaration.signature)}
                />
              ) : (
                <p className="text-gray-500">Not provided</p>
              )}
            </div>
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