import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Menu } from "lucide-react";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Questify
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <a
              href="#challenges"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Challenges
            </a>
            <a
              href="#leaderboard"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Leaderboard
            </a>
            <a
              href="#rewards"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Rewards
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-muted text-foreground px-3 py-1">
              <Trophy className="w-3 h-3 mr-1 text-accent" />
              1,250 pts
            </Badge>
            <Button size="sm" variant="outline">
              Sign In
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:shadow-glow">
              Get Started
            </Button>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
