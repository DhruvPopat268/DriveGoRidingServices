import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader } from 'lucide-react';
import axios from 'axios';

interface CarCategory {
  _id: string;
  name: string;
  description: string;
  status: boolean;
  createdAt: string;
}

interface CarCategoryForm {
  name: string;
  description: string;
}

export const CarCategoryPage = () => {
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CarCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CarCategoryForm>({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/car-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching car categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCategory) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/car-categories/${editingCategory._id}`, categoryForm);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/car-categories`, categoryForm);
      }
      await fetchCategories();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving car category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: CarCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/car-categories/${id}`);
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting car category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/car-categories/${id}/status`, {
        status: !currentStatus
      });
      await fetchCategories();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: ''
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Car Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-end mb-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Car Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Category Name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Textarea
                  placeholder="Description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {editingCategory ? 'Update' : 'Add'} Category
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading car categories...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No data found! Add first category.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    <Switch
                      checked={category.status}
                      onCheckedChange={() => handleStatusToggle(category._id, category.status)}
                    />
                  </TableCell>
                  <TableCell>{new Date(category.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};