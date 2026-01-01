import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign } from "lucide-react";

const bookedRides = [
  {
    id: "#R12850",
    rider: "Alice Johnson",
    driver: "Robert Lee",
    from: "Central Station",
    to: "Business District",
    status: "booked",
    amount: "$28.50",
    time: "1 min ago"
  },
  {
    id: "#R12849",
    rider: "Mark Wilson",
    driver: "Jennifer Davis",
    from: "Shopping Center",
    to: "Residential Area",
    status: "booked",
    amount: "$22.30",
    time: "3 min ago"
  },
  {
    id: "#R12848",
    rider: "Lisa Chen",
    driver: "Michael Brown",
    from: "Airport",
    to: "Hotel District",
    status: "booked",
    amount: "$45.75",
    time: "6 min ago"
  },
  {
    id: "#R12847",
    rider: "James Taylor",
    driver: "Sarah Martinez",
    from: "University",
    to: "City Center",
    status: "booked",
    amount: "$19.25",
    time: "9 min ago"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "booked":
      return <Badge className="bg-orange-600 text-white hover:bg-orange-700">Booked</Badge>;
    default:
      return <Badge className="bg-gray-600 text-white hover:bg-gray-700">Unknown</Badge>;
  }
};

export const BookedRides = () => {
  return (
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-black flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Booked Rides</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookedRides.map((ride) => (
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