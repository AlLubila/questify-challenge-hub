import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, Trophy, Camera, Star, Wallet, Users, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      category: "How It Works",
      icon: HelpCircle,
      questions: [
        {
          q: "What is A Challenge?",
          a: "A Challenge is a creative community where you can join original photo and video missions, share your work, and compete for listed rewards. A fresh challenge is published every week."
        },
        {
          q: "How do I participate in a challenge?",
          a: "It's simple! Click on a challenge you like, take an original photo or video that matches the theme, add a caption if you want, and submit. You can edit your image with filters and stickers before posting."
        },
        {
          q: "Who creates the challenges?",
          a: "A new batch of five challenges is prepared each week by our AI editor. Admins review the programme and can also create special or sponsored challenges."
        },
      ]
    },
    {
      category: "Ranking & Rewards",
      icon: Trophy,
      questions: [
        {
          q: "How do I win a challenge?",
          a: "At the end of each challenge, participants are ranked using the published criteria, including community response and rule compliance. Top creators earn recognition, points, and badges."
        },
        {
          q: "What rewards can I earn?",
          a: "Current rewards are non-cash: points, badges, profile recognition, and occasional partner rewards that are clearly described on the challenge page. Points and badges have no cash value."
        },
        {
          q: "What are points for?",
          a: "Points you earn by participating in challenges increase your level and unlock badges. The more you participate, the higher your level!"
        },
      ]
    },
    {
      category: "Submissions",
      icon: Camera,
      questions: [
        {
          q: "What types of content can I submit?",
          a: "You can submit photos or videos depending on the challenge type. Make sure your content is original and matches the challenge theme."
        },
        {
          q: "Why was my submission rejected?",
          a: "Submissions are automatically verified. If your image appears to be AI-generated or taken from the internet, it will be rejected. Only original photos/videos that YOU created are accepted."
        },
        {
          q: "Can I edit my submission?",
          a: "Once submitted, you cannot modify your entry. Make sure everything is perfect before submitting!"
        },
      ]
    },
    {
      category: "Leaderboard & Ranking",
      icon: Star,
      questions: [
        {
          q: "How does the leaderboard work?",
          a: "The leaderboard displays the Top 10 participants for each completed challenge. Ranking is based on: Likes × 2 + Comments. You can also see your own rank."
        },
        {
          q: "When is the ranking finalized?",
          a: "The final ranking is determined when the challenge ends. Eligible creators then receive the listed non-cash points, badges, recognition, or clearly announced partner reward."
        },
      ]
    },
    {
      category: "Points & Badges",
      icon: Wallet,
      questions: [
        {
          q: "Can I withdraw points as money?",
          a: "No. A Challenge points and badges are recognition inside the community and cannot currently be exchanged or withdrawn as money."
        },
        {
          q: "How do partner rewards work?",
          a: "If a challenge includes a partner reward, its eligibility and delivery details will be stated clearly on that challenge. No partner reward is implied unless it is explicitly listed."
        },
      ]
    },
    {
      category: "Community",
      icon: Users,
      questions: [
        {
          q: "How do I follow other creators?",
          a: "Click on a creator's profile and press 'Follow'. You'll then see their submissions in your 'Following' feed."
        },
        {
          q: "How do I earn referral rewards?",
          a: "Share your unique referral link (in the Referrals section). When someone signs up with your link, you earn rewards!"
        },
      ]
    },
    {
      category: "Rules & Safety",
      icon: Shield,
      questions: [
        {
          q: "What are the main rules?",
          a: "1. Original content only (no AI, no internet). 2. Follow the challenge theme. 3. No offensive or inappropriate content. 4. One account per person."
        },
        {
          q: "How is fraud detected?",
          a: "Our AI automatically verifies each submission to detect AI-generated images or ones taken from the internet. Cheaters are banned."
        },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know to become an A Challenge pro!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {faqs.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{category.category}</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((faq, faqIndex) => (
                  <AccordionItem key={faqIndex} value={`item-${categoryIndex}-${faqIndex}`}>
                    <AccordionTrigger className="text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ))}
        </div>

        <Card className="p-8 text-center bg-primary/10">
          <h2 className="text-2xl font-bold mb-4">
            Still have questions?
          </h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help! Contact us by email.
          </p>
          <Button 
            size="lg" 
            className="bg-primary"
            onClick={() => window.location.href = 'mailto:alweb003@gmail.com'}
          >
            Contact Us
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
