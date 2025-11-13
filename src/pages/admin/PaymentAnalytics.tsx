import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, Users, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export default function PaymentAnalytics() {
  const [timeRange, setTimeRange] = useState("30");

  // Fetch boost purchases
  const { data: boostPurchases } = useQuery({
    queryKey: ["boost-purchases", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));
      
      const { data, error } = await supabase
        .from("boost_purchases")
        .select("*, profiles(username)")
        .gte("created_at", date.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch subscriptions
  const { data: subscriptions } = useQuery({
    queryKey: ["subscriptions-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, profiles(username)");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch wallet transactions
  const { data: transactions } = useQuery({
    queryKey: ["wallet-transactions", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));
      
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*, profiles(username)")
        .gte("created_at", date.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalBoostRevenue = boostPurchases?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0;
  const activeSubscriptions = subscriptions?.filter(sub => sub.is_active).length || 0;
  const totalTransactionVolume = transactions?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;

  // Group boost purchases by type
  const boostTypeData = boostPurchases?.reduce((acc: any, purchase) => {
    const existing = acc.find((item: any) => item.name === purchase.boost_type);
    if (existing) {
      existing.value += purchase.amount;
      existing.count += 1;
    } else {
      acc.push({ name: purchase.boost_type, value: purchase.amount, count: 1 });
    }
    return acc;
  }, []) || [];

  // Revenue over time
  const revenueByDay = boostPurchases?.reduce((acc: any, purchase) => {
    const date = new Date(purchase.created_at).toLocaleDateString();
    const existing = acc.find((item: any) => item.date === date);
    if (existing) {
      existing.revenue += purchase.amount;
    } else {
      acc.push({ date, revenue: purchase.amount });
    }
    return acc;
  }, []) || [];

  // Transaction types breakdown
  const transactionTypeData = transactions?.reduce((acc: any, tx) => {
    const existing = acc.find((item: any) => item.name === tx.transaction_type);
    if (existing) {
      existing.value += Math.abs(tx.amount);
      existing.count += 1;
    } else {
      acc.push({ name: tx.transaction_type, value: Math.abs(tx.amount), count: 1 });
    }
    return acc;
  }, []) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payment Analytics</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boost Revenue</p>
                <p className="text-2xl font-bold">${(totalBoostRevenue / 100).toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transaction Volume</p>
                <p className="text-2xl font-bold">${(totalTransactionVolume / 100).toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-lg">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boost Purchases</p>
                <p className="text-2xl font-bold">{boostPurchases?.length || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Revenue Over Time */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Revenue Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border p-2 rounded shadow">
                        <p className="font-medium">{payload[0].payload.date}</p>
                        <p className="text-primary">Revenue: ${(Number(payload[0].value) / 100).toFixed(2)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Boost Types Breakdown */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Boost Types Revenue</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={boostTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: $${(entry.value / 100).toFixed(2)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {boostTypeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border p-2 rounded shadow">
                        <p className="font-medium">{payload[0].name}</p>
                        <p className="text-primary">Amount: ${(Number(payload[0].value) / 100).toFixed(2)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Transaction Types */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Transaction Types</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={transactionTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border p-2 rounded shadow">
                        <p className="font-medium">{payload[0].payload.name}</p>
                        <p className="text-primary">Amount: ${(Number(payload[0].value) / 100).toFixed(2)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend />
                <Bar dataKey="value" fill="#8b5cf6" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Purchasers */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Recent Boost Purchases</h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {boostPurchases?.slice(0, 10).map((purchase: any) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">@{purchase.profiles?.username}</p>
                    <p className="text-sm text-muted-foreground capitalize">{purchase.boost_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(purchase.amount / 100).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!boostPurchases || boostPurchases.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No purchases yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Active Subscriptions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Active Subscriptions</h2>
          <div className="space-y-3">
            {subscriptions?.filter(sub => sub.is_active).slice(0, 10).map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">@{sub.profiles?.username}</p>
                  <p className="text-sm text-muted-foreground">Product: {sub.product_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-success">Active</p>
                  <p className="text-xs text-muted-foreground">
                    Ends: {sub.subscription_end ? new Date(sub.subscription_end).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
            {subscriptions?.filter(sub => sub.is_active).length === 0 && (
              <p className="text-center text-muted-foreground py-8">No active subscriptions</p>
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {transactions?.slice(0, 20).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">@{tx.profiles?.username}</p>
                  <p className="text-sm text-muted-foreground">{tx.description || tx.transaction_type}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.amount > 0 ? 'text-success' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}${(tx.amount / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {(!transactions || transactions.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            )}
          </div>
        </Card>
      </div>
    );
  }
