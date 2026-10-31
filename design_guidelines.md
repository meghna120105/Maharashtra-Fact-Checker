# Design Guidelines: Maharashtra News Fact-Checker

## Design Approach

**Selected Approach:** Design System + Reference-Based Hybrid

Drawing inspiration from trusted fact-checking platforms (Snopes, PolitiFact) and modern news aggregators (Google News, Flipboard) while maintaining Material Design principles for information-dense applications. The design emphasizes trust, clarity, and immediate comprehension of verification results.

**Key Principles:**
- Trust through transparency: Clear visual hierarchy for fact-check results
- Scannable information: Easy-to-digest news summaries and verdicts
- Instant clarity: Verdicts must be immediately obvious
- Professional credibility: Clean, authoritative visual treatment

## Typography

**Font Families (via Google Fonts):**
- Headlines: "Inter" - weights 600, 700 (clean, modern, authoritative)
- Body: "Inter" - weights 400, 500 (optimal readability for content)

**Type Scale:**
- Page Title: text-4xl font-bold (landing hero)
- Section Headers: text-2xl font-semibold
- Card Headlines: text-lg font-semibold
- News Titles: text-base font-medium
- Body Text: text-sm regular
- Metadata/Labels: text-xs font-medium uppercase tracking-wide
- Verdict Display: text-3xl font-bold (large, unmissable)
- Accuracy Percentage: text-5xl font-bold (hero number)

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Micro spacing (gaps, padding): 2, 4
- Component internal spacing: 6, 8
- Section spacing: 12, 16, 24
- Page margins: 6 (mobile), 12, 16 (desktop)

**Grid Structure:**
- Container: max-w-7xl mx-auto
- Two-column desktop split: grid-cols-1 lg:grid-cols-2 gap-8
- News card grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Single column content: max-w-4xl mx-auto

**Viewport Strategy:**
- Hero section: Natural height (not forced viewport)
- URL checker: Prominent but compact (py-16)
- News feed sections: Content-driven height with py-12 spacing
- Responsive padding: py-8 (mobile), py-12 (tablet), py-16 (desktop)

## Component Library

### 1. Hero Section
- Concise headline introducing the fact-checker purpose
- Subheadline explaining Maharashtra focus
- Trust indicators: "AI-Powered • Real-time Verification • Regional Focus"
- Minimal height with immediate CTA to URL checker
- No background image - solid treatment with subtle gradient overlay permitted

### 2. URL Fact-Checker Card (Primary Feature)
**Prominent Card positioned high on page:**
- Large input field with placeholder: "Paste news article URL here..."
- Submit button: "Verify News" (size: lg, bold)
- Loading state with animated spinner and "Analyzing article..." text
- Input helper text: "We'll check if this Maharashtra news is accurate"

### 3. Fact-Check Result Display
**Large verdict card with clear visual hierarchy:**
- Verdict badge: Pill-shaped with large text (TRUE • FALSE • PARTIALLY TRUE • MISLEADING)
- Accuracy score: Massive number display (e.g., "87%") with "Accuracy Rating" label
- Visual meter/progress bar showing accuracy visually
- Result sections:
  - "What We Found" (key findings in bullet points)
  - "Why This Rating" (detailed reasoning, 3-4 paragraphs)
  - "Sources Checked" (list with icons)
  - "Last Verified" timestamp
- Share result button set

### 4. Maharashtra News Feed
**Two distinct sections:**

**Daily Summary Grid:**
- 3-column grid (1 mobile, 2 tablet, 3 desktop) of news cards
- Each card contains:
  - Small category tag (Politics • Crime • Business • Sports)
  - News headline (2-line clamp)
  - Brief summary (3-line clamp)
  - Pre-checked verdict badge (smaller, corner placement)
  - Accuracy indicator (percentage)
  - Timestamp and source
  - "Read Full Check" link

**Featured Fact-Checks:**
- Larger horizontal cards showcasing important verified stories
- Image thumbnail (left), content (right) layout on desktop
- Stacked on mobile
- Expanded summary (5-6 lines)
- Prominent verdict and detailed metadata

### 5. Navigation Header
- Logo/Brand name: "Maharashtra Fact-Checker"
- Navigation links: Home • Verify URL • News Feed • About
- Search icon for news archive (optional secondary feature)
- Sticky on scroll (subtle shadow appears)

### 6. Footer
- Quick links: How It Works • FAQ • Contact
- Data sources disclaimer
- Social media links
- Copyright and attribution
- Newsletter signup: "Get daily Maharashtra fact-checks"

### 7. Verdict Badge System
**Distinct visual treatments for each verdict type (shapes/borders only, no colors):**
- TRUE: Solid border, filled background
- FALSE: Thick border, outlined style
- PARTIALLY TRUE: Dashed border
- MISLEADING: Double border
- Each with appropriate icon from Heroicons (check-circle, x-circle, exclamation-triangle)

### 8. Accuracy Meter Component
- Horizontal progress bar showing 0-100% scale
- Segmented into zones: 0-40% (Low), 41-70% (Medium), 71-100% (High)
- Large percentage number positioned above or beside meter
- Label: "Factual Accuracy Score"

### 9. Information Cards (How It Works section)
- 3-column grid explaining process
- Icon + Title + Description pattern
- Icons: document (submit URL), search (AI analysis), check-badge (get results)
- Numbered steps (1, 2, 3)

## Icons

**Library:** Heroicons (via CDN)

**Key Icons:**
- check-circle (verified/true)
- x-circle (false)
- exclamation-triangle (misleading)
- information-circle (partially true)
- newspaper (news articles)
- magnifying-glass (search/analyze)
- link (URL submission)
- clock (timestamp)
- share (social sharing)
- document-text (article content)

## Animations

**Minimal, purposeful only:**
- Loading spinner during URL verification (smooth rotation)
- Verdict reveal: Subtle fade-in with slight scale (0.95 to 1)
- Accuracy meter: Animated fill on result display (2s duration)
- NO scroll-triggered animations
- NO hover transformations on cards

## Images

**No hero image required.** This is a utility-focused application where immediate functionality takes precedence.

**News Card Thumbnails:**
- Small thumbnail images (80x80px) for featured news items
- Placeholder pattern for articles without images
- Aspect ratio: 16:9 for featured cards, 1:1 for grid thumbnails

## Multi-Column Strategy

**Use Cases:**
- News grid: 3 columns on desktop for daily summaries
- Process explanation: 3 columns for "How It Works"
- Result breakdown: 2 columns for detailed findings (desktop only)
- Featured checks: Single column, full width
- Mobile: All content stacks to single column

## Layout Structure

1. **Header** (sticky navigation)
2. **Hero** (compact, py-16) - Brief intro + value prop
3. **URL Checker** (prominent, py-12) - Primary feature card
4. **How It Works** (py-16) - 3-column process explanation
5. **Maharashtra Daily News** (py-16) - Pre-verified news grid
6. **Featured Fact-Checks** (py-16) - Expanded story cards
7. **Trust Section** (py-12) - Data sources, methodology transparency
8. **Footer** (py-8)

**Result Page Structure** (after URL submission):
- Sticky header with "New Check" CTA
- Large verdict card (hero position)
- Article preview card
- Detailed findings sections
- Related Maharashtra news sidebar

This design creates a trustworthy, professional fact-checking platform with clear information hierarchy and immediate comprehension of verification results.