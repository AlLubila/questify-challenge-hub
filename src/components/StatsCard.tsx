import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle: string;
  gradient?: string;
}

export const StatsCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  gradient = "bg-gradient-primary",
}: StatsCardProps) => {
  return (
    <Card className="p-6 bg-card border-border hover:shadow-glow transition-all duration-300 hover:scale-105 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
};
