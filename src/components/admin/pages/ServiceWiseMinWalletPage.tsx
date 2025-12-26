import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye, X, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
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
import apiClient from '../../../lib/axiosInterceptor';

interface ServiceWalletBalance {
  _id?: string;
  category: string | { _id?: string; id?: string; name: string };
  subcategory: string | { _id?: string; id?: string; name: string };
  subSubCategory?: string | { _id?: string; id?: string; name: string };
  minWalletBalance: number;
}

interface Category {
  _id: string;
  name: string;
}

interface Subcategory {
  _id?: string;
  id?: string;
  name: string;
  categoryId: string;
}

interface SubSubCategory {
  _id?: string;
  id?: string;
  name: string;
  categoryId: string;
  subCategoryId: string;
}

export const ServiceWiseMinWalletPage = () => {
  const [walletBalances, setWalletBalances] = useState<ServiceWalletBalance[]>([]);
  const [filteredWalletBalances, setFilteredWalletBalances] = useState<ServiceWalletBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubSubCategories, setFilteredSubSubCategories] = useState<SubSubCategory[]>([]);

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSubcategory, setFilterSubcategory] = useState<string>('all');
  const [filterSubcategoriesForFilter, setFilterSubcategoriesForFilter] = useState<Subcategory[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [paginatedWalletBalances, setPaginatedWalletBalances] = useState<ServiceWalletBalance[]>([]);

  const [walletForm, setWalletForm] = useState({
    category: '',
    subcategory: '',
    subSubCategory: '',
    minWalletBalance: ''
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWalletBalance, setEditingWalletBalance] = useState<ServiceWalletBalance | null>(null);
  const [viewingWalletBalance, setViewingWalletBalance] = useState<ServiceWalletBalance | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper function to extract ID from objects that might have either _id or id
  const extractId = (item: string | { _id?: string; id?: string }) => {
    if (typeof item === 'string') return item;
    return item._id || item.id || '';
  };

  // Helper function to get selected subcategory name from form
  const getSelectedSubCategoryName = () => {
    const selectedSubCategory = subcategories.find(sub => (sub.id || sub._id) === walletForm.subcategory);
    return selectedSubCategory ? selectedSubCategory.name : '';
  };

  const isOutstationSubCategory = () => {
    return getSelectedSubCategoryName().toLowerCase() === 'outstation';
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter subcategories when category changes in form
  useEffect(() => {
    if (walletForm.category) {
      const filtered = subcategories.filter(sub => sub.categoryId === walletForm.category);
      setFilteredSubcategories(filtered);
      setWalletForm(prev => ({ ...prev, subcategory: '', subSubCategory: '' }));
      setFilteredSubSubCategories([]);
    } else {
      setFilteredSubcategories([]);
      setFilteredSubSubCategories([]);
    }
  }, [walletForm.category, subcategories]);

  // Filter sub-subcategories when subcategory changes in form
  useEffect(() => {
    if (walletForm.subcategory) {
      const filtered = subSubCategories.filter(subSub =>
        subSub.categoryId === walletForm.category &&
        subSub.subCategoryId === walletForm.subcategory
      );
      setFilteredSubSubCategories(filtered);
      setWalletForm(prev => ({ ...prev, subSubCategory: '' }));
    } else {
      setFilteredSubSubCategories([]);
    }
  }, [walletForm.subcategory, subSubCategories]);

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

  // Apply filters to wallet balances
  useEffect(() => {
    let filtered = [...walletBalances];

    if (filterCategory && filterCategory !== 'all') {
      filtered = filtered.filter(walletBalance => {
        const categoryId = extractId(walletBalance.category);
        return categoryId === filterCategory;
      });
    }

    if (filterSubcategory && filterSubcategory !== 'all') {
      filtered = filtered.filter(walletBalance => {
        const subcategoryId = extractId(walletBalance.subcategory);
        return subcategoryId === filterSubcategory;
      });
    }

    setFilteredWalletBalances(filtered);
    setCurrentPage(1);
  }, [walletBalances, filterCategory, filterSubcategory]);

  // Pagination logic
  useEffect(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    setPaginatedWalletBalances(filteredWalletBalances.slice(startIndex, endIndex));
  }, [filteredWalletBalances, currentPage, recordsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredWalletBalances.length / recordsPerPage);
  const startRecord = filteredWalletBalances.length === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, filteredWalletBalances.length);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [walletBalancesRes, categoriesRes, subcategoriesRes, subSubCategoriesRes] = await Promise.all([
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/service-wallet-balances`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/subcategories`),
        apiClient.get(`${import.meta.env.VITE_API_URL}/api/subsubcategories`)
      ]);

      setWalletBalances(walletBalancesRes.data.data || walletBalancesRes.data);
      setCategories(categoriesRes.data);
      setSubcategories(subcategoriesRes.data);
      setSubSubCategories(subSubCategoriesRes.data);
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
      category: walletForm.category,
      subcategory: walletForm.subcategory,
      ...(walletForm.subSubCategory && { subSubCategory: walletForm.subSubCategory }),
      minWalletBalance: parseFloat(walletForm.minWalletBalance) || 0
    };

    try {
      if (editingWalletBalance) {
        await apiClient.put(`${import.meta.env.VITE_API_URL}/api/service-wallet-balances/${editingWalletBalance._id}`, payload);
      } else {
        await apiClient.post(`${import.meta.env.VITE_API_URL}/api/service-wallet-balances`, payload);
      }

      await fetchData();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (walletBalance: ServiceWalletBalance) => {
    setEditingWalletBalance(walletBalance);

    const categoryId = extractId(walletBalance.category);
    const subcategoryId = extractId(walletBalance.subcategory);
    const subSubCategoryId = walletBalance.subSubCategory ? extractId(walletBalance.subSubCategory) : '';

    // Set filtered subcategories first
    const filteredSubs = subcategories.filter(sub => sub.categoryId === categoryId);
    setFilteredSubcategories(filteredSubs);

    // Set filtered sub-subcategories
    const filteredSubSubs = subSubCategories.filter(subSub =>
      subSub.categoryId === categoryId && subSub.subCategoryId === subcategoryId
    );
    setFilteredSubSubCategories(filteredSubSubs);

    setWalletForm({
      category: categoryId,
      subcategory: subcategoryId,
      subSubCategory: subSubCategoryId,
      minWalletBalance: walletBalance.minWalletBalance.toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await apiClient.delete(`${import.meta.env.VITE_API_URL}/api/service-wallet-balances/${id}`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingWalletBalance(null);
    setWalletForm({
      category: '',
      subcategory: '',
      subSubCategory: '',
      minWalletBalance: ''
    });
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterSubcategory('all');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const getName = (item: string | { name?: string } | null | undefined): string => {
    if (!item || item === '') return 'Unknown';
    if (typeof item === 'string') return item;
    return item.name || 'Unknown';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Service Wise Min Wallet Balance</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-end mb-1">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Create Balance Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingWalletBalance ? 'Edit' : 'Create'} Wallet Balance Rule</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  value={walletForm.category}
                  onValueChange={(value) => setWalletForm(prev => ({ ...prev, category: value }))}
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
                  value={walletForm.subcategory}
                  onValueChange={(value) => setWalletForm(prev => ({ ...prev, subcategory: value }))}
                  disabled={!walletForm.category}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((sub) => (
                      <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isOutstationSubCategory() && (
                  <Select
                    value={walletForm.subSubCategory}
                    onValueChange={(value) => setWalletForm(prev => ({ ...prev, subSubCategory: value }))}
                    disabled={!walletForm.subcategory}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Sub-Sub Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubSubCategories.map((subSub) => (
                        <SelectItem key={subSub.id || subSub._id} value={subSub.id || subSub._id}>
                          {subSub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  type="number"
                  step="0.01"
                  placeholder="Minimum Wallet Balance (₹)"
                  value={walletForm.minWalletBalance}
                  onChange={(e) => setWalletForm(prev => ({ ...prev, minWalletBalance: e.target.value }))}
                  required
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Saving...' : editingWalletBalance ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
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
              <Select
                value={filterCategory}
                onValueChange={setFilterCategory}
              >
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
                    <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Showing {startRecord}-{endRecord} of {filteredWalletBalances.length} rules
              </div>
            </div>
          </div>
        </div>

        {/* Records per page selector */}
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show</span>
            <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">records</span>
          </div>
        </div>

        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Sub-Sub Category</TableHead>
                <TableHead>Min Wallet Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center items-center">
                      <Loader className="w-6 h-6 animate-spin mr-2" />
                      <span>Loading wallet balance rules...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredWalletBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    {walletBalances.length === 0
                      ? "No wallet balance rules found. Create your first one!"
                      : "No rules match the selected filters."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                paginatedWalletBalances.map((walletBalance, index) => (
                  <TableRow key={walletBalance._id}>
                    <TableCell>{(currentPage - 1) * recordsPerPage + index + 1}</TableCell>
                    <TableCell>{getName(walletBalance.category)}</TableCell>
                    <TableCell>{getName(walletBalance.subcategory)}</TableCell>
                    <TableCell>{walletBalance.subSubCategory ? getName(walletBalance.subSubCategory) : '-'}</TableCell>
                    <TableCell>₹{walletBalance.minWalletBalance}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingWalletBalance(walletBalance);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(walletBalance)}
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
                                This will permanently delete the wallet balance rule.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(walletBalance._id)}>
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

        {/* Pagination Controls */}
        {filteredWalletBalances.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {startRecord} to {endRecord} of {filteredWalletBalances.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>View Wallet Balance Rule</DialogTitle>
            </DialogHeader>
            {viewingWalletBalance && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-gray-600">{getName(viewingWalletBalance.category)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Subcategory</label>
                  <p className="text-sm text-gray-600">{getName(viewingWalletBalance.subcategory)}</p>
                </div>
                {viewingWalletBalance.subSubCategory && (
                  <div>
                    <label className="text-sm font-medium">Sub-Sub Category</label>
                    <p className="text-sm text-gray-600">{getName(viewingWalletBalance.subSubCategory)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Minimum Wallet Balance</label>
                  <p className="text-sm text-gray-600">₹{viewingWalletBalance.minWalletBalance}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
};