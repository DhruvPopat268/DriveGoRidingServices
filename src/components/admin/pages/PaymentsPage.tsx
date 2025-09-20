
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, TrendingDown } from "lucide-react";

const paymentStats = [
  { title: "Today's Revenue", amount: "$12,847", change: "+18.7%", trend: "up" },
  { title: "Pending Payments", amount: "$3,245", change: "-5.2%", trend: "down" },
  { title: "Driver Payouts", amount: "$8,954", change: "+12.3%", trend: "up" },
  { title: "Commission Earned", amount: "$2,643", change: "+15.8%", trend: "up" },
];

const recentTransactions = [
  { id: "TXN001", type: "Ride Payment", amount: "$28.50", status: "completed", user: "Alice Cooper", time: "2 min ago" },
  { id: "TXN002", type: "Driver Payout", amount: "$156.80", status: "pending", user: "John Smith", time: "5 min ago" },
  { id: "TXN003", type: "Refund", amount: "$18.00", status: "completed", user: "Bob Wilson", time: "10 min ago" },
  { id: "TXN004", type: "Ride Payment", amount: "$42.30", status: "failed", user: "Carol Brown", time: "15 min ago" },
];

export const PaymentsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Payments & Finance</h1>
        <div className="flex space-x-2">
          <Button variant="outline">Generate Report</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Process Payouts</Button>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {paymentStats.map((stat, index) => (
          <Card key={index} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                {stat.title}
              </CardTitle>
              <DollarSign className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.amount}</div>
              <div className="flex items-center space-x-1 text-xs">
                {stat.trend === "up" ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {stat.change}
                </span>
                <span className="text-gray-400">vs yesterday</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{transaction.type}</p>
                    <p className="text-sm text-gray-400">{transaction.user} • {transaction.time}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-white font-medium">{transaction.amount}</span>
                  <Badge 
                    variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'}
                    className={
                      transaction.status === 'completed' ? 'bg-green-600' : 
                      transaction.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'
                    }
                  >
                    {transaction.status}
                  </Badge>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
