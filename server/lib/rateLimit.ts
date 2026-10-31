import type { Request, Response, NextFunction } from "express";

/** Tiny in-memory per-IP limiter to protect your AI budget. */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      const retry = Math.ceil((windowMs - (now - recent[0])) / 60000);
      return res.status(429).json({ message: `Too many requests. Please try again in about ${retry} minute(s).` });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
