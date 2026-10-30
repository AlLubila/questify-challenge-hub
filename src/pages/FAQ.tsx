import { useLanguage } from "@/contexts/LanguageContext";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, Trophy, Camera, Star, Wallet, Users, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FAQ = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const faqs = [
    {
      category: t("faq.c0"),
      icon: HelpCircle,
      questions: [
        {
          q: t("faq.q0"),
          a: t("faq.a0")
        },
        {
          q: t("faq.q1"),
          a: t("faq.a1")
        },
        {
          q: t("faq.q2"),
          a: t("faq.a2")
        },
      ]
    },
    {
      category: t("faq.c1"),
      icon: Trophy,
      questions: [
        {
          q: t("faq.q3"),
          a: t("faq.a3")
        },
        {
          q: t("faq.q4"),
          a: t("faq.a4")
        },
        {
          q: t("faq.q5"),
          a: t("faq.a5")
        },
      ]
    },
    {
      category: t("faq.c2"),
      icon: Camera,
      questions: [
        {
          q: t("faq.q6"),
          a: t("faq.a6")
        },
        {
          q: t("faq.q7"),
          a: t("faq.a7")
        },
        {
          q: t("faq.q8"),
          a: t("faq.a8")
        },
      ]
    },
    {
      category: t("faq.c3"),
      icon: Star,
      questions: [
        {
          q: t("faq.q9"),
          a: t("faq.a9")
        },
        {
          q: t("faq.q10"),
          a: t("faq.a10")
        },
      ]
    },
    {
      category: t("faq.c4"),
      icon: Wallet,
      questions: [
        {
          q: t("faq.q11"),
          a: t("faq.a11")
        },
        {
          q: t("faq.q12"),
          a: t("faq.a12")
        },
      ]
    },
    {
      category: t("faq.c5"),
      icon: Users,
      questions: [
        {
          q: t("faq.q13"),
          a: t("faq.a13")
        },
        {
          q: t("faq.q14"),
          a: t("faq.a14")
        },
      ]
    },
    {
      category: t("faq.c6"),
      icon: Shield,
      questions: [
        {
          q: t("faq.q15"),
          a: t("faq.a15")
        },
        {
          q: t("faq.q16"),
          a: t("faq.a16")
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
            {t("Back")}
          </Button>
        </div>

        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            {t("Frequently Asked Questions")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("Everything you need to know to become an A Challenge pro!")}
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
            {t("Still have questions?")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("Our team is here to help! Contact us by email.")}
          </p>
          <Button 
            size="lg" 
            className="bg-primary"
            onClick={() => window.location.href = 'mailto:alweb003@gmail.com'}
          >
            {t("Contact Us")}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
