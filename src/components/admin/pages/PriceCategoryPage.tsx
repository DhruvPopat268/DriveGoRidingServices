import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Loader, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface PriceCategory {
  _id: string;
  priceCategoryName: string;
}

export const PriceCategoryPage = () => {
  const navigate = useNavigate();
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [priceCategoryForm, setPriceCategoryForm] = useState({
    priceCategoryName: ''
  });
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPriceCategories();
  }, []);

  const fetchPriceCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/price-categories`);
      setPriceCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch price categories', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      priceCategoryName: priceCategoryForm.priceCategoryName.trim()
    };

    try {
      if (editingCategory) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/price-categories/${editingCategory._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/price-categories`, payload);
      }
      await fetchPriceCategories();
      setDialogOpen(false);
      setEditingCategory(null);
      setPriceCategoryForm({ priceCategoryName: '' });
    } catch (err) {
      console.error('Failed to save price category', err);
    }
  };

  const handleEdit = (priceCategory: PriceCategory) => {
    setEditingCategory(priceCategory);
    setPriceCategoryForm({
      priceCategoryName: priceCategory.priceCategoryName
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/price-categories/${id}`);
      fetchPriceCategories();
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setPriceCategoryForm({ priceCategoryName: '' });
  };

  const handleViewDrivers = (category: PriceCategory) => {
    navigate(`/admin/category-assignment/driver/${category._id}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Driver Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Driver Categories</h2>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Driver Category' : 'Create Driver Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Driver Category Name (e.g., Classic, Prime, Premium)"
                  value={priceCategoryForm.priceCategoryName}
                  onChange={(e) => setPriceCategoryForm({ priceCategoryName: e.target.value })}
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
              <TableHead>Driver Category Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-2" />
                    <span>Loading driver categories...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : priceCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  No driver categories found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              priceCategories.map((priceCategory) => (
                <TableRow key={priceCategory._id}>
                  <TableCell className="font-medium">{priceCategory.priceCategoryName}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewDrivers(priceCategory)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(priceCategory)}>
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
                              This will permanently delete the driver category. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(priceCategory._id)}>
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