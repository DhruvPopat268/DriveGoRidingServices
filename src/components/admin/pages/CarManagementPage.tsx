import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Car {
  _id: string;
  name: string;
  description: string;
  category: {
    _id: string;
    name: string;
  } | null;
  image: string;
  seater: number;
  status: boolean;
  createdAt: string;
}

interface CarCategory {
  _id: string;
  name: string;
}

interface CarForm {
  name: string;
  description: string;
  category: string;
  image: File | null;
  seater: string;
  existingImageUrl?: string;
}

export const CarManagementPage = () => {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [filteredCars, setFilteredCars] = useState<Car[]>([]);
  const [categories, setCategories] = useState<CarCategory[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [carForm, setCarForm] = useState<CarForm>({
    name: '',
    description: '',
    category: '',
    image: null,
    seater: '',
    existingImageUrl: ''
  });

  useEffect(() => {
    fetchCars();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (filterCategory === 'all') {
      setFilteredCars(cars);
    } else {
      setFilteredCars(cars.filter(car => car.category?._id === filterCategory));
    }
  }, [cars, filterCategory]);

  const fetchCars = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/cars`);
      setCars(response.data);
    } catch (error) {
      console.error('Error fetching cars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/car-categories`);
      setCategories(response.data.filter((cat: CarCategory & { status: boolean }) => cat.status));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/image`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = '';
      if (carForm.image) {
        imageUrl = await uploadImageToCloudinary(carForm.image);
      }

      const payload = {
        name: carForm.name,
        description: carForm.description,
        category: carForm.category,
        seater: parseInt(carForm.seater),
        ...(imageUrl && { image: imageUrl })
      };

      if (editingCar) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/cars/${editingCar._id}`, payload);
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/cars`, payload);
      }
      
      await fetchCars();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving car:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    setCarForm({
      name: car.name,
      description: car.description,
      category: car.category?._id || '',
      image: null,
      seater: car.seater.toString(),
      existingImageUrl: car.image
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/cars/${id}`);
      await fetchCars();
    } catch (error) {
      console.error('Error deleting car:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: boolean) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/cars/${id}/status`, {
        status: !currentStatus
      });
      await fetchCars();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setEditingCar(null);
    setCarForm({
      name: '',
      description: '',
      category: '',
      image: null,
      seater: '',
      existingImageUrl: ''
    });
  };

  const handleViewDrivers = (car: Car) => {
    navigate(`/admin/category-assignment/car/${car._id}`, {
      state: { categoryName: car.name, isCarAssignment: true }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Car Management</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category._id} value={category._id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Car
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCar ? 'Edit' : 'Add'} Car</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  value={carForm.category}
                  onValueChange={(value) => setCarForm(prev => ({ ...prev, category: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {carForm.existingImageUrl && (
                  <div className="mb-2">
                    <img src={carForm.existingImageUrl} alt="Current" className="w-20 h-20 object-cover rounded" />
                    <p className="text-sm text-gray-500">Current Image</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCarForm(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                  required={!editingCar}
                />

                <Input
                  placeholder="Car Name"
                  value={carForm.name}
                  onChange={(e) => setCarForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />

                <Input
                  type="number"
                  placeholder="Seater (e.g., 4, 7)"
                  value={carForm.seater}
                  onChange={(e) => setCarForm(prev => ({ ...prev, seater: e.target.value }))}
                  required
                  min="1"
                />

                <Textarea
                  placeholder="Description"
                  value={carForm.description}
                  onChange={(e) => setCarForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {editingCar ? 'Update' : 'Add'} Car
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading cars...</span>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">{cars.length === 0 ? 'No data found! Add first car.' : 'No cars found for selected category.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {/* <TableHead>Image</TableHead> */}
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Seater</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCars.map((car,index) => (
                <TableRow key={car._id}>
                  {/* <TableCell>
                    {car.image && (
                      <img src={car.image} alt={car.name} className="w-12 h-12 object-cover rounded" />
                    )}
                  </TableCell> */}
                  <TableCell>{index+1}</TableCell>
                  <TableCell className="font-medium">{car.name}</TableCell>
                  <TableCell>{car.category?.name || 'No Category'}</TableCell>
                  <TableCell>{car.seater}</TableCell>
                  <TableCell>{car.description}</TableCell>
                  <TableCell>
                    <Switch
                      checked={car.status}
                      onCheckedChange={() => handleStatusToggle(car._id, car.status)}
                    />
                  </TableCell>
                  <TableCell>{new Date(car.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDrivers(car)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(car)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(car._id)}
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