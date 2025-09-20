
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Bell, Shield, CreditCard, Globe, Smartphone } from "lucide-react";

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Settings & Configuration</h1>
        <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
      </div>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* General Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Platform Status</span>
              <Badge className="bg-green-600">Online</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Maintenance Mode</span>
              <Badge variant="outline">Off</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Debug Mode</span>
              <Badge variant="outline">Off</Badge>
            </div>
            <Button className="w-full" variant="outline">Configure</Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">New Registrations</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Email Verification</span>
              <Badge className="bg-green-600">Required</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Phone Verification</span>
              <Badge className="bg-green-600">Required</Badge>
            </div>
            <Button className="w-full" variant="outline">Manage Users</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Push Notifications</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">SMS Alerts</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Email Updates</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <Button className="w-full" variant="outline">Configure</Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Two-Factor Auth</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">SSL Certificate</span>
              <Badge className="bg-green-600">Valid</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">API Rate Limiting</span>
              <Badge className="bg-green-600">Active</Badge>
            </div>
            <Button className="w-full" variant="outline">Security Panel</Button>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Credit Cards</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Digital Wallets</span>
              <Badge className="bg-green-600">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Cash Payments</span>
              <Badge className="bg-yellow-600">Limited</Badge>
            </div>
            <Button className="w-full" variant="outline">Payment Config</Button>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Mobile App
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Current Version</span>
              <Badge variant="outline">v2.4.1</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Force Update</span>
              <Badge variant="outline">Off</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Beta Features</span>
              <Badge className="bg-blue-600">Available</Badge>
            </div>
            <Button className="w-full" variant="outline">App Management</Button>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Panel */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Base Fare ($)</label>
              <input 
                type="number" 
                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md"
                defaultValue="3.50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Per Mile Rate ($)</label>
              <input 
                type="number" 
                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md"
                defaultValue="1.25"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Per Minute Rate ($)</label>
              <input 
                type="number" 
                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md"
                defaultValue="0.20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Surge Multiplier</label>
              <input 
                type="number" 
                className="w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md"
                defaultValue="1.5"
              />
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <Button className="bg-blue-600 hover:bg-blue-700">Update Pricing</Button>
            <Button variant="outline">Reset to Default</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
