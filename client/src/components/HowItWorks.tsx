import { Card, CardContent } from "@/components/ui/card";
import { FileText, Search, BadgeCheck } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      icon: FileText,
      title: "Submit URL",
      description: "Paste the link to any Maharashtra news article you want to verify.",
    },
    {
      number: 2,
      icon: Search,
      title: "AI Analysis",
      description: "We extract the key claims, then search independent outlets and fact-check databases for matching coverage.",
    },
    {
      number: 3,
      icon: BadgeCheck,
      title: "Get Results",
      description: "Receive a detailed fact-check with accuracy rating and explanation.",
    },
  ];

  return (
    <section id="how-it-works" className="border-y border-border/60 bg-card/55 px-4 py-14 sm:px-6 sm:py-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-2 text-[10px] font-bold uppercase">A clear process</p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-how-it-works-title">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} className="border-border/70 bg-background/70 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" data-testid={`card-step-${step.number}`}>
                <CardContent className="space-y-4 px-6 pb-7 pt-7">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="text-sm font-bold text-primary">Step {step.number}</div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
