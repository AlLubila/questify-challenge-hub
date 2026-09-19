import { cn } from "@/lib/utils";

interface QuestifyLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export const QuestifyLogo = ({ className, showWordmark = true }: QuestifyLogoProps) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0 text-primary" role="img" aria-label="Questify">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M23 5C12.5 5 5 12.7 5 23.1 5 33.5 12.5 41 23 41c3.2 0 6.2-.7 8.8-2.1l8.6 5.1v-9.4l-3.7-2.2A18 18 0 0 0 41 23.1C41 12.7 33.5 5 23 5Zm0 7.1c6.4 0 10.8 4.6 10.8 11 0 2.1-.5 4-1.4 5.6L25 24.3v8.2l-1.9 1.4H23c-6.4 0-10.8-4.5-10.8-10.8S16.6 12.1 23 12.1Z"
      />
      <path fill="hsl(var(--background))" d="M32.2 31.6h4.1v3.8h-4.1zm4.1 3.8h4.1v3.8h-4.1z" />
    </svg>
    {showWordmark && <span className="text-xl font-black tracking-tight text-foreground">Questify</span>}
  </span>
);
