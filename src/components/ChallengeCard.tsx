import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Trophy, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

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
  isEnded?: boolean;
}

export const ChallengeCard = ({
  id,
  title,
  description,
  image,
  prize,
  participants,
  timeLeft,
  points,
  difficulty,
  isEnded = false,
}: ChallengeCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const difficultyColors = {
    easy: "bg-success text-success-foreground",
    medium: "bg-accent text-accent-foreground",
    hard: "bg-secondary text-secondary-foreground",
  };
  
  const difficultyLabel = t(`challenges.${difficulty}`);

  return (
    <Card className="group overflow-hidden border-border bg-card transition-colors duration-200 hover:border-primary/40">
      <div className="relative overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-muted" role="img" aria-label={`${title} has no cover image`}>
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={difficultyColors[difficulty]} variant="secondary">
            {difficultyLabel}
          </Badge>
          <Badge variant="outline" className="border-border bg-background/90 text-foreground backdrop-blur-sm">
            {points} {t("challenges.points").toLowerCase()}
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="mb-2 text-xl font-bold text-foreground">
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
          <Button 
            onClick={() => navigate(`/challenge/${id}`)}
            disabled={isEnded}
          >
            {isEnded ? "Challenge ended" : t("challenges.joinChallenge")}
          </Button>
        </div>
      </div>
    </Card>
  );
};
