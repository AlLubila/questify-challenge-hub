import { Header } from "@/components/Header";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChallenges, calculateTimeLeft } from "@/hooks/useChallenges";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChallengeCardSkeleton } from "@/components/skeletons/ChallengeCardSkeleton";
import { TrendingChallenges } from "@/components/TrendingChallenges";
import { WeeklyTopPerformers } from "@/components/WeeklyTopPerformers";

const Index = () => {
  const { data: challenges, isLoading, isError, refetch } = useChallenges();
  const { t } = useLanguage();
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

      <section className="border-b border-border px-4 py-14 md:py-20">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:gap-16">
            <div className="space-y-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("hero.badge")}
              </p>
              
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
                {t("hero.title1")}
                <br />
                {t("hero.title2")}
                <br />
                <span className="text-primary">{t("hero.title3")}</span>
              </h1>

              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                {t("hero.description")}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="h-12 px-6 text-base"
                  onClick={scrollToChallenges}
                >
                  {t("hero.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 px-6 text-base"
                  onClick={() => navigate('/faq')}
                >
                  <HelpCircle className="h-4 w-4" />
                  {t("hero.howItWorks")}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-card md:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">How an entry works</p>
              <ol className="mt-6 divide-y divide-border">
                {[
                  ["01", "Choose an open brief", "Check the rules, deadline, reward, and judging criteria."],
                  ["02", "Submit original work", "Upload your own photo or video before the challenge closes."],
                  ["03", "Get reviewed", "Approved entries earn points and appear in the community feed."],
                ].map(([step, title, description]) => (
                  <li key={step} className="grid grid-cols-[2.5rem_1fr] gap-4 py-5 first:pt-0 last:pb-0">
                    <span className="font-mono text-sm text-primary">{step}</span>
                    <div>
                      <h2 className="font-semibold text-foreground">{title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>


      <section className="px-4 py-16" id="challenges">
        <div className="container">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {showingArchive ? "Recent Challenges" : t("challenges.featured")}
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                {showingArchive ? "New challenges are on the way. Explore recently completed quests in the meantime." : t("challenges.trending")}
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
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
                        image={challenge.image_url || ""}
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
                  <h3 className="text-xl font-semibold">No open challenges right now</h3>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">Check back soon for a fresh creative challenge.</p>
                </Card>
              )}
            </div>

            <aside className="hidden h-fit space-y-6 lg:sticky lg:top-24 lg:block">
              <WeeklyTopPerformers />
              <TrendingChallenges />
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="container">
          <Card className="flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{t("cta.title")}</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{t("cta.description")}</p>
            </div>
            <Button
              size="lg"
              className="shrink-0"
              onClick={scrollToChallenges}
            >
              {t("cta.button")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
