import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, X, Loader, Loader2, Eye, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/axiosInterceptor";
import { toast } from "@/hooks/use-toast";

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

export const DriverDetailPage = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [ridesCurrentPage, setRidesCurrentPage] = useState(1);
  const [ridesPerPage] = useState(10);

  // ── Edit Basic Info state ─────────────────────────────────────────────────
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    permanentAddress: '',
    subCategory: [] as string[],
    vehicleType: [] as string[],
    canDrive: [] as string[],
    knownLanguages: [] as string[],
  });
  const [langInput, setLangInput] = useState('');

  // Fetch subcategories filtered by driver's category
  const driverCategoryId = driver?.personalInformation?.category?._id;
  const { data: allSubcategories = [] } = useQuery({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);
      return res.data || [];
    },
    enabled: showEditDialog,
  });
  const filteredSubcategories = driverCategoryId
    ? allSubcategories.filter((s: any) => String(s.categoryId) === String(driverCategoryId))
    : allSubcategories;

  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ['driverVehicleTypes'],
    queryFn: async () => {
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/drivervehicletypes/active`);
      return res.data?.data || [];
    },
    enabled: showEditDialog,
  });

  const { data: vehicleCategories = [] } = useQuery({
    queryKey: ['vehicleCategories'],
    queryFn: async () => {
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/vehiclecategories/active`);
      return res.data?.data || [];
    },
    enabled: showEditDialog,
  });

  const openEditDialog = () => {
    if (!driver) return;
    setEditForm({
      fullName: driver.personalInformation?.fullName || '',
      email: driver.personalInformation?.email || '',
      permanentAddress: driver.personalInformation?.permanentAddress || '',
      subCategory: driver.personalInformation?.subCategory?.map((s) => String(s._id)) || [],
      vehicleType: driver.drivingDetails?.vehicleType?.map((v: any) => String(v._id || v)) || [],
      canDrive: driver.drivingDetails?.canDrive?.map((c: any) => String(c._id || c)) || [],
      knownLanguages: driver.languageSkillsAndReferences?.knownLanguages || [],
    });
    setLangInput('');
    setShowEditDialog(true);
  };

  const toggleArrayItem = (arr: string[], id: string): string[] =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const addLanguage = () => {
    const lang = langInput.trim();
    if (lang && !editForm.knownLanguages.includes(lang)) {
      setEditForm((f) => ({ ...f, knownLanguages: [...f.knownLanguages, lang] }));
    }
    setLangInput('');
  };

  const removeLanguage = (lang: string) => {
    setEditForm((f) => ({ ...f, knownLanguages: f.knownLanguages.filter((l) => l !== lang) }));
  };

  const handleEditSave = async () => {
    try {
      setEditLoading(true);
      await apiClient.patch(
        `${import.meta.env.VITE_API_URL}/api/admin/all-drivers/${driverId}/update-basic-info`,
        editForm
      );
      toast({ title: 'Driver info updated successfully' });
      setShowEditDialog(false);
      fetchDriverDetail();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setEditLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

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
      () => navigate(-1)();
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
      () => navigate(-1)();
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
    navigate(`/all-rides/${rideId}`);
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
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Badge variant="secondary" className="text-sm">{driver.status}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={openEditDialog} className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
            <Pencil className="w-4 h-4 mr-2" />
            Edit Driver Info
          </Button>
          {driver.status === "Onreview" && (
            <>
              <Button onClick={handleApprove}>
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
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
              <p className="font-semibold">Area</p>
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

      {/* ── Edit Basic Info Dialog ────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Driver Info</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Full Name */}
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            {/* Permanent Address */}
            <div className="space-y-1">
              <Label>Area (Permanent Address)</Label>
              <Input
                value={editForm.permanentAddress}
                onChange={(e) => setEditForm((f) => ({ ...f, permanentAddress: e.target.value }))}
                placeholder="Enter permanent address / area"
              />
            </div>

            {/* Sub Categories */}
            <div className="space-y-2">
              <Label>Sub Categories</Label>
              {filteredSubcategories.length === 0 ? (
                <p className="text-sm text-gray-500">No subcategories available</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {filteredSubcategories.map((sub: any) => (
                    <div key={sub.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sub-${sub.id}`}
                        checked={editForm.subCategory.includes(String(sub.id))}
                        onCheckedChange={() =>
                          setEditForm((f) => ({ ...f, subCategory: toggleArrayItem(f.subCategory, String(sub.id)) }))
                        }
                      />
                      <label htmlFor={`sub-${sub.id}`} className="text-sm cursor-pointer">{sub.name}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Types */}
            <div className="space-y-2">
              <Label>Vehicle Types</Label>
              {vehicleTypes.length === 0 ? (
                <p className="text-sm text-gray-500">No vehicle types available</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {vehicleTypes.map((vt: any) => (
                    <div key={vt._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`vt-${vt._id}`}
                        checked={editForm.vehicleType.includes(String(vt._id))}
                        onCheckedChange={() => {
                          const vtId = String(vt._id);
                          const isRemoving = editForm.vehicleType.includes(vtId);
                          setEditForm((f) => {
                            const newVehicleType = toggleArrayItem(f.vehicleType, vtId);
                            // If unchecking a vehicle type, also deselect its canDrive children
                            const newCanDrive = isRemoving
                              ? f.canDrive.filter(cdId => {
                                  const vc = vehicleCategories.find((v: any) => String(v._id) === cdId);
                                  return String(vc?.DriveVehicleType?._id || vc?.DriveVehicleType || '') !== vtId;
                                })
                              : f.canDrive;
                            return { ...f, vehicleType: newVehicleType, canDrive: newCanDrive };
                          });
                        }}
                      />
                      <label htmlFor={`vt-${vt._id}`} className="text-sm cursor-pointer">{vt.name}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Can Drive (Vehicle Categories) */}
            <div className="space-y-2">
              <Label>Can Drive</Label>
              <p className="text-xs text-gray-500">Only vehicles whose vehicle type is selected above are enabled.</p>
              {vehicleCategories.length === 0 ? (
                <p className="text-sm text-gray-500">No vehicle categories available</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {vehicleCategories.map((vc: any) => {
                    const parentTypeId = String(vc.DriveVehicleType?._id || vc.DriveVehicleType || '');
                    const isEnabled = editForm.vehicleType.includes(parentTypeId);
                    const parentTypeName = vc.DriveVehicleType?.name || '';
                    return (
                      <div key={vc._id} className={`flex items-center space-x-2 ${!isEnabled ? 'opacity-40' : ''}`}>
                        <Checkbox
                          id={`vc-${vc._id}`}
                          checked={editForm.canDrive.includes(String(vc._id))}
                          disabled={!isEnabled}
                          onCheckedChange={() => {
                            if (!isEnabled) return;
                            setEditForm((f) => ({ ...f, canDrive: toggleArrayItem(f.canDrive, String(vc._id)) }));
                          }}
                        />
                        <label
                          htmlFor={`vc-${vc._id}`}
                          className={`text-sm ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {vc.vehicleName}
                          {parentTypeName && (
                            <span className="ml-1 text-xs text-gray-400">({parentTypeName})</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Known Languages */}
            <div className="space-y-2">
              <Label>Known Languages</Label>
              <div className="flex gap-2">
                <Input
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  placeholder="Type a language and press Add"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <Button type="button" variant="outline" onClick={addLanguage} className="shrink-0">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              {editForm.knownLanguages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {editForm.knownLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {lang}
                      <button
                        type="button"
                        onClick={() => removeLanguage(lang)}
                        className="hover:text-blue-600 ml-0.5"
                        aria-label={`Remove ${lang}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─────────────────────────────────────────────────────────────────── */}

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