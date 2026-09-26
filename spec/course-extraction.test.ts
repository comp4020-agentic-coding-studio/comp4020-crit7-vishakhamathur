import { describe, expect, it } from "vitest";
import {
  excludeAlreadyCompleted,
  extractCourseCodes,
  guessCategory,
} from "../src/lib/course-extraction";
import type { DegreeRule } from "../src/lib/schema";

// Pure-function tests for the transcript-import feature — no PDF, no HTTP,
// just the extraction/categorisation logic on plain strings.
const rule = (category: string, requiredCourses: string[] | null): DegreeRule => ({
  id: 0,
  year: 2024,
  category,
  requiredUnits: 0,
  requiredCourses: requiredCourses ? JSON.stringify(requiredCourses) : null,
});

describe("extractCourseCodes", () => {
  it("finds ANU-shaped course codes and de-duplicates, keeping first-seen order", () => {
    const text = "History: COMP2100 (6u)\n...\nSummary: TEST9999, COMP2100 again";
    expect(extractCourseCodes(text)).toEqual(["COMP2100", "TEST9999"]);
  });

  it("ignores substrings that aren't a real 4-letter/4-digit code", () => {
    expect(extractCourseCodes("XCOMP21001 COM1234 COMP123")).toEqual([]);
  });

  it("returns an empty list when there's nothing to find", () => {
    expect(extractCourseCodes("no course codes here")).toEqual([]);
  });
});

describe("guessCategory", () => {
  const rules = [
    rule("Core", ["COMP2100", "COMP4450"]),
    rule("Specialisation", null),
    rule("General Electives", null),
  ];

  it("matches a course against whichever category has a fixed course list", () => {
    expect(guessCategory("COMP2100", rules)).toBe("Core");
  });

  it("is case-insensitive when matching against the fixed list", () => {
    expect(guessCategory("comp2100", rules)).toBe("Core");
  });

  it("falls back to General Electives for anything not on a fixed list", () => {
    expect(guessCategory("TEST9999", rules)).toBe("General Electives");
  });

  it("falls back to the first null-course-list category when General Electives isn't seeded", () => {
    const rulesWithoutElectives = [rule("Core", ["COMP2100"]), rule("Specialisation", null)];
    expect(guessCategory("TEST9999", rulesWithoutElectives)).toBe("Specialisation");
  });
});

describe("excludeAlreadyCompleted", () => {
  it("drops codes that are already recorded, case-insensitively", () => {
    expect(excludeAlreadyCompleted(["COMP2100", "COMP4450"], ["comp2100"])).toEqual(["COMP4450"]);
  });

  it("leaves the list untouched when nothing overlaps", () => {
    expect(excludeAlreadyCompleted(["COMP2100"], ["COMP4450"])).toEqual(["COMP2100"]);
  });
});
