import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "react-router-dom";
import { AChallengeLogo } from "@/components/AChallengeLogo";

const hiddenPrefixes = ["/admin", "/auth", "/wallet", "/referrals"];

export const SiteFooter = () => {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <footer className="border-t-2 border-border bg-muted/30 px-4 py-10">
      <div className="container grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-3">
          <AChallengeLogo />
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {t("footer.description") }
          </p>
        </div>
        <nav aria-label={t("footer.legal")} className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
          <Link className="hover:text-primary" to="/privacy">{t("footer.privacy")}</Link>
          <Link className="hover:text-primary" to="/terms">{t("footer.terms")}</Link>
          <Link className="hover:text-primary" to="/cookies">{t("footer.cookies")}</Link>
          <Link className="hover:text-primary" to="/contest-rules">{t("footer.rules")}</Link>
          <Link className="hover:text-primary" to="/faq">{t("footer.help")}</Link>
        </nav>
      </div>
      <div className="container mt-8 border-t border-border pt-5 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} A Challenge. {t("footer.rights")}</p>
        <address className="mt-2 not-italic">
          {t("footer.operator")} Albi Lubila Mayamwene ·{" "}
          <a className="font-semibold text-primary underline-offset-4 hover:underline" href="mailto:alweb003@gmail.com">alweb003@gmail.com</a>
        </address>
      </div>
    </footer>
  );
};
