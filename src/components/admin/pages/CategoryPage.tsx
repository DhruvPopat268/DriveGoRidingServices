import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import axios from 'axios';

interface Category {
  _id: string;
  id?: string; // Optional for compatibility
  name: string;
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
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      const categoriesData = response.data.data || [];
      // Ensure categoriesData is an array and filter out any null/undefined entries
      const validCategories: Category[] = Array.isArray(categoriesData)
        ? categoriesData.filter((item: any): item is Category =>
            item !== null && typeof item === 'object' && (item._id || item.id) && typeof item.name === 'string'
          ).map(item => ({
              _id: item._id || item.id, // Ensure _id is always present
              name: item.name,
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

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      setActionLoading({ create: true });
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryForm.name.trim() }),
      });

      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        // Add the new category to the list
        const newCategory = result.data as Category;
        if (newCategory._id || newCategory.id) {
            setCategories([{ ...newCategory, _id: newCategory._id || newCategory.id! }, ...categories]);
            setCategoryForm({ name: '' });
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

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryForm.name.trim() }),
      });

      const result: ApiResponse = await response.json();

      if (result.success && result.data) {
        // Update the category in the list
        setCategories(categories.map(cat => {
            const currentCatId = cat._id || cat.id;
            return currentCatId === categoryId ? { ...result.data as Category, _id: categoryId } : cat;
        }));
        setCategoryForm({ name: '' });
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
    setCategoryForm({ name: category.name });
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading({ [`delete-${id}`]: true });
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/categories/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        // Remove the category from the list
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

  return (
    <div className="space-y-8">
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
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <Input
                  placeholder="Enter category name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ name: e.target.value })}
                  required
                  disabled={actionLoading.create}
                />
                <Button type="submit" className="w-full" disabled={actionLoading.create}>
                  {actionLoading.create ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                placeholder="Enter category name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ name: e.target.value })}
                required
                disabled={editingCategory ? actionLoading[`edit-${editingCategory._id || editingCategory.id}`] : false}
              />
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
                  'Update'
                )}
              </Button>
            </form>
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
                <TableHead>Index</TableHead>{/* Changed from ID to Index */}
                <TableHead>Category Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No categories found. Create your first category!
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category, index) => { // Added 'index' parameter to map
                  const categoryId = category._id || category.id;
                  // Ensure category and its ID are valid before rendering
                  if (!category || !categoryId) {
                    console.warn("Skipping invalid category entry:", category);
                    return null; // Skip this iteration
                  }

                  return (
                    <TableRow key={categoryId}> {/* Still using categoryId for unique key */}
                      <TableCell className="font-mono text-sm">
                        {index + 1} {/* Displaying index starting from 1 */}
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
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
                            onClick={() => handleEdit(category)}
                            disabled={actionLoading[`edit-${categoryId}`] || actionLoading[`delete-${categoryId}`]}
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
                                  This action cannot be undone. This will permanently delete the category "{category.name}".
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