import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { format } from "date-fns";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Wallet = () => {
  const { balance, transactions, isLoading } = useWallet();
  const { subscriptionData, createCheckout, isCreatingCheckout } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Wallet</h1>
          <p className="text-muted-foreground">Manage your balance and subscriptions</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
              <CardDescription>Your current wallet balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">${(balance / 100).toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle>Creator Pass</CardTitle>
              <CardDescription>Premium subscription for extra perks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionData?.subscribed ? (
                <>
                  <Badge variant="default">Active</Badge>
                  {subscriptionData.subscription_end && (
                    <p className="text-sm text-muted-foreground">
                      Renews on {format(new Date(subscriptionData.subscription_end), "PPP")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Subscribe for $5/month to get extra rewards, exclusive stats, and premium features
                  </p>
                  <Button onClick={() => createCheckout()} disabled={isCreatingCheckout}>
                    {isCreatingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent wallet activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-3">
                      {transaction.amount > 0 ? (
                        <div className="p-2 bg-green-500/10 rounded-full">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-500/10 rounded-full">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium capitalize">
                          {transaction.transaction_type.replace(/_/g, " ")}
                        </p>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), "PPp")}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${transaction.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                      {transaction.amount > 0 ? "+" : ""}${(Math.abs(transaction.amount) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Wallet;
