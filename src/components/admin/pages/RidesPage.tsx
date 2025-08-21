
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, User, Car } from "lucide-react";

const ridesData = [
  { id: "#12345", driver: "John Smith", rider: "Alice Cooper", pickup: "Downtown Plaza", destination: "Airport Terminal", status: "completed", duration: "25 min", fare: "$28.50", time: "2 hours ago" },
  { id: "#12346", driver: "Sarah Johnson", rider: "Bob Wilson", pickup: "Central Station", destination: "Mall District", status: "ongoing", duration: "15 min", fare: "$18.00", time: "Active now" },
  { id: "#12347", driver: "Mike Davis", rider: "Carol Brown", pickup: "Business Center", destination: "Residential Area", status: "cancelled", duration: "0 min", fare: "$0.00", time: "1 hour ago" },
];

export const RidesPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Rides Management</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Filter</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Export</Button>
        </div>
      </div>

      <div className="space-y-4">
        {ridesData.map((ride) => (
          <Card key={ride.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">Ride {ride.id}</CardTitle>
                  <p className="text-sm text-gray-400">{ride.time}</p>
                </div>
                <Badge 
                  variant={ride.status === 'completed' ? 'default' : ride.status === 'ongoing' ? 'destructive' : 'secondary'}
                  className={
                    ride.status === 'completed' ? 'bg-green-600' : 
                    ride.status === 'ongoing' ? 'bg-blue-600' : 'bg-red-600'
                  }
                >
                  {ride.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Car className="w-4 h-4" />
                    <span className="text-sm">Driver: {ride.driver}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Rider: {ride.rider}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{ride.pickup}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span className="text-sm">{ride.destination}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{ride.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">{ride.fare}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">View Details</Button>
                  <Button size="sm" variant="outline">Track</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
