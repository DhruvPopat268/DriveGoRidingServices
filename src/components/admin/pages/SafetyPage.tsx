
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Phone, MapPin, Clock, User } from "lucide-react";

const safetyIncidents = [
  { id: "INC001", type: "Route Deviation", driver: "John Smith", rider: "Alice Cooper", severity: "medium", status: "investigating", time: "30 min ago", location: "Downtown Area" },
  { id: "INC002", type: "Emergency Button", driver: "Sarah Johnson", rider: "Bob Wilson", severity: "high", status: "resolved", time: "2 hours ago", location: "Highway 101" },
  { id: "INC003", type: "Speeding Alert", driver: "Mike Davis", rider: "Carol Brown", severity: "low", status: "closed", time: "1 day ago", location: "City Center" },
];

export const SafetyPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Safety & Security</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Safety Report</Button>
          <Button className="bg-red-600 hover:bg-red-700">Emergency Response</Button>
        </div>
      </div>

      {/* Safety Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Incidents</CardTitle>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">3</div>
            <p className="text-xs text-red-500">2 high priority</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Emergency Calls</CardTitle>
            <Phone className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">12</div>
            <p className="text-xs text-green-500">-25% from last week</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Safety Score</CardTitle>
            <Shield className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">94.5%</div>
            <p className="text-xs text-green-500">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Response Time</CardTitle>
            <Clock className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">3.2 min</div>
            <p className="text-xs text-green-500">-0.5 min improvement</p>
          </CardContent>
        </Card>
      </div>

      {/* Safety Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Safety Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Emergency Button</span>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Real-time Tracking</span>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Route Monitoring</span>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Speed Alerts</span>
              <Badge className="bg-yellow-600">Warning</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Police Department</p>
                <p className="text-sm text-gray-400">911</p>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Medical Emergency</p>
                <p className="text-sm text-gray-400">911</p>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Security Team</p>
                <p className="text-sm text-gray-400">+1-800-SECURITY</p>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Safety Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {safetyIncidents.map((incident) => (
              <div key={incident.id} className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      incident.severity === 'high' ? 'bg-red-600' :
                      incident.severity === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                    }`}>
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{incident.type}</p>
                      <p className="text-sm text-gray-400">Incident #{incident.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={incident.severity === 'high' ? 'destructive' : incident.severity === 'medium' ? 'secondary' : 'outline'}
                      className={
                        incident.severity === 'high' ? 'bg-red-600' : 
                        incident.severity === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                      }
                    >
                      {incident.severity}
                    </Badge>
                    <Badge 
                      variant={incident.status === 'investigating' ? 'secondary' : incident.status === 'resolved' ? 'default' : 'outline'}
                      className={
                        incident.status === 'investigating' ? 'bg-blue-600' : 
                        incident.status === 'resolved' ? 'bg-green-600' : 'bg-gray-600'
                      }
                    >
                      {incident.status}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Driver: {incident.driver}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Rider: {incident.rider}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{incident.location}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{incident.time}</span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">View Details</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">Take Action</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
