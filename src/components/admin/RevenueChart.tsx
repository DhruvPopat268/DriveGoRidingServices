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
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-black flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Weekly Revenue</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#374151" />
              <YAxis stroke="#374151" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  color: "#111827"
                }}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-black">$34,406</p>
            <p className="text-gray-600 text-sm">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-black">479</p>
            <p className="text-gray-600 text-sm">Total Rides</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
