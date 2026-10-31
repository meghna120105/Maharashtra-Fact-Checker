import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const verdictEnum = z.enum(["TRUE", "FALSE", "PARTIALLY_TRUE", "MISLEADING", "UNVERIFIED"]);
export type VerdictType = z.infer<typeof verdictEnum>;

export const claimStatusEnum = z.enum(["SUPPORTED", "PARTIAL", "CONTRADICTED", "UNVERIFIED"]);
export type ClaimStatus = z.infer<typeof claimStatusEnum>;

export const confidenceEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type Confidence = z.infer<typeof confidenceEnum>;

export const langEnum = z.enum(["en", "hi", "mr"]);
export type Lang = z.infer<typeof langEnum>;

export const sourceCredibilitySchema = z.object({
  domain: z.string(),
  tier: z.enum(["GOVERNMENT", "FACT_CHECKER", "ESTABLISHED", "SOCIAL", "UNKNOWN"]),
  note: z.string(),
});
export type SourceCredibility = z.infer<typeof sourceCredibilitySchema>;

export const evidenceSchema = z.object({
  id: z.number(),
  kind: z.enum(["news", "factcheck"]),
  title: z.string(),
  source: z.string(),
  url: z.string(),
  publishedAt: z.string().optional(),
  rating: z.string().optional(), // textual rating for fact-check evidence
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const claimSchema = z.object({
  claim: z.string(),
  status: claimStatusEnum,
  explanation: z.string(),
  evidenceIds: z.array(z.number()),
});
export type Claim = z.infer<typeof claimSchema>;

export const summarySchema = z.object({
  tldr: z.string(),
  keyPoints: z.array(z.string()),
  lang: langEnum,
});
export type Summary = z.infer<typeof summarySchema>;

export const factCheckResultSchema = z.object({
  id: z.string(),
  inputType: z.enum(["url", "text"]),
  url: z.string(),
  title: z.string(),
  verdict: verdictEnum,
  accuracy: z.number().min(0).max(100),
  confidence: confidenceEnum,
  summary: summarySchema.optional(),
  claims: z.array(claimSchema),
  reasoning: z.string(),
  redFlags: z.array(z.string()),
  evidence: z.array(evidenceSchema),
  sourceCredibility: sourceCredibilitySchema.optional(),
  limitations: z.array(z.string()),
  lastVerified: z.string(),
  createdAt: z.string(),
});
export type FactCheckResult = z.infer<typeof factCheckResultSchema>;

export const newsItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  categories: z.array(z.string()),
  headline: z.string(),
  snippet: z.string().optional(),
  imageUrl: z.string().optional(),
  source: z.string(),
  url: z.string(),
  directLink: z.boolean(), // false when the link is a Google News redirect
  publishedAt: z.string(), // ISO
  lang: langEnum,
  coverage: z.number(), // how many distinct outlets reported this story
  relatedHeadlines: z.array(z.string()).optional(),
  summary: summarySchema.optional(),
  factCheckId: z.string().optional(),
  verdict: verdictEnum.optional(),
  accuracy: z.number().optional(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

export const factCheckRequestSchema = z
  .object({
    url: z.string().url("Please enter a valid URL").optional(),
    text: z.string().min(20, "Please paste at least a sentence or two").max(8000).optional(),
    lang: langEnum.optional(),
  })
  .refine((v) => !!v.url !== !!v.text, { message: "Provide either a URL or text" });
export type FactCheckRequest = z.infer<typeof factCheckRequestSchema>;

export const NEWS_CATEGORIES = ["Top", "Mumbai", "Pune", "Nagpur", "Politics", "Business", "Infrastructure", "Crime", "Sports", "Marathi"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
