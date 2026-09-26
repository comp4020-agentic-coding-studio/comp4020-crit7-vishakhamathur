import { describe, expect, inject, it } from "vitest";

// The degree tracker's own spec tests, replacing the starter's guestbook
// plumbing test (spec/README.md: "it goes when the starter does"). These
// prove the crit's core testable flow — add a completed course, watch its
// category's units move, reload, verify it's still there — plus the two
// promises specific to this prototype: Core flags a missing compulsory
// course by name, and a completed course carries across catalogue years.
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

describe("degree tracker", () => {
  it("Core starts with every 2024 compulsory course missing", async () => {
    const text = await get("/?year=2024");
    expect(text).toContain("COMP1600");
    expect(text).toContain("COMP4450");
  });

  it("adds a completed course and redirects back to the same year view", async () => {
    const res = await post(
      "/api/completed-courses",
      new URLSearchParams({
        category: "General Electives",
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
    expect(text).toContain("6 / 48 units");
  });

  it("drops a compulsory course from Core's missing list once it's added", async () => {
    await post(
      "/api/completed-courses",
      new URLSearchParams({
        category: "Core",
        courseCode: "COMP2100",
        units: "6",
        year: "2024",
      }),
    );

    const text = await get("/?year=2024");
    expect(text).not.toContain("Missing: COMP1600, COMP2100");
    expect(text).toContain("COMP1600");
  });

  it("carries a completed course over when switching catalogue years", async () => {
    const text = await get("/?year=2027");
    expect(text).toContain("6 / 48 units"); // General Electives carried over too
    expect(text).toContain('class="course-list"><li>COMP2100'); // Core carried over too

    // COMP2400 is only compulsory from 2027, so it's still missing here...
    const missingLine = text.match(/Missing: [^<]+/)?.[0];
    expect(missingLine).toContain("COMP2400");
    // ...but COMP2100 is compulsory in both years, so it's no longer missing.
    expect(missingLine).not.toContain("COMP2100");
  });
});
