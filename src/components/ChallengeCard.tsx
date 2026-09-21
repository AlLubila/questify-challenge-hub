import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChallengeArtwork } from "@/components/ChallengeArtwork";
import { publicRewardLabel } from "@/lib/rewards";

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
    <Card className="mission-card group overflow-hidden border-2 border-border bg-card shadow-card">
      <div className="relative h-52 overflow-hidden border-b-2 border-border">
        <ChallengeArtwork src={image} alt={title} />
        <div className="absolute left-3 top-3 border-2 border-background bg-[#f7f2e8] px-2 py-1 font-mono text-[11px] font-bold text-[#101113]">
          MISSION
        </div>
        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={difficultyColors[difficulty]} variant="secondary">
            {difficultyLabel}
          </Badge>
          <Badge variant="outline" className="border-2 border-background bg-background text-foreground">
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
            <span>{publicRewardLabel(prize, points)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-primary" />
            <span>{participants.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t-2 border-dashed border-border pt-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="text-foreground font-medium">{timeLeft}</span>
          </div>
          <Button className="mission-stamp border-2 border-primary shadow-[3px_3px_0_hsl(var(--background))]"
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
