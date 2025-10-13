import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';

interface Driver {
  _id: string;
  personalInformation: {
    fullName: string;
    mobileNumber: string;
    email: string;
  };
  mobile: string;
  status: string;
  driverCategory?: { _id: string; priceCategoryName: string; };
  parcelCategory?: { _id: string; categoryName: string; };
  assignedCar?: { _id: string; name: string; };
}

const categoryConfig = {
  driver: {
    field: 'driverCategory',
    endpoint: '/api/driver/assign-category',
    displayField: 'priceCategoryName',
    title: 'Driver Category'
  },
  parcel: {
    field: 'parcelCategory',
    endpoint: '/api/driver/assign-parcel-category', 
    displayField: 'categoryName',
    title: 'Parcel Category'
  }
};

const carAssignmentConfig = {
  field: 'assignedCar',
  endpoint: '/api/driver/assign-car',
  displayField: 'name',
  title: 'Assigned Car'
};

export const UniversalCategoryAssignmentPage = () => {
  const { categoryType, categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const categoryName = location.state?.categoryName || 'Category';
  const isCarAssignment = location.state?.isCarAssignment || false;
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const config = isCarAssignment ? carAssignmentConfig : categoryConfig[categoryType as keyof typeof categoryConfig];

  useEffect(() => {
    if (!config) {
      navigate(-1);
      return;
    }
    fetchDrivers();
  }, [categoryId, categoryType]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/driver`);
      
      // Filter drivers: no assignments OR current assignment only
      const filteredDrivers = res.data.filter((driver: Driver) => {
        const hasDriverCategory = driver.driverCategory;
        const hasParcelCategory = driver.parcelCategory;
        const hasAssignedCar = driver.assignedCar;
        
        // Count existing assignments
        const assignmentCount = [hasDriverCategory, hasParcelCategory, hasAssignedCar].filter(Boolean).length;
        
        // Allow if no assignments OR only has current assignment
        if (assignmentCount === 0) return true;
        if (assignmentCount === 1 && (driver[config.field as keyof Driver] as any)?._id === categoryId) return true;
        
        return false;
      });
      
      setDrivers(filteredDrivers);
      
      // Pre-select drivers already in this category
      const preSelected = filteredDrivers
        .filter((driver: Driver) => (driver[config.field as keyof Driver] as any)?._id === categoryId)
        .map((driver: Driver) => driver._id);
      setSelectedDrivers(preSelected);
      
    } catch (err) {
      console.error('Failed to fetch drivers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelect = (driverId: string, checked: boolean) => {
    if (checked) {
      setSelectedDrivers([...selectedDrivers, driverId]);
    } else {
      setSelectedDrivers(selectedDrivers.filter(id => id !== driverId));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = isCarAssignment 
        ? { carId: categoryId, driverIds: selectedDrivers }
        : { categoryId, driverIds: selectedDrivers };
        
      await axios.put(`${import.meta.env.VITE_API_URL}${config.endpoint}`, payload);
      
      navigate(-1);
    } catch (err) {
      console.error(`Failed to assign drivers to ${isCarAssignment ? 'car' : categoryType + ' category'}`, err);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentCategory = (driver: Driver) => {
    const category = driver[config.field as keyof Driver] as any;
    return category?.[config.displayField] || 'No Category';
  };

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 mt-10">
          <Button variant="outline" className='ml-5' onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Assign Drivers to {isCarAssignment ? 'Car: ' : ''}{categoryName}</h1>
        </div>
        
        <Button onClick={handleSave} disabled={saving} className='mt-10 mr-5'>
          {saving ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Assignment
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Available Drivers</h2>
          {/* <p className="text-gray-600">
            Select drivers to assign to <strong>{categoryName}</strong> {config.title.toLowerCase()}. 
            Drivers already assigned to this category are pre-selected.
          </p> */}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            <span>Loading drivers...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Driver Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current {config.title}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No drivers available for assignment
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => (
                  <TableRow key={driver._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDrivers.includes(driver._id)}
                        onCheckedChange={(checked) => 
                          handleDriverSelect(driver._id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {driver.personalInformation?.fullName || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {driver.personalInformation?.mobileNumber || driver.mobile}
                    </TableCell>
                    <TableCell>
                      {driver.personalInformation?.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getCurrentCategory(driver)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        driver.status === 'Approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {driver.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};