import { describe, expect, inject, it } from "vitest";

// The degree tracker's own spec tests, replacing the starter's guestbook
// plumbing test (spec/README.md: "it goes when the starter does"). These
// prove the crit's core testable flow — add a completed course, watch its
// category's units move, reload, verify it's still there — plus the two
// promises specific to this prototype: Compulsory flags a missing
// compulsory course by name, and a completed course carries across
// catalogue years.
const baseUrl = inject("baseUrl");

// Astro checks form POSTs carry a same-origin Origin header (CSRF
// protection); browsers send it automatically, a bare fetch doesn't.
const post = (path: string, body: URLSearchParams) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

const get = (path: string) => fetch(new URL(path, baseUrl)).then((res) => res.text());

const missingLine = (text: string) => text.match(/Missing: [^<]+/)?.[0];

describe("degree tracker", () => {
  it("Compulsory starts with every 2024 compulsory course missing", async () => {
    const text = await get("/?year=2024");
    expect(text).toContain("COMP1600");
    expect(text).toContain("COMP4450");
  });

  it("adds a completed course and redirects back to the same year view", async () => {
    const res = await post(
      "/api/completed-courses",
      new URLSearchParams({
        category: "University Elective",
        courseCode: "COMP4020",
        units: "6",
        year: "2024",
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/?year=2024");
  });

  it("persists the course and its category's units across a reload", async () => {
    const text = await get("/?year=2024");
    expect(text).toContain("COMP4020");
    expect(text).toContain("6 / 48 units"); // 2024 University Elective (flat 48 units every year)
  });

  it("drops a compulsory course from Compulsory's missing list once it's added", async () => {
    await post(
      "/api/completed-courses",
      new URLSearchParams({
        category: "Compulsory",
        courseCode: "COMP2100",
        units: "6",
        year: "2024",
      }),
    );

    const text = await get("/?year=2024");
    expect(missingLine(text)).not.toContain("COMP2100");
    expect(text).toContain("COMP1600");
  });

  it("carries a completed course over when switching catalogue years", async () => {
    const text = await get("/?year=2027");
    expect(text).toContain("6 / 48 units"); // 2027 University Elective carried over too
    expect(text).toContain('class="course-list"><li>COMP2100'); // Compulsory carried over too

    // COMP2400 is only compulsory from 2027, so it's still missing here...
    const line = missingLine(text);
    expect(line).toContain("COMP2400");
    // ...but COMP2100 is compulsory in both years, so it's no longer missing.
    expect(line).not.toContain("COMP2100");
  });

  it("models 2025 as a genuine transition year with a smaller 60-unit Compulsory", async () => {
    const text = await get("/?year=2025");
    // COMP2100, added to Compulsory earlier in this suite, carries over here too.
    expect(text).toContain("6 / 60 units");

    const line = missingLine(text);
    // 2025 requires both the old COMP1600 and the newly-added COMP2400 at once...
    expect(line).toContain("COMP1600");
    expect(line).toContain("COMP2400");
    // ...but not COMP2120 (drops out this year) or COMP3630 (not added until 2026).
    expect(line).not.toContain("COMP2120");
    expect(line).not.toContain("COMP3630");
  });

  it("models 2023 with the same 66-unit Compulsory as 2024", async () => {
    const text = await get("/?year=2023");
    // COMP2100, added to Compulsory earlier in this suite, carries over here too.
    expect(text).toContain("6 / 66 units");

    const line = missingLine(text);
    expect(line).toContain("COMP1600");
    expect(line).toContain("COMP4450");
    expect(line).not.toContain("COMP2100");
  });
});
