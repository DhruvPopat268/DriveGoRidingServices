import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
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

interface Category {
  _id: string;
  name: string;
  description: string;
  image: {
    public_id: string;
    url: string;
  };
}

interface PriceCategory {
  _id: string;
  priceCategoryName: string;
  description: string;
  category: string | Category; // Can be populated or just ID
  chargePerKm: number;
  chargePerMinute: number;
}

export const PriceCategoryPage = () => {
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceCategoryForm, setPriceCategoryForm] = useState({
    priceCategoryName: '',
    description: '',
    category: '',
    chargePerKm: '',
    chargePerMinute: ''
  });
  const [editingCategory, setEditingCategory] = useState<PriceCategory | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchPriceCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const fetchPriceCategories = async () => {
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
      description: priceCategoryForm.description.trim(),
      category: priceCategoryForm.category,
      chargePerKm: parseFloat(priceCategoryForm.chargePerKm),
      chargePerMinute: parseFloat(priceCategoryForm.chargePerMinute)
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
      setPriceCategoryForm({ priceCategoryName: '', description: '', category: '', chargePerKm: '', chargePerMinute: '' });
    } catch (err) {
      console.error('Failed to save price category', err);
    }
  };

  const handleEdit = (priceCategory: PriceCategory) => {
    setEditingCategory(priceCategory);
    setPriceCategoryForm({
      priceCategoryName: priceCategory.priceCategoryName,
      description: priceCategory.description,
      category: typeof priceCategory.category === 'string' ? priceCategory.category : priceCategory.category._id,
      chargePerKm: priceCategory.chargePerKm.toString(),
      chargePerMinute: priceCategory.chargePerMinute.toString()
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

  const getCategoryName = (category: string | Category): string => {
    if (typeof category === 'string') {
      const foundCategory = categories.find(cat => cat._id === category);
      return foundCategory ? foundCategory.name : 'Unknown';
    }
    return category.name;
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
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setPriceCategoryForm({ priceCategoryName: '', description: '', category: '', chargePerKm: '', chargePerMinute: '' });
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
                <Select
                  value={priceCategoryForm.category}
                  onValueChange={(value) => setPriceCategoryForm({ ...priceCategoryForm, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Driver Category Name"
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
                <Input
                  placeholder="Description"
                  value={priceCategoryForm.description}
                  onChange={(e) => setPriceCategoryForm({ ...priceCategoryForm, description: e.target.value })}
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
              <TableHead>Category</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Charge Per Km</TableHead>
              <TableHead>Charge Per Minute</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priceCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No price category found. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              priceCategories.map((priceCategory) => (
                <TableRow key={priceCategory._id}>
                  <TableCell>{getCategoryName(priceCategory.category)}</TableCell>
                  <TableCell>{priceCategory.priceCategoryName}</TableCell>
                  <TableCell>{priceCategory.chargePerKm.toFixed(2)}</TableCell>
                  <TableCell>{priceCategory.chargePerMinute.toFixed(2)}</TableCell>
                  <TableCell>{priceCategory.description}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
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
                              This will permanently delete the price category.
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