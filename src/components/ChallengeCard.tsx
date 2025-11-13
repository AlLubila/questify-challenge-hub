import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Users, Sparkles } from "lucide-react";

interface ChallengeCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  prize: string;
  participants: number;
  timeLeft: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
}

export const ChallengeCard = ({
  title,
  description,
  image,
  prize,
  participants,
  timeLeft,
  points,
  difficulty,
}: ChallengeCardProps) => {
  const difficultyColors = {
    easy: "bg-success text-success-foreground",
    medium: "bg-accent text-accent-foreground",
    hard: "bg-secondary text-secondary-foreground",
  };

  return (
    <Card className="group overflow-hidden bg-card border-border hover:shadow-glow transition-all duration-300 hover:scale-[1.02] animate-fade-in">
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={difficultyColors[difficulty]} variant="secondary">
            {difficulty}
          </Badge>
          <Badge className="bg-gradient-primary text-primary-foreground border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            {points} pts
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-accent" />
            <span>{prize}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-primary" />
            <span>{participants.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-foreground font-medium">{timeLeft}</span>
          </div>
          <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
            Join Challenge
          </Button>
        </div>
      </div>
    </Card>
  );
};
