import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, inject, it } from "vitest";

// End-to-end test for the transcript-import feature, following
// tracker.test.ts's own style: hit the real running server over HTTP, assert
// against rendered HTML. Uses COMP1600 (a real 2024 Core course that no
// other spec file ever inserts into completedCourses — it's only ever
// checked as "missing" — so this test isn't order-dependent on the shared
// database) and TEST9999 (a fictional code, to exercise the
// falls-to-General-Electives branch).
const baseUrl = inject("baseUrl");

const fixturePath = fileURLToPath(new URL("./fixtures/statement-of-result.pdf", import.meta.url));

const post = (path: string, body: URLSearchParams | FormData) =>
  fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });

const get = (path: string) => fetch(new URL(path, baseUrl)).then((res) => res.text());

describe("transcript import", () => {
  it("previews detected courses from an uploaded PDF without saving anything", async () => {
    const body = new FormData();
    body.set("year", "2024");
    body.set(
      "transcript",
      new File([readFileSync(fixturePath)], "statement-of-result.pdf", {
        type: "application/pdf",
      }),
    );

    const res = await post("/upload-preview", body);
    expect(res.status).toBe(200);

    const text = await res.text();
    // COMP1600 is Core in 2024, so it's pre-selected as Core...
    expect(text).toMatch(/COMP1600[\s\S]*?<option value="Core" selected>/);
    // ...TEST9999 isn't on any fixed list, so it falls to General Electives...
    expect(text).toMatch(/TEST9999[\s\S]*?<option value="General Electives" selected>/);
    // ...and the duplicate COMP1600 in the PDF's text is de-duplicated to a
    // single row (which embeds the code 4 times: the checkbox value, the
    // label text, and the two per-row field names units_COMP1600/
    // category_COMP1600 — two rows would be 8).
    expect(text.match(/COMP1600/g)).toHaveLength(4);

    // Nothing committed yet.
    const home = await get("/?year=2024");
    expect(home).not.toContain("TEST9999");
  });

  it("commits only the confirmed rows, honouring an overridden category, and redirects back to the same year", async () => {
    // Submits "Supplementary" instead of the guessed "General Electives" —
    // both to prove the user's override wins, and to avoid colliding with
    // tracker.test.ts's exact General Electives unit-total assertions (all
    // spec files share one running server + database).
    const res = await post(
      "/api/completed-courses/from-pdf",
      new URLSearchParams({
        year: "2024",
        include: "TEST9999",
        units_TEST9999: "6",
        category_TEST9999: "Supplementary",
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/?year=2024");

    const text = await get("/?year=2024");
    expect(text).toContain("TEST9999");
  });
});
