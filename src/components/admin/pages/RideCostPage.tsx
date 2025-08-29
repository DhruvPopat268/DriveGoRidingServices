import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
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
  modelType: string;
  extraPerKm?: number;
  extraPerMinute?: number;
  pickCharges?: number;
  nightCharges?: number;
  cancellationFee?: number;
  insurance?: number;
  extraChargesFromAdmin?: number;
  gst?: number;
  discount?: number;
  // New fields from backend schema
  perKmRate?: number;
  perMinuteRate?: number;
  minimumFare?: number;
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

export const RideCostPage = () => {
  const [rideCosts, setRideCosts] = useState<RideCost[]>([]);
  const [rideCostForm, setRideCostForm] = useState<any>({});
  const [rideCostDialogOpen, setRideCostDialogOpen] = useState(false);
  const [editingRideCost, setEditingRideCost] = useState<RideCost | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewingRideCost, setViewingRideCost] = useState<RideCost | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchRideCosts();
      await fetchCategoriesAndSubcategories();
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchRideCosts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/ride-costs`);
      const fetchedRideCosts = res.data.data || res.data;
      if (Array.isArray(fetchedRideCosts)) {
        setRideCosts(fetchedRideCosts);
      } else {
        console.warn("API response for ride costs is not an array. Setting state to empty array.", res.data);
        setRideCosts([]);
      }
    } catch (error) {
      console.error('Error fetching ride costs:', error);
      setRideCosts([]);
    }
  };

  const fetchCategoriesAndSubcategories = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/categories`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/subcategories`)
      ]);
      
      console.log('Categories response:', categoriesRes.data);
      console.log('Subcategories response:', subcategoriesRes.data);
      
      // Based on your console output, the data is directly in the response
      const categoriesData = categoriesRes.data || [];
      const subcategoriesData = subcategoriesRes.data || [];
      
      console.log('Setting categories:', categoriesData);
      console.log('Setting subcategories:', subcategoriesData);
      
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);
    } catch (error) {
      console.error('Error fetching categories and subcategories:', error);
      setCategories([]);
      setSubcategories([]);
    }
  };

  const comprehensiveFields = [
    { key: 'extraPerKm', label: 'Per Km Charges', type: 'number' },
    { key: 'extraPerMinute', label: 'Per Minute Charges', type: 'number' },
    { key: 'pickCharges', label: 'Pick Charges', type: 'number' },
    { key: 'nightCharges', label: 'Night Charges', type: 'number' },
    { key: 'cancellationFee', label: 'Cancellation Fee', type: 'number' },
    { key: 'insurance', label: 'Insurance', type: 'number' },
    { key: 'extraChargesFromAdmin', label: 'Extra Charges from Admin in %', type: 'number' },
    { key: 'gst', label: 'GST in %', type: 'number' },
    { key: 'discount', label: 'Discount', type: 'number' },
  ];

  const simpleFields = [
    { key: 'perKmRate', label: 'Per Km Rate', type: 'number' },
    { key: 'perMinuteRate', label: 'Per Minute Rate', type: 'number' },
    { key: 'minimumFare', label: 'Minimum Fare', type: 'number' },
    { key: 'pickCharges', label: 'Pick Charges', type: 'number' },
    { key: 'nightCharges', label: 'Night Charges', type: 'number' },
    { key: 'cancellationFee', label: 'Cancellation Fee', type: 'number' },
    { key: 'insurance', label: 'Insurance', type: 'number' },
    { key: 'extraChargesFromAdmin', label: 'Extra Charges from Admin in %', type: 'number' },
    { key: 'gst', label: 'GST in %', type: 'number' },
    { key: 'discount', label: 'Discount', type: 'number' },
  ];

  const getFormFields = (subcategoryName: string) => {
    if (!subcategoryName) return simpleFields;
    
    const subcategory = subcategories.find(sub => sub.name.toLowerCase() === subcategoryName.toLowerCase());
    const category = subcategory && categories.find(cat => cat._id === subcategory.categoryId);

    if (category?.name.toLowerCase() === 'driver' && ['oneway', 'hourly'].includes(subcategoryName.toLowerCase())) {
        return comprehensiveFields;
    } else {
        return comprehensiveFields;
    }
  };

  // Get category ID by name
  const getCategoryIdByName = (categoryName: string): string => {
    const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    return category?._id || '';
  };

  // Get filtered subcategories based on selected category
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return [];
    const categoryId = getCategoryIdByName(selectedCategory);
    return subcategories.filter(sub => sub.categoryId === categoryId);
  };

  const handleRideCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const modelType = `${selectedCategory.toLowerCase()}-${selectedSubcategory.toLowerCase()}`;
      const payload = Object.fromEntries(
        Object.entries(rideCostForm).map(([key, value]) => [
          key,
          parseFloat(String(value || '0'))
        ])
      );
      payload.modelType = modelType;

      await axios.post(`${import.meta.env.VITE_API_URL}/api/ride-costs`, payload);
      fetchRideCosts();
      setRideCostDialogOpen(false);
      setRideCostForm({});
      setSelectedCategory('');
      setSelectedSubcategory('');
      alert('Ride cost model created successfully!');
    } catch (error) {
      console.error('Error creating ride cost:', error);
      alert('Failed to create ride cost model');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRideCost?._id) return;

    try {
      setLoading(true);
      const modelType = `${selectedCategory.toLowerCase()}-${selectedSubcategory.toLowerCase()}`;
      const payload = Object.fromEntries(
        Object.entries(rideCostForm).map(([key, value]) => [
          key,
          parseFloat(String(value || '0'))
        ])
      );
      payload.modelType = modelType;

      await axios.put(`${import.meta.env.VITE_API_URL}/api/ride-costs/${editingRideCost._id}`, payload);
      fetchRideCosts();
      setEditDialogOpen(false);
      setEditingRideCost(null);
      setRideCostForm({});
      setSelectedCategory('');
      setSelectedSubcategory('');
      alert('Ride cost model updated successfully!');
    } catch (error) {
      console.error('Error updating ride cost:', error);
      alert('Failed to update ride cost model');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rideCost: RideCost) => {
    setEditingRideCost(rideCost);
    
    // Parse the modelType to get category and subcategory
    const modelTypeParts = rideCost.modelType.split('-');
    if (modelTypeParts.length >= 2) {
      const categoryName = modelTypeParts[0];
      const subcategoryName = modelTypeParts[1];
      
      // Find the actual category name (case-insensitive)
      const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
      const subcategory = subcategories.find(sub => sub.name.toLowerCase() === subcategoryName.toLowerCase());
      
      setSelectedCategory(category?.name || categoryName);
      setSelectedSubcategory(subcategory?.name || subcategoryName);
    }

    // Populate form with existing data
    const newForm: any = {};
    Object.entries(rideCost).forEach(([key, value]) => {
      if (key !== '_id' && key !== 'modelType' && typeof value !== 'undefined') {
        newForm[key] = value?.toString() || '';
      }
    });
    setRideCostForm(newForm);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;

    try {
      setLoading(true);
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/ride-costs/${id}`);
      fetchRideCosts();
      alert('Ride cost model deleted successfully!');
    } catch (error) {
      console.error('Error deleting ride cost:', error);
      alert('Failed to delete ride cost model');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (rideCost: RideCost) => {
    setViewingRideCost(rideCost);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Ride Cost Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Ride Cost Models</h2>
          
          <Dialog open={rideCostDialogOpen} onOpenChange={setRideCostDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setRideCostForm({});
                setSelectedCategory('');
                setSelectedSubcategory('');
              }} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ride Cost Model
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Ride Cost Model</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRideCostSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <Select onValueChange={(value) => {
                      setSelectedCategory(value);
                      setSelectedSubcategory(''); // Reset subcategory when category changes
                    }} value={selectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subcategory</label>
                    <Select onValueChange={setSelectedSubcategory} value={selectedSubcategory} disabled={!selectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredSubcategories().map((sub) => (
                          <SelectItem key={sub._id} value={sub.name}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory && selectedSubcategory && (
                    getFormFields(selectedSubcategory).map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium mb-1">{field.label}</label>
                        <Input
                          type={field.type}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          value={rideCostForm[field.key] || ''}
                          onChange={(e) =>
                            setRideCostForm((prev: any) => ({
                              ...prev,
                              [field.key]: e.target.value
                            }))
                          }
                          required
                        />
                      </div>
                    ))
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || !selectedCategory || !selectedSubcategory}>
                  {loading ? 'Creating...' : 'Submit'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Ride Cost Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedSubcategory(''); // Reset subcategory when category changes
                  }} value={selectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subcategory</label>
                  <Select onValueChange={setSelectedSubcategory} value={selectedSubcategory} disabled={!selectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredSubcategories().map((sub) => (
                        <SelectItem key={sub._id} value={sub.name}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedCategory && selectedSubcategory && (
                  getFormFields(selectedSubcategory).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1">{field.label}</label>
                      <Input
                        type={field.type}
                        value={rideCostForm[field.key] || ''}
                        onChange={(e) =>
                          setRideCostForm((prev: any) => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))
                        }
                        required
                      />
                    </div>
                  ))
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || !selectedCategory || !selectedSubcategory}>
                {loading ? 'Updating...' : 'Update'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rideCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                    No ride cost model found. Add your first one!
                  </TableCell>
                </TableRow>
              ) : (
                rideCosts.map((rideCost) => (
                  <TableRow key={rideCost._id}>
                    <TableCell>{rideCost.modelType}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(rideCost)}
                          disabled={loading}
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
                                This will delete the ride cost permanently. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(rideCost._id)}
                                disabled={loading}
                              >
                                {loading ? 'Deleting...' : 'Delete'}
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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Ride Cost Model</DialogTitle>
            </DialogHeader>
            {viewingRideCost && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Model Type</label>
                  <Input value={viewingRideCost.modelType} readOnly />
                </div>
                {(() => {
                  const modelTypeParts = viewingRideCost.modelType.split('-');
                  const subcategoryName = modelTypeParts.length >= 2 ? modelTypeParts[1] : '';
                  return getFormFields(subcategoryName).map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1">{field.label}</label>
                      <Input 
                        value={viewingRideCost[field.key as keyof RideCost]?.toString() || '0'} 
                        readOnly 
                      />
                    </div>
                  ));
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};