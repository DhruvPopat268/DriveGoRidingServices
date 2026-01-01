import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import apiClient from '../../lib/axiosInterceptor';

const COLORS = {
  booked: '#f59e0b',
  confirmed: '#10b981', 
  ongoing: '#3b82f6',
  completed: '#059669',
  cancelled: '#ef4444',
  extended: '#8b5cf6',
  reached: '#06b6d4'
};

export const RideStatusChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchRideStatusData();
  }, []);

  const fetchRideStatusData = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/dashboard/ride-status-distribution`);
      const data = response.data.data;
      
      const formattedData = [
        { name: 'Booked', value: data.BOOKED, color: COLORS.booked },
        { name: 'Confirmed', value: data.CONFIRMED, color: COLORS.confirmed },
        { name: 'Ongoing', value: data.ONGOING, color: COLORS.ongoing },
        { name: 'Completed', value: data.COMPLETED, color: COLORS.completed },
        { name: 'Cancelled', value: data.CANCELLED, color: COLORS.cancelled },
        { name: 'Extended', value: data.EXTENDED, color: COLORS.extended },
        { name: 'Reached', value: data.REACHED, color: COLORS.reached }
      ].filter(item => item.value > 0);
      
      setData(formattedData);
    } catch (error) {
      console.error('Error fetching ride status data:', error);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  const createPieSlice = (item, index) => {
    const percentage = (item.value / total) * 100;
    const startAngle = cumulativePercentage * 3.6; // Convert to degrees
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    const midAngle = (startAngle + endAngle) / 2;
    cumulativePercentage += percentage;

    const isLargeArc = percentage > 50 ? 1 : 0;
    const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);

    // Calculate text position (middle of the slice)
    const textX = 50 + 25 * Math.cos((midAngle - 90) * Math.PI / 180);
    const textY = 50 + 25 * Math.sin((midAngle - 90) * Math.PI / 180);

    const pathData = [
      'M', 50, 50,
      'L', x1, y1,
      'A', 40, 40, 0, isLargeArc, 1, x2, y2,
      'Z'
    ].join(' ');

    return (
      <g key={index}>
        <path
          d={pathData}
          fill={item.color}
          stroke="white"
          strokeWidth="1"
          className="cursor-pointer transition-opacity duration-200"
          style={{ opacity: hoveredSlice === index ? 0.8 : 1 }}
          title={`${item.name}: ${item.value} (${((item.value / total) * 100).toFixed(1)}%)`}
          onMouseEnter={(e) => {
            setHoveredSlice(index);
            setTooltipPosition({ x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => setHoveredSlice(null)}
          onMouseMove={(e) => {
            setTooltipPosition({ x: e.clientX, y: e.clientY });
          }}
        />
        {percentage > 5 && (
          <text
            x={textX}
            y={textY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="5"
            fill="black"
            fontWeight="bold"
            className="pointer-events-none"
          >
            {percentage.toFixed(0)}%
          </text>
        )}
      </g>
    );
  };

  return (
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Ride Status Distribution
        </CardTitle>
        <div className="text-left">
          <span className="text-xl font-bold text-black">Total Rides - {total}</span>
         
        </div>
       
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
                <div>Count: {data[hoveredSlice].value}</div>
                <div>Percentage: {((data[hoveredSlice].value / total) * 100).toFixed(1)}%</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              {data.map((item, index) => {
                const percentage = ((item.value / total) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-xs">{item.name}: {item.value} ({percentage}%)</span>
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