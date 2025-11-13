import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReferrals } from "@/hooks/useReferrals";
import { useProfile } from "@/hooks/useProfile";
import { Copy, Gift, Users, DollarSign, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Referrals() {
  const { data: profile } = useProfile();
  const { data: referralData, isLoading } = useReferrals();

  const referralLink = referralData?.referralCode
    ? `${window.location.origin}/auth?ref=${referralData.referralCode}`
    : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Questify!",
          text: `Join me on Questify and earn 25 coins! Use my referral code: ${referralData?.referralCode}`,
          url: referralLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Invite Friends</h1>
            <p className="text-muted-foreground">
              Share Questify and earn rewards together!
            </p>
          </div>

          {/* Stats Cards */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                    <p className="text-2xl font-bold text-foreground">
                      {referralData?.totalReferrals || 0}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold text-foreground">
                      {referralData?.totalEarnings || 0} coins
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reward per Friend</p>
                    <p className="text-2xl font-bold text-foreground">50 coins</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Referral Link Card */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold mb-4 text-foreground">Your Referral Link</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Share this link with friends. They get 25 coins when they sign up, and you
              get 50 coins!
            </p>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg text-sm text-foreground break-all">
                {referralLink || "Loading..."}
              </div>
              <Button onClick={copyReferralLink} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={shareReferral} size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* How it Works */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-bold mb-4 text-foreground">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Share Your Link</h3>
                  <p className="text-sm text-muted-foreground">
                    Send your unique referral link to friends via social media, email, or
                    messaging apps.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">They Sign Up</h3>
                  <p className="text-sm text-muted-foreground">
                    Your friend creates a Questify account using your referral link and
                    gets 25 coins instantly.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">You Both Earn</h3>
                  <p className="text-sm text-muted-foreground">
                    You receive 50 coins as a thank you for spreading the word about
                    Questify!
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Referred Users List */}
          {referralData?.referrals && referralData.referrals.length > 0 && (
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-bold mb-4 text-foreground">
                Your Referrals ({referralData.referrals.length})
              </h2>
              <div className="space-y-3">
                {referralData.referrals.map((referral: any) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={referral.referred.avatar_url} />
                        <AvatarFallback>
                          {referral.referred.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">
                          {referral.referred.display_name || referral.referred.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{referral.referred.username}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        +{referral.reward_amount} coins
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
