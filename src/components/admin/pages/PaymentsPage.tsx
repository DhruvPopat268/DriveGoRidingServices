
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, TrendingUp, TrendingDown, Wallet, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface WalletData {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  lastTransactionAt: string | null;
  isActive: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  paymentMethod: string | null;
  date: string;
  paidAt: string | null;
}

export const PaymentsPage = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: "Error", description: "Please login first", variant: "destructive" });
        return;
      }

      const response = await fetch('/api/payments/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
      } else {
        throw new Error('Failed to fetch wallet data');
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({ title: "Error", description: "Failed to fetch wallet data", variant: "destructive" });
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/payments/history?type=deposit', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async () => {
    try {
      const amount = parseFloat(addMoneyAmount);
      if (!amount || amount < 10 || amount > 50000) {
        toast({ title: "Error", description: "Amount should be between ₹10 and ₹50,000", variant: "destructive" });
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        toast({ title: "Error", description: "Please login first", variant: "destructive" });
        return;
      }

      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount })
      });

      if (response.ok) {
        const orderData = await response.json();
        // Here you would integrate with Razorpay frontend SDK
        toast({ title: "Success", description: "Order created successfully" });
        setIsAddMoneyOpen(false);
        setAddMoneyAmount('');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: "Error", description: "Failed to create order", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading wallet data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Wallet & Payments</h1>
        <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Money
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add Money to Wallet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Enter amount (10-50000)"
                  value={addMoneyAmount}
                  onChange={(e) => setAddMoneyAmount(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  min="10"
                  max="50000"
                />
              </div>
              <Button onClick={handleAddMoney} className="w-full bg-green-600 hover:bg-green-700">
                Proceed to Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wallet Stats */}
      {walletData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Current Balance
              </CardTitle>
              <Wallet className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatAmount(walletData.balance)}</div>
              <p className="text-xs text-gray-400 mt-1">
                {walletData.isActive ? 'Active' : 'Inactive'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Deposited
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatAmount(walletData.totalDeposited)}</div>
              <p className="text-xs text-gray-400 mt-1">All time deposits</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Total Spent
              </CardTitle>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatAmount(walletData.totalSpent)}</div>
              <p className="text-xs text-gray-400 mt-1">All time spending</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-400">
                        {formatDate(transaction.date)}
                        {transaction.paidAt && ` • Paid: ${formatDate(transaction.paidAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-white font-medium">{formatAmount(transaction.amount)}</span>
                    <Badge 
                      variant={transaction.status === 'paid' ? 'default' : transaction.status === 'created' ? 'secondary' : 'destructive'}
                      className={
                        transaction.status === 'paid' ? 'bg-green-600' : 
                        transaction.status === 'created' ? 'bg-yellow-600' : 'bg-red-600'
                      }
                    >
                      {transaction.status}
                    </Badge>
                    {transaction.paymentMethod && (
                      <span className="text-xs text-gray-400">{transaction.paymentMethod}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
