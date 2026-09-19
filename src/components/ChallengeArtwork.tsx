import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ChallengeArtworkProps {
  src?: string;
  alt: string;
  className?: string;
}

export const ChallengeArtwork = ({ src, alt, className }: ChallengeArtworkProps) => {
  const [failed, setFailed] = useState(!src);

  useEffect(() => setFailed(!src), [src]);

  if (!failed && src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={cn("h-full w-full bg-[#f7f2e8]", className)} role="img" aria-label={`${alt} — Wavazo illustrated cover`}>
      <svg viewBox="0 0 640 360" className="h-full w-full" aria-hidden="true">
        <rect width="640" height="360" fill="#f7f2e8" />
        <circle cx="530" cy="72" r="42" fill="#69c6f0" stroke="#101113" strokeWidth="7" />
        <path d="M165 292C178 145 268 72 420 82c-24 142-111 216-255 210Z" fill="#c7f36b" stroke="#101113" strokeWidth="8" />
        <path d="m188 277 205-177M269 206l-22-72m78 26 72 16" fill="none" stroke="#101113" strokeWidth="7" strokeLinecap="round" />
        <path d="M112 310c96 31 205 11 304-63" fill="none" stroke="#101113" strokeWidth="7" strokeDasharray="14 13" />
        <circle cx="98" cy="280" r="24" fill="#69c6f0" stroke="#101113" strokeWidth="7" />
        <path d="M70 360c3-74 56-74 59 0" fill="#ff705d" stroke="#101113" strokeWidth="7" />
        <path d="M416 201v65l56-23-56-22" fill="#ff705d" stroke="#101113" strokeWidth="7" strokeLinejoin="round" />
        <path d="M513 55a28 28 0 1 0 20 47l21 12V86l-10-6a28 28 0 0 0-31-25Z" fill="#101113" />
      </svg>
    </div>
  );
};
