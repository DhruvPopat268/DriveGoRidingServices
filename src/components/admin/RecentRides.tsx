import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign } from "lucide-react";

const recentRides = [
  {
    id: "#R12847",
    rider: "John Doe",
    driver: "Mike Smith",
    from: "Downtown",
    to: "Airport",
    status: "completed",
    amount: "$24.50",
    time: "2 min ago"
  },
  {
    id: "#R12846",
    rider: "Sarah Wilson",
    driver: "Tom Johnson",
    from: "Mall",
    to: "University",
    status: "in-progress",
    amount: "$18.30",
    time: "5 min ago"
  },
  {
    id: "#R12845",
    rider: "David Brown",
    driver: "Lisa Garcia",
    from: "Hospital",
    to: "Home",
    status: "completed",
    amount: "$32.75",
    time: "8 min ago"
  },
  {
    id: "#R12844",
    rider: "Emma Davis",
    driver: "Carlos Rodriguez",
    from: "Office",
    to: "Restaurant",
    status: "cancelled",
    amount: "$0.00",
    time: "12 min ago"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Completed</Badge>;
    case "in-progress":
      return <Badge className="bg-blue-600 text-white hover:bg-blue-700">In Progress</Badge>;
    case "cancelled":
      return <Badge className="bg-red-600 text-white hover:bg-red-700">Cancelled</Badge>;
    default:
      return <Badge className="bg-gray-600 text-white hover:bg-gray-700">Unknown</Badge>;
  }
};

export const RecentRides = () => {
  return (
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-black flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Recent Rides</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentRides.map((ride) => (
          <div key={ride.id} className="border-b border-gray-200 pb-4 last:border-b-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-black font-medium">{ride.id}</p>
                <p className="text-gray-600 text-sm">
                  {ride.rider} → {ride.driver}
                </p>
              </div>
              {getStatusBadge(ride.status)}
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-700">
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>
                  {ride.from} → {ride.to}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-sm">
              <div className="flex items-center space-x-1 text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{ride.time}</span>
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <DollarSign className="w-3 h-3" />
                <span>{ride.amount}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
