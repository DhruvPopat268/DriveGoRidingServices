import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../../../lib/axiosInterceptor';
import { Plus, Edit, Trash2, Eye, X, Loader, ChevronLeft, ChevronRight, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

interface RideCost {
  _id?: string;
  category: string | { _id?: string; id?: string; name: string };
  subcategory: string | { _id?: string; id?: string; name: string };
  subSubCategory?: string | { _id?: string; id?: string; name: string };
  priceCategory: string | { _id?: string; id?: string; priceCategoryName: string };
  weight?: number;
  baseFare: number;
  includedKm: number;
  includedMinutes: number;
  extraChargePerKm: number;
  extraChargePerMinute: number;
  pickCharges: number;
  nightCharges: number;
  cancellationFee: number;
  cancellationBufferTime: number;
  insurance: number;
  extraChargesFromAdmin: number;
  gst: number;
  discount: number;
  minimumFare: number;
  driverCancellationCharges: number;
  driverCancellationCredits: number;
  status?: boolean;
}

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id?: string;
  id?: string;
  name: string;
  categoryId: string;
}

interface PriceCategory {
  _id: string;
  priceCategoryName: string;
}

interface ParcelVehicle {
  _id: string;
  vehicleName: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface SubSubCategory {
  _id?: string;
  id?: string;
  name: string;
  categoryId: string;
  subCategoryId: string;
}

export const DriverRideCostPage = () => {
  const [rideCosts, setRideCosts] = useState<RideCost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [parcelVehicles, setParcelVehicles] = useState<ParcelVehicle[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubSubCategories, setFilteredSubSubCategories] = useState<SubSubCategory[]>([]);
  const [filteredPriceCategories, setFilteredPriceCategories] = useState<PriceCategory[]>([]);

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterPriceCategory, setFilterPriceCategory] = useState<string>('all');
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState<Subcategory[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [rideCostForm, setRideCostForm] = useState({
    category: '',
    subcategory: '',
    subSubCategory: '',
    priceCategory: '',
    weight: '',
    baseFare: '',
    includedKm: '',
    includedMinutes: '',
    extraChargePerKm: '',
    extraChargePerMinute: '',
    pickCharges: '',
    nightCharges: '',
    cancellationFee: '',
    cancellationBufferTime: '',    insurance: '',
    extraChargesFromAdmin: '',
    gst: '',
    discount: '',
    driverCancellationCharges: '',
    driverCancellationCredits: ''
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRideCost, setEditingRideCost] = useState<RideCost | null>(null);
  const [viewingRideCost, setViewingRideCost] = useState<RideCost | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Bulk import state
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportErrors, setBulkImportErrors] = useState<{
    row: number;
    errors: { field: string; value: string; message: string }[];
  }[]>([]);
  const [bulkImportSuccess, setBulkImportSuccess] = useState<string | null>(null);
  const [sampleDownloading, setSampleDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to extract ID from objects that might have either _id or id
  const extractId = (item: string | { _id?: string; id?: string }) => {
    if (typeof item === 'string') return item;
    return item._id || item.id || '';
  };

  // Helper function to check if current category is parcel
  const isParcelCategory = (categoryItem: string | { _id?: string; id?: string; name: string }) => {
    const categoryName = getName(categoryItem);
    return categoryName.toLowerCase() === 'parcel';
  };

  // Helper function to get selected category name from form
  const getSelectedCategoryName = () => {
    const selectedCategory = categories.find(cat => cat._id === rideCostForm.category);
    return selectedCategory ? selectedCategory.name : '';
  };

  // Helper function to get selected subcategory name from form
  const getSelectedSubCategoryName = () => {
    const selectedSubCategory = subcategories.find(sub => (sub.id || sub._id) === rideCostForm.subcategory);
    return selectedSubCategory ? selectedSubCategory.name : '';
  };

  const isFormParcelCategory = () => {
    return getSelectedCategoryName().toLowerCase() === 'parcel';
  };

  const isFormDriverCategory = () => {
    return getSelectedCategoryName().toLowerCase() === 'driver';
  };

  const isOutstationSubCategory = () => {
    return getSelectedSubCategoryName().toLowerCase() === 'outstation';
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Re-fetch ride costs whenever filters, page, or limit change
  useEffect(() => {
    fetchRideCosts();
  }, [currentPage, recordsPerPage, filterCategory, filterSubcategory, filterPriceCategory]);

  // Filter subcategories when category changes in form
  useEffect(() => {
    if (rideCostForm.category) {
      const filtered = subcategories.filter(sub => sub.categoryId === rideCostForm.category);
      setFilteredSubcategories(filtered);
      if (!isEditing) {
        setRideCostForm(prev => ({ ...prev, subcategory: '', subSubCategory: '', priceCategory: '' }));
      }
      setFilteredSubSubCategories([]);
      setFilteredPriceCategories([]);
    } else {
      setFilteredSubcategories([]);
      setFilteredSubSubCategories([]);
      setFilteredPriceCategories([]);
    }
  }, [rideCostForm.category, subcategories, isEditing]);

  // Filter sub-subcategories when subcategory changes in form
  useEffect(() => {
    if (rideCostForm.subcategory) {
      const filtered = subSubCategories.filter(subSub =>
        subSub.categoryId === rideCostForm.category &&
        subSub.subCategoryId === rideCostForm.subcategory
      );
      setFilteredSubSubCategories(filtered);
      if (!isEditing) {
        setRideCostForm(prev => ({ ...prev, subSubCategory: '', priceCategory: '' }));
      }

      // Show price categories if not outstation or if outstation and subSubCategory selected
      if (!isOutstationSubCategory()) {
        setFilteredPriceCategories(priceCategories);
        // Clear subSubCategory when switching away from outstation
        if (isEditing) {
          setRideCostForm(prev => ({ ...prev, subSubCategory: '' }));
        }
      } else {
        setFilteredPriceCategories([]);
      }
    } else {
      setFilteredSubSubCategories([]);
      setFilteredPriceCategories([]);
    }
  }, [rideCostForm.subcategory, subSubCategories, priceCategories, isEditing]);

  // Show price categories when sub-subcategory is selected for outstation
  useEffect(() => {
    if (rideCostForm.subSubCategory && isOutstationSubCategory()) {
      setFilteredPriceCategories(priceCategories);
      if (!isEditing) {
        setRideCostForm(prev => ({ ...prev, priceCategory: '' }));
      }
    }
  }, [rideCostForm.subSubCategory, priceCategories, isEditing]);

  // Fetch parcel vehicles when category is parcel
  useEffect(() => {
    if (isFormParcelCategory()) {
      fetchParcelVehicles();
    }
  }, [rideCostForm.category]);

  // Filter subcategories for filter dropdown
  useEffect(() => {
    if (filterCategory && filterCategory !== 'all') {
      const filtered = subcategories.filter(sub => sub.categoryId === filterCategory);
      setFilterSubcategoriesForFilter(filtered);
      setFilterSubcategory('all');
    } else {
      setFilterSubcategoriesForFilter([]);
      setFilterSubcategory('all');
    }
    setCurrentPage(1);
  }, [filterCategory, subcategories]);

  // Apply filters to ride costs — removed (now server-side)

  // Pagination logic — removed (now server-side)

  // Server-side totals from API response
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Fetch only ride costs (with filters + pagination) — called whenever filters/page change
  const fetchRideCosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: recordsPerPage.toString(),
        ...(filterCategory !== 'all' && { category: filterCategory }),
        ...(filterSubcategory !== 'all' && { subcategory: filterSubcategory }),
        ...(filterPriceCategory !== 'all' && { priceCategory: filterPriceCategory }),
      });
      const res = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/DriverRideCosts?${params}`);
      setRideCosts(res.data.data || []);
      setTotalRecords(res.data.totalRecords || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching ride costs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown data only once on mount
  const fetchData = async () => {
    try {
      const [categoriesRes, subcategoriesRes, subSubCategoriesRes, priceCategoriesRes] = await Promise.all([
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/price-categories`)
      ]);
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
      setSubSubCategories(subSubCategoriesRes.data);
      setPriceCategories(priceCategoriesRes.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchParcelVehicles = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/parcel-vehicles`);
      setParcelVehicles(response.data);
    } catch (error) {
      console.error('Error fetching parcel vehicles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      category: rideCostForm.category,
      subcategory: rideCostForm.subcategory,
      subSubCategory: rideCostForm.subSubCategory || null,
      priceCategory: rideCostForm.priceCategory,
      ...(isFormParcelCategory() && { weight: parseFloat(rideCostForm.weight) || 0 }),
      baseFare: parseFloat(rideCostForm.baseFare) || 0,
      includedKm: rideCostForm.includedKm.trim(),
      includedMinutes: rideCostForm.includedMinutes.trim(),
      extraChargePerKm: parseFloat(rideCostForm.extraChargePerKm) || 0,
      extraChargePerMinute: parseFloat(rideCostForm.extraChargePerMinute) || 0,
      pickCharges: parseFloat(rideCostForm.pickCharges) || 0,
      nightCharges: parseFloat(rideCostForm.nightCharges) || 0,
      cancellationFee: parseFloat(rideCostForm.cancellationFee) || 0,
      cancellationBufferTime: parseInt(rideCostForm.cancellationBufferTime) || 0,
      insurance: parseFloat(rideCostForm.insurance) || 0,
      extraChargesFromAdmin: parseFloat(rideCostForm.extraChargesFromAdmin) || 0,
      gst: parseFloat(rideCostForm.gst) || 0,
      discount: parseFloat(rideCostForm.discount) || 0,
      driverCancellationCharges: parseFloat(rideCostForm.driverCancellationCharges) || 0,
      driverCancellationCredits: parseFloat(rideCostForm.driverCancellationCredits) || 0
    };

    try {
      if (editingRideCost) {
        await apiClient.put(`${import.meta.env.VITE_API_URL}/api/DriverRideCosts/${editingRideCost._id}`, payload);
      } else {
        await apiClient.post(`${import.meta.env.VITE_API_URL}/api/DriverRideCosts`, payload);
      }

      await fetchData();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving ride cost:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (rideCost: RideCost) => {
    if (!rideCost._id) return;
    
    setIsEditing(true);
    setLoading(true);

    try {
      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL}/api/DriverRideCosts/${rideCost._id}`
      );
      const fetchedRideCost = response.data.data;

      setEditingRideCost(fetchedRideCost);

      const categoryId = extractId(fetchedRideCost.category);
      const subcategoryId = extractId(fetchedRideCost.subcategory);
      const subSubCategoryId = fetchedRideCost.subSubCategory ? extractId(fetchedRideCost.subSubCategory) : '';
      const priceCategoryId = extractId(fetchedRideCost.priceCategory);

      // Set filtered subcategories first
      const filteredSubs = subcategories.filter(sub => sub.categoryId === categoryId);
      setFilteredSubcategories(filteredSubs);

      // Set filtered sub-subcategories
      const filteredSubSubs = subSubCategories.filter(subSub =>
        subSub.categoryId === categoryId && subSub.subCategoryId === subcategoryId
      );
      setFilteredSubSubCategories(filteredSubSubs);

      // Set filtered price categories - show all when subcategory is selected
      setFilteredPriceCategories(priceCategories);

      setRideCostForm({
        category: categoryId,
        subcategory: subcategoryId,
        subSubCategory: subSubCategoryId,
        priceCategory: priceCategoryId,
        weight: fetchedRideCost.weight?.toString() || '',
        baseFare: fetchedRideCost.baseFare.toString(),
        includedKm: fetchedRideCost.includedKm || '',
        includedMinutes: fetchedRideCost.includedMinutes || '',
        extraChargePerKm: fetchedRideCost.extraChargePerKm.toString(),
        extraChargePerMinute: fetchedRideCost.extraChargePerMinute.toString(),
        pickCharges: fetchedRideCost.pickCharges.toString(),
        nightCharges: fetchedRideCost.nightCharges.toString(),
        cancellationFee: fetchedRideCost.cancellationFee.toString(),
        cancellationBufferTime: fetchedRideCost.cancellationBufferTime.toString(),
        insurance: fetchedRideCost.insurance.toString(),
        extraChargesFromAdmin: fetchedRideCost.extraChargesFromAdmin.toString(),
        gst: fetchedRideCost.gst.toString(),
        discount: fetchedRideCost.discount.toString(),
        driverCancellationCharges: fetchedRideCost.driverCancellationCharges?.toString() || '0',
        driverCancellationCredits: fetchedRideCost.driverCancellationCredits?.toString() || '0'
      });
      
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching ride cost:', error);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`${import.meta.env.VITE_API_URL}/api/DriverRideCosts/${id}/status`, {
        status: !currentStatus
      });
      await fetchRideCosts();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/DriverRideCosts/${id}`);
      await fetchRideCosts();
    } catch (error) {
      console.error('Error deleting ride cost:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingRideCost(null);
    setIsEditing(false);
    setRideCostForm({
      category: '',
      subcategory: '',
      subSubCategory: '',
      priceCategory: '',
      weight: '',
      baseFare: '',
      includedKm: '',
      includedMinutes: '',
      extraChargePerKm: '',
      extraChargePerMinute: '',
      pickCharges: '',
      nightCharges: '',
      cancellationFee: '',
      cancellationBufferTime: '',
      insurance: '',
      extraChargesFromAdmin: '',
      gst: '',
      discount: '',
      driverCancellationCharges: '',
      driverCancellationCredits: ''
    });
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterSubcategory('all');
    setFilterPriceCategory('all');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Fixed getName function with proper null checking
  const getName = (item: string | { name?: string; priceCategoryName?: string } | null | undefined): string => {
    // Handle null, undefined, or empty string cases
    if (!item || item === '') return 'Unknown';

    // Handle string case
    if (typeof item === 'string') return item;

    // Handle object case
    return item.name || item.priceCategoryName || 'Unknown';
  };

  // Helper function to format minutes display
  const formatMinutesDisplay = (minutes: string | number, subcategoryItem: string | { name?: string }) => {
    const minutesNum = typeof minutes === 'string' ? parseInt(minutes) : minutes;
    if (!isNaN(minutesNum) && minutesNum >= 60 && minutesNum % 60 === 0) {
      const hours = minutesNum / 60;
      if (hours >= 24 && hours % 24 === 0) {
        const days = hours / 24;
        return `${minutes} (${days}d)`;
      }
      return `${minutes} (${hours}h)`;
    }
    return minutes.toString();
  };

  // Download sample Excel file
  const handleDownloadSample = async () => {
    setSampleDownloading(true);
    try {
      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL}/api/DriverRideCosts/sample-excel`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'driver_packages_sample.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading sample file:', error);
    } finally {
      setSampleDownloading(false);
    }
  };

  // Export filtered records as Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        ...(filterCategory !== 'all' && { category: filterCategory }),
        ...(filterSubcategory !== 'all' && { subcategory: filterSubcategory }),
        ...(filterPriceCategory !== 'all' && { priceCategory: filterPriceCategory }),
      });
      const response = await apiClient.get(
        `${import.meta.env.VITE_API_URL}/api/DriverRideCosts/export?${params}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'driver_packages_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  // Bulk import handler
  const handleBulkImport = async () => {
    if (!bulkImportFile) return;
    setBulkImportLoading(true);
    setBulkImportErrors([]);
    setBulkImportSuccess(null);

    const formData = new FormData();
    formData.append('file', bulkImportFile);

    try {
      const response = await apiClient.post(
        `${import.meta.env.VITE_API_URL}/api/DriverRideCosts/bulk-import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setBulkImportSuccess(response.data.message);
      setBulkImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Refresh the list
      await fetchRideCosts();
    } catch (error: any) {
      const data = error?.response?.data;
      if (data && data.errors) {
        setBulkImportErrors(data.errors);
      } else {
        setBulkImportErrors([{
          row: 0,
          errors: [{ field: 'Server', value: '', message: data?.error || data?.message || 'Upload failed' }]
        }]);
      }
    } finally {
      setBulkImportLoading(false);
    }
  };

  const resetBulkImportDialog = () => {
    setBulkImportFile(null);
    setBulkImportErrors([]);
    setBulkImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Driver Packages</h1>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-red-600">***for monthly or weekly packages create package as per 1 day</h4>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-end mb-1">
          {/* Export Button */}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="mr-2"
          >
            {exporting ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>

          {/* Download Sample Button */}
          <Button
            variant="outline"
            onClick={handleDownloadSample}
            disabled={sampleDownloading}
            className="mr-2"
          >
            {sampleDownloading ? (
              <Loader className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download Sample
          </Button>

          {/* Bulk Import Button + Dialog */}
          <Dialog
            open={bulkImportDialogOpen}
            onOpenChange={(open) => {
              setBulkImportDialogOpen(open);
              if (!open) resetBulkImportDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="mr-2" disabled={loading}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import Driver Packages</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Instructions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Download the sample file first and fill in your data</li>
                    <li>Category, Subcategory, and Driver Category names must match exactly (case-insensitive) with the names in the system</li>
                    <li>Sub-Sub Category is required only when Subcategory is <strong>Outstation</strong></li>
                    <li>All numeric fields must be 0 or greater</li>
                    <li>All rows must be valid — even one error will reject the entire file</li>
                  </ul>
                </div>

                {/* File picker */}
                <div>
                  <label className="text-sm font-medium block mb-2">Select Excel File (.xlsx)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setBulkImportFile(file);
                      setBulkImportErrors([]);
                      setBulkImportSuccess(null);
                    }}
                    className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2"
                  />
                  {bulkImportFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: <span className="font-medium">{bulkImportFile.name}</span> ({(bulkImportFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                {/* Upload button */}
                <Button
                  onClick={handleBulkImport}
                  disabled={!bulkImportFile || bulkImportLoading}
                  className="w-full"
                >
                  {bulkImportLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Validating & Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Import
                    </>
                  )}
                </Button>

                {/* Success message */}
                {bulkImportSuccess && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-800 font-medium">
                    ✅ {bulkImportSuccess}
                  </div>
                )}

                {/* Error table */}
                {bulkImportErrors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-600 mb-2">
                      ❌ {bulkImportErrors.length} row(s) have errors. Fix them in the file and re-upload.
                    </p>
                    <div className="border border-red-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-red-700 w-16">Row #</th>
                            <th className="text-left px-3 py-2 font-semibold text-red-700 w-36">Field</th>
                            <th className="text-left px-3 py-2 font-semibold text-red-700 w-28">Your Value</th>
                            <th className="text-left px-3 py-2 font-semibold text-red-700">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkImportErrors.map((rowErr) =>
                            rowErr.errors.map((err, idx) => (
                              <tr
                                key={`${rowErr.row}-${idx}`}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50/40'}
                              >
                                {idx === 0 && (
                                  <td
                                    className="px-3 py-2 font-bold text-red-600 align-top"
                                    rowSpan={rowErr.errors.length}
                                  >
                                    {rowErr.row === 0 ? '—' : rowErr.row}
                                  </td>
                                )}
                                <td className="px-3 py-2 text-gray-700">{err.field}</td>
                                <td className="px-3 py-2 text-gray-500 italic">
                                  {err.value !== '' ? err.value : <span className="text-gray-300">(empty)</span>}
                                </td>
                                <td className="px-3 py-2 text-red-700">{err.message}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRideCost ? 'Edit' : 'Create'} Drive Package</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Category</label>
                    <Select
                      value={rideCostForm.category}
                      onValueChange={(value) => setRideCostForm(prev => ({ ...prev, category: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rideCostForm.category && !isFormDriverCategory() && (
                      <p className="text-red-500 text-sm mt-1">Only driver category is allowed</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">Subcategory</label>
                    <Select
                      value={rideCostForm.subcategory}
                      onValueChange={(value) => setRideCostForm(prev => ({ ...prev, subcategory: value }))}
                      disabled={!rideCostForm.category}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSubcategories.map((sub) => (
                          <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>



                  {/* Sub-Sub Category and Driver Category - Two column layout for outstation */}
                  {isOutstationSubCategory() && (
                    <div className="grid grid-cols-2 gap-4 col-span-2">
                      <div>
                        <label className="text-sm font-medium block mb-2">Sub-Sub Category</label>
                        <Select
                          value={rideCostForm.subSubCategory}
                          onValueChange={(value) => setRideCostForm(prev => ({ ...prev, subSubCategory: value }))}
                          disabled={!rideCostForm.subcategory}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sub-Sub Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubSubCategories.map((subSub) => (
                              <SelectItem key={subSub.id || subSub._id} value={subSub.id || subSub._id}>
                                {subSub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium block mb-2">{isFormParcelCategory() ? 'Parcel Vehicle' : 'Driver Category'}</label>
                        {isFormParcelCategory() ? (
                          <Select
                            value={rideCostForm.priceCategory}
                            onValueChange={(value) => setRideCostForm(prev => ({ ...prev, priceCategory: value }))}
                            disabled={!rideCostForm.subcategory || (isOutstationSubCategory() && !rideCostForm.subSubCategory)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Parcel Vehicle" />
                            </SelectTrigger>
                            <SelectContent>
                              {parcelVehicles.map((vehicle) => (
                                <SelectItem key={vehicle._id} value={vehicle._id}>
                                  {vehicle.vehicleName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={rideCostForm.priceCategory}
                            onValueChange={(value) => setRideCostForm(prev => ({ ...prev, priceCategory: value }))}
                            disabled={!rideCostForm.subcategory || (isOutstationSubCategory() && !rideCostForm.subSubCategory)}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Driver Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredPriceCategories.map((pc) => (
                                <SelectItem key={pc._id} value={pc._id}>
                                  {pc.priceCategoryName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* For non-outstation subcategories, show only the driver category dropdown spanning 2 columns */}
                  {!isOutstationSubCategory() && rideCostForm.subcategory && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium block mb-2">{isFormParcelCategory() ? 'Parcel Vehicle' : 'Driver Category'}</label>
                      {isFormParcelCategory() ? (
                        <Select
                          value={rideCostForm.priceCategory}
                          onValueChange={(value) => setRideCostForm(prev => ({ ...prev, priceCategory: value }))}
                          disabled={!rideCostForm.subcategory}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Parcel Vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {parcelVehicles.map((vehicle) => (
                              <SelectItem key={vehicle._id} value={vehicle._id}>
                                {vehicle.vehicleName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={rideCostForm.priceCategory}
                          onValueChange={(value) => setRideCostForm(prev => ({ ...prev, priceCategory: value }))}
                          disabled={!rideCostForm.subcategory}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Driver Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPriceCategories.map((pc) => (
                              <SelectItem key={pc._id} value={pc._id}>
                                {pc.priceCategoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                  {isFormParcelCategory() && (
                    <div>
                      <label className="text-sm font-medium block mb-2">Weight (kg)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Weight (kg)"
                        value={rideCostForm.weight}
                        onChange={(e) => setRideCostForm(prev => ({ ...prev, weight: e.target.value }))}
                        required
                      />
                    </div>
                  )}


                  <div>
                    <label className="text-sm font-medium block mb-2">Base Fare (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Base Fare (₹)"
                      value={rideCostForm.baseFare}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, baseFare: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Included KM</label>
                    <Input
                      type="text"
                      placeholder="Included KM (e.g., 10 km, Unlimited)"
                      value={rideCostForm.includedKm}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, includedKm: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Included Minutes</label>
                    <Input
                      type="text"
                      placeholder="Included Minutes (e.g., 60 min, Unlimited)"
                      value={rideCostForm.includedMinutes}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, includedMinutes: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Extra Charge per KM (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Extra Charge per KM (₹)"
                      value={rideCostForm.extraChargePerKm}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargePerKm: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Extra Charge per Minute (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Extra Charge per Minute (₹)"
                      value={rideCostForm.extraChargePerMinute}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargePerMinute: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Pick Charges</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Pick Charges"
                      value={rideCostForm.pickCharges}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, pickCharges: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Night Charges</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Night Charges"
                      value={rideCostForm.nightCharges}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, nightCharges: e.target.value }))}
                    />
                  </div>
                <div>
                    <label className="text-sm font-medium block mb-2">User Cancellation Charges</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="User Cancellation Charges"
                      value={rideCostForm.cancellationFee}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, cancellationFee: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Cancellation Buffer Time (minutes)</label>
                    <Input
                      type="number"
                      placeholder="Cancellation Buffer Time (minutes)"
                      value={rideCostForm.cancellationBufferTime}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, cancellationBufferTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Insurance</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Insurance"
                      value={rideCostForm.insurance}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, insurance: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Admin Commission %</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Admin Commission %"
                      value={rideCostForm.extraChargesFromAdmin}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargesFromAdmin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">GST %</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="GST %"
                      value={rideCostForm.gst}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, gst: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Discount</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Discount"
                      value={rideCostForm.discount}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, discount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Driver Cancellation Charges</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Driver Cancellation Charges"
                      value={rideCostForm.driverCancellationCharges}
                      onChange={(e) => setRideCostForm(prev => ({ ...prev, driverCancellationCharges: e.target.value }))}
                    />
                  </div>
                 
                </div>
                <Button type="submit" className="w-full" disabled={loading || (rideCostForm.category && !isFormDriverCategory())}>
                  {loading ? 'Saving...' : editingRideCost ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Category
              </label>
              <div>
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filterCategory && filterCategory !== 'all' && (() => {
                  const selectedCategory = categories.find(cat => cat._id === filterCategory);
                  return selectedCategory && selectedCategory.name.toLowerCase() !== 'driver' && (
                    <p className="text-red-500 text-sm mt-1">Only driver category is allowed</p>
                  );
                })()}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Subcategory
              </label>
              <Select
                value={filterSubcategory}
                onValueChange={setFilterSubcategory}
                disabled={!filterCategory || filterCategory === 'all'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {filterSubcategoriesForFilter.map((sub) => (
                    <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Driver Category
              </label>
              <Select
                value={filterPriceCategory}
                onValueChange={setFilterPriceCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Driver Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Driver Categories</SelectItem>
                  {priceCategories.map((pc) => (
                    <SelectItem key={pc._id} value={pc._id}>
                      {pc.priceCategoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-end">
              {((filterCategory && filterCategory !== 'all') || (filterSubcategory && filterSubcategory !== 'all') || (filterPriceCategory && filterPriceCategory !== 'all')) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear Filters
                </Button>
              ) : (
                <div className="text-sm text-gray-600">
                  Showing {startRecord}-{endRecord} of {totalRecords}
                </div>
              )}
            </div>
          </div>
        </div>

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

        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Sub-Sub Category</TableHead>
                <TableHead>Driver Category</TableHead>
                <TableHead>Base Fare</TableHead>
                <TableHead>Incl. KM</TableHead>
                <TableHead>Incl. Min</TableHead>
                <TableHead>Extra/Km</TableHead>
                <TableHead>Extra/Min</TableHead>
                {/* Show Weight column header if any ride cost is from parcel category */}
                {rideCosts.some(rideCost => isParcelCategory(rideCost.category)) && (
                  <TableHead>Weight (kg)</TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={rideCosts.some(rideCost => isParcelCategory(rideCost.category)) ? 12 : 11} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading driver ride costs...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rideCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={rideCosts.some(rideCost => isParcelCategory(rideCost.category)) ? 12 : 11} className="text-center py-6">
                    {rideCosts.length === 0
                      ? "No ride cost models found. Create your first one!"
                      : "No models match the selected filters."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                rideCosts.map((rideCost, index) => (
                  <TableRow key={rideCost._id}>
                    <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                    <TableCell>{getName(rideCost.category)}</TableCell>
                    <TableCell>{getName(rideCost.subcategory)}</TableCell>
                    <TableCell>{rideCost.subSubCategory ? getName(rideCost.subSubCategory) : '-'}</TableCell>
                    <TableCell>{getName(rideCost.priceCategory)}</TableCell>
                    <TableCell>₹{rideCost.baseFare}</TableCell>
                    <TableCell>{rideCost.includedKm}</TableCell>
                    <TableCell>{formatMinutesDisplay(rideCost.includedMinutes, rideCost.subcategory)}</TableCell>
                    <TableCell>₹{rideCost.extraChargePerKm}</TableCell>
                    <TableCell>₹{rideCost.extraChargePerMinute}</TableCell>
                    {/* Show Weight column data if any ride cost is from parcel category */}
                    {rideCosts.some(rc => isParcelCategory(rc.category)) && (
                      <TableCell>
                        {isParcelCategory(rideCost.category) ? `${rideCost.weight || 0} kg` : '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      <Switch
                        checked={rideCost.status ?? true}
                        onCheckedChange={() => handleStatusToggle(rideCost._id!, rideCost.status ?? true)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingRideCost(rideCost);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rideCost)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={loading}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the ride cost model.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rideCost._id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination Controls */}
        {totalRecords > 0 && (
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

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>View Drive Package</DialogTitle>
            </DialogHeader>
            {viewingRideCost && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-gray-600">{getName(viewingRideCost.category)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Subcategory</label>
                  <p className="text-sm text-gray-600">{getName(viewingRideCost.subcategory)}</p>
                </div>
                {viewingRideCost.subSubCategory && (
                  <div>
                    <label className="text-sm font-medium">Sub-Sub Category</label>
                    <p className="text-sm text-gray-600">{getName(viewingRideCost.subSubCategory)}</p>
                  </div>
                )}
                <div className={viewingRideCost.subSubCategory ? "" : "col-span-2"}>
                  <label className="text-sm font-medium">Driver Category</label>
                  <p className="text-sm text-gray-600">{getName(viewingRideCost.priceCategory)}</p>
                </div>
                {isParcelCategory(viewingRideCost.category) && (
                  <div>
                    <label className="text-sm font-medium">Weight</label>
                    <p className="text-sm text-gray-600">{viewingRideCost.weight || 0} kg</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Base Fare</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.baseFare}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Included KM</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.includedKm}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Included Minutes</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.includedMinutes}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Extra Charge per KM</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.extraChargePerKm}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Extra Charge per Minute</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.extraChargePerMinute}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Pick Charges</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.pickCharges}</p>
                </div>
              <div>
                  <label className="text-sm font-medium">Night Charges</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.nightCharges}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">User Cancellation Charges</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.cancellationFee}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">User Cancellation Buffer Time</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.cancellationBufferTime} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Insurance</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.insurance}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Commission</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.extraChargesFromAdmin}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">GST</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.gst}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Discount</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.discount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Driver Cancellation Charges</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.driverCancellationCharges || 0}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};

export default DriverRideCostPage;