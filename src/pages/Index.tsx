import { Header } from "@/components/Header";
import { ChallengeCard } from "@/components/ChallengeCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, Flag, HelpCircle } from "lucide-react";
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

      <section className="border-b-2 border-border px-4 py-12 md:py-16">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:gap-16">
            <div className="space-y-7">
              <p className="border-l-4 border-primary pl-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {t("hero.badge")}
              </p>
              
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
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
                  <ArrowDownRight className="h-4 w-4" />
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

            <div className="relative overflow-hidden rounded-2xl border-2 border-[#101113] bg-[#f7f2e8] p-6 text-[#101113] shadow-card md:p-8">
              <div className="flex items-center justify-between border-b-2 border-dashed border-[#101113]/30 pb-4">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">Mission route / 01</p>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#101113] bg-primary"><Flag className="h-5 w-5" /></span>
              </div>
              <svg viewBox="0 0 420 70" className="mt-4 h-14 w-full" aria-hidden="true">
                <path className="route-path" d="M10 35 C85 2 120 64 195 34 S315 5 405 34" fill="none" stroke="#101113" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <ol className="grid gap-3 sm:grid-cols-3">
                {[
                  ["01", "Choose an open brief", "Check the rules, deadline, reward, and judging criteria."],
                  ["02", "Submit original work", "Upload your own photo or video before the challenge closes."],
                  ["03", "Get reviewed", "Approved entries earn points and appear in the community feed."],
                ].map(([step, title, description]) => (
                  <li key={step} className="rounded-xl border-2 border-[#101113] bg-white/50 p-4">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#101113] bg-primary font-mono text-xs font-bold">{step}</span>
                    <div>
                      <h2 className="mt-3 font-bold">{title}</h2>
                      <p className="mt-1 text-sm leading-5 text-[#101113]/75">{description}</p>
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
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Mission board</p>
              <h2 className="mb-2 text-3xl font-black tracking-tight text-foreground md:text-4xl">
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
          <Card className="flex flex-col items-start justify-between gap-6 border-2 border-[#101113] bg-[#69c6f0] p-8 text-[#101113] shadow-card md:flex-row md:items-center md:p-10">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">Your next mission</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{t("cta.title")}</h2>
              <p className="mt-2 max-w-2xl text-[#101113]/75">{t("cta.description")}</p>
            </div>
            <Button
              size="lg"
              className="shrink-0"
              onClick={scrollToChallenges}
            >
              {t("cta.button")}
              <Flag className="h-4 w-4" />
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
