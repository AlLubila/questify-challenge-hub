import { cn } from "@/lib/utils";

interface WavazoLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export const WavazoLogo = ({ className, showWordmark = true }: WavazoLogoProps) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" role="img" aria-label="Wavazo">
      <path
        d="M6.5 15c1.9 12.8 4.7 23 9.7 23 5.1 0 5.8-17 9.2-17"
        fill="none"
        stroke="#ff8a1f"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <path d="M25.4 21c3.5 0 4.3 17 9.3 17 4.8 0 6.2-16.8 6.2-29" fill="none" stroke="#ff4d3d" strokeLinecap="round" strokeWidth="7" />
      <circle cx="40.9" cy="7.5" r="3.5" fill="#ff4d3d" />
      <path d="M41 9.5c-4.6-1.9-7.6.6-11.7-1.1v8.4c4.1 1.7 7.1-.8 11.7 1.1V9.5Z" fill="#12366b" />
      <path d="M35.1 9.4v3.6h5.9V9.5c-2.2-.9-4.1-.8-5.9-.1Z" fill="hsl(var(--background))" />
    </svg>
    {showWordmark && <span className="text-xl font-black tracking-[-0.04em] text-foreground">Wavazo</span>}
  </span>
);
