
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

const data = [
  { name: "Mon", revenue: 2400, rides: 45 },
  { name: "Tue", revenue: 1398, rides: 32 },
  { name: "Wed", revenue: 9800, rides: 87 },
  { name: "Thu", revenue: 3908, rides: 64 },
  { name: "Fri", revenue: 4800, rides: 91 },
  { name: "Sat", revenue: 3800, rides: 78 },
  { name: "Sun", revenue: 4300, rides: 82 }
];

export const RevenueChart = () => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Weekly Revenue</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">$34,406</p>
            <p className="text-gray-400 text-sm">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">479</p>
            <p className="text-gray-400 text-sm">Total Rides</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
