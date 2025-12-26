import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DeleteConfirmation } from "@/components/ui/delete-confirmation";
import apiClient from '../../../lib/axiosInterceptor';

const API_URL = import.meta.env.VITE_API_URL;

interface Instruction {
  _id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  subSubCategoryId?: string;
  subSubCategoryName?: string;
  driverCategoryId?: string;
  driverCategoryName?: string;
  carCategoryId?: string;
  carCategoryName?: string;
  carId?: string;
  carName?: string;
  parcelCategoryId?: string;
  parcelCategoryName?: string;
  vehicleTypeId?: string;
  vehicleTypeName?: string;
  instructions: string;
}

interface Category {
  _id: string;
  name: string;
}

interface SubCategory {
  _id: string;
  name: string;
  categoryId: string;
}

interface SubSubCategory {
  id: string;
  name: string;
  categoryId: string;
  subCategoryId: string;
}

interface DriverCategory {
  _id: string;
  priceCategoryName: string;
  chargePerKm: number;
  chargePerMinute: number;
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

interface ParcelVehicleType {
  _id: string;
  parcelCategory: {
    _id: string;
    categoryName: string;
    description: string;
  };
  name: string;
  description: string;
  weight: number;
}

export const InstructionsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedDriverCategory, setSelectedDriverCategory] = useState("");
  const [selectedCarCategory, setSelectedCarCategory] = useState("");
  const [selectedCar, setSelectedCar] = useState("");
  const [selectedVehicleType, setSelectedVehicleType] = useState("");
  const [selectedParcelCategory, setSelectedParcelCategory] = useState("");
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState("");
  const [instructions, setInstructions] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [paginatedInstructions, setPaginatedInstructions] = useState([]);

  const queryClient = useQueryClient();

  // Fetch instructions
  const { data: instructionsData = [], isLoading } = useQuery({
    queryKey: ["instructions"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/instructions`);
      return response.data.data || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      return response.data || [];
    },
  });

  // Fetch subcategories
  const { data: subCategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);
      return response.data || [];
    },
  });

  // Fetch driver categories (price categories) - only when selected category is 'driver'
  const { data: driverCategories = [] } = useQuery({
    queryKey: ["driver-categories", selectedCategory],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/price-categories`);
      return response.data || [];
    },
    enabled: !!selectedCategory && Array.isArray(categories) && categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'driver',
  });

  // Fetch car categories - only when selected category is 'cab'
  const { data: carCategories = [] } = useQuery({
    queryKey: ["car-categories", selectedCategory],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/car-categories`);
      return response.data || [];
    },
    enabled: !!selectedCategory && Array.isArray(categories) && categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'cab',
  });

  // Fetch cars - only when selected category is 'cab'
  const { data: cars = [] } = useQuery({
    queryKey: ["cars", selectedCategory],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/cars`);
      return response.data || [];
    },
    enabled: !!selectedCategory && Array.isArray(categories) && categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'cab',
  });

  // Fetch parcel vehicle types - only when selected category is 'parcel'
  const { data: parcelVehicleTypes = [] } = useQuery({
    queryKey: ["parcel-vehicle-types", selectedCategory],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/parcelVehicles`);
      return response.data || [];
    },
    enabled: !!selectedCategory && Array.isArray(categories) && categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'parcel',
  });

  // Filter subcategories based on selected category
  const filteredSubCategories = Array.isArray(subCategories) ? subCategories.filter(
    (sub: SubCategory) => sub.categoryId === selectedCategory
  ) : [];

  console.log("All subcategories:", subCategories);
  console.log("Filtered subcategories:", filteredSubCategories);

  // Fetch subSubCategories - only when subcategory is 'outstation' and category is 'driver' or 'cab'
  const { data: subSubCategories = [] } = useQuery({
    queryKey: ["subsubcategories", selectedSubCategory],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`);
      return response.data || [];
    },
    enabled: !!selectedSubCategory && 
      subCategories.find(sub => (sub._id || sub.id) === selectedSubCategory)?.name?.toLowerCase() === 'outstation' &&
      (categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'driver' ||
       categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'cab'),
  });

  // Filter cars based on selected car category
  const filteredCars = Array.isArray(cars) ? cars.filter(
    (car: Car) => car.category._id === selectedCarCategory
  ) : [];

  // Get unique parcel categories
  const uniqueParcelCategories = Array.isArray(parcelVehicleTypes) ? parcelVehicleTypes.reduce((acc: any[], current: ParcelVehicleType) => {
    const exists = acc.find(item => item._id === current.parcelCategory._id);
    if (!exists) {
      acc.push(current.parcelCategory);
    }
    return acc;
  }, []) : [];

  // Filter vehicle types based on selected parcel category
  const filteredVehicleTypes = Array.isArray(parcelVehicleTypes) ? parcelVehicleTypes.filter(
    (vt: ParcelVehicleType) => vt.parcelCategory._id === selectedParcelCategory
  ) : [];

  // Filter subSubCategories based on selected subcategory
  const filteredSubSubCategories = Array.isArray(subSubCategories) ? subSubCategories.filter(
    (subSub: SubSubCategory) => subSub.subCategoryId === selectedSubCategory
  ) : [];

  // Console logs for debugging
  console.log("Selected subcategory ID:", selectedSubCategory);
  console.log("All subSubCategories:", subSubCategories);
  console.log("Filtered subSubCategories:", filteredSubSubCategories);

  // Reset subcategory when category changes or when filtered subcategories don't include current selection
  useEffect(() => {
    if (selectedSubCategory && Array.isArray(filteredSubCategories) && !filteredSubCategories.some((sub: SubCategory) => sub._id === selectedSubCategory)) {
      // setSelectedSubCategory("");
    }
  }, [selectedCategory, filteredSubCategories, selectedSubCategory]);

  // Create instruction mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/instructions`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructions"] });
      toast({ title: "Success", description: "Instruction added successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add instruction",
        variant: "destructive"
      });
    },
  });

  // Update instruction mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`${import.meta.env.VITE_API_URL}/api/instructions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructions"] });
      toast({ title: "Success", description: "Instruction updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update instruction",
        variant: "destructive"
      });
    },
  });

  // Delete instruction mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/instructions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructions"] });
      toast({ title: "Success", description: "Instruction deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete instruction",
        variant: "destructive"
      });
    },
  });

  const resetForm = () => {
    setSelectedCategory("");
    setSelectedSubCategory("");
    setSelectedSubSubCategory("");
    setSelectedDriverCategory("");
    setSelectedCarCategory("");
    setSelectedCar("");
    setSelectedVehicleType("");
    setSelectedParcelCategory("");
    setInstructions("");
    setEditingInstruction(null);
  };

  const handleSubmit = () => {
    const selectedCategoryName = categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase();
    
    // Validation based on category type
    if (!selectedCategory || !selectedSubCategory || !instructions.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (selectedCategoryName === 'driver' && !selectedDriverCategory) {
      toast({
        title: "Error",
        description: "Please select a driver category",
        variant: "destructive"
      });
      return;
    }

    if (selectedCategoryName === 'cab' && (!selectedCarCategory || !selectedCar)) {
      toast({
        title: "Error",
        description: "Please select car category and car",
        variant: "destructive"
      });
      return;
    }

    if (selectedCategoryName === 'parcel' && (!selectedParcelCategory || !selectedVehicleType)) {
      toast({
        title: "Error",
        description: "Please select driver category and vehicle type",
        variant: "destructive"
      });
      return;
    }

    const categoryName = categories.find((cat: Category) => cat._id === selectedCategory)?.name || "";
    const subCategoryName = subCategories.find((sub: SubCategory) => sub._id === selectedSubCategory)?.name || "";
    
    let data: any = {
      categoryId: selectedCategory,
      categoryName,
      subCategoryId: selectedSubCategory,
      subCategoryName,
      instructions: instructions.trim(),
    };

    // Add subSubCategory if selected
    if (selectedSubSubCategory) {
      const subSubCategoryName = filteredSubSubCategories.find((subSub: SubSubCategory) => subSub.id === selectedSubSubCategory)?.name || "";
      data.subSubCategoryId = selectedSubSubCategory;
      data.subSubCategoryName = subSubCategoryName;
    }

    // Add driver category data if category is 'driver'
    if (selectedCategoryName === 'driver') {
      const driverCategoryName = driverCategories.find((driver: DriverCategory) => driver._id === selectedDriverCategory)?.priceCategoryName || "";
      data.driverCategoryId = selectedDriverCategory;
      data.driverCategoryName = driverCategoryName;
    }

    // Add parcel vehicle type data if category is 'parcel'
    if (selectedCategoryName === 'parcel') {
      const parcelCategory = uniqueParcelCategories.find(pc => pc._id === selectedParcelCategory);
      const vehicleType = parcelVehicleTypes.find((vt: ParcelVehicleType) => vt._id === selectedVehicleType);
      data.driverCategoryId = selectedParcelCategory;
      data.driverCategoryName = parcelCategory?.categoryName || "";
      data.vehicleTypeId = selectedVehicleType;
      data.vehicleTypeName = vehicleType?.name || "";
    }

    // Add car data if category is 'cab'
    if (selectedCategoryName === 'cab') {
      const carCategoryName = carCategories.find((carCat: CarCategory) => carCat._id === selectedCarCategory)?.name || "";
      const carName = cars.find((car: Car) => car._id === selectedCar)?.name || "";
      data.carCategoryId = selectedCarCategory;
      data.carCategoryName = carCategoryName;
      data.carId = selectedCar;
      data.carName = carName;
    }

    if (editingInstruction) {
      updateMutation.mutate({ id: editingInstruction._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (instruction: Instruction) => {
    setEditingInstruction(instruction);
    setSelectedCategory(instruction.categoryId);
    setSelectedSubCategory(instruction.subCategoryId);
    setSelectedSubSubCategory(instruction.subSubCategoryId || "");
    setSelectedDriverCategory(instruction.driverCategoryId || "");
    setSelectedCarCategory(instruction.carCategoryId || "");
    setSelectedCar(instruction.carId || "");
    setSelectedParcelCategory(instruction.parcelCategoryId || "");
    setSelectedVehicleType(instruction.vehicleTypeId || "");
    setInstructions(instruction.instructions);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubCategory(""); // Reset subcategory when category changes
    setSelectedSubSubCategory(""); // Reset subsubcategory
    setSelectedDriverCategory(""); // Reset driver category
    setSelectedCarCategory(""); // Reset car category
    setSelectedCar(""); // Reset car
    setSelectedVehicleType(""); // Reset vehicle type
    setSelectedParcelCategory(""); // Reset parcel category
  };

  // Pagination logic
  useEffect(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    setPaginatedInstructions(instructionsData.slice(startIndex, endIndex));
  }, [instructionsData, currentPage, recordsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(instructionsData.length / recordsPerPage);
  const startRecord = instructionsData.length === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, instructionsData.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 bg-white text-black">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">T & C Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add T & C
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white text-black">
            <DialogHeader>
              <DialogTitle>
                {editingInstruction ? "Edit Instructions" : "Add Instructions"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(categories) && categories.map((category: Category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subcategory">Sub Category</Label>
                <Select
                  key={`${selectedCategory}-subcategory`}
                  value={selectedSubCategory || ""}
                  onValueChange={(value) => {
                    console.log("Selected subcategory:", value);
                    console.log("Subcategory name:", Array.isArray(subCategories) ? subCategories.find(sub => (sub._id || sub.id) === value)?.name : undefined);
                    setSelectedSubCategory(value);
                    setSelectedSubSubCategory(""); // Reset subsubcategory when subcategory changes
                  }}
                  disabled={!selectedCategory || filteredSubCategories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !selectedCategory
                          ? "Select Category first"
                          : filteredSubCategories.length === 0
                            ? "No Sub Categories available"
                            : "Select Sub Category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubCategories.map((subCategory) => {
                      return (
                        <SelectItem
                          key={subCategory._id || subCategory.id}
                          value={subCategory._id || subCategory.id}
                        >
                          {subCategory.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* SubSubCategory - only show for 'outstation' subcategory in driver/cab categories */}
              {subCategories.find(sub => (sub._id || sub.id) === selectedSubCategory)?.name?.toLowerCase() === 'outstation' &&
               (categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'driver' ||
                categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'cab') && (
                <div>
                  <Label htmlFor="subsubcategory">Sub Sub Category</Label>
                  <Select
                    value={selectedSubSubCategory}
                    onValueChange={setSelectedSubSubCategory}
                    disabled={!selectedSubCategory || filteredSubSubCategories.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedSubCategory
                            ? "Select Sub Category first"
                            : filteredSubSubCategories.length === 0
                              ? "No Sub Sub Categories available"
                              : "Select Sub Sub Category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubSubCategories.map((subSubCategory: SubSubCategory) => (
                        <SelectItem key={subSubCategory.id} value={subSubCategory.id}>
                          {subSubCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Driver Category - only show for 'driver' category */}
              {categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'driver' && (
                <div>
                  <Label htmlFor="drivercategory">Driver Category</Label>
                  <Select
                    value={selectedDriverCategory}
                    onValueChange={setSelectedDriverCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Driver Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {driverCategories.map((driverCategory: DriverCategory) => (
                        <SelectItem key={driverCategory._id} value={driverCategory._id}>
                          {driverCategory.priceCategoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Parcel Category and Vehicle Type - only show for 'parcel' category */}
              {categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'parcel' && (
                <>
                  <div>
                    <Label htmlFor="parcelcategory">Driver Category</Label>
                    <Select
                      value={selectedParcelCategory}
                      onValueChange={(value) => {
                        setSelectedParcelCategory(value);
                        setSelectedVehicleType(""); // Reset vehicle type when category changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Driver Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueParcelCategories.map((parcelCategory) => (
                          <SelectItem key={parcelCategory._id} value={parcelCategory._id}>
                            {parcelCategory.categoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vehicletype">Vehicle Type</Label>
                    <Select
                      value={selectedVehicleType}
                      onValueChange={setSelectedVehicleType}
                      disabled={!selectedParcelCategory || filteredVehicleTypes.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedParcelCategory
                              ? "Select Driver Category first"
                              : filteredVehicleTypes.length === 0
                                ? "No Vehicle Types available"
                                : "Select Vehicle Type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredVehicleTypes.map((vehicleType: ParcelVehicleType) => (
                          <SelectItem key={vehicleType._id} value={vehicleType._id}>
                            {vehicleType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Cab Category and Car - only show for 'cab' category */}
              {categories.find((cat: Category) => cat._id === selectedCategory)?.name?.toLowerCase() === 'cab' && (
                <>
                  <div>
                    <Label htmlFor="carcategory">Driver Category</Label>
                    <Select
                      value={selectedCarCategory}
                      onValueChange={(value) => {
                        setSelectedCarCategory(value);
                        setSelectedCar(""); // Reset car when category changes
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Driver Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {carCategories.map((carCategory: CarCategory) => (
                          <SelectItem key={carCategory._id} value={carCategory._id}>
                            {carCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="car">Car</Label>
                    <Select
                      value={selectedCar}
                      onValueChange={setSelectedCar}
                      disabled={!selectedCarCategory || filteredCars.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedCarCategory
                              ? "Select Driver Category first"
                              : filteredCars.length === 0
                                ? "No Cars available"
                                : "Select Car"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCars.map((car: Car) => (
                          <SelectItem key={car._id} value={car._id}>
                            {car.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter instructions..."
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Instructions Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">T & C List</h2>
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
          {isLoading ? (
            <div className="text-center py-8">
              <div className="flex justify-center items-center">
                <Loader className="w-6 h-6 animate-spin mr-2" />
                <span>Loading instructions...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead className="text-gray-600">Category</TableHead>
                    <TableHead className="text-gray-600">Sub Category</TableHead>
                    <TableHead className="text-gray-600">Sub Sub Category</TableHead>
                    <TableHead className="text-gray-600">Driver Category</TableHead>
                    <TableHead className="text-gray-600">Vehicle/Car</TableHead>
                    <TableHead className="text-gray-600">Instructions</TableHead>
                    <TableHead className="text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructionsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No T & C found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInstructions.map((instruction: Instruction, index) => {
                      const getVehicleCarInfo = () => {
                        if (instruction.categoryName?.toLowerCase() === 'cab') {
                          return `  ${instruction.carName || ''}`;
                        } else if (instruction.categoryName?.toLowerCase() === 'parcel') {
                          return instruction.vehicleTypeName || '';
                        }
                        return '-';
                      };

                      return (
                        <TableRow key={instruction._id}>
                          <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                          <TableCell>{instruction.categoryName}</TableCell>
                          <TableCell>{instruction.subCategoryName}</TableCell>
                          <TableCell>{instruction.subSubCategoryName || '-'}</TableCell>
                          <TableCell>{instruction.driverCategoryName || instruction.parcelCategoryName || instruction.carCategoryName || '-'}</TableCell>
                          <TableCell>{getVehicleCarInfo()}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {instruction.instructions}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(instruction)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <DeleteConfirmation
                                onDelete={() => handleDelete(instruction._id)}
                                itemName="instruction"
                                buttonVariant="outline"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {instructionsData.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startRecord} to {endRecord} of {instructionsData.length} entries
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
        </div>
      </div>
    </div>
  );
};