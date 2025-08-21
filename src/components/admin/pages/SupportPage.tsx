
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Mail, Clock, User, AlertTriangle } from "lucide-react";

const supportTickets = [
  { id: "SUP001", user: "Alice Cooper", type: "Payment Issue", priority: "high", status: "open", time: "5 min ago", message: "Payment was charged but ride was cancelled" },
  { id: "SUP002", user: "John Smith", type: "App Bug", priority: "medium", status: "in-progress", time: "15 min ago", message: "GPS location not updating properly" },
  { id: "SUP003", user: "Bob Wilson", type: "Account Issue", priority: "low", status: "resolved", time: "2 hours ago", message: "Unable to update profile information" },
  { id: "SUP004", user: "Carol Brown", type: "Safety Concern", priority: "high", status: "open", time: "30 min ago", message: "Driver took unauthorized route" },
];

export const SupportPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Support Center</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Bulk Actions</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Create Ticket</Button>
        </div>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Open Tickets</CardTitle>
            <MessageCircle className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">24</div>
            <p className="text-xs text-red-500">+3 from yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">In Progress</CardTitle>
            <Clock className="w-5 h-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">12</div>
            <p className="text-xs text-green-500">-2 from yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Resolved Today</CardTitle>
            <MessageCircle className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">18</div>
            <p className="text-xs text-green-500">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Response</CardTitle>
            <Clock className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">8 min</div>
            <p className="text-xs text-green-500">-2 min from yesterday</p>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="p-4 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{ticket.user}</p>
                      <p className="text-sm text-gray-400">Ticket #{ticket.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'medium' ? 'secondary' : 'outline'}
                      className={
                        ticket.priority === 'high' ? 'bg-red-600' : 
                        ticket.priority === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                      }
                    >
                      {ticket.priority} priority
                    </Badge>
                    <Badge 
                      variant={ticket.status === 'open' ? 'destructive' : ticket.status === 'in-progress' ? 'secondary' : 'default'}
                      className={
                        ticket.status === 'open' ? 'bg-red-600' : 
                        ticket.status === 'in-progress' ? 'bg-blue-600' : 'bg-green-600'
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-sm text-gray-300 mb-1">{ticket.type}</p>
                  <p className="text-gray-400 text-sm">{ticket.message}</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{ticket.time}</span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Respond
                    </Button>
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
