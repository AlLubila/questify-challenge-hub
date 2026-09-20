import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://achallenge.vercel.app";
const DEFAULT_TITLE = "A Challenge — Weekly Creative Photo & Video Challenges";
const DEFAULT_DESCRIPTION = "Join original weekly photo and video challenges, share creative work, earn points, and discover standout creators on A Challenge.";

const publicPages: Record<string, { title: string; description: string }> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  "/feed": {
    title: "Community Feed — Creative Challenge Entries | A Challenge",
    description: "Discover original photo and video challenge entries from the A Challenge creator community.",
  },
  "/leaderboard": {
    title: "Creative Challenge Leaderboard | A Challenge",
    description: "See the top A Challenge creators ranked by community votes and engagement across completed challenges.",
  },
  "/faq": {
    title: "How A Challenge Works | A Challenge",
    description: "Learn how to join A Challenge, submit original work, earn points, and participate safely.",
  },
};

const upsertMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

export const RouteMetadata = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const isChallenge = pathname.startsWith("/challenge/");
    const isPublicProfile = pathname.startsWith("/profile/");
    const metadata = publicPages[pathname]
      ?? (isChallenge ? {
        title: "Creative Challenge Brief | A Challenge",
        description: "View the rules, deadline, points, and submission details for this A Challenge creative mission.",
      } : isPublicProfile ? {
        title: "Creator Profile | A Challenge",
        description: "Explore an A Challenge creator profile and their original creative entries.",
      } : {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
      });

    const noIndex = pathname === "/auth"
      || pathname === "/profile"
      || pathname.startsWith("/admin")
      || pathname === "/wallet"
      || pathname === "/referrals";
    const canonicalPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    document.title = metadata.title;
    upsertMeta('meta[name="description"]', "name", "description", metadata.description);
    upsertMeta('meta[name="robots"]', "name", "robots", noIndex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    upsertMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", metadata.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
};
