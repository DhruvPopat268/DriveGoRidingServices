
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, MapPin, Star, Phone, Mail } from "lucide-react";

const driversData = [
  { id: 1, name: "John Smith", phone: "+1234567890", email: "john@example.com", status: "online", rating: 4.8, rides: 1247, location: "Downtown", car: "Toyota Camry 2020" },
  { id: 2, name: "Sarah Johnson", phone: "+1234567891", email: "sarah@example.com", status: "offline", rating: 4.9, rides: 987, location: "Uptown", car: "Honda Civic 2019" },
  { id: 3, name: "Mike Davis", phone: "+1234567892", email: "mike@example.com", status: "busy", rating: 4.7, rides: 1456, location: "Midtown", car: "Nissan Altima 2021" },
];

export const DriversPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Drivers Management</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">Add New Driver</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {driversData.map((driver) => (
          <Card key={driver.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{driver.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-300">{driver.rating}</span>
                  </div>
                </div>
                <Badge 
                  variant={driver.status === 'online' ? 'default' : driver.status === 'busy' ? 'destructive' : 'secondary'}
                  className={driver.status === 'online' ? 'bg-green-600' : ''}
                >
                  {driver.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{driver.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{driver.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Car className="w-4 h-4" />
                <span className="text-sm">{driver.car}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{driver.location}</span>
              </div>
              <div className="text-sm text-gray-400">
                Total Rides: {driver.rides}
              </div>
              <div className="flex space-x-2 pt-2">
                <Button size="sm" variant="outline">Contact</Button>
                <Button size="sm" variant="outline">View Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
