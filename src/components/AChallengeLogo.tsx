import { cn } from "@/lib/utils";

interface AChallengeLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export const AChallengeLogo = ({ className, showWordmark = true }: AChallengeLogoProps) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" role="img" aria-label="A Challenge">
      <path d="M6.5 40 21.8 9.5" fill="none" stroke="#ff8a1f" strokeLinecap="round" strokeWidth="7" />
      <path d="m25.4 9.5 16.1 30.5" fill="none" stroke="#ff4d3d" strokeLinecap="round" strokeWidth="7" />
      <path d="M13.5 30h22" fill="none" stroke="#12366b" strokeLinecap="round" strokeWidth="7" />
      <path d="M15 30h19" fill="none" stroke="#f7f2e8" strokeLinecap="round" strokeWidth="3" />
      <circle cx="23.6" cy="7.5" r="3.8" fill="#ff8a1f" />
      <path d="M27 7.8c4-1.8 7.2.8 11.2-.9v8.2c-4 1.7-7.2-.9-11.2.9V7.8Z" fill="#12366b" />
    </svg>
    {showWordmark && <span className="text-xl font-black tracking-[-0.04em] text-foreground">A Challenge</span>}
  </span>
);
