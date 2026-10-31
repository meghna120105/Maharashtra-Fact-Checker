# Maharashtra Fact-Checker

## Overview
AI-powered news fact-checking application focused on Maharashtra, India. Users can paste news article URLs to get instant verification with accuracy ratings, and browse AI-generated Maharashtra daily news summaries with fact-check analysis.

## Recent Changes
- Feb 6, 2026: Initial MVP built with OpenAI-powered fact-checking, URL content extraction, Maharashtra news generation
- Feb 6, 2026: Removed navigation tabs (Verify URL, News Feed) per user request

## Recent Changes
- Oct 31, 2026: Rebuilt backend. News is now REAL (RSS from Google News + publisher feeds, refreshed every 10 min, pushed to the browser via SSE). Fact-checks are evidence-based: claims are extracted, independent coverage + Google Fact Check API results are retrieved, and the verdict is derived from per-claim statuses. Added summaries (EN/HI/MR), paste-text mode, source classification, SSRF protection, rate limiting, JSON persistence (.data/).

## Setup
Copy `.env.example` -> Secrets/.env. `OPENAI_API_KEY` is required for AI features. `GOOGLE_FACTCHECK_API_KEY` is optional but recommended.

## Key Files
- `server/news.ts` feeds + clustering, `server/evidence.ts` evidence search, `server/factcheck.ts` pipeline + scoring, `server/lib/net.ts` SSRF-safe fetch, `server/lib/sources.ts` source tiers
- API: GET /api/news, POST /api/news/refresh, GET /api/news/stream (SSE), POST /api/news/:id/summary, POST /api/news/:id/fact-check, POST /api/fact-check ({url}|{text}), GET /api/fact-checks/recent, GET /api/health
