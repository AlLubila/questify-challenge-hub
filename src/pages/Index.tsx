import { Header } from "@/components/Header";
import { ChallengeCard } from "@/components/ChallengeCard";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Users, Zap, TrendingUp, Award } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import challenge1 from "@/assets/challenge-1.jpg";
import challenge2 from "@/assets/challenge-2.jpg";
import challenge3 from "@/assets/challenge-3.jpg";

const Index = () => {
  const challenges = [
    {
      id: "1",
      title: "Golden Hour Photography",
      description: "Capture the perfect sunset moment in your city. Show us your best golden hour shot!",
      image: challenge1,
      prize: "$500 Cash",
      participants: 12458,
      timeLeft: "2d 14h left",
      points: 500,
      difficulty: "medium" as const,
    },
    {
      id: "2",
      title: "Digital Art Fusion",
      description: "Create a unique digital artwork combining nature and technology themes.",
      image: challenge2,
      prize: "$1000 Cash",
      participants: 8932,
      timeLeft: "5d 8h left",
      points: 750,
      difficulty: "hard" as const,
    },
    {
      id: "3",
      title: "30-Second Dance Challenge",
      description: "Show off your best moves! Create an original 30-second dance routine.",
      image: challenge3,
      prize: "$250 Cash",
      participants: 24876,
      timeLeft: "18h left",
      points: 300,
      difficulty: "easy" as const,
    },
  ];

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
                Join 100k+ Creators Worldwide
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-black leading-tight">
                Create.
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Compete.
                </span>
                <br />
                Win Big.
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg">
                Join daily creative challenges, earn points and badges, compete with creators worldwide,
                and win real cash prizes. Your creativity has never been this rewarding!
              </p>

              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-gradient-primary hover:shadow-glow text-lg px-8 h-14">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Creating Now
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                  See How It Works
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div>
                  <p className="text-3xl font-bold text-foreground">$50k+</p>
                  <p className="text-sm text-muted-foreground">Prizes Won</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-3xl font-bold text-foreground">100k+</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <p className="text-3xl font-bold text-foreground">500+</p>
                  <p className="text-sm text-muted-foreground">Challenges</p>
                </div>
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

      {/* Stats Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              icon={Trophy}
              title="Total Prizes"
              value="$50k+"
              subtitle="Awarded to creators"
              gradient="bg-gradient-accent"
            />
            <StatsCard
              icon={Users}
              title="Active Creators"
              value="100k+"
              subtitle="Creating daily"
              gradient="bg-gradient-primary"
            />
            <StatsCard
              icon={Zap}
              title="Daily Challenges"
              value="12"
              subtitle="New every day"
              gradient="bg-gradient-secondary"
            />
            <StatsCard
              icon={TrendingUp}
              title="Avg Earnings"
              value="$250"
              subtitle="Per month"
              gradient="bg-gradient-primary"
            />
          </div>
        </div>
      </section>

      {/* Featured Challenges */}
      <section className="py-20 px-4" id="challenges">
        <div className="container">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-3">
                Featured Challenges
              </h2>
              <p className="text-muted-foreground text-lg">
                Join these trending challenges and start earning today
              </p>
            </div>
            <Button variant="outline" className="hidden md:flex">
              View All Challenges
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge, index) => (
              <div key={challenge.id} style={{ animationDelay: `${index * 0.1}s` }}>
                <ChallengeCard {...challenge} />
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12 md:hidden">
            <Button variant="outline" className="w-full sm:w-auto">
              View All Challenges
            </Button>
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
              Ready to Turn Your Creativity Into Cash?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of creators earning money doing what they love.
              Sign up now and get 100 bonus points!
            </p>
            <Button
              size="lg"
              className="bg-gradient-primary hover:shadow-glow text-xl px-12 h-16"
            >
              <Sparkles className="w-6 h-6 mr-2" />
              Join Questify Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
