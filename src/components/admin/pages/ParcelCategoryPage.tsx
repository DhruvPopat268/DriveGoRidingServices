import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import axios from 'axios';

interface ParcelCategory {
  _id: string;
  categoryName: string;
  description: string;
}

export const ParcelCategoryPage = () => {
  const [parcelCategories, setParcelCategories] = useState<ParcelCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState({
    categoryName: '',
    description: ''
  });
  const [editingCategory, setEditingCategory] = useState<ParcelCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParcelCategories();
  }, []);

  const fetchParcelCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/parcel-categories`);
      setParcelCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch parcel categories', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      categoryName: categoryForm.categoryName.trim(),
      description: categoryForm.description.trim()
    };

    try {
      if (editingCategory) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/parcel-categories/${editingCategory._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/parcel-categories`, payload);
      }
      await fetchParcelCategories();
      setDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ categoryName: '', description: '' });
    } catch (err) {
      console.error('Failed to save parcel category', err);
    }
  };

  const handleEdit = (category: ParcelCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      categoryName: category.categoryName,
      description: category.description
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/parcel-categories/${id}`);
      fetchParcelCategories();
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryForm({ categoryName: '', description: '' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parcel Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Parcel Categories</h2>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Parcel Category' : 'Create Parcel Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Category Name (e.g., Documents, Electronics, Food)"
                  value={categoryForm.categoryName}
                  onChange={(e) => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  required
                />
                <Button type="submit" className="w-full">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading parcel categories...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : parcelCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No parcel categories found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              parcelCategories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">{category.categoryName}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the parcel category. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(category._id)}>
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