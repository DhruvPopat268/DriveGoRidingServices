import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
  chargePerKm: number;
  chargePerMinute: number;
}

export const PriceCategoryPage = () => {
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [priceCategoryForm, setPriceCategoryForm] = useState({
    priceCategoryName: '',
    chargePerKm: '',
    chargePerMinute: ''
  });
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/price-categories`);
      setPriceCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch price categories', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      priceCategoryName: priceCategoryForm.priceCategoryName.trim(),
      chargePerKm: parseFloat(priceCategoryForm.chargePerKm),
      chargePerMinute: parseFloat(priceCategoryForm.chargePerMinute)
    };

    try {
      if (editingCategory) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/price-categories/${editingCategory._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/price-categories`, payload);
      }
      await fetchCategories();
      setDialogOpen(false);
      setEditingCategory(null);
      setPriceCategoryForm({ priceCategoryName: '', chargePerKm: '', chargePerMinute: '' });
    } catch (err) {
      console.error('Failed to save price category', err);
    }
  };

  const handleEdit = (category: PriceCategory) => {
    setEditingCategory(category);
    setPriceCategoryForm({
      priceCategoryName: category.priceCategoryName,
      chargePerKm: category.chargePerKm.toString(),
      chargePerMinute: category.chargePerMinute.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/price-categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error('Failed to delete category', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Price Category Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Price Categories</h2>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setPriceCategoryForm({ priceCategoryName: '', chargePerKm: '', chargePerMinute: '' });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Price Category' : 'Create Price Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Category Name"
                  value={priceCategoryForm.priceCategoryName}
                  onChange={(e) => setPriceCategoryForm({ ...priceCategoryForm, priceCategoryName: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Charge per km"
                  value={priceCategoryForm.chargePerKm}
                  onChange={(e) => setPriceCategoryForm({ ...priceCategoryForm, chargePerKm: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Charge per minute"
                  value={priceCategoryForm.chargePerMinute}
                  onChange={(e) => setPriceCategoryForm({ ...priceCategoryForm, chargePerMinute: e.target.value })}
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
              <TableHead>Name</TableHead>
              <TableHead>Charge Per Km</TableHead>
              <TableHead>Charge Per Minute</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No price category found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              priceCategories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell>{category.priceCategoryName}</TableCell>
                  <TableCell>{category.chargePerKm.toFixed(2)}</TableCell>
                  <TableCell>{category.chargePerMinute.toFixed(2)}</TableCell>
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
                              This will permanently delete the price category.
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
