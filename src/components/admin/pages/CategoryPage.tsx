import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader, Upload, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

interface Category {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  image?: {
    public_id: string;
    url: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: Category | Category[];
  count?: number;
  errors?: string[];
}


export const CategoryPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/api/categories`);
      const categoriesData = response.data || [];

      const validCategories: Category[] = Array.isArray(categoriesData)
        ? categoriesData.filter((item: any): item is Category =>
          item !== null && typeof item === 'object' && (item._id || item.id) && typeof item.name === 'string'
        ).map(item => ({
          _id: item._id || item.id,
          name: item.name,
          description: item.description || '',
          image: item.image,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }))
        : [];
      setCategories(validCategories);
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Fetch categories error:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Image size should be less than 10MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setCategoryForm(prev => ({ ...prev, image: file }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setCategoryForm(prev => ({ ...prev, image: null }));
    setImagePreview(null);
  };

  const resetForm = () => {
    setCategoryForm({ name: '', description: '', image: null });
    setImagePreview(null);
    setError(null);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      setActionLoading({ create: true });
      setError(null);

      const formData = new FormData();
      formData.append('name', categoryForm.name.trim());
      formData.append('description', categoryForm.description.trim());
      if (categoryForm.image) {
        formData.append('image', categoryForm.image);
      }

      const response = await axios.post(`${API_BASE_URL}/api/categories`, formData);

      const result: ApiResponse = response.data;

      if (result.success && result.data) {
        const newCategory = result.data as Category;
        if (newCategory._id || newCategory.id) {
          setCategories([{ ...newCategory, _id: newCategory._id || newCategory.id! }, ...categories]);
          resetForm();
          setCategoryDialogOpen(false);
          setSuccess('Category created successfully!');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError('Created category is missing an ID.');
        }
      } else {
        setError(result.message || 'Failed to create category');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Create category error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !categoryForm.name.trim()) return;

    const categoryId = editingCategory._id || editingCategory.id;
    if (!categoryId) {
      setError('Editing category is missing an ID.');
      return;
    }

    try {
      setActionLoading({ [`edit-${categoryId}`]: true });
      setError(null);

      const formData = new FormData();
      formData.append('name', categoryForm.name.trim());
      formData.append('description', categoryForm.description.trim());
      if (categoryForm.image) {
        formData.append('image', categoryForm.image);
      }

      const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
        method: 'PUT',
        body: formData,
      });

      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        setCategories(categories.map(cat => {
          const currentCatId = cat._id || cat.id;
          return currentCatId === categoryId ? { ...result.data as Category, _id: categoryId } : cat;
        }));
        resetForm();
        setEditDialogOpen(false);
        setEditingCategory(null);
        setSuccess('Category updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to update category');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Update category error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      image: null
    });
    // Set existing image as preview if available
    if (category.image?.url) {
      setImagePreview(category.image.url);
    } else {
      setImagePreview(null);
    }
    setEditDialogOpen(true);
  };

  const handleView = (category: Category) => {
    setViewingCategory(category);
    setViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading({ [`delete-${id}`]: true });
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        setCategories(categories.filter(cat => (cat._id || cat.id) !== id));
        setSuccess('Category deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || 'Failed to delete category');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Delete category error:', err);
    } finally {
      setActionLoading({});
    }
  };

  const ImagePreviewComponent = ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <div className={`relative ${className || 'w-16 h-16'}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover rounded-lg"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMSAyMUg0M1Y0M0gyMVYyMVoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTI2IDMwTDMwIDM0TDM0IDMwTDM4IDM0VjM4SDI2VjMwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
        }}
      />
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Category Management</h1>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
          <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
            setCategoryDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={loading || actionLoading.create}>
                {actionLoading.create ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Category
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category Name *</label>
                  <Input
                    placeholder="Enter category name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    disabled={actionLoading.create}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    placeholder="Enter category description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    disabled={actionLoading.create}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category Image</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={actionLoading.create}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />

                    {imagePreview && (
                      <div className="relative w-32 h-32">
                        <ImagePreviewComponent src={imagePreview} alt="Preview" className="w-32 h-32" />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          disabled={actionLoading.create}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={actionLoading.create}>
                  {actionLoading.create ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Category'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
            setEditingCategory(null);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category Name *</label>
                <Input
                  placeholder="Enter category name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={editingCategory ? actionLoading[`edit-${editingCategory._id || editingCategory.id}`] : false}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Enter category description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  disabled={editingCategory ? actionLoading[`edit-${editingCategory._id || editingCategory.id}`] : false}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category Image</label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={editingCategory ? actionLoading[`edit-${editingCategory._id || editingCategory.id}`] : false}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />

                  {imagePreview && (
                    <div className="relative w-32 h-32">
                      <ImagePreviewComponent src={imagePreview} alt="Preview" className="w-32 h-32" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        disabled={editingCategory ? actionLoading[`edit-${editingCategory._id || editingCategory.id}`] : false}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={editingCategory ? actionLoading[`edit-${editingCategory._id || editingCategory.id}`] : false}
              >
                {editingCategory && actionLoading[`edit-${editingCategory._id || editingCategory.id}`] ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Category'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Category Details</DialogTitle>
            </DialogHeader>
            {viewingCategory && (
              <div className="space-y-4">
                {viewingCategory.image?.url && (
                  <div className="flex justify-center">
                    <ImagePreviewComponent
                      src={viewingCategory.image.url}
                      alt={viewingCategory.name}
                      className="w-48 h-48"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{viewingCategory.name}</h3>
                  {viewingCategory.description && (
                    <p className="text-gray-600 mt-2">{viewingCategory.description}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  <p>Created: {viewingCategory.createdAt ? new Date(viewingCategory.createdAt).toLocaleDateString() : 'N/A'}</p>
                  {viewingCategory.updatedAt && (
                    <p>Updated: {new Date(viewingCategory.updatedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {loading && categories.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading categories...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No categories found. Create your first category!
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category, index) => {
                  const categoryId = category._id || category.id;
                  if (!category || !categoryId) {
                    console.warn("Skipping invalid category entry:", category);
                    return null;
                  }

                  return (
                    <TableRow key={categoryId}>
                      <TableCell className="font-mono text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {category.image?.url ? (
                          <ImagePreviewComponent
                            src={category.image.url}
                            alt={category.name}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="max-w-xs">
                        {category.description ? (
                          <div className="truncate" title={category.description}>
                            {category.description.length > 50
                              ? category.description.substring(0, 50) + '...'
                              : category.description}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.createdAt
                          ? new Date(category.createdAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(category)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            disabled={actionLoading[`edit-${categoryId}`] || actionLoading[`delete-${categoryId}`]}
                            title="Edit category"
                          >
                            {actionLoading[`edit-${categoryId}`] ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Edit className="w-4 h-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading[`edit-${categoryId}`] || actionLoading[`delete-${categoryId}`]}
                                title="Delete category"
                              >
                                {actionLoading[`delete-${categoryId}`] ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the category "{category.name}" and its associated image.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={actionLoading[`delete-${categoryId}`]}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(categoryId)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={actionLoading[`delete-${categoryId}`]}
                                >
                                  {actionLoading[`delete-${categoryId}`] ? (
                                    <>
                                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    'Delete'
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};