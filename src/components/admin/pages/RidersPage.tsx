
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, MapPin, Star, Phone, Mail, CreditCard } from "lucide-react";

const ridersData = [
  { id: 1, name: "Alice Cooper", phone: "+1234567893", email: "alice@example.com", status: "active", rating: 4.9, totalRides: 156, location: "Downtown", paymentMethod: "Credit Card" },
  { id: 2, name: "Bob Wilson", phone: "+1234567894", email: "bob@example.com", status: "inactive", rating: 4.7, totalRides: 89, location: "Uptown", paymentMethod: "PayPal" },
  { id: 3, name: "Carol Brown", phone: "+1234567895", email: "carol@example.com", status: "active", rating: 4.8, totalRides: 234, location: "Midtown", paymentMethod: "Debit Card" },
];

export const RidersPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Riders Management</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">Export Data</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ridersData.map((rider) => (
          <Card key={rider.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{rider.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-300">{rider.rating}</span>
                  </div>
                </div>
                <Badge 
                  variant={rider.status === 'active' ? 'default' : 'secondary'}
                  className={rider.status === 'active' ? 'bg-green-600' : ''}
                >
                  {rider.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{rider.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{rider.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{rider.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">{rider.paymentMethod}</span>
              </div>
              <div className="text-sm text-gray-400">
                Total Rides: {rider.totalRides}
              </div>
              <div className="flex space-x-2 pt-2">
                <Button size="sm" variant="outline">Contact</Button>
                <Button size="sm" variant="outline">View History</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
