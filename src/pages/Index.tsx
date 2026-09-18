import { Header } from "@/components/Header";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, Award, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";
import challenge1 from "@/assets/challenge-1.jpg";
import { useChallenges, calculateTimeLeft } from "@/hooks/useChallenges";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChallengeCardSkeleton } from "@/components/skeletons/ChallengeCardSkeleton";
import { TrendingChallenges } from "@/components/TrendingChallenges";
import { PersonalizedChallenges } from "@/components/PersonalizedChallenges";
import { WeeklyTopPerformers } from "@/components/WeeklyTopPerformers";
import { AchievementsShowcase } from "@/components/AchievementsShowcase";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { data: challenges, isLoading, isError, refetch } = useChallenges();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const now = Date.now();
  const activeChallenges = challenges?.filter((challenge) => (
    new Date(challenge.start_date).getTime() <= now && new Date(challenge.end_date).getTime() > now
  )) ?? [];
  const displayChallenges = activeChallenges.length > 0 ? activeChallenges : (challenges ?? []);
  const showingArchive = !isLoading && activeChallenges.length === 0 && displayChallenges.length > 0;

  const scrollToChallenges = () => {
    document.getElementById("challenges")?.scrollIntoView({ behavior: "smooth" });
  };

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
                  className="bg-gradient-primary text-lg px-8 h-14 hover:shadow-glow"
                  onClick={scrollToChallenges}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t("hero.cta")}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 h-14"
                  onClick={() => navigate('/faq')}
                >
                  <HelpCircle className="w-5 h-5 mr-2" />
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
                {showingArchive ? "Recent Challenges" : t("challenges.featured")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {showingArchive ? "New challenges are on the way. Explore recently completed quests in the meantime." : t("challenges.trending")}
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
              ) : isError ? (
                <Card className="p-8 text-center">
                  <h3 className="text-xl font-semibold">Challenges could not be loaded</h3>
                  <p className="mt-2 text-muted-foreground">Check your connection and try again.</p>
                  <Button className="mt-5" onClick={() => refetch()}>Try again</Button>
                </Card>
              ) : displayChallenges.length > 0 ? (
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
                        isEnded={new Date(challenge.end_date).getTime() <= now}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="p-10 text-center">
                  <Sparkles className="mx-auto h-10 w-10 text-primary" />
                  <h3 className="mt-4 text-2xl font-semibold">The next quest is being prepared</h3>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">Check back soon for a fresh creative challenge.</p>
                </Card>
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
              onClick={scrollToChallenges}
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
