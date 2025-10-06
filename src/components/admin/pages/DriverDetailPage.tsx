import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface DriverDetail {
  _id: string;
  mobile: string;
  status: string;
  createdAt: string;
  personalInformation: {
    aadhar: string[];
    drivingLicense: string[];
    fullName: string;
    dateOfBirth: string;
    gender: string;
    mobileNumber: string;
    alternateNumber: string;
    email: string;
    currentAddress: string;
    permanentAddress: string;
    panCard: string;
    passportPhoto: string;
  };
  drivingDetails: {
    vehicleType: string[];
    canDrive: string[];
    drivingExperienceYears: number;
    licenseType: string;
    preferredWork: string;
  };
  paymentAndSubscription: {
    preferredPaymentCycle: string;
    bankAccountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string;
    oneTimeRegistrationFee: number;
    subscriptionPlan: string;
  };
  languageSkillsAndReferences: {
    knownLanguages: string[];
    references: Array<{
      name: string;
      relationship: string;
      mobileNumber: string;
      _id: string;
    }>;
  };
  declaration: {
    signedAt: string;
    signature: string;
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

  useEffect(() => {
    fetchDriverDetail();
  }, [driverId]);

  const fetchDriverDetail = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/${driverId}`);
      const data = await response.json();
      setDriver(data);
    } catch (error) {
      console.error('Error fetching driver detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/approve/${driverId}`, {
        method: 'POST'
      });
      if (response.ok) {
        onBack();
      }
    } catch (error) {
      console.error('Error approving driver:', error);
    }
  };

  const handleReject = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/driver/reject/${driverId}`, {
        method: 'POST'
      });
      if (response.ok) {
        onBack();
      }
    } catch (error) {
      console.error('Error rejecting driver:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
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
        <div className="flex space-x-2">
          <Button onClick={handleApprove}>
            <Check className="w-4 h-4 mr-2" />
            Approve
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            <X className="w-4 h-4 mr-2" />
            Reject
          </Button>
        </div>
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
                <p>{driver.personalInformation.fullName}</p>
              </div>
              <div>
                <p className="font-semibold">Gender</p>
                <p>{driver.personalInformation.gender}</p>
              </div>
              <div>
                <p className="font-semibold">Date of Birth</p>
                <p>{new Date(driver.personalInformation.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-semibold">Mobile Number</p>
                <p>{driver.personalInformation.mobileNumber}</p>
              </div>
              <div>
                <p className="font-semibold">Alternate Number</p>
                <p>{driver.personalInformation.alternateNumber}</p>
              </div>
              <div>
                <p className="font-semibold">Email</p>
                <p>{driver.personalInformation.email}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Current Address</p>
              <p>{driver.personalInformation.currentAddress}</p>
            </div>
            <div>
              <p className="font-semibold">Permanent Address</p>
              <p>{driver.personalInformation.permanentAddress}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Passport Photo</p>
                <img 
                  src={driver.personalInformation.passportPhoto} 
                  alt="Passport" 
                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" 
                  onClick={() => setPreviewImage(driver.personalInformation.passportPhoto)}
                />
              </div>
              <div>
                <p className="font-semibold">PAN Card</p>
                <img 
                  src={driver.personalInformation.panCard} 
                  alt="PAN" 
                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" 
                  onClick={() => setPreviewImage(driver.personalInformation.panCard)}
                />
              </div>
            </div>
            <div>
              <p className="font-semibold">Aadhar Documents</p>
              <div className="flex space-x-2">
                {driver.personalInformation.aadhar.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`Aadhar ${index + 1}`} 
                    className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" 
                    onClick={() => setPreviewImage(url)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold">Driving License</p>
              <div className="flex space-x-2">
                {driver.personalInformation.drivingLicense.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`License ${index + 1}`} 
                    className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80" 
                    onClick={() => setPreviewImage(url)}
                  />
                ))}
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
              <p>{driver.drivingDetails.licenseType}</p>
            </div>
            <div>
              <p className="font-semibold">Driving Experience</p>
              <p>{driver.drivingDetails.drivingExperienceYears} years</p>
            </div>
            <div>
              <p className="font-semibold">Preferred Work</p>
              <p>{driver.drivingDetails.preferredWork}</p>
            </div>
            <div>
              <p className="font-semibold">Vehicle Types</p>
              <div className="flex flex-wrap gap-2">
                {driver.drivingDetails.vehicleType.map((type, index) => (
                  <Badge key={index} variant="outline">{type}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold">Can Drive</p>
              <div className="flex flex-wrap gap-2">
                {driver.drivingDetails.canDrive.map((vehicle, index) => (
                  <Badge key={index} variant="outline">{vehicle}</Badge>
                ))}
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
                <p>{driver.paymentAndSubscription.preferredPaymentCycle}</p>
              </div>
              <div>
                <p className="font-semibold">Registration Fee</p>
                <p>₹{driver.paymentAndSubscription.oneTimeRegistrationFee}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Bank Account Holder</p>
              <p>{driver.paymentAndSubscription.bankAccountHolderName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">Bank Name</p>
                <p>{driver.paymentAndSubscription.bankName}</p>
              </div>
              <div>
                <p className="font-semibold">Account Number</p>
                <p>{driver.paymentAndSubscription.accountNumber}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-semibold">IFSC Code</p>
                <p>{driver.paymentAndSubscription.ifscCode}</p>
              </div>
              <div>
                <p className="font-semibold">UPI ID</p>
                <p>{driver.paymentAndSubscription.upiId}</p>
              </div>
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
                {driver.languageSkillsAndReferences.knownLanguages.map((lang, index) => (
                  <Badge key={index} variant="outline">{lang}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold">References</p>
              <div className="space-y-2">
                {driver.languageSkillsAndReferences.references.map((ref, index) => (
                  <div key={index} className="p-3 border rounded">
                    <p><strong>Name:</strong> {ref.name}</p>
                    <p><strong>Relationship:</strong> {ref.relationship}</p>
                    <p><strong>Mobile:</strong> {ref.mobileNumber}</p>
                  </div>
                ))}
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
                <p>{new Date(driver.declaration.signedAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold">Created At</p>
                <p>{new Date(driver.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Signature</p>
              <img 
                src={driver.declaration.signature} 
                alt="Signature" 
                className="w-32 h-16 object-cover rounded border cursor-pointer hover:opacity-80" 
                onClick={() => setPreviewImage(driver.declaration.signature)}
              />
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
    </div>
  );
};