import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Axis3DIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import axios from 'axios'

interface Category {
  _id: number;
  name: string;
}

interface SubCategory {
  id: number;
  _id: string;
  categoryId: number;
  categoryName: string;
  name: string;
  description?: string;
  image?: string;
}

export const SubCategoryPage = () => {
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subCategoryDialogOpen, setSubCategoryDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [subCategoryForm, setSubCategoryForm] = useState({
    categoryId: '',
    name: '',
    description: '',
  });

  // File state for image uploads
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cateData = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
        const categoryList = cateData.data;

        if (Array.isArray(categoryList)) {
          setCategories(categoryList);
        } else {
          console.error("Category data is not an array:", cateData.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    const fetchSubCategories = async () => {
      try {
        const subcateData = await axios.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);

        let subcategoryList = [];
        if (Array.isArray(subcateData.data)) {
          subcategoryList = subcateData.data;
        } else if (Array.isArray(subcateData.data.data)) {
          subcategoryList = subcateData.data.data;
        } else {
          console.error("Invalid subcategory response format", subcateData.data);
          setSubCategories([]);
          return;
        }

        const mappedSubCategories = subcategoryList.map((subCat) => {
          const category = categories.find((cat) => cat._id === subCat.categoryId);
          return {
            ...subCat,
            id: subCat.id || subCat._id,
            _id: subCat._id || subCat.id,
            categoryName: category ? category.name : "Unknown",
          };
        });

        setSubCategories(mappedSubCategories);
      } catch (error) {
        console.error("Failed to fetch subcategories:", error);
        setSubCategories([]);
      }
    };

    fetchCategories();
    fetchSubCategories();
  }, [categories]); // Add categories dependency to re-fetch subcategories when categories change

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

  const handleSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (subCategoryForm.categoryId && subCategoryForm.name.trim()) {
      try {
        // Create FormData for multipart/form-data request
        const formData = new FormData();
        formData.append('categoryId', subCategoryForm.categoryId);
        formData.append('name', subCategoryForm.name.trim());
        formData.append('description', subCategoryForm.description || '');

        // Add image file if selected
        if (imageFile) {
          formData.append('image', imageFile);
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/subcategories`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        // Refresh the subcategories list
        const subcateData = await axios.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);

        let subcategoryList = [];
        if (Array.isArray(subcateData.data)) {
          subcategoryList = subcateData.data;
        } else if (Array.isArray(subcateData.data.data)) {
          subcategoryList = subcateData.data.data;
        }

        const mappedSubCategories = subcategoryList.map((subCat) => {
          const category = categories.find((cat) => cat._id === subCat.categoryId);
          return {
            ...subCat,
            id: subCat.id || subCat._id,
            _id: subCat._id || subCat.id,
            categoryName: category ? category.name : "Unknown",
          };
        });

        setSubCategories(mappedSubCategories);

        // Reset form and close dialog
        setSubCategoryForm({ categoryId: '', name: '', description: '' });
        setImageFile(null);
        setSubCategoryDialogOpen(false);

        // Reset file input
        const fileInput = document.getElementById('create-image-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (error) {
        console.error('Failed to add subcategory:', error);
        alert('Error adding subcategory. Please try again.');
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubCategory && subCategoryForm.categoryId && subCategoryForm.name.trim()) {
      try {
        // Create FormData for multipart/form-data request
        const formData = new FormData();
        formData.append('categoryId', subCategoryForm.categoryId);
        formData.append('name', subCategoryForm.name.trim());
        formData.append('description', subCategoryForm.description || '');

        // Add image file if a new one is selected
        if (editImageFile) {
          formData.append('image', editImageFile);
        }

        await axios.put(
          `${import.meta.env.VITE_API_URL}/api/subcategories/${editingSubCategory._id}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        // Refresh the list after successful update
        const subcateData = await axios.get(`${import.meta.env.VITE_API_URL}/api/subcategories`);

        let subcategoryList = [];
        if (Array.isArray(subcateData.data)) {
          subcategoryList = subcateData.data;
        } else if (Array.isArray(subcateData.data.data)) {
          subcategoryList = subcateData.data.data;
        }

        const mappedSubCategories = subcategoryList.map((subCat) => {
          const category = categories.find((cat) => cat._id === subCat.categoryId);
          return {
            ...subCat,
            id: subCat.id || subCat._id,
            _id: subCat._id || subCat.id,
            categoryName: category ? category.name : "Unknown",
          };
        });

        setSubCategories(mappedSubCategories);

        // Reset form and close dialog
        setSubCategoryForm({ categoryId: '', name: '', description: '' });
        setEditImageFile(null);
        setEditDialogOpen(false);
        setEditingSubCategory(null);

        // Reset file input
        const fileInput = document.getElementById('edit-image-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (error) {
        console.error('Failed to update subcategory:', error);
        alert('Error updating subcategory. Please try again.');
      }
    }
  };

  const handleEdit = (subCategory: SubCategory) => {
    setEditingSubCategory(subCategory);
    setSubCategoryForm({
      categoryId: subCategory.categoryId.toString(),
      name: subCategory.name,
      description: subCategory.description || ''
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (subCategory: SubCategory) => {
    try {
      const deleteId = subCategory._id || subCategory.id;
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/subcategories/${deleteId}`);

      if (response.status === 200) {
        setSubCategories(prev => prev.filter(subCat => subCat.id !== subCategory.id));
        console.log('Subcategory deleted successfully');
      } else {
        console.error('Delete failed:', response.data);
      }
    } catch (err: any) {
      console.error('Error deleting subcategory:', err.response?.data || err.message);
      alert('Error deleting subcategory. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sub Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Sub Categories</h2>
          <Dialog open={subCategoryDialogOpen} onOpenChange={setSubCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Subcategory
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subcategory</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubCategorySubmit} className="space-y-4">
                <Select value={subCategoryForm.categoryId} onValueChange={(value) => setSubCategoryForm({ ...subCategoryForm, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Sub Category Name"
                  value={subCategoryForm.name}
                  onChange={(e) => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                  required
                />

                <Input
                  placeholder="Description"
                  value={subCategoryForm.description}
                  onChange={(e) => setSubCategoryForm({ ...subCategoryForm, description: e.target.value })}
                />

                {/* File input for image upload */}
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subcategory</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Select value={subCategoryForm.categoryId} onValueChange={(value) => setSubCategoryForm({ ...subCategoryForm, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category._id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Sub Category Name"
                value={subCategoryForm.name}
                onChange={(e) => setSubCategoryForm({ ...subCategoryForm, name: e.target.value })}
                required
              />

              <Input
                placeholder="Description"
                value={subCategoryForm.description}
                onChange={(e) => setSubCategoryForm({ ...subCategoryForm, description: e.target.value })}
              />

              {/* File input for image upload */}
              <div className="space-y-2">
                <label htmlFor="edit-image-input" className="text-sm font-medium">
                  Upload New Image (optional)
                </label>
                {editingSubCategory?.image && (
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={editingSubCategory.image}
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
              <TableHead>Sub Category Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {subCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                  No subcategories found. Please add first.
                </TableCell>
              </TableRow>
            ) : (
              subCategories.map((subCategory, index) => (
                <TableRow key={subCategory.id}>
                  <TableCell>{index + 1}</TableCell>
                 
                  <TableCell>
                    {subCategory.image && (
                      <img
                        src={subCategory.image}
                        alt={subCategory.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    )}
                  </TableCell>
                  <TableCell>{subCategory.categoryName}</TableCell>
                  <TableCell>{subCategory.name}</TableCell>
                  <TableCell>{subCategory.description || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(subCategory)}
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
                            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{subCategory.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(subCategory)}>
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
