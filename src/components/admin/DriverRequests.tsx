
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, UserX, Eye, Star } from "lucide-react";

const driverRequests = [
  {
    id: 1,
    name: "Alex Johnson",
    email: "alex.j@email.com",
    phone: "+1 (555) 0123",
    rating: 4.8,
    vehicleType: "Toyota Camry 2020",
    licenseVerified: true,
    insuranceVerified: true,
    backgroundCheck: "pending"
  },
  {
    id: 2,
    name: "Maria Garcia",
    email: "maria.g@email.com",
    phone: "+1 (555) 0124",
    rating: 4.9,
    vehicleType: "Honda Civic 2021",
    licenseVerified: true,
    insuranceVerified: false,
    backgroundCheck: "completed"
  },
  {
    id: 3,
    name: "Robert Chen",
    email: "robert.c@email.com",
    phone: "+1 (555) 0125",
    rating: 4.7,
    vehicleType: "Nissan Altima 2019",
    licenseVerified: false,
    insuranceVerified: true,
    backgroundCheck: "completed"
  }
];

export const DriverRequests = () => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5" />
            <span>Driver Requests</span>
          </div>
          <Badge className="bg-red-600 hover:bg-red-700">
            {driverRequests.length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {driverRequests.map((driver) => (
          <div key={driver.id} className="border border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-white font-medium">{driver.name}</h4>
                <p className="text-gray-400 text-sm">{driver.email}</p>
                <p className="text-gray-400 text-sm">{driver.phone}</p>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-white text-sm">{driver.rating}</span>
              </div>
            </div>
            
            <div className="mb-3">
              <p className="text-gray-300 text-sm">{driver.vehicleType}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className={driver.licenseVerified ? "bg-green-600" : "bg-red-600"}>
                License: {driver.licenseVerified ? "✓" : "✗"}
              </Badge>
              <Badge className={driver.insuranceVerified ? "bg-green-600" : "bg-red-600"}>
                Insurance: {driver.insuranceVerified ? "✓" : "✗"}
              </Badge>
              <Badge className={
                driver.backgroundCheck === "completed" ? "bg-green-600" : 
                driver.backgroundCheck === "pending" ? "bg-yellow-600" : "bg-red-600"
              }>
                Background: {driver.backgroundCheck}
              </Badge>
            </div>
            
            <div className="flex space-x-2">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Eye className="w-3 h-3 mr-1" />
                Review
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <UserCheck className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive">
                <UserX className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
