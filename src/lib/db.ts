import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type CompletedCourse,
  completedCourses,
  type DegreeRule,
  degreeRules,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { CompletedCourse, DegreeRule };

export function listYears(): number[] {
  return db
    .selectDistinct({ year: degreeRules.year })
    .from(degreeRules)
    .orderBy(degreeRules.year)
    .all()
    .map((row) => row.year);
}

export function listDegreeRules(year: number): DegreeRule[] {
  return db
    .select()
    .from(degreeRules)
    .where(eq(degreeRules.year, year))
    .orderBy(degreeRules.id)
    .all();
}

export function listCompletedCourses(): CompletedCourse[] {
  return db.select().from(completedCourses).orderBy(desc(completedCourses.id)).all();
}

export function addCompletedCourse(
  category: string,
  courseCode: string,
  units: number,
  courseName?: string,
): CompletedCourse {
  return db
    .insert(completedCourses)
    .values({ category, courseCode, units, courseName: courseName?.trim() || null })
    .returning()
    .get();
}

export function deleteCompletedCourse(id: number): void {
  db.delete(completedCourses).where(eq(completedCourses.id, id)).run();
}

export type CategoryProgress = {
  category: string;
  requiredUnits: number;
  completedUnits: number;
  requiredCourses: string[] | null;
  missingRequiredCourses: string[];
  courses: CompletedCourse[];
};

// Joins a year's rules against ALL completed courses by category-name match
// — not by year — so the same real course counts under whichever year's
// lens you're viewing (see schema.ts for why completedCourses.category isn't
// a foreign key).
export function getProgress(year: number): CategoryProgress[] {
  const rules = listDegreeRules(year);
  const completed = listCompletedCourses();

  return rules.map((rule) => {
    const inCategory = completed.filter((course) => course.category === rule.category);
    const completedUnits = inCategory.reduce((sum, course) => sum + course.units, 0);
    const requiredCourses: string[] | null = rule.requiredCourses
      ? JSON.parse(rule.requiredCourses)
      : null;
    const done = new Set(inCategory.map((course) => course.courseCode.toUpperCase()));
    const missingRequiredCourses =
      requiredCourses?.filter((code) => !done.has(code.toUpperCase())) ?? [];

    return {
      category: rule.category,
      requiredUnits: rule.requiredUnits,
      completedUnits,
      requiredCourses,
      missingRequiredCourses,
      courses: inCategory,
    };
  });
}

// Real AACOM (Bachelor of Advanced Computing Honours) structure for every
// catalogue year Programs & Courses currently has archived for this
// prototype: 2023, 2024 (the student's actual commencing year), 2025, 2026,
// and 2027 (P&C's current published year), pulled from
// https://programsandcourses.anu.edu.au/<year>/program/AACOM, collapsed
// into 5 fixed categories (Compulsory, Comp Elective, University Elective,
// Specialisation, Project) rather than P&C's own per-year category names —
// e.g. Compulsory merges that year's Introductory/Foundational units in
// with Core's (keeping Core's fixed course list), and University Elective
// merges Supplementary/ICT-Related in with General Electives. Fixed seed
// data, not user-editable — only completed courses are entered
// interactively.
//
// 2023 and 2024 share an identical Core (same 8 compulsory courses, 48
// units) and identical category totals overall; 2023's own P&C page just
// slices the remaining "further study" units into four finer either/or
// bullets where 2024's collapses them into three named categories — not a
// genuine structural difference, so 2023 reuses 2024's numbers.
//
// 2025 is a genuine mid-transition year, not a copy-paste of 2024 or 2026:
// its Core block is 42 units across 7 courses (COMP1600 and the
// newly-added COMP2400 both required at once) rather than the 48-unit/
// 8-course Core every other modelled year has — COMP2120 rejoins and
// COMP1600 finally drops out from 2026 onward. 2026 and 2027 turned out to
// be identical in structure once fetched, so they share the same numbers.
//
// This is fixed reference data, not something a student ever edits, and
// nothing else references degreeRules.id (joins are by category-name
// string) — so re-deriving it from scratch on every boot is safe, and
// simpler than reconciling an old category shape in place.
function seedDegreeRules(): void {
  const core2024 = JSON.stringify([
    "COMP1600",
    "COMP2100",
    "COMP2120",
    "COMP2300",
    "COMP2310",
    "COMP2420",
    "COMP3600",
    "COMP4450",
  ]);
  const core2025 = JSON.stringify([
    "COMP1600",
    "COMP2100",
    "COMP2300",
    "COMP2310",
    "COMP2400",
    "COMP3600",
    "COMP4450",
  ]);
  const core2026And2027 = JSON.stringify([
    "COMP2100",
    "COMP2120",
    "COMP2300",
    "COMP2310",
    "COMP2400",
    "COMP3600",
    "COMP3630",
    "COMP4450",
  ]);

  // Comp Elective is 5 courses (one compulsory 4000-level, two either
  // 3000-or-4000-level, the rest any level) — a level-by-level breakdown
  // this prototype doesn't model (see the README's judgement-call note), but
  // the unit total is fixed regardless: 5 courses x 6 units = 30. University
  // Elective is a flat 48 units — General Electives alone, not merged with
  // anything computing-related. Both are the same across every catalogue
  // year modelled, unlike Compulsory's list.
  const COMP_ELECTIVE_UNITS = 30;
  const UNIVERSITY_ELECTIVE_UNITS = 48;

  const yearRows = (year: number, compulsoryUnits: number, compulsoryList: string) => [
    { year, category: "Compulsory", requiredUnits: compulsoryUnits, requiredCourses: compulsoryList },
    { year, category: "Comp Elective", requiredUnits: COMP_ELECTIVE_UNITS, requiredCourses: null },
    { year, category: "University Elective", requiredUnits: UNIVERSITY_ELECTIVE_UNITS, requiredCourses: null },
    { year, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
    { year, category: "Project", requiredUnits: 24, requiredCourses: null },
  ];

  const allRows = [
    // 2023/2024: Compulsory = 18 (Introductory) + 48 (Core).
    ...yearRows(2023, 66, core2024),
    ...yearRows(2024, 66, core2024),
    // 2025: Compulsory = 18 (Introductory) + 42 (Core).
    ...yearRows(2025, 60, core2025),
    // 2026/2027: Compulsory = 18 (Foundational) + 48 (Core).
    ...yearRows(2026, 66, core2026And2027),
    ...yearRows(2027, 66, core2026And2027),
  ];

  db.delete(degreeRules).run();
  db.insert(degreeRules).values(allRows).run();
}
seedDegreeRules();

// Maps every category name this app has ever seeded degreeRules with onto
// the current 5-category scheme, so a completed course entered under an old
// name (Core, General Electives, ...) still matches its category after the
// rename above. Idempotent: once applied, no row is stored under an old
// name anymore, so re-running finds nothing to update.
const CATEGORY_RENAMES: Record<string, string> = {
  Introductory: "Compulsory",
  Foundational: "Compulsory",
  Core: "Compulsory",
  "Further COMP Study": "Comp Elective",
  "Upper-Level COMP": "Comp Elective",
  "COMP Electives": "Comp Elective",
  Supplementary: "University Elective",
  "ICT-Related": "University Elective",
  "General Electives": "University Elective",
  Capstone: "Project",
};
function migrateCompletedCourseCategories(): void {
  for (const [from, to] of Object.entries(CATEGORY_RENAMES)) {
    db.update(completedCourses).set({ category: to }).where(eq(completedCourses.category, from)).run();
  }
}
migrateCompletedCourseCategories();
