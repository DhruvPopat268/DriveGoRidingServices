import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader } from "lucide-react";

interface PurchasedPlan {
  driverId: string;
  driverName: string;
  driverMobile: string;
  paymentId: string;
  planName: string;
  amount: number;
  status: string;
  purchasedAt: string;
}

interface ApiResponse {
  success: boolean;
  totalPlans: number;
  purchasedPlans: PurchasedPlan[];
}

export const DriverPurchasedPlansPage = () => {
  const [plans, setPlans] = useState<PurchasedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPlans, setTotalPlans] = useState(0);

  useEffect(() => {
    fetchPurchasedPlans();
  }, []);

  const fetchPurchasedPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminToken = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subscription-plans/drivers/purchased-plans`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch purchased plans');
      }

      const data: ApiResponse = await response.json();
      setPlans(data.purchasedPlans || []);
      setTotalPlans(data.totalPlans || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader className="w-6 h-6 animate-spin mr-2" />
        <span>Loading purchased plans...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Driver Purchased Plans History</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchased Plans ({totalPlans})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Driver Name</TableHead>
                <TableHead>Mobile Number</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead>Plan Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchased Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No purchased plans found
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan, index) => (
                  <TableRow key={`${plan.driverId}-${plan.paymentId}-${index}`}>
                    <TableCell className="font-mono text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {plan.driverName || 'N/A'}
                    </TableCell>
                    <TableCell>{plan.driverMobile || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {plan.paymentId}
                    </TableCell>
                    <TableCell>{plan.planName}</TableCell>
                    <TableCell>₹{plan.amount}</TableCell>
                    <TableCell>
                      {getStatusBadge(plan.status)}
                    </TableCell>
                    <TableCell>
                      {new Date(plan.purchasedAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};