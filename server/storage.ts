import { type User, type InsertUser, type FactCheckResult, type NewsItem, type Summary } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "store.json");
const CHECK_TTL_MS = 6 * 3600 * 1000; // reuse a fact-check for the same URL for 6h

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveFactCheck(result: FactCheckResult): Promise<FactCheckResult>;
  getFactCheck(id: string): Promise<FactCheckResult | undefined>;
  getFreshFactCheckByUrl(url: string): Promise<FactCheckResult | undefined>;
  getRecentFactChecks(limit: number): Promise<FactCheckResult[]>;
  mergeNewsItems(items: NewsItem[]): Promise<number>;
  getNewsItems(): Promise<NewsItem[]>;
  getNewsItem(id: string): Promise<NewsItem | undefined>;
  updateNewsItem(id: string, patch: Partial<NewsItem>): Promise<NewsItem | undefined>;
  hasImageLookup(id: string): Promise<boolean>;
  markImageLookup(id: string): Promise<void>;
  clearImageLookup(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private factChecks = new Map<string, FactCheckResult>();
  private newsItems = new Map<string, NewsItem>();
  private imageLookups = new Set<string>();
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    try {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
      (raw.factChecks ?? []).forEach((f: FactCheckResult) => this.factChecks.set(f.id, f));
      (raw.newsItems ?? []).forEach((n: NewsItem) => this.newsItems.set(n.id, n));
      (raw.imageLookups ?? []).forEach((id: string) => this.imageLookups.add(id));
    } catch { /* first run */ }
  }

  /** Debounced snapshot so a restart doesn't lose cached news / checks. */
  private persist() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(FILE, JSON.stringify({
          factChecks: Array.from(this.factChecks.values()).slice(-300),
          newsItems: Array.from(this.newsItems.values()),
          imageLookups: Array.from(this.imageLookups).slice(-3000),
        }));
      } catch (e: any) { console.warn("[storage] persist failed:", e.message); }
    }, 2000);
  }

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) { return Array.from(this.users.values()).find((u) => u.username === username); }
  async createUser(u: InsertUser): Promise<User> { const user = { ...u, id: randomUUID() }; this.users.set(user.id, user); return user; }

  async saveFactCheck(result: FactCheckResult) { this.factChecks.set(result.id, result); this.persist(); return result; }
  async getFactCheck(id: string) { return this.factChecks.get(id); }
  async getFreshFactCheckByUrl(url: string) {
    return Array.from(this.factChecks.values()).reverse().find((f) => f.url === url && Date.now() - +new Date(f.createdAt) < CHECK_TTL_MS);
  }
  async getRecentFactChecks(limit: number) {
    return Array.from(this.factChecks.values()).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
  }

  /** Adds new stories, keeps existing summaries/checks, drops stories older than 5 days. Returns #new. */
  async mergeNewsItems(items: NewsItem[]) {
    let added = 0;
    for (const it of items) {
      const prev = this.newsItems.get(it.id);
      if (prev) this.newsItems.set(it.id, { ...it, imageUrl: it.imageUrl ?? prev.imageUrl, summary: prev.summary, factCheckId: prev.factCheckId, verdict: prev.verdict, accuracy: prev.accuracy });
      else { this.newsItems.set(it.id, it); added++; }
    }
    const cutoff = Date.now() - 5 * 24 * 3600 * 1000;
    this.newsItems.forEach((v, k) => { if (+new Date(v.publishedAt) < cutoff) this.newsItems.delete(k); });
    this.persist();
    return added;
  }
  async getNewsItems() { return Array.from(this.newsItems.values()).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt)); }
  async getNewsItem(id: string) { return this.newsItems.get(id); }
  async updateNewsItem(id: string, patch: Partial<NewsItem>) {
    const cur = this.newsItems.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch };
    this.newsItems.set(id, next);
    this.persist();
    return next;
  }
  async hasImageLookup(id: string) { return this.imageLookups.has(id); }
  async markImageLookup(id: string) { this.imageLookups.add(id); this.persist(); }
  async clearImageLookup(id: string) { this.imageLookups.delete(id); this.persist(); }
}

export const storage = new MemStorage();
export type { Summary };
