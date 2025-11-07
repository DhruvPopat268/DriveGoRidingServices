import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UniversalCategoryAssignmentPage } from '@/components/admin/pages/UniversalCategoryAssignmentPage';
import axios from 'axios';

interface AxiosError {
  response?: {
    status: number;
  };
}

export const CategoryAssignmentPage = () => {
  const { categoryType, categoryId } = useParams<{ categoryType: string; categoryId: string }>();
  const navigate = useNavigate();
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!categoryType || !categoryId) {
      navigate('/');
      return;
    }

    fetchCategoryName();
  }, [categoryType, categoryId]);

  const fetchCategoryName = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      let nameField = '';

      switch (categoryType) {
        case 'parcel':
          endpoint = `/api/parcel-categories/${categoryId}`;
          nameField = 'categoryName';
          break;
        case 'driver':
          endpoint = `/api/price-categories/${categoryId}`;
          nameField = 'priceCategoryName';
          break;
        case 'car':
          endpoint = `/api/cars/${categoryId}`;
          nameField = 'name';
          break;
        default:
          setError('Invalid category type');
          return;
      }

      const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`);
      setCategoryName(response.data[nameField] || 'Unknown Category');
    } catch (err) {
      console.error('Failed to fetch category details:', err);
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 404) {
        setError('Category not found');
      } else {
        setError('Failed to load category details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading category details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!categoryType || !categoryId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <UniversalCategoryAssignmentPage
        categoryType={categoryType}
        categoryId={categoryId}
        categoryName={categoryName}
        isCarAssignment={categoryType === 'car'}
        onBack={handleBack}
      />
    </div>
  );
};