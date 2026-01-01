import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '../../lib/axiosInterceptor';

const COLORS = {
  driver: '#3b82f6',
  cab: '#10b981',
  parcel: '#f59e0b'
};

export const RevenueDistributionChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [error, setError] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/dashboard/revenue-distribution`);
      const data = response.data.data;
      
      const formattedData = [
        { name: 'Driver', value: data.driver, color: COLORS.driver },
        { name: 'Cab', value: data.cab, color: COLORS.cab },
        { name: 'Parcel', value: data.parcel, color: COLORS.parcel }
      ].filter(item => item.value > 0);
      
      const total = data.driver + data.cab + data.parcel;
      setTotalRevenue(total);
      setData(formattedData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  let cumulativePercentage = 0;

  const createPieSlice = (item, index) => {
    const percentage = (item.value / totalRevenue) * 100;
    const startAngle = cumulativePercentage * 3.6; // Convert to degrees
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    cumulativePercentage += percentage;

    const isLargeArc = percentage > 50 ? 1 : 0;
    const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);

    const pathData = [
      'M', 50, 50,
      'L', x1, y1,
      'A', 40, 40, 0, isLargeArc, 1, x2, y2,
      'Z'
    ].join(' ');

    return (
      <path
        key={index}
        d={pathData}
        fill={item.color}
        stroke="white"
        strokeWidth="1"
        className="cursor-pointer transition-opacity duration-200"
        style={{ opacity: hoveredSlice === index ? 0.8 : 1 }}
        title={`${item.name}: ${formatCurrency(item.value)} (${((item.value / totalRevenue) * 100).toFixed(1)}%)`}
        onMouseEnter={(e) => {
          setHoveredSlice(index);
          setTooltipPosition({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setHoveredSlice(null)}
        onMouseMove={(e) => {
          setTooltipPosition({ x: e.clientX, y: e.clientY });
        }}
      />
    );
  };

  return (
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Revenue Distribution by Category
        </CardTitle>
        <p className="text-sm text-gray-600">
          Total: {formatCurrency(totalRevenue)}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg width="280" height="280" viewBox="0 0 100 100">
                {data.map((item, index) => createPieSlice(item, index))}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs font-bold">{formatCurrency(totalRevenue)}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            {hoveredSlice !== null && data[hoveredSlice] && (
              <div 
                className="fixed bg-black text-white px-3 py-2 rounded-lg shadow-lg text-sm z-50 pointer-events-none"
                style={{
                  left: tooltipPosition.x + 10,
                  top: tooltipPosition.y - 40,
                }}
              >
                <div className="font-medium">{data[hoveredSlice].name}</div>
                <div>Revenue: {formatCurrency(data[hoveredSlice].value)}</div>
                <div>Share: {((data[hoveredSlice].value / totalRevenue) * 100).toFixed(1)}%</div>
              </div>
            )}
            <div className="space-y-2 mt-4 w-full">
              {data.map((item, index) => {
                const percentage = ((item.value / totalRevenue) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-xs font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">{formatCurrency(item.value)}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};