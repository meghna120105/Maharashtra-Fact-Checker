import { describe, expect, it } from "vitest";
import type { Claim, Evidence } from "@shared/schema";
import { deriveVerdict } from "./factcheck";

const claim = (status: Claim["status"], evidenceIds: number[] = [1]): Claim => ({
  claim: "A testable news claim",
  status,
  explanation: "Test explanation",
  evidenceIds,
});

const evidence = (id: number, source: string, kind: Evidence["kind"] = "news"): Evidence => ({
  id,
  kind,
  title: "Evidence headline",
  source,
  url: `https://example.com/${id}`,
});

describe("deriveVerdict", () => {
  it("returns TRUE when all claims are supported", () => {
    const result = deriveVerdict([claim("SUPPORTED")], [evidence(1, "Outlet A")]);
    expect(result).toMatchObject({ verdict: "TRUE", accuracy: 100 });
  });

  it("returns FALSE when a fact-checker contradicts the claim", () => {
    const result = deriveVerdict([claim("CONTRADICTED")], [evidence(1, "Fact Checker", "factcheck")]);
    expect(result).toMatchObject({ verdict: "FALSE", accuracy: 0 });
  });

  it("returns FALSE when two or more independent news outlets contradict the claim", () => {
    const claims = [claim("CONTRADICTED", [1, 2])];
    const sources = [evidence(1, "Outlet A", "news"), evidence(2, "Outlet B", "news")];
    const result = deriveVerdict(claims, sources);
    expect(result).toMatchObject({ verdict: "FALSE", accuracy: 0 });
  });

  it("returns MISLEADING when supported and contradicted claims coexist", () => {
    const claims = [claim("SUPPORTED", [1]), claim("CONTRADICTED", [2])];
    const sources = [evidence(1, "Outlet A"), evidence(2, "Outlet B"), evidence(3, "Outlet C")];
    const result = deriveVerdict(claims, sources);
    expect(result).toMatchObject({ verdict: "MISLEADING" });
  });

  it("returns MISLEADING when model flags misleading framing despite true claims", () => {
    const claims = [claim("SUPPORTED", [1])];
    const sources = [evidence(1, "Outlet A")];
    const result = deriveVerdict(claims, sources, "MISLEADING");
    expect(result).toMatchObject({ verdict: "MISLEADING" });
  });

  it("returns UNVERIFIED when every claim is unverified", () => {
    const result = deriveVerdict([claim("UNVERIFIED", [])], []);
    expect(result).toMatchObject({ verdict: "UNVERIFIED", accuracy: 35 });
  });

  it("returns UNVERIFIED when there are no claims", () => {
    const result = deriveVerdict([], []);
    expect(result).toMatchObject({ verdict: "UNVERIFIED", accuracy: 35 });
  });

  it("keeps verdict UNVERIFIED and never turns missing evidence into FALSE", () => {
    const claims = [claim("UNVERIFIED", []), claim("UNVERIFIED", [])];
    const result = deriveVerdict(claims, []);
    expect(result.verdict).toBe("UNVERIFIED");
    expect(result.verdict).not.toBe("FALSE");
  });

  it("downgrades a contradiction supported by only one news outlet to MISLEADING", () => {
    const result = deriveVerdict([claim("CONTRADICTED", [1])], [evidence(1, "One Outlet", "news")]);
    expect(result).toMatchObject({ verdict: "MISLEADING" });
  });

  it("returns PARTIALLY_TRUE for partial support without contradiction", () => {
    const claims = [claim("PARTIAL", [1])];
    const sources = [evidence(1, "Outlet A")];
    const result = deriveVerdict(claims, sources);
    expect(result).toMatchObject({ verdict: "PARTIALLY_TRUE", accuracy: 60 });
  });
});
