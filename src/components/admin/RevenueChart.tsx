import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

export const RevenueChart = () => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalRides: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyRevenue = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/weekly-revenue`);
        const result = await response.json();
        if (result.success) {
          setData(result.data.chartData);
          setSummary(result.data.summary);
        }
      } catch (error) {
        console.error('Error fetching weekly revenue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyRevenue();
  }, []);
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
            <p className="text-2xl font-bold text-black">
              {loading ? '...' : `₹${summary.totalRevenue.toLocaleString()}`}
            </p>
            <p className="text-gray-600 text-sm">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-black">
              {loading ? '...' : summary.totalRides}
            </p>
            <p className="text-gray-600 text-sm">Total Rides</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
