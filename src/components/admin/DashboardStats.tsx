import { TrendingUp, TrendingDown, Users, Car, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    title: "Total Rides Today",
    value: "1,247",
    change: "+12.3%",
    trend: "up",
    icon: MapPin,
    color: "text-blue-600"
  },
  {
    title: "Active Drivers",
    value: "89",
    change: "+2.1%",
    trend: "up",
    icon: Car,
    color: "text-green-600"
  },
  {
    title: "Active Riders",
    value: "342",
    change: "-3.2%",
    trend: "down",
    icon: Users,
    color: "text-purple-600"
  },
  {
    title: "Revenue Today",
    value: "$12,847",
    change: "+18.7%",
    trend: "up",
    icon: DollarSign,
    color: "text-yellow-600"
  }
];

export const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white border border-gray-300 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">
              {stat.title}
            </CardTitle>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">{stat.value}</div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
