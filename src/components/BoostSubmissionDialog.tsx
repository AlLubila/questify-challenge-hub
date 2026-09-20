import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap } from "lucide-react";
import { useBoostTicket, BoostType } from "@/hooks/useBoostTicket";
import { cn } from "@/lib/utils";

interface BoostSubmissionDialogProps {
  submissionId: string;
  children: React.ReactNode;
}

const BOOST_OPTIONS = [
  {
    type: "small" as BoostType,
    name: "Small Boost",
    price: 1,
    multiplier: "2x",
    description: "Double your submission visibility",
    color: "bg-accent text-accent-foreground",
  },
  {
    type: "medium" as BoostType,
    name: "Medium Boost",
    price: 2,
    multiplier: "5x",
    description: "5x your submission visibility",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    type: "large" as BoostType,
    name: "Large Boost",
    price: 3,
    multiplier: "10x",
    description: "10x your submission visibility",
    color: "bg-primary text-primary-foreground",
  },
];

export const BoostSubmissionDialog = ({ submissionId, children }: BoostSubmissionDialogProps) => {
  const { purchaseBoost, isPurchasing } = useBoostTicket();

  const handleBoostSelect = (boostType: BoostType) => {
    purchaseBoost({ boostType, submissionId });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Boost Your Submission
          </DialogTitle>
          <DialogDescription>
            Increase your submission's visibility and get more votes!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {BOOST_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => handleBoostSelect(option.type)}
              disabled={isPurchasing}
              className={cn(
                "w-full p-4 rounded-lg border-2 border-border hover:border-primary transition-all",
                "bg-card hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-between group"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", option.color)}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{option.name}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-foreground">
                  {option.multiplier}
                </span>
                <span className="text-sm font-medium">${option.price}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Boosted submissions appear more frequently in the feed
        </p>
      </DialogContent>
    </Dialog>
  );
};
