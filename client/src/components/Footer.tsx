import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-base mb-4">Maharashtra Fact-Checker</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered fact verification for Maharashtra news. Ensuring accurate, trustworthy information for everyone.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/how-it-works">
                  <a className="text-sm text-muted-foreground hover:text-foreground hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2 inline-block" data-testid="link-how-it-works">
                    How It Works
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/faq">
                  <a className="text-sm text-muted-foreground hover:text-foreground hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2 inline-block" data-testid="link-faq">
                    FAQ
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="text-sm text-muted-foreground hover:text-foreground hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2 inline-block" data-testid="link-contact">
                    Contact
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Disclaimer</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fact-check results are generated using AI analysis and cross-referenced sources. While we strive for accuracy, users should verify critical information independently.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 Maharashtra Fact-Checker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
