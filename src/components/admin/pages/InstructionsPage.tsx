
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface Instruction {
  _id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
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

export const InstructionsPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [instructions, setInstructions] = useState("");

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
      return response.data.data || [];
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

  // Filter subcategories based on selected category
  const filteredSubCategories = subCategories.filter(
   
    (sub: SubCategory) => sub.categoryId === selectedCategory

  );
    console.log(filteredSubCategories)


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
    setInstructions("");
    setEditingInstruction(null);
  };

  const handleSubmit = () => {
    if (!selectedCategory || !selectedSubCategory || !instructions.trim()) {
      toast({ 
        title: "Error", 
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const categoryName = categories.find((cat: Category) => cat._id === selectedCategory)?.name || "";
    const subCategoryName = subCategories.find((sub: SubCategory) => sub._id === selectedSubCategory)?.name || "";

    const data = {
      categoryId: selectedCategory,
      categoryName,
      subCategoryId: selectedSubCategory,
      subCategoryName,
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
    setInstructions(instruction.instructions);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this instruction?")) {
      deleteMutation.mutate(id);
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white dark:text-white text-gray-900">T & C Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add T & C
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingInstruction ? "Edit Instructions" : "Add Instructions"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedSubCategory(""); // Reset subcategory when category changes
                }}>
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
                  value={selectedSubCategory} 
                  onValueChange={setSelectedSubCategory}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Sub Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubCategories.map((subCategory: SubCategory) => (
                      <SelectItem key={subCategory._id} value={subCategory._id}>
                        {subCategory.name}
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
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Instructions Table */}
      <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg border border-gray-700 dark:border-gray-700 border-gray-200">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white dark:text-white text-gray-900 mb-4">T & C List</h2>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300 dark:text-gray-300 text-gray-600">Category</TableHead>
                  <TableHead className="text-gray-300 dark:text-gray-300 text-gray-600">Sub Category</TableHead>
                  <TableHead className="text-gray-300 dark:text-gray-300 text-gray-600">Instructions</TableHead>
                  <TableHead className="text-gray-300 dark:text-gray-300 text-gray-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructionsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 dark:text-gray-400 text-gray-500">
                      No T & C found
                    </TableCell>
                  </TableRow>
                ) : (
                  instructionsData.map((instruction: Instruction) => (
                    <TableRow key={instruction._id}>
                      <TableCell className="text-white dark:text-white text-gray-900">
                        {instruction.categoryName}
                      </TableCell>
                      <TableCell className="text-white dark:text-white text-gray-900">
                        {instruction.subCategoryName}
                      </TableCell>
                      <TableCell className="text-white dark:text-white text-gray-900 max-w-xs truncate">
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(instruction._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};
