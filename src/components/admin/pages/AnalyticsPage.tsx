
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Car, MapPin, Clock } from "lucide-react";

export const AnalyticsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
        <div className="flex space-x-2">
          <select className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-md">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Rides</CardTitle>
            <MapPin className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">8,742</div>
            <p className="text-xs text-green-500">+12.5% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Users</CardTitle>
            <Users className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">2,156</div>
            <p className="text-xs text-green-500">+8.2% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg. Trip Time</CardTitle>
            <Clock className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">18.5 min</div>
            <p className="text-xs text-red-500">-2.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Driver Rating</CardTitle>
            <Car className="w-5 h-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">4.8</div>
            <p className="text-xs text-green-500">+0.2 from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Popular Routes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { route: "Downtown → Airport", count: 324, percentage: 85 },
              { route: "Mall → Central Station", count: 287, percentage: 75 },
              { route: "Business District → Residential", count: 156, percentage: 40 },
              { route: "University → Shopping Center", count: 98, percentage: 25 },
            ].map((route, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">{route.route}</span>
                  <span className="text-white">{route.count} rides</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${route.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Peak Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { time: "8:00 - 9:00 AM", rides: 156, percentage: 90 },
              { time: "6:00 - 7:00 PM", rides: 142, percentage: 82 },
              { time: "7:00 - 8:00 PM", rides: 128, percentage: 74 },
              { time: "5:00 - 6:00 PM", rides: 98, percentage: 56 },
              { time: "12:00 - 1:00 PM", rides: 67, percentage: 39 },
            ].map((hour, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">{hour.time}</span>
                  <span className="text-white">{hour.rides} rides</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${hour.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
