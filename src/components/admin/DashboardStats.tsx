import { TrendingUp, TrendingDown, Users, Car, MapPin, Calendar, CheckCircle, Clock, ArrowRight, CalendarClock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import apiClient from "../../lib/axiosInterceptor";
import { RupeeIcon } from "@/components/ui/RupeeIcon";

export const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/dashboard/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 gap-6">
        {Array.from({ length: 10 }).map((_, index) => (
          <Card key={index} className="bg-white border border-gray-300 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-800">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <div>Error loading stats</div>;
  }

  const allStats = [
    {
      title: "Total Rides Today",
      value: stats.totalRidesToday.count.toString(),
      change: stats.totalRidesToday.percentage,
      trend: stats.totalRidesToday.trend,
      icon: MapPin,
      color: "text-blue-600"
    },
    {
      title: "Scheduled Rides Today",
      value: stats.scheduledRidesToday.toString(),
      icon: CalendarClock,
      color: "text-indigo-600"
    },
    {
      title: "Active Drivers",
      value: stats.activeDrivers.toString(),
      icon: Car,
      color: "text-green-600"
    },
    {
      title: "Active Riders",
      value: stats.activeRiders.toString(),
      icon: Users,
      color: "text-purple-600"
    },
    {
      title: "Revenue Today",
      value: `₹${stats.revenueToday.amount.toLocaleString()}`,
      change: stats.revenueToday.percentage,
      trend: stats.revenueToday.trend,
      icon: RupeeIcon,
      color: "text-yellow-600"
    },
    {
      title: "Booked Rides Today",
      value: stats.bookedToday.toString(),
      icon: Calendar,
      color: "text-orange-600"
    },
    {
      title: "Confirmed Rides Today",
      value: stats.confirmedToday.toString(),
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Ongoing Rides Today",
      value: stats.ongoingToday.toString(),
      icon: Clock,
      color: "text-blue-600"
    },
    {
      title: "Cancelled Rides Today",
      value: stats.cancelledToday.toString(),
      icon: XCircle,
      color: "text-red-600"
    },
    {
      title: "Total Net Revenue",
      value: `₹${stats.totalNetRevenue.toLocaleString()}`,
      icon: RupeeIcon,
      color: "text-yellow-600"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 gap-6">
      {allStats.map((stat, index) => (
        <Card key={index} className="bg-white border border-gray-300 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">
              {stat.title}
            </CardTitle>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{stat.value}</div>
            {stat.change && (
              <div className="flex items-center space-x-1 text-xs">
                {stat.trend === "up" ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {stat.change}
                </span>
                <span className="text-gray-600">vs yesterday</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
