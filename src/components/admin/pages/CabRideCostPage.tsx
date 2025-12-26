import React, { useEffect, useState } from 'react';
import apiClient from '../../../lib/axiosInterceptor';
import { Plus, Edit, Trash2, Eye, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface CarCategory {
    _id: string;
    name: string;
}

interface Car {
    _id: string;
    name: string;
    category: {
        _id: string;
        name: string;
    };
}

interface SubSubCategory {
    _id?: string;
    id?: string;
    name: string;
    categoryId: string;
    subCategoryId: string;
}

export const CabRideCostPage = () => {
    const [rideCosts, setRideCosts] = useState<RideCost[]>([]);
    const [filteredRideCosts, setFilteredRideCosts] = useState<RideCost[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
    const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
    const [parcelVehicles, setParcelVehicles] = useState<ParcelVehicle[]>([]);
    const [carCategories, setCarCategories] = useState<CarCategory[]>([]);
    const [cars, setCars] = useState<Car[]>([]);
    const [filteredCars, setFilteredCars] = useState<Car[]>([]);
    const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
    const [filteredSubSubCategories, setFilteredSubSubCategories] = useState<SubSubCategory[]>([]);
    const [filteredPriceCategories, setFilteredPriceCategories] = useState<PriceCategory[]>([]);

    // Filter states
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
    const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState<Subcategory[]>([]);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [paginatedRideCosts, setPaginatedRideCosts] = useState<RideCost[]>([]);

    const [rideCostForm, setRideCostForm] = useState({
        category: '',
        subcategory: '',
        subSubCategory: '',
        priceCategory: '',
        car: '',
        weight: '',
        baseFare: '',
        includedKm: '',
        includedMinutes: '',
        extraChargePerKm: '',
        extraChargePerMinute: '',
        pickCharges: '',
        nightCharges: '',
        cancellationBufferTime: '', cancellationFee: '',
        insurance: '',
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

    const isFormCabCategory = () => {
        return getSelectedCategoryName().toLowerCase() === 'cab';
    };

    const isOutstationSubCategory = () => {
        return getSelectedSubCategoryName().toLowerCase() === 'outstation';
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter subcategories when category changes in form
    useEffect(() => {
        if (rideCostForm.category) {
            const filtered = subcategories.filter(sub => sub.categoryId === rideCostForm.category);
            setFilteredSubcategories(filtered);
            if (!isEditing) {
                setRideCostForm(prev => ({ ...prev, subcategory: '', subSubCategory: '', priceCategory: '', car: '' }));
            }
            setFilteredSubSubCategories([]);
            setFilteredPriceCategories([]);
            setFilteredCars([]);
        } else {
            setFilteredSubcategories([]);
            setFilteredSubSubCategories([]);
            setFilteredPriceCategories([]);
            setFilteredCars([]);
        }
    }, [rideCostForm.category, subcategories, isEditing]);

    // Filter cars when cab category changes
    useEffect(() => {
        if (rideCostForm.priceCategory) {
            const filtered = cars.filter(car => car.category._id === rideCostForm.priceCategory);
            setFilteredCars(filtered);
            if (!isEditing) {
                setRideCostForm(prev => ({ ...prev, car: '' }));
            }
        } else {
            setFilteredCars([]);
        }
    }, [rideCostForm.priceCategory, cars, isEditing]);

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
    }, [filterCategory, subcategories]);

    // Apply filters to ride costs
    useEffect(() => {
        let filtered = [...rideCosts];

        if (filterCategory && filterCategory !== 'all') {
            filtered = filtered.filter(rideCost => {
                const categoryId = extractId(rideCost.category);
                return categoryId === filterCategory;
            });
        }

        if (filterSubcategory && filterSubcategory !== 'all') {
            filtered = filtered.filter(rideCost => {
                const subcategoryId = extractId(rideCost.subcategory);
                return subcategoryId === filterSubcategory;
            });
        }

        setFilteredRideCosts(filtered);
        setCurrentPage(1); // Reset to first page when filters change
    }, [rideCosts, filterCategory, filterSubcategory]);

    // Pagination logic
    useEffect(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        setPaginatedRideCosts(filteredRideCosts.slice(startIndex, endIndex));
    }, [filteredRideCosts, currentPage, recordsPerPage]);

    // Calculate pagination info
    const totalPages = Math.ceil(filteredRideCosts.length / recordsPerPage);
    const startRecord = filteredRideCosts.length === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
    const endRecord = Math.min(currentPage * recordsPerPage, filteredRideCosts.length);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rideCostsRes, categoriesRes, subcategoriesRes, subSubCategoriesRes, carCategoriesRes, carsRes] = await Promise.all([
                apiClient.get(`${import.meta.env.VITE_API_URL}/api/CabRideCosts`),
                apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`),
                apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`),
                apiClient.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`),

                apiClient.get(`${import.meta.env.VITE_API_URL}/api/car-categories`),
                apiClient.get(`${import.meta.env.VITE_API_URL}/api/cars`)
            ]);

            setRideCosts(rideCostsRes.data.data || rideCostsRes.data);
            setCategories(categoriesRes.data);
            setSubcategories(subcategoriesRes.data);
            console.log('subcategoriesRes.data:', subcategoriesRes.data);
            setSubSubCategories(subSubCategoriesRes.data);
            console.log('subSubCategoriesRes.data:', subSubCategoriesRes.data);

            setCarCategories(carCategoriesRes.data.filter((cat: CarCategory & { status: boolean }) => cat.status));
            console.log('carCategoriesRes.data:', carCategoriesRes.data);
            setCars(carsRes.data.filter((car: Car & { status: boolean }) => car.status));
            console.log('carsRes.data:', carsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
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
            car: rideCostForm.car,
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
                await apiClient.put(`${import.meta.env.VITE_API_URL}/api/CabRideCosts/${editingRideCost._id}`, payload);
            } else {
                await apiClient.post(`${import.meta.env.VITE_API_URL}/api/CabRideCosts`, payload);
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
                `${import.meta.env.VITE_API_URL}/api/CabRideCosts/${rideCost._id}`
            );
            const fetchedRideCost = response.data.data;
            console.log('Fetched Ride Cost for Edit:', fetchedRideCost);
            setEditingRideCost(fetchedRideCost);

            const categoryId = extractId(fetchedRideCost.category);
            const subcategoryId = extractId(fetchedRideCost.subcategory);
            const subSubCategoryId = fetchedRideCost.subSubCategory ? extractId(fetchedRideCost.subSubCategory) : '';
            const priceCategoryId = fetchedRideCost.priceCategory ? extractId(fetchedRideCost.priceCategory) : '';

            console.log('categoryId:', categoryId, 'subcategoryId:', subcategoryId, 'subSubCategoryId:', subSubCategoryId, 'priceCategoryId:', priceCategoryId);

            // Set filtered subcategories first
            const filteredSubs = subcategories.filter(sub => sub.categoryId === categoryId);
            setFilteredSubcategories(filteredSubs);
            console.log('Filtered Subcategories:', filteredSubs);
            // Set filtered sub-subcategories
            const filteredSubSubs = subSubCategories.filter(subSub =>
                subSub.categoryId === categoryId && subSub.subCategoryId === subcategoryId
            );
            setFilteredSubSubCategories(filteredSubSubs);
            console.log('Filtered Sub-Subcategories:', filteredSubSubs);
            // Set filtered price categories - show all when subcategory is selected
            setFilteredPriceCategories(priceCategories);

            console.log('category:', categoryId,
                'subcategory:', subcategoryId,
                'subSubCategory:', subSubCategoryId,
                'priceCategory:', priceCategoryId,
                'car:', fetchedRideCost.car ? extractId(fetchedRideCost.car) : '',)
            setRideCostForm({
                category: categoryId,
                subcategory: subcategoryId,
                subSubCategory: subSubCategoryId,
                priceCategory: priceCategoryId,
                car: fetchedRideCost.car ? extractId(fetchedRideCost.car) : '',
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
            await apiClient.patch(`${import.meta.env.VITE_API_URL}/api/CabRideCosts/${id}/status`, {
                status: !currentStatus
            });
            await fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        setLoading(true);
        try {
            await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/CabRideCosts/${id}`);
            await fetchData();
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
            car: '',
            weight: '',
            baseFare: '',
            includedKm: '',
            includedMinutes: '',
            extraChargePerKm: '',
            extraChargePerMinute: '',
            pickCharges: '',
            cancellationBufferTime: '', nightCharges: '',
            cancellationFee: '',
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

    // Helper function to format minutes display for hourly subcategory
    const formatMinutesDisplay = (minutes: string | number, subcategoryItem: string | { name?: string }) => {
        const subcategoryName = getName(subcategoryItem);
        if (subcategoryName.toLowerCase() === 'hourly') {
            const minutesNum = typeof minutes === 'string' ? parseInt(minutes) : minutes;
            if (!isNaN(minutesNum) && minutesNum >= 60 && minutesNum % 60 === 0) {
                const hours = minutesNum / 60;
                return `${minutes} (${hours}h)`;
            }
        }
        return minutes.toString();
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Cab Ride Cost Management</h1>
            </div>

            <div className="flex items-center justify-between">
                <h4 className="text-red-600">***for monthly or weekly packages add basefare as per 1 day</h4>
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-end mb-1">
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm} disabled={loading}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Model
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingRideCost ? 'Edit' : 'Create'} Ride Cost Model</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
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
                                        {rideCostForm.category && !isFormCabCategory() && (
                                            <p className="text-red-500 text-sm mt-1">Only cab category is allowed</p>
                                        )}
                                    </div>

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



                                    {/* Sub-Sub Category and Driver Category - Two column layout for outstation */}
                                    {isOutstationSubCategory() && (
                                        <div className="grid grid-cols-2 gap-4 col-span-2">
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
                                                        <SelectValue placeholder="Select Cab Category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {carCategories.map((cc) => (
                                                            <SelectItem key={cc._id} value={cc._id}>
                                                                {cc.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {/* Car dropdown for outstation */}
                                            {isFormCabCategory() && rideCostForm.priceCategory && (
                                                <Select
                                                    value={rideCostForm.car}
                                                    onValueChange={(value) => setRideCostForm(prev => ({ ...prev, car: value }))}
                                                    disabled={!rideCostForm.priceCategory}
                                                    required
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Car" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {filteredCars.map((car) => (
                                                            <SelectItem key={car._id} value={car._id}>
                                                                {car.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    )}

                                    {/* For non-outstation subcategories, show only the driver category dropdown spanning 2 columns */}
                                    {!isOutstationSubCategory() && rideCostForm.subcategory && (
                                        <div className="col-span-2">
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
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Select
                                                        value={rideCostForm.priceCategory}
                                                        onValueChange={(value) => setRideCostForm(prev => ({ ...prev, priceCategory: value }))}
                                                        disabled={!rideCostForm.subcategory}
                                                        required
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Cab Category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {carCategories.map((cc) => (
                                                                <SelectItem key={cc._id} value={cc._id}>
                                                                    {cc.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {/* Car dropdown for non-outstation */}
                                                    {isFormCabCategory() && rideCostForm.priceCategory && (
                                                        <Select
                                                            value={rideCostForm.car}
                                                            onValueChange={(value) => setRideCostForm(prev => ({ ...prev, car: value }))}
                                                            disabled={!rideCostForm.priceCategory}
                                                            required
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Car" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {filteredCars.map((car) => (
                                                                    <SelectItem key={car._id} value={car._id}>
                                                                        {car.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isFormParcelCategory() && (
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Weight (kg)"
                                            value={rideCostForm.weight}
                                            onChange={(e) => setRideCostForm(prev => ({ ...prev, weight: e.target.value }))}
                                            required
                                        />
                                    )}


                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Base Fare (₹)"
                                        value={rideCostForm.baseFare}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, baseFare: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Included KM (e.g., 10 km, Unlimited)"
                                        value={rideCostForm.includedKm}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, includedKm: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Included Minutes (e.g., 60 min, Unlimited)"
                                        value={rideCostForm.includedMinutes}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, includedMinutes: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Extra Charge per KM (₹)"
                                        value={rideCostForm.extraChargePerKm}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargePerKm: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Extra Charge per Minute (₹)"
                                        value={rideCostForm.extraChargePerMinute}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargePerMinute: e.target.value }))}
                                        required
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Pick Charges"
                                        value={rideCostForm.pickCharges}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, pickCharges: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Night Charges"
                                        value={rideCostForm.nightCharges}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, nightCharges: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Cancellation Fee"
                                        value={rideCostForm.cancellationFee}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, cancellationFee: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Cancellation Buffer Time (minutes)"
                                        value={rideCostForm.cancellationBufferTime}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, cancellationBufferTime: e.target.value }))}
                                    />

                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Insurance"
                                        value={rideCostForm.insurance}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, insurance: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Admin Commission %"
                                        value={rideCostForm.extraChargesFromAdmin}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargesFromAdmin: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="GST %"
                                        value={rideCostForm.gst}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, gst: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Discount"
                                        value={rideCostForm.discount}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, discount: e.target.value }))}
                                    />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Driver Cancellation Charges"
                                        value={rideCostForm.driverCancellationCharges}
                                        onChange={(e) => setRideCostForm(prev => ({ ...prev, driverCancellationCharges: e.target.value }))}
                                    />

                                </div>
                                <Button type="submit" className="w-full" disabled={loading || (rideCostForm.category && !isFormCabCategory())}>
                                    {loading ? 'Saving...' : editingRideCost ? 'Update' : 'Create'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filter Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        {(filterCategory && filterCategory !== 'all') || (filterSubcategory && filterSubcategory !== 'all') && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="text-xs"
                            >
                                <X className="w-3 h-3 mr-1" />
                                Clear Filters
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                    return selectedCategory && selectedCategory.name.toLowerCase() !== 'cab' && (
                                        <p className="text-red-500 text-sm mt-1">Only cab category is allowed</p>
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

                        <div className="flex items-end">
                            <div className="text-sm text-gray-600">
                                Showing {startRecord}-{endRecord} of {filteredRideCosts.length} models
                            </div>
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
                                <TableHead>Cab Category</TableHead>
                                <TableHead>Car</TableHead>
                                <TableHead>Base Fare</TableHead>
                                <TableHead>Incl. KM</TableHead>
                                <TableHead>Incl. Min</TableHead>
                                <TableHead>Extra/Km</TableHead>
                                <TableHead>Extra/Min</TableHead>
                                {/* Show Weight column header if any filtered ride cost is from parcel category */}
                                {filteredRideCosts.some(rideCost => isParcelCategory(rideCost.category)) && (
                                    <TableHead>Weight (kg)</TableHead>
                                )}
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={filteredRideCosts.some(rideCost => isParcelCategory(rideCost.category)) ? 13 : 12} className="text-center py-8">
                                        <div className="flex justify-center items-center">
                                            <Loader className="w-6 h-6 animate-spin mr-2" />
                                            <span>Loading cab ride costs...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredRideCosts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={filteredRideCosts.some(rideCost => isParcelCategory(rideCost.category)) ? 13 : 12} className="text-center py-6">
                                        {rideCosts.length === 0
                                            ? "No ride cost models found. Create your first one!"
                                            : "No models match the selected filters."
                                        }
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRideCosts.map((rideCost, index) => (
                                    <TableRow key={rideCost._id}>
                                        <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                                        <TableCell>{getName(rideCost.category)}</TableCell>
                                        <TableCell>{getName(rideCost.subcategory)}</TableCell>
                                        <TableCell>{rideCost.subSubCategory ? getName(rideCost.subSubCategory) : '-'}</TableCell>
                                        <TableCell>{getName(rideCost.priceCategory)}</TableCell>
                                        <TableCell>{rideCost.car ? getName(rideCost.car) : '-'}</TableCell>
                                        <TableCell>₹{rideCost.baseFare}</TableCell>
                                        <TableCell>{rideCost.includedKm}</TableCell>
                                        <TableCell>{formatMinutesDisplay(rideCost.includedMinutes, rideCost.subcategory)}</TableCell>
                                        <TableCell>₹{rideCost.extraChargePerKm}</TableCell>
                                        <TableCell>₹{rideCost.extraChargePerMinute}</TableCell>
                                        {/* Show Weight column data if any filtered ride cost is from parcel category */}
                                        {filteredRideCosts.some(rc => isParcelCategory(rc.category)) && (
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
                {filteredRideCosts.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-600">
                            Showing {startRecord} to {endRecord} of {filteredRideCosts.length} entries
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
                            <DialogTitle>View Ride Cost Model</DialogTitle>
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
                                <div>
                                    <label className="text-sm font-medium">Cab Category</label>
                                    <p className="text-sm text-gray-600">{getName(viewingRideCost.priceCategory)}</p>
                                </div>
                                <div className={viewingRideCost.subSubCategory ? "" : "col-span-1"}>
                                    <label className="text-sm font-medium">Car</label>
                                    <p className="text-sm text-gray-600">{viewingRideCost.car ? getName(viewingRideCost.car) : '-'}</p>
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
                                    <label className="text-sm font-medium">Cancellation Fee</label>
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