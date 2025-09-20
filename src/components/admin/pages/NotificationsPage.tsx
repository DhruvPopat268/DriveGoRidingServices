
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Send, Users, Car, AlertTriangle, Info } from "lucide-react";

const notifications = [
  { id: 1, title: "New Driver Registration", message: "John Doe has submitted driver application", type: "info", time: "5 min ago", read: false },
  { id: 2, title: "Payment Failed", message: "Payment processing failed for ride #12345", type: "error", time: "10 min ago", read: false },
  { id: 3, title: "High Demand Area", message: "Surge pricing activated in Downtown area", type: "warning", time: "15 min ago", read: true },
  { id: 4, title: "Weekly Report", message: "Your weekly analytics report is ready", type: "info", time: "1 hour ago", read: true },
];

export const NotificationsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Notifications Center</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Mark All Read</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Send className="w-4 h-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Notify All Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">Send notifications to all registered users</p>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Send to All</Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Car className="w-5 h-5 mr-2" />
              Notify Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">Send notifications to active drivers only</p>
            <Button className="w-full bg-green-600 hover:bg-green-700">Send to Drivers</Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">Send emergency notifications immediately</p>
            <Button className="w-full bg-red-600 hover:bg-red-700">Emergency Alert</Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 rounded-lg ${notification.read ? 'bg-gray-700' : 'bg-gray-600 border-l-4 border-blue-500'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      notification.type === 'error' ? 'bg-red-600' :
                      notification.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
                    }`}>
                      {notification.type === 'error' ? <AlertTriangle className="w-5 h-5 text-white" /> :
                       notification.type === 'warning' ? <Bell className="w-5 h-5 text-white" /> :
                       <Info className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className="text-white font-medium">{notification.title}</p>
                      <p className="text-sm text-gray-400">{notification.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notification.read && (
                      <Badge className="bg-blue-600">New</Badge>
                    )}
                    <span className="text-xs text-gray-500">{notification.time}</span>
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  <Button size="sm" variant="outline">View Details</Button>
                  {!notification.read && (
                    <Button size="sm" variant="outline">Mark as Read</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
