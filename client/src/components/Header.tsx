import { Link } from "wouter";
import { Moon, ShieldCheck, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function Header() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "light";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <header className="site-header sticky top-0 z-50 border-b border-border/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between">
        <Link href="/">
          <span className="inline-flex items-center gap-3 text-foreground cursor-pointer" data-testid="link-home">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/15"><ShieldCheck className="h-5 w-5" /></span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm sm:text-base font-bold tracking-tight">Maharashtra Fact-Checker</span>
              <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">News · Evidence · Clarity</span>
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <a href="#news" className="hidden sm:inline-flex rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Latest news</a>
          <a href="#how-it-works" className="hidden sm:inline-flex rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">How it works</a>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            className="rounded-full"
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
