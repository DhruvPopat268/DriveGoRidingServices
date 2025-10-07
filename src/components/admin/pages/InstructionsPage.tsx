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
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface Instruction {
  _id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  driverCategoryId: string;
  driverCategoryName: string;
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

interface DriverCategory {
  _id: string;
  priceCategoryName: string;
  chargePerKm: number;
  chargePerMinute: number;
}

export const InstructionsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedDriverCategory, setSelectedDriverCategory] = useState("");
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
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/instructions`);
      return response.data.data || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      return response.data || [];
    },
  });

  // Fetch subcategories
  const { data: subCategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);
      return response.data || [];
    },
  });

  // Fetch driver categories (price categories)
  const { data: driverCategories = [] } = useQuery({
    queryKey: ["driver-categories"],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/price-categories`);
      return response.data || [];
    },
  });

  // Filter subcategories based on selected category
  const filteredSubCategories = subCategories.filter(
    (sub: SubCategory) => sub.categoryId === selectedCategory
  );

  // Reset subcategory when category changes or when filtered subcategories don't include current selection
  useEffect(() => {
    if (selectedSubCategory && !filteredSubCategories.some((sub: SubCategory) => sub._id === selectedSubCategory)) {
      // setSelectedSubCategory("");
    }
  }, [selectedCategory, filteredSubCategories, selectedSubCategory]);

  // Create instruction mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/instructions`, data);
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
      const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/instructions/${id}`, data);
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
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/instructions/${id}`);
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
    setSelectedDriverCategory("");
    setInstructions("");
    setEditingInstruction(null);
  };

  const handleSubmit = () => {
    if (!selectedCategory || !selectedSubCategory || !selectedDriverCategory || !instructions.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const categoryName = categories.find((cat: Category) => cat._id === selectedCategory)?.name || "";
    const subCategoryName = subCategories.find((sub: SubCategory) => sub._id === selectedSubCategory)?.name || "";
    const driverCategoryName = driverCategories.find((driver: DriverCategory) => driver._id === selectedDriverCategory)?.priceCategoryName || "";

    const data = {
      categoryId: selectedCategory,
      categoryName,
      subCategoryId: selectedSubCategory,
      subCategoryName,
      driverCategoryId: selectedDriverCategory,
      driverCategoryName,
      instructions: instructions.trim(),
    };

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
    setSelectedDriverCategory(instruction.driverCategoryId);
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
                    {categories.map((category: Category) => (
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
                    console.log("🟢 SubCategory changed:", value, typeof value);
                    setSelectedSubCategory(value);
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
                      const subCategoryId = String(subCategory.id);
                      return (
                        <SelectItem
                          key={subCategory.id}
                          value={subCategoryId}
                        >
                          {subCategory.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

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
                    <TableHead className="text-gray-600">Driver Category</TableHead>
                    <TableHead className="text-gray-600">Instructions</TableHead>
                    <TableHead className="text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instructionsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No T & C found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedInstructions.map((instruction: Instruction, index) => (
                      <TableRow key={instruction._id}>
                        <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                        <TableCell>{instruction.categoryName}</TableCell>
                        <TableCell>{instruction.subCategoryName}</TableCell>
                        <TableCell>{instruction.driverCategoryName}</TableCell>
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
                    ))
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