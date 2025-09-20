import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

interface RideCost {
  _id?: string;
  category: string | { _id: string; name: string };
  subcategory: string | { _id: string; name: string };
  priceCategory: string | { _id: string; priceCategoryName: string };
  chargePerKm: number;
  chargePerMinute: number;
  pickCharges: number;
  nightCharges: number;
  cancellationFee: number;
  insurance: number;
  extraChargesFromAdmin: number;
  gst: number;
  discount: number;
  minimumFare: number;
}

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id: string;
  name: string;
  categoryId: string;
}

interface PriceCategory {
  _id: string;
  priceCategoryName: string;
}

export const RideCostPage = () => {
  const [rideCosts, setRideCosts] = useState<RideCost[]>([]);
  const [filteredRideCosts, setFilteredRideCosts] = useState<RideCost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [filteredPriceCategories, setFilteredPriceCategories] = useState<PriceCategory[]>([]);
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState<Subcategory[]>([]);
  
  const [rideCostForm, setRideCostForm] = useState({
    category: '',
    subcategory: '',
    priceCategory: '',
    chargePerKm: '',
    chargePerMinute: '',
    pickCharges: '',
    nightCharges: '',
    cancellationFee: '',
    insurance: '',
    extraChargesFromAdmin: '',
    gst: '',
    discount: ''
  });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRideCost, setEditingRideCost] = useState<RideCost | null>(null);
  const [viewingRideCost, setViewingRideCost] = useState<RideCost | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Filter subcategories when category changes in form
  useEffect(() => {
    if (rideCostForm.category) {
      const filtered = subcategories.filter(sub => sub.categoryId === rideCostForm.category);
      setFilteredSubcategories(filtered);
      setRideCostForm(prev => ({ ...prev, subcategory: '', priceCategory: '' }));
      setFilteredPriceCategories([]);
    } else {
      setFilteredSubcategories([]);
      setFilteredPriceCategories([]);
    }
  }, [rideCostForm.category, subcategories]);

  // Show all price categories when subcategory is selected in form
  useEffect(() => {
    if (rideCostForm.subcategory) {
      setFilteredPriceCategories(priceCategories);
      setRideCostForm(prev => ({ ...prev, priceCategory: '' }));
    } else {
      setFilteredPriceCategories([]);
    }
  }, [rideCostForm.subcategory, priceCategories]);

  // Filter subcategories for filter dropdown
  useEffect(() => {
    if (filterCategory && filterCategory !== 'all') {
      const filtered = subcategories.filter(sub => sub.categoryId === filterCategory);
      setFilterSubcategoriesForFilter(filtered);
      setFilterSubcategory('all');
    } else {
      setFilterSubcategoriesForFilter([]);
      setFilterSubcategory('all');
    }
  }, [filterCategory, subcategories]);

  // Apply filters to ride costs
  useEffect(() => {
    let filtered = [...rideCosts];

    if (filterCategory && filterCategory !== 'all') {
      filtered = filtered.filter(rideCost => {
        const categoryId = typeof rideCost.category === 'string' ? rideCost.category : rideCost.category._id;
        return categoryId === filterCategory;
      });
    }

    if (filterSubcategory && filterSubcategory !== 'all') {
      filtered = filtered.filter(rideCost => {
        const subcategoryId = typeof rideCost.subcategory === 'string' ? rideCost.subcategory : rideCost.subcategory._id;
        return subcategoryId === filterSubcategory;
      });
    }

    setFilteredRideCosts(filtered);
  }, [rideCosts, filterCategory, filterSubcategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rideCostsRes, categoriesRes, subcategoriesRes, priceCategoriesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/ride-costs`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/categories`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/subcategories`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/price-categories`)
      ]);
      
      setRideCosts(rideCostsRes.data.data || rideCostsRes.data);
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
      setPriceCategories(priceCategoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      category: rideCostForm.category,
      subcategory: rideCostForm.subcategory,
      priceCategory: rideCostForm.priceCategory,
      chargePerKm: parseFloat(rideCostForm.chargePerKm) || 0,
      chargePerMinute: parseFloat(rideCostForm.chargePerMinute) || 0,
      pickCharges: parseFloat(rideCostForm.pickCharges) || 0,
      nightCharges: parseFloat(rideCostForm.nightCharges) || 0,
      cancellationFee: parseFloat(rideCostForm.cancellationFee) || 0,
      insurance: parseFloat(rideCostForm.insurance) || 0,
      extraChargesFromAdmin: parseFloat(rideCostForm.extraChargesFromAdmin) || 0,
      gst: parseFloat(rideCostForm.gst) || 0,
      discount: parseFloat(rideCostForm.discount) || 0
    };

    try {
      if (editingRideCost) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/ride-costs/${editingRideCost._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/ride-costs`, payload);
      }
      
      await fetchData();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving ride cost:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rideCost: RideCost) => {
    setEditingRideCost(rideCost);
    setRideCostForm({
      category: typeof rideCost.category === 'string' ? rideCost.category : rideCost.category._id,
      subcategory: typeof rideCost.subcategory === 'string' ? rideCost.subcategory : rideCost.subcategory._id,
      priceCategory: typeof rideCost.priceCategory === 'string' ? rideCost.priceCategory : rideCost.priceCategory._id,
      chargePerKm: rideCost.chargePerKm.toString(),
      chargePerMinute: rideCost.chargePerMinute.toString(),
      pickCharges: rideCost.pickCharges.toString(),
      nightCharges: rideCost.nightCharges.toString(),
      cancellationFee: rideCost.cancellationFee.toString(),
      insurance: rideCost.insurance.toString(),
      extraChargesFromAdmin: rideCost.extraChargesFromAdmin.toString(),
      gst: rideCost.gst.toString(),
      discount: rideCost.discount.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/ride-costs/${id}`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting ride cost:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingRideCost(null);
    setRideCostForm({
      category: '',
      subcategory: '',
      priceCategory: '',
      chargePerKm: '',
      chargePerMinute: '',
      pickCharges: '',
      nightCharges: '',
      cancellationFee: '',
      insurance: '',
      extraChargesFromAdmin: '',
      gst: '',
      discount: ''
    });
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterSubcategory('all');
  };

  const getName = (item: string | { name?: string; priceCategoryName?: string }): string => {
    if (typeof item === 'string') return 'Unknown';
    return item.name || item.priceCategoryName || 'Unknown';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ride Cost Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Ride Cost Models</h2>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ride Cost Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRideCost ? 'Edit' : 'Create'} Ride Cost Model</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={rideCostForm.category}
                    onValueChange={(value) => setRideCostForm(prev => ({ ...prev, category: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={rideCostForm.subcategory}
                    onValueChange={(value) => setRideCostForm(prev => ({ ...prev, subcategory: value }))}
                    disabled={!rideCostForm.category}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="col-span-2">
                    <Select
                      value={rideCostForm.priceCategory}
                      onValueChange={(value) => setRideCostForm(prev => ({ ...prev, priceCategory: value }))}
                      disabled={!rideCostForm.subcategory}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Driver Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPriceCategories.map((pc) => (
                          <SelectItem key={pc._id} value={pc._id}>
                            {pc.priceCategoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Charge per km"
                    value={rideCostForm.chargePerKm}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, chargePerKm: e.target.value }))}
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Charge per minute"
                    value={rideCostForm.chargePerMinute}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, chargePerMinute: e.target.value }))}
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Pick Charges"
                    value={rideCostForm.pickCharges}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, pickCharges: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Night Charges"
                    value={rideCostForm.nightCharges}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, nightCharges: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Cancellation Fee"
                    value={rideCostForm.cancellationFee}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, cancellationFee: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Insurance"
                    value={rideCostForm.insurance}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, insurance: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Admin Commission %"
                    value={rideCostForm.extraChargesFromAdmin}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, extraChargesFromAdmin: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="GST %"
                    value={rideCostForm.gst}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, gst: e.target.value }))}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Discount"
                    value={rideCostForm.discount}
                    onChange={(e) => setRideCostForm(prev => ({ ...prev, discount: e.target.value }))}
                  />

                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving...' : editingRideCost ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Filter Options</h3>
            {(filterCategory && filterCategory !== 'all') || (filterSubcategory && filterSubcategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Category
              </label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Subcategory
              </label>
              <Select 
                value={filterSubcategory} 
                onValueChange={setFilterSubcategory}
                disabled={!filterCategory || filterCategory === 'all'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {filterSubcategoriesForFilter.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {filteredRideCosts.length} of {rideCosts.length} models
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Driver Category</TableHead>
                <TableHead>Per Km</TableHead>
                <TableHead>Per Min</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">Loading...</TableCell>
                </TableRow>
              ) : filteredRideCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    {rideCosts.length === 0 
                      ? "No ride cost models found. Create your first one!"
                      : "No models match the selected filters."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredRideCosts.map((rideCost) => (
                  <TableRow key={rideCost._id}>
                    <TableCell>{getName(rideCost.category)}</TableCell>
                    <TableCell>{getName(rideCost.subcategory)}</TableCell>
                    <TableCell>{getName(rideCost.priceCategory)}</TableCell>
                    <TableCell>₹{rideCost.chargePerKm}</TableCell>
                    <TableCell>₹{rideCost.chargePerMinute}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingRideCost(rideCost);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rideCost)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={loading}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the ride cost model.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rideCost._id)}>
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
        </ScrollArea>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>View Ride Cost Model</DialogTitle>
            </DialogHeader>
            {viewingRideCost && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-gray-600">{getName(viewingRideCost.category)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Subcategory</label>
                  <p className="text-sm text-gray-600">{getName(viewingRideCost.subcategory)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Driver Category</label>
                  <p className="text-sm text-gray-600">{getName(viewingRideCost.priceCategory)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Pick Charges</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.pickCharges}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Night Charges</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.nightCharges}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Cancellation Fee</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.cancellationFee}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Insurance</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.insurance}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Commission</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.extraChargesFromAdmin}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">GST</label>
                  <p className="text-sm text-gray-600">{viewingRideCost.gst}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Discount</label>
                  <p className="text-sm text-gray-600">₹{viewingRideCost.discount}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};