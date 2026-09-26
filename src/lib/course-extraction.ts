import type { DegreeRule } from "./schema";

// ANU course codes are exactly 4 uppercase letters + 4 digits (COMP1100,
// MATH1005, ...). Word-boundaried so we don't grab a substring of a longer
// alphanumeric run in the PDF's text layer.
const COURSE_CODE_RE = /\b[A-Z]{4}\d{4}\b/g;

// De-duplicated, first-seen order preserved — a real Statement of Result
// mentions each course more than once (summary table + per-session detail).
export function extractCourseCodes(text: string): string[] {
  return [...new Set(text.match(COURSE_CODE_RE) ?? [])];
}

// A course counts as Core (or any other category with a fixed course list)
// if it appears in that category's requiredCourses for the given year;
// everything else falls to General Electives — categories without a fixed
// list (Specialisation, Foundational, ...) aren't modelled course-by-course,
// same simplification the rest of this app already makes.
export function guessCategory(code: string, rules: DegreeRule[]): string {
  const upper = code.toUpperCase();
  for (const rule of rules) {
    if (!rule.requiredCourses) continue;
    const required: string[] = JSON.parse(rule.requiredCourses);
    if (required.some((c) => c.toUpperCase() === upper)) return rule.category;
  }
  return (
    rules.find((r) => r.category === "General Electives")?.category ??
    rules.find((r) => r.requiredCourses === null)?.category ??
    "General Electives"
  );
}

// Stricter than the manual add-course form (which the README documents as
// not guarding against duplicates at all): re-uploading the same transcript
// shouldn't keep re-adding courses you've already confirmed.
export function excludeAlreadyCompleted(codes: string[], completedCodes: string[]): string[] {
  const done = new Set(completedCodes.map((c) => c.toUpperCase()));
  return codes.filter((code) => !done.has(code.toUpperCase()));
}
