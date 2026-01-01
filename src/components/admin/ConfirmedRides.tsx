import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign } from "lucide-react";

const confirmedRides = [
  {
    id: "#R12854",
    rider: "Emma Thompson",
    driver: "David Wilson",
    from: "Train Station",
    to: "Corporate Plaza",
    status: "confirmed",
    amount: "$31.50",
    time: "2 min ago"
  },
  {
    id: "#R12853",
    rider: "Ryan Garcia",
    driver: "Amanda Clark",
    from: "Medical Center",
    to: "Pharmacy",
    status: "confirmed",
    amount: "$15.75",
    time: "4 min ago"
  },
  {
    id: "#R12852",
    rider: "Sophie Miller",
    driver: "Kevin Rodriguez",
    from: "School",
    to: "Library",
    status: "confirmed",
    amount: "$12.25",
    time: "7 min ago"
  },
  {
    id: "#R12851",
    rider: "Daniel Lee",
    driver: "Maria Gonzalez",
    from: "Gym",
    to: "Grocery Store",
    status: "confirmed",
    amount: "$18.90",
    time: "10 min ago"
  }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "confirmed":
      return <Badge className="bg-green-600 text-white hover:bg-green-700">Confirmed</Badge>;
    default:
      return <Badge className="bg-gray-600 text-white hover:bg-gray-700">Unknown</Badge>;
  }
};

export const ConfirmedRides = () => {
  return (
    <Card className="bg-white border border-gray-300 shadow-md">
      <CardHeader>
        <CardTitle className="text-black flex items-center space-x-2">
          <MapPin className="w-5 h-5" />
          <span>Confirmed Rides</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {confirmedRides.map((ride) => (
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