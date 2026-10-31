import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import FactCheckResult from "@/components/FactCheckResult";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { FactCheckResult as FactCheckData } from "@shared/schema";

export default function SharedCheck() {
  const [, params] = useRoute<{ id: string }>("/check/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";
  const check = useQuery<FactCheckData>({
    queryKey: ["/api/fact-checks", id],
    enabled: !!id,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-6">
        {check.isLoading ? (
          <Card className="max-w-4xl mx-auto"><CardContent className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></CardContent></Card>
        ) : check.data ? (
          <FactCheckResult data={check.data} onNewCheck={() => setLocation("/")} />
        ) : (
          <Card className="max-w-4xl mx-auto"><CardContent className="py-12 text-center text-sm text-muted-foreground">
            {check.error instanceof Error ? check.error.message : "Fact-check not found."}
          </CardContent></Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
