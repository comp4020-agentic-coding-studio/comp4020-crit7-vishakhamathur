// Real ANU course titles for every code that appears on a Compulsory
// required-course list (see db.ts) — verified against
// programsandcourses.anu.edu.au. Codes a student enters that aren't on this
// list (electives, mostly) don't get an automatic name; the add-course and
// upload-preview forms let a name be typed in instead.
const KNOWN_COURSE_NAMES: Record<string, string> = {
  COMP1600: "Foundations of Computing",
  COMP2100: "Software Construction",
  COMP2120: "Software Engineering",
  COMP2300: "Computer Architecture",
  COMP2310: "Systems, Networks, and Concurrency",
  COMP2400: "Relational Databases",
  COMP2420: "Introduction to Data Management, Analysis and Security",
  COMP3600: "Algorithms",
  COMP3630: "Theory of Computation",
  COMP4450: "Computing Research Methods",
};

export function lookupCourseName(code: string): string | undefined {
  return KNOWN_COURSE_NAMES[code.toUpperCase()];
}

// A course code alone (COMP2100) is easy to forget what it actually is; this
// pairs it with a name wherever one's known — stored on the row, or else
// this file's fixed lookup — so the code is never shown bare when a name is
// available.
export function courseLabel(code: string, name?: string | null): string {
  const resolved = name ?? lookupCourseName(code);
  return resolved ? `${code} — ${resolved}` : code;
}
