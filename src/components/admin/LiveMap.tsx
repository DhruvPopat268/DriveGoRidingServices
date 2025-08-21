
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, Car } from "lucide-react";

const liveData = {
  activeDrivers: 89,
  activeRiders: 342,
  ongoingRides: 67,
  availableDrivers: 22
};

const recentActivity = [
  { type: "ride_start", location: "Downtown Plaza", time: "Just now" },
  { type: "driver_online", location: "Airport Area", time: "1 min ago" },
  { type: "ride_complete", location: "University District", time: "2 min ago" },
  { type: "ride_request", location: "Shopping Mall", time: "3 min ago" },
  { type: "driver_offline", location: "Business District", time: "5 min ago" }
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "ride_start":
      return <Navigation className="w-4 h-4 text-blue-500" />;
    case "ride_complete":
      return <MapPin className="w-4 h-4 text-green-500" />;
    case "driver_online":
      return <Car className="w-4 h-4 text-green-500" />;
    case "driver_offline":
      return <Car className="w-4 h-4 text-red-500" />;
    case "ride_request":
      return <Users className="w-4 h-4 text-yellow-500" />;
    default:
      return <MapPin className="w-4 h-4 text-gray-500" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "ride_start":
      return "bg-blue-600";
    case "ride_complete":
      return "bg-green-600";
    case "driver_online":
      return "bg-green-600";
    case "driver_offline":
      return "bg-red-600";
    case "ride_request":
      return "bg-yellow-600";
    default:
      return "bg-gray-600";
  }
};

export const LiveMap = () => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Live Activity</span>
          <Badge className="bg-green-600 hover:bg-green-700">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Live Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Car className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-bold text-white">{liveData.activeDrivers}</p>
            <p className="text-xs text-gray-400">Active Drivers</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-bold text-white">{liveData.activeRiders}</p>
            <p className="text-xs text-gray-400">Active Riders</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-bold text-white">{liveData.ongoingRides}</p>
            <p className="text-xs text-gray-400">Ongoing Rides</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Car className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-bold text-white">{liveData.availableDrivers}</p>
            <p className="text-xs text-gray-400">Available</p>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="bg-gray-700 rounded-lg p-8 mb-4 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">Interactive Map</p>
            <p className="text-gray-500 text-sm">Real-time driver and rider locations</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-white font-medium mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-gray-300">{activity.location}</p>
                </div>
                <span className="text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
