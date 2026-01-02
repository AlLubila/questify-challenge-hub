import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReferrals } from "@/hooks/useReferrals";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Users, DollarSign, Gift, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Referrals() {
  const { data, isLoading } = useReferrals();
  const { t } = useLanguage();

  const copyReferralLink = () => {
    if (data?.referralCode) {
      const link = `${window.location.origin}/auth?ref=${data.referralCode}`;
      navigator.clipboard.writeText(link);
      toast.success("Referral link copied to clipboard!");
    }
  };

  const shareReferral = async () => {
    if (data?.referralCode) {
      const link = `${window.location.origin}/auth?ref=${data.referralCode}`;
      const text = `Join Questify with my referral code and get 25 bonus points! ${link}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Join Questify",
            text: text,
            url: link,
          });
        } catch (error) {
          copyReferralLink();
        }
      } else {
        copyReferralLink();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("referrals.title")}</h1>
        <p className="text-muted-foreground">
          {t("referrals.description")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("referrals.totalReferrals")}</p>
              <p className="text-2xl font-bold">{data?.referralCount || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("referrals.totalEarnings")}</p>
              <p className="text-2xl font-bold">{data?.referralEarnings || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Gift className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("referrals.rewardPerReferral")}</p>
              <p className="text-2xl font-bold">50 pts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Referral Code Card */}
      <Card className="p-8 mb-8 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">{t("referrals.yourCode")}</h2>
          <p className="text-muted-foreground">{t("referrals.shareCode")}</p>
        </div>

        <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 bg-background border-2 border-primary/20 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold tracking-wider text-primary">
                {data?.referralCode || "XXXXXXXX"}
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <Button onClick={copyReferralLink} variant="outline" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              {t("referrals.copyLink")}
            </Button>
            <Button onClick={shareReferral} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              {t("referrals.share")}
            </Button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-background/50 rounded-lg">
          <h3 className="font-semibold mb-2">{t("referrals.howItWorks")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{t("referrals.step1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{t("referrals.step2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{t("referrals.step3")}</span>
            </li>
          </ul>
        </div>
      </Card>

      {/* Referral History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">{t("referrals.history")}</h2>
        
        {data?.referrals && data.referrals.length > 0 ? (
          <div className="space-y-4">
            {data.referrals.map((referral: any) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={referral.referred?.avatar_url} />
                    <AvatarFallback>
                      {referral.referred?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {referral.referred?.display_name || referral.referred?.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("referrals.joined")} {format(new Date(referral.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                    {referral.status}
                  </Badge>
                  <div className="text-right">
                    <p className="font-semibold text-green-500">+{referral.reward_amount}</p>
                    <p className="text-xs text-muted-foreground">{t("challenges.points").toLowerCase()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">{t("referrals.noReferrals")}</p>
            <p className="text-sm text-muted-foreground">
              {t("referrals.startSharing")}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
