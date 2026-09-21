import { Header } from "@/components/Header";
import { Link, useLocation } from "react-router-dom";

type Section = { title: string; paragraphs: string[] };
type LegalDocument = { title: string; introduction: string; sections: Section[] };

const updated = "September 21, 2026";

const documents: Record<string, LegalDocument> = {
  "/privacy": {
    title: "Privacy Policy",
    introduction: "This policy explains what A Challenge collects, why it is used, and the choices available to you.",
    sections: [
      { title: "Information we collect", paragraphs: ["We process account details, profile information, challenge submissions, moderation records, participation activity, and support communications that you choose to provide.", "Payment providers may process billing information. A Challenge should store only the provider identifiers and transaction records needed to operate purchases, rewards, and refunds."] },
      { title: "How information is used", paragraphs: ["Information is used to operate accounts, publish entries you choose to share, rank eligible participation, prevent abuse, moderate content, administer prizes, improve performance, and meet legal obligations."] },
      { title: "Analytics and error monitoring", paragraphs: ["A Challenge uses privacy-friendly Vercel Analytics, Speed Insights, and technical error reports. Error reports are limited, exclude email addresses when detected, and are used to diagnose failures and improve reliability."] },
      { title: "Sharing and retention", paragraphs: ["Public profile fields and approved submissions can be visible to other visitors. Service providers such as Supabase, Vercel, payment processors, and email delivery providers process data only to provide the service.", "Data is kept only as long as needed for the service, security, accounting, dispute resolution, or legal requirements. You may request access, correction, export, or deletion where applicable."] },
      { title: "Your choices", paragraphs: ["You can edit profile information, remove optional content where the product allows it, or request account deletion. Essential authentication storage is required to keep you signed in securely."] },
      { title: "Children and international use", paragraphs: ["Users who are below the age of digital consent in their country must use the service only with permission from a parent or legal guardian. Local privacy rights may vary by country."] },
    ],
  },
  "/terms": {
    title: "Terms of Use",
    introduction: "By creating an account or submitting content, you agree to these terms and the applicable challenge rules.",
    sections: [
      { title: "Account responsibilities", paragraphs: ["Provide accurate information, protect your login credentials, and notify A Challenge if you believe your account has been compromised. You are responsible for activity performed through your account."] },
      { title: "Original and lawful content", paragraphs: ["Submit only work you created or have permission to use. Do not submit illegal, deceptive, hateful, sexually exploitative, dangerous, privacy-invasive, or rights-infringing content."] },
      { title: "Licence to display submissions", paragraphs: ["You retain ownership of your work. By submitting it, you grant A Challenge a non-exclusive, worldwide, royalty-free licence to host, display, resize, moderate, and promote that submission in connection with the service and the relevant challenge."] },
      { title: "Moderation and enforcement", paragraphs: ["A Challenge may reject, hide, or remove entries and may restrict accounts that violate these terms, challenge rules, safety requirements, or applicable law. Material decisions may be reviewed when an appeal channel is available."] },
      { title: "Rewards and availability", paragraphs: ["Points may be promotional and have no cash value unless a challenge expressly states otherwise. Features, schedules, prizes, and availability may change, but published commitments will be handled fairly and transparently."] },
      { title: "Disclaimers", paragraphs: ["The service is provided on an as-available basis. Nothing in these terms excludes rights or liabilities that cannot legally be excluded in your jurisdiction."] },
    ],
  },
  "/cookies": {
    title: "Cookie and Storage Policy",
    introduction: "A Challenge keeps tracking deliberately small and uses browser storage only where it supports the service.",
    sections: [
      { title: "Essential storage", paragraphs: ["Supabase authentication uses browser storage to maintain a secure signed-in session. Interface preferences may also be stored locally. Disabling essential storage can prevent login and personalised features from working."] },
      { title: "Analytics", paragraphs: ["Vercel Web Analytics and Speed Insights measure page usage and Core Web Vitals without building advertising profiles. A Challenge does not use third-party advertising cookies."] },
      { title: "Your controls", paragraphs: ["You can clear site data through your browser. Doing so signs you out and resets locally stored preferences. Browser privacy controls can also limit non-essential measurement."] },
    ],
  },
  "/contest-rules": {
    title: "General Challenge and Contest Rules",
    introduction: "These rules apply unless a challenge page publishes additional terms. If specific rules conflict, the specific challenge rules control.",
    sections: [
      { title: "Eligibility and entry", paragraphs: ["No purchase is necessary. Enter before the published deadline using an eligible account. Age, country, format, and prize restrictions may be specified on each challenge page. Minors need permission from a parent or legal guardian where required."] },
      { title: "Originality and permissions", paragraphs: ["Entries must be your original work. Obtain permission from identifiable people, location owners, and rights holders when required. AI-generated or materially AI-assisted content is allowed only when the challenge explicitly permits it and must be disclosed when requested."] },
      { title: "Safety and fair play", paragraphs: ["Do not endanger people, animals, property, or the public. Do not manipulate votes, create duplicate accounts, plagiarise entries, or misrepresent when or how work was created."] },
      { title: "Judging", paragraphs: ["Winners may be selected using the published criteria, which can include originality, execution, relevance, community response, and compliance. Engagement signals may be reviewed for fraud and are not automatically decisive."] },
      { title: "Prizes", paragraphs: ["Prize description, value, eligibility, delivery timing, and any tax responsibility will be stated on the challenge page or winner notice. Substitution may occur only when reasonably necessary and with comparable value where required."] },
      { title: "Disqualification and cancellation", paragraphs: ["Entries that break these rules may be rejected. A challenge may be modified, paused, or cancelled when fraud, technical failure, safety, legal restrictions, or events outside reasonable control prevent fair operation."] },
    ],
  },
};

const Legal = () => {
  const { pathname } = useLocation();
  const document = documents[pathname] ?? documents["/terms"];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 py-12 md:py-16">
        <article className="container max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">A Challenge policies</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{document.title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">Last updated: {updated}</p>
          <p className="mt-7 text-lg leading-8 text-muted-foreground">{document.introduction}</p>
          <div className="mt-10 space-y-10">
            {document.sections.map((section) => (
              <section key={section.title} aria-labelledby={section.title.replace(/\s+/g, "-").toLowerCase()}>
                <h2 id={section.title.replace(/\s+/g, "-").toLowerCase()} className="text-2xl font-black">{section.title}</h2>
                <div className="mt-3 space-y-3 text-base leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="mt-12 rounded-xl border-2 border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
            Questions or rights requests can be raised through the support channel identified in A Challenge account communications. See the <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/faq">Help page</Link> for general guidance.
          </aside>
        </article>
      </main>
    </div>
  );
};

export default Legal;
