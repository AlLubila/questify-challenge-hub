import { Header } from "@/components/Header";
import { ChallengeCard } from "@/components/ChallengeCard";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Users, Zap, TrendingUp, Award, RefreshCw } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import challenge1 from "@/assets/challenge-1.jpg";
import challenge2 from "@/assets/challenge-2.jpg";
import challenge3 from "@/assets/challenge-3.jpg";
import { useChallenges, calculateTimeLeft } from "@/hooks/useChallenges";
import { useGenerateChallenge } from "@/hooks/useGenerateChallenge";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChallengeCardSkeleton } from "@/components/skeletons/ChallengeCardSkeleton";
import { TrendingChallenges } from "@/components/TrendingChallenges";
import { PersonalizedChallenges } from "@/components/PersonalizedChallenges";
import { WeeklyTopPerformers } from "@/components/WeeklyTopPerformers";
import { AchievementsShowcase } from "@/components/AchievementsShowcase";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { data: challenges, isLoading } = useChallenges();
  const { mutate: generateChallenge, isPending: isGenerating } = useGenerateChallenge();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Fallback challenges for when database is empty
  const fallbackChallenges = [
    {
      id: "1",
      title: "Golden Hour Photography",
      description: "Capture the perfect sunset moment in your city. Show us your best golden hour shot!",
      image_url: challenge1,
      prize: "$500 Cash",
      participants_count: 12458,
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      points: 500,
      difficulty: "medium" as const,
    },
    {
      id: "2",
      title: "Digital Art Fusion",
      description: "Create a unique digital artwork combining nature and technology themes.",
      image_url: challenge2,
      prize: "$1000 Cash",
      participants_count: 8932,
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      points: 750,
      difficulty: "hard" as const,
    },
    {
      id: "3",
      title: "30-Second Dance Challenge",
      description: "Show off your best moves! Create an original 30-second dance routine.",
      image_url: challenge3,
      prize: "$250 Cash",
      participants_count: 24876,
      end_date: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
      points: 300,
      difficulty: "easy" as const,
    },
  ];

  const displayChallenges = challenges && challenges.length > 0 ? challenges : fallbackChallenges;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-primary opacity-10 blur-3xl" />
        <div className="container relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <Badge className="bg-gradient-accent text-accent-foreground border-0 px-4 py-2 w-fit">
                <Sparkles className="w-4 h-4 mr-2" />
                {t("hero.badge")}
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-black leading-tight">
                {t("hero.title1")}
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  {t("hero.title2")}
                </span>
                <br />
                {t("hero.title3")}
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg">
                {t("hero.description")}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:shadow-glow text-lg px-8 h-14"
                  onClick={() => {
                    const challengesSection = document.getElementById('challenges');
                    if (challengesSection) {
                      challengesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t("hero.cta")}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 h-14"
                  onClick={() => {
                    const challengesSection = document.getElementById('challenges');
                    if (challengesSection) {
                      challengesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {t("hero.howItWorks")}
                </Button>
              </div>

            </div>

            <div className="relative animate-float">
              <div className="absolute inset-0 bg-gradient-secondary blur-3xl opacity-30 rounded-full" />
              <img
                src={heroImage}
                alt="Questify Hero"
                className="relative rounded-3xl shadow-card border border-border/50"
              />
            </div>
          </div>
        </div>
      </section>


      {/* Featured Challenges */}
      <section className="py-20 px-4" id="challenges">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-3">
                {t("challenges.featured")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t("challenges.trending")}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              {isLoading ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <ChallengeCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {displayChallenges.map((challenge, index) => (
                    <div key={challenge.id} style={{ animationDelay: `${index * 0.1}s` }}>
                      <ChallengeCard 
                        id={challenge.id}
                        title={challenge.title}
                        description={challenge.description}
                        image={challenge.image_url || challenge1}
                        prize={challenge.prize}
                        participants={challenge.participants_count}
                        timeLeft={calculateTimeLeft(challenge.end_date)}
                        points={challenge.points}
                        difficulty={challenge.difficulty}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden lg:block space-y-6 sticky top-6 h-fit">
              <WeeklyTopPerformers />
              <AchievementsShowcase />
              <TrendingChallenges />
              {user && <PersonalizedChallenges />}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <Award className="w-20 h-20 mx-auto text-primary animate-pulse-glow" />
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              {t("cta.title")}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t("cta.description")}
            </p>
            <Button
              size="lg"
              className="bg-gradient-primary hover:shadow-glow text-xl px-12 h-16"
              onClick={() => {
                const challengesSection = document.getElementById('challenges');
                if (challengesSection) {
                  challengesSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <Sparkles className="w-6 h-6 mr-2" />
              {t("cta.button")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
