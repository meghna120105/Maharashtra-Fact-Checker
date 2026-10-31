export default function HeroSection() {
  return (
    <section className="px-4 pt-8 pb-6 sm:px-6 sm:pt-12 sm:pb-8">
      <div className="hero-surface soft-enter max-w-7xl mx-auto px-6 py-10 sm:px-12 sm:py-14 lg:px-16 lg:py-[4.5rem]">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="eyebrow inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/75 px-3 py-1.5 text-[10px] font-bold uppercase">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(152_60%_40%_/_0.12)]" /> Independent Maharashtra news desk
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.06] tracking-[-.04em] text-foreground sm:text-5xl lg:text-6xl" data-testid="text-hero-title">
            The facts behind <span className="text-primary">the headlines.</span>
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg" data-testid="text-hero-subtitle">
            Follow the latest from across Maharashtra. Check claims against available evidence, with sources you can read for yourself.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground sm:text-sm">
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Live regional headlines</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Evidence-led checks</span>
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Transparent limitations</span>
          </div>
        </div>
      </div>
    </section>
  );
}
