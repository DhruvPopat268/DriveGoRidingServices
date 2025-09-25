import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import axios from 'axios';

interface Category {
  _id: string;
  name: string;
}

interface SubCategory {
  _id: string;
  name: string;
}

interface SubSubCategory {
  id: string;
  _id: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  name: string;
  description?: string;
  image?: string;
}

export const SubSubCategoryPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [filteredSubSubCategories, setFilteredSubSubCategories] = useState<SubSubCategory[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string>('all');
  const [subSubCategoryDialogOpen, setSubSubCategoryDialogOpen] = useState(false);
  const [editingSubSubCategory, setEditingSubSubCategory] = useState<SubSubCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [subSubCategoryForm, setSubSubCategoryForm] = useState({
    categoryId: '',
    subCategoryId: '',
    name: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  // Filter sub-subcategories based on selected filters
  useEffect(() => {
    let filtered = subSubCategories;
    
    if (selectedCategoryFilter !== 'all') {
      filtered = filtered.filter(subSubCat => 
        subSubCat.categoryId === selectedCategoryFilter
      );
    }
    
    if (selectedSubCategoryFilter !== 'all') {
      filtered = filtered.filter(subSubCat => 
        subSubCat.subCategoryId === selectedSubCategoryFilter
      );
    }
    
    setFilteredSubSubCategories(filtered);
  }, [subSubCategories, selectedCategoryFilter, selectedSubCategoryFilter]);

  // Fetch subcategories when category changes in form
  useEffect(() => {
    if (subSubCategoryForm.categoryId) {
      fetchSubCategoriesByCategory(subSubCategoryForm.categoryId);
    }
  }, [subSubCategoryForm.categoryId]);

  const fetchSubCategoriesByCategory = async (categoryId: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories/subcategories/${categoryId}`);
      setSubCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
      setSubCategories([]);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    const fetchSubSubCategories = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`);
        setSubSubCategories(response.data);
      } catch (error) {
        console.error("Failed to fetch sub-subcategories:", error);
        setSubSubCategories([]);
      }
    };

    fetchCategories();
    fetchSubSubCategories();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
    }
  };

  const handleSubSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subSubCategoryForm.categoryId && subSubCategoryForm.subCategoryId && subSubCategoryForm.name.trim()) {
      try {
        const formData = new FormData();
        formData.append('categoryId', subSubCategoryForm.categoryId);
        formData.append('subCategoryId', subSubCategoryForm.subCategoryId);
        formData.append('name', subSubCategoryForm.name.trim());
        formData.append('description', subSubCategoryForm.description || '');

        if (imageFile) {
          formData.append('image', imageFile);
        }

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/subsubcategories`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        // Refresh the list
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`);
        setSubSubCategories(response.data);

        // Reset form
        setSubSubCategoryForm({ categoryId: '', subCategoryId: '', name: '', description: '' });
        setImageFile(null);
        setSubSubCategoryDialogOpen(false);

        const fileInput = document.getElementById('create-image-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (error) {
        console.error('Failed to add sub-subcategory:', error);
        alert('Error adding sub-subcategory. Please try again.');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubSubCategory && subSubCategoryForm.categoryId && subSubCategoryForm.subCategoryId && subSubCategoryForm.name.trim()) {
      try {
        const formData = new FormData();
        formData.append('categoryId', subSubCategoryForm.categoryId);
        formData.append('subCategoryId', subSubCategoryForm.subCategoryId);
        formData.append('name', subSubCategoryForm.name.trim());
        formData.append('description', subSubCategoryForm.description || '');

        if (editImageFile) {
          formData.append('image', editImageFile);
        }

        const updateId = editingSubSubCategory._id || editingSubSubCategory.id;
        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/subsubcategories/${updateId}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        // Refresh the list
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`);
        setSubSubCategories(response.data);

        // Reset form
        setSubSubCategoryForm({ categoryId: '', subCategoryId: '', name: '', description: '' });
        setEditImageFile(null);
        setEditDialogOpen(false);
        setEditingSubSubCategory(null);

        const fileInput = document.getElementById('edit-image-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (error) {
        console.error('Failed to update sub-subcategory:', error);
        alert('Error updating sub-subcategory. Please try again.');
      }
    }
  };

  const handleEdit = async (subSubCategory: SubSubCategory) => {
    setEditingSubSubCategory(subSubCategory);
    setSubSubCategoryForm({
      categoryId: subSubCategory.categoryId,
      subCategoryId: subSubCategory.subCategoryId,
      name: subSubCategory.name,
      description: subSubCategory.description || ''
    });
    
    // Fetch subcategories for the selected category
    await fetchSubCategoriesByCategory(subSubCategory.categoryId);
    setEditDialogOpen(true);
  };

  const handleDelete = async (subSubCategory: SubSubCategory) => {
    try {
      const deleteId = subSubCategory._id || subSubCategory.id;
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/subsubcategories/${deleteId}`);
      setSubSubCategories(prev => prev.filter(subSubCat => subSubCat.id !== subSubCategory.id));
    } catch (error) {
      console.error('Error deleting sub-subcategory:', error);
      alert('Error deleting sub-subcategory. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sub-Sub Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sub-Sub Categories</h2>
          <div className="flex items-center space-x-4">
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Category:</span>
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Create Button */}
            <Dialog open={subSubCategoryDialogOpen} onOpenChange={setSubSubCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Sub-Sub Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Sub-Sub Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubSubCategorySubmit} className="space-y-4">
                  <Select 
                    value={subSubCategoryForm.categoryId} 
                    onValueChange={(value) => setSubSubCategoryForm({ ...subSubCategoryForm, categoryId: value, subCategoryId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={subSubCategoryForm.subCategoryId} 
                    onValueChange={(value) => setSubSubCategoryForm({ ...subSubCategoryForm, subCategoryId: value })}
                    disabled={!subSubCategoryForm.categoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategories.map((subCategory) => (
                        <SelectItem key={subCategory._id} value={subCategory._id}>
                          {subCategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Sub-Sub Category Name"
                    value={subSubCategoryForm.name}
                    onChange={(e) => setSubSubCategoryForm({ ...subSubCategoryForm, name: e.target.value })}
                    required
                  />

                  <Input
                    placeholder="Description"
                    value={subSubCategoryForm.description}
                    onChange={(e) => setSubSubCategoryForm({ ...subSubCategoryForm, description: e.target.value })}
                  />

                  <div className="space-y-2">
                    <label htmlFor="create-image-input" className="text-sm font-medium">
                      Upload Image
                    </label>
                    <Input
                      id="create-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imageFile && (
                      <p className="text-sm text-gray-600">Selected: {imageFile.name}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full">Submit</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Sub-Sub Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Select 
                value={subSubCategoryForm.categoryId} 
                onValueChange={(value) => setSubSubCategoryForm({ ...subSubCategoryForm, categoryId: value, subCategoryId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={subSubCategoryForm.subCategoryId} 
                onValueChange={(value) => setSubSubCategoryForm({ ...subSubCategoryForm, subCategoryId: value })}
                disabled={!subSubCategoryForm.categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map((subCategory) => (
                    <SelectItem key={subCategory._id} value={subCategory._id}>
                      {subCategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Sub-Sub Category Name"
                value={subSubCategoryForm.name}
                onChange={(e) => setSubSubCategoryForm({ ...subSubCategoryForm, name: e.target.value })}
                required
              />

              <Input
                placeholder="Description"
                value={subSubCategoryForm.description}
                onChange={(e) => setSubSubCategoryForm({ ...subSubCategoryForm, description: e.target.value })}
              />

              <div className="space-y-2">
                <label htmlFor="edit-image-input" className="text-sm font-medium">
                  Upload New Image (optional)
                </label>
                {editingSubSubCategory?.image && (
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={editingSubSubCategory.image}
                      alt="Current"
                      className="h-10 w-10 object-cover rounded"
                    />
                    <span className="text-sm text-gray-600">Current image</span>
                  </div>
                )}
                <Input
                  id="edit-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {editImageFile && (
                  <p className="text-sm text-gray-600">New image selected: {editImageFile.name}</p>
                )}
              </div>

              <Button type="submit" className="w-full">Update</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sub Category</TableHead>
              <TableHead>Sub-Sub Category Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredSubSubCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-6">
                  No sub-sub categories found. Please add first.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubSubCategories.map((subSubCategory, index) => (
                <TableRow key={subSubCategory.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {subSubCategory.image && (
                      <img
                        src={subSubCategory.image}
                        alt={subSubCategory.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell>{subSubCategory.categoryName}</TableCell>
                  <TableCell>{subSubCategory.subCategoryName}</TableCell>
                  <TableCell>{subSubCategory.name}</TableCell>
                  <TableCell>{subSubCategory.description || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(subSubCategory)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Sub-Sub Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{subSubCategory.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(subSubCategory)}>
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
      </Card>
    </div>
  );
};