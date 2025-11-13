import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/hooks/useWallet";
import { format } from "date-fns";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";

const Wallet = () => {
  const { t } = useLanguage();
  const { balance, transactions, isLoading } = useWallet();
  const { subscriptionData, createCheckout, isCreatingCheckout } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-8">
          <div>
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-32" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t("wallet.title")}</h1>
          <p className="text-muted-foreground">{t("wallet.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("wallet.balance")}</CardTitle>
              <CardDescription>{t("wallet.currentBalance")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">${(balance / 100).toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t("wallet.creatorPass")}</CardTitle>
              <CardDescription>{t("wallet.premiumSubscription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionData?.subscribed ? (
                <>
                  <Badge variant="default">{t("wallet.active")}</Badge>
                  {subscriptionData.subscription_end && (
                    <p className="text-sm text-muted-foreground">
                      {t("profile.renewsOn")} {format(new Date(subscriptionData.subscription_end), "PPP")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("wallet.subscriptionDesc")}
                  </p>
                  <Button onClick={() => createCheckout()} disabled={isCreatingCheckout}>
                    {isCreatingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.loading")}
                      </>
                    ) : (
                      t("wallet.subscribeNow")
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
            <CardTitle>{t("wallet.transactions")}</CardTitle>
            <CardDescription>{t("wallet.recentActivity")}</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("wallet.noTransactions")}</p>
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
