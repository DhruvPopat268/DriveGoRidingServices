import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Users, Car } from "lucide-react";

const liveData = {
  activeDrivers: 89,
  activeRiders: 342,
  ongoingRides: 67,
  availableDrivers: 22,
};

const recentActivity = [
  { type: "ride_start", location: "Downtown Plaza", time: "Just now" },
  { type: "driver_online", location: "Airport Area", time: "1 min ago" },
  { type: "ride_complete", location: "University District", time: "2 min ago" },
  { type: "ride_request", location: "Shopping Mall", time: "3 min ago" },
  { type: "driver_offline", location: "Business District", time: "5 min ago" },
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "ride_start":
      return <Navigation className="w-4 h-4 text-black" />;
    case "ride_complete":
      return <MapPin className="w-4 h-4 text-black" />;
    case "driver_online":
      return <Car className="w-4 h-4 text-black" />;
    case "driver_offline":
      return <Car className="w-4 h-4 text-black" />;
    case "ride_request":
      return <Users className="w-4 h-4 text-black" />;
    default:
      return <MapPin className="w-4 h-4 text-black" />;
  }
};

const getActivityColor = () => {
  return "bg-white"; // keep all activity backgrounds white
};

export const LiveMap = () => {
  return (
    <Card className="bg-white border border-gray-300 text-black">
      <CardHeader>
        <CardTitle className="text-black flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-black" />
          <span>Live Activity</span>
          <Badge className="bg-black hover:bg-gray-800 text-white">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Live Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <Car className="w-6 h-6 text-black" />
            </div>
            <p className="text-xl font-bold text-black">{liveData.activeDrivers}</p>
            <p className="text-xs text-black">Active Drivers</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-black" />
            </div>
            <p className="text-xl font-bold text-black">{liveData.activeRiders}</p>
            <p className="text-xs text-black">Active Riders</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <Navigation className="w-6 h-6 text-black" />
            </div>
            <p className="text-xl font-bold text-black">{liveData.ongoingRides}</p>
            <p className="text-xs text-black">Ongoing Rides</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <Car className="w-6 h-6 text-black" />
            </div>
            <p className="text-xl font-bold text-black">{liveData.availableDrivers}</p>
            <p className="text-xs text-black">Available</p>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white border border-gray-300 rounded-lg p-8 mb-4 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-black mx-auto mb-2" />
            <p className="text-black">Interactive Map</p>
            <p className="text-black text-sm">Real-time driver and rider locations</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-black font-medium mb-3">Recent Activity</h4>
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 text-sm text-black"
              >
                <div
                  className={`w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center ${getActivityColor()}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-black">{activity.location}</p>
                </div>
                <span className="text-black">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
