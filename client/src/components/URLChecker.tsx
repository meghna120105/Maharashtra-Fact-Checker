import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link, Loader2, FileText } from "lucide-react";

export type VerifyInput = { url: string } | { text: string };

interface URLCheckerProps {
  onVerify: (input: VerifyInput) => void;
  isLoading?: boolean;
}

export default function URLChecker({ onVerify, isLoading = false }: URLCheckerProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"url" | "text">("url");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "url" && url.trim()) onVerify({ url: url.trim() });
    if (mode === "text" && text.trim().length >= 20) onVerify({ text: text.trim() });
  };

  const disabled = isLoading || (mode === "url" ? !url.trim() : text.trim().length < 20);

  return (
    <Card className="checker-surface mx-auto max-w-4xl border-border/70 bg-card shadow-xl shadow-primary/5" data-testid="card-url-checker" id="verify">
      <CardHeader className="space-y-2 p-6 sm:p-8">
        <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Verify a news story</CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">
          Paste an article link, or paste text (e.g. a WhatsApp forward). We pull out the claims and compare them with independent coverage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "text")}>
            <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 rounded-xl bg-muted/80 p-1">
              <TabsTrigger value="url" data-testid="tab-url"><Link className="h-4 w-4 mr-2" />Article link</TabsTrigger>
              <TabsTrigger value="text" data-testid="tab-text"><FileText className="h-4 w-4 mr-2" />Paste text</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-4">
              <Input
                type="url"
                placeholder="Paste news article URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 rounded-xl border-border/80 bg-background text-base shadow-sm focus-visible:ring-primary/30"
                disabled={isLoading}
                data-testid="input-url"
              />
            </TabsContent>
            <TabsContent value="text" className="mt-4">
              <Textarea
                placeholder="Paste the message, headline or article text you want to check..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="rounded-xl border-border/80 bg-background text-base shadow-sm focus-visible:ring-primary/30"
                maxLength={8000}
                disabled={isLoading}
                data-testid="input-text"
              />
            </TabsContent>
          </Tabs>
          <Button type="submit" size="lg" disabled={disabled} className="h-12 w-full rounded-xl px-8 font-semibold shadow-md shadow-primary/15 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:w-auto" data-testid="button-verify">
            {isLoading ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Checking claims...</>) : "Verify News"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
