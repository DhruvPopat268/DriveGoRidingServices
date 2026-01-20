import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/axiosInterceptor";

interface Category {
  _id: string;
  name: string;
}

interface SubCategory {
  _id: string;
  name: string;
  categoryId: string;
}

interface RideFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  filterSubcategory: string;
  setFilterSubcategory: (value: string) => void;
  filterCity: string;
  setFilterCity: (value: string) => void;
  dateRange: { from: string; to: string };
  handleDateRangeChange: (field: 'from' | 'to', value: string) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  dateFilter: string;
  filterSubcategoriesForFilter: SubCategory[];
}

export const RideFilters = ({
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  filterSubcategory,
  setFilterSubcategory,
  filterCity,
  setFilterCity,
  dateRange,
  handleDateRangeChange,
  clearFilters,
  applyFilters,
  dateFilter,
  filterSubcategoriesForFilter
}: RideFiltersProps) => {
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      return response.data || [];
    },
  });

  // Fetch cities
  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/cities`);
      return response.data || [];
    },
  });

  return (
    <div className="mb-6 p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <Select
            value={filterCategory}
            onValueChange={setFilterCategory}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: Category) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Subcategory
          </label>
          <Select
            value={filterSubcategory}
            onValueChange={setFilterSubcategory}
            disabled={!filterCategory || filterCategory === 'all'}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {filterSubcategoriesForFilter.map((sub: SubCategory) => (
                <SelectItem key={sub._id} value={sub._id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            City
          </label>
          <Select
            value={filterCity}
            onValueChange={setFilterCity}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city: any) => (
                <SelectItem key={city._id} value={city.name}>
                  {city.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => handleDateRangeChange('from', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => handleDateRangeChange('to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div className="flex items-end space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={applyFilters}
            className="text-xs h-8"
          >
            <Search className="w-3 h-3 mr-1" />
            Apply
          </Button>
          {((filterCategory && filterCategory !== 'all') || (filterSubcategory && filterSubcategory !== 'all') || (filterCity && filterCity !== 'all') || searchQuery || dateFilter || dateRange.from || dateRange.to) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs h-8"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};