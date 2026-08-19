import { useState } from "react";
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
  _id?: string;
  id?: string;
  name: string;
  categoryId: string;
}

interface DropdownPerson {
  _id: string;
  name: string;
  mobile: string;
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
  filterRider: string;
  setFilterRider: (value: string) => void;
  filterDriver: string;
  setFilterDriver: (value: string) => void;
  filterStatus?: string;
  setFilterStatus?: (value: string) => void;
  statusCounts?: Record<string, number>;
}

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'BOOKED',    label: 'Booked' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ONGOING',   label: 'Ongoing' },
  { value: 'REACHED',   label: 'Reached' },
  { value: 'EXTENDED',  label: 'Extended' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

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
  filterSubcategoriesForFilter,
  filterRider,
  setFilterRider,
  filterDriver,
  setFilterDriver,
  filterStatus = 'all',
  setFilterStatus,
  statusCounts = {},
}: RideFiltersProps) => {
  const [riderSearch, setRiderSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/categories`);
      return response.data || [];
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/cities`);
      return response.data || [];
    },
  });

  const { data: riders = [] } = useQuery<DropdownPerson[]>({
    queryKey: ["riders-list", riderSearch],
    queryFn: async () => {
      const params = riderSearch ? `?search=${encodeURIComponent(riderSearch)}` : '';
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/admin/riders-list${params}`);
      return response.data?.data || [];
    },
  });

  const { data: drivers = [] } = useQuery<DropdownPerson[]>({
    queryKey: ["drivers-list", driverSearch],
    queryFn: async () => {
      const params = driverSearch ? `?search=${encodeURIComponent(driverSearch)}` : '';
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/admin/drivers-list${params}`);
      return response.data?.data || [];
    },
  });

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const hasActiveFilters =
    (filterCategory && filterCategory !== 'all') ||
    (filterSubcategory && filterSubcategory !== 'all') ||
    (filterCity && filterCity !== 'all') ||
    (filterRider && filterRider !== 'all') ||
    (filterDriver && filterDriver !== 'all') ||
    (filterStatus && filterStatus !== 'all') ||
    searchQuery || dateFilter || dateRange.from || dateRange.to;

  return (
    <div className="mb-6 p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Row 1 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: Category) => (
                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
          <Select
            value={filterSubcategory}
            onValueChange={setFilterSubcategory}
            disabled={!filterCategory || filterCategory === 'all'}
          >
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {filterSubcategoriesForFilter.map((sub: SubCategory) => (
                <SelectItem key={sub._id || sub.id} value={sub._id || sub.id}>{sub.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city: any) => (
                <SelectItem key={city._id} value={city.name}>{city.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rider</label>
          <Select value={filterRider} onValueChange={setFilterRider}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All Riders" /></SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search rider..."
                  value={riderSearch}
                  onChange={(e) => setRiderSearch(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <SelectItem value="all">All Riders</SelectItem>
              {riders.map((rider) => (
                <SelectItem key={rider._id} value={rider._id}>
                  <span className="font-medium">{rider.name || 'N/A'}</span>
                  <span className="text-gray-500 ml-1 text-xs">· {rider.mobile}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Partner</label>
          <Select value={filterDriver} onValueChange={setFilterDriver}>
            <SelectTrigger className="w-full"><SelectValue placeholder="All Partners" /></SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search partner..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <SelectItem value="all">All Partners</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver._id} value={driver._id}>
                  <span className="font-medium">{driver.name || 'N/A'}</span>
                  <span className="text-gray-500 ml-1 text-xs">· {driver.mobile}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => handleDateRangeChange('from', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => handleDateRangeChange('to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        {/* Status Filter — after To Date */}
        {setFilterStatus && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{label}</span>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {value === 'all' ? totalCount : (statusCounts[value] ?? 0)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      </div>

      <div className="flex items-center justify-end space-x-2 mt-3">
        <Button variant="default" size="sm" onClick={applyFilters} className="text-xs h-8">
          <Search className="w-3 h-3 mr-1" />
          Apply
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs h-8">
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
