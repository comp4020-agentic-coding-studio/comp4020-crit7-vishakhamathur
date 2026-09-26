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
): CompletedCourse {
  return db.insert(completedCourses).values({ category, courseCode, units }).returning().get();
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
// https://programsandcourses.anu.edu.au/<year>/program/AACOM. Fixed seed
// data, not user-editable — only completed courses are entered
// interactively.
//
// 2023 and 2024 share an identical Core (same 8 compulsory courses, 48
// units) and identical Introductory/Specialisation/Capstone/Electives
// totals; 2023's own page just slices the remaining 30 "further study"
// units into four finer either/or bullets where 2024's collapses them into
// three named categories. Same simplification this file already applies
// elsewhere (OR-choices and specialisation tracks aren't modelled course by
// course), so 2023 reuses 2024's exact category shape and Core list rather
// than inventing a fourth bucket to mirror wording that isn't a genuine
// structural difference.
//
// 2025 is a genuine mid-transition year, not a copy-paste of 2024 or 2026:
// its compulsory block is 42 units across 7 courses (COMP1600 and the
// newly-added COMP2400 both required at once), one unit total short of the
// 48-unit/8-course Core every other modelled year has — COMP2120 rejoins
// and COMP1600 finally drops out from 2026 onward. 2026 and 2027 turned out
// to be identical in structure once fetched, so they share the same Core
// list below.
//
// Seeding is per-year and additive: a database that already has some years
// (e.g. an earlier deploy that only knew 2024/2027) gets exactly the
// missing years inserted on the next boot, without touching existing rows —
// completed courses and previously-seeded years are left alone.
function seedDegreeRulesIfEmpty(): void {
  const existingYears = new Set(listYears());

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

  const allRows = [
    // 2023 — same category shape and Core list as 2024 (see comment above).
    { year: 2023, category: "Introductory", requiredUnits: 18, requiredCourses: null },
    { year: 2023, category: "Core", requiredUnits: 48, requiredCourses: core2024 },
    { year: 2023, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
    { year: 2023, category: "Further COMP Study", requiredUnits: 6, requiredCourses: null },
    { year: 2023, category: "Upper-Level COMP", requiredUnits: 18, requiredCourses: null },
    { year: 2023, category: "Supplementary", requiredUnits: 6, requiredCourses: null },
    { year: 2023, category: "Capstone", requiredUnits: 24, requiredCourses: null },
    { year: 2023, category: "General Electives", requiredUnits: 48, requiredCourses: null },
    // 2024
    { year: 2024, category: "Introductory", requiredUnits: 18, requiredCourses: null },
    { year: 2024, category: "Core", requiredUnits: 48, requiredCourses: core2024 },
    { year: 2024, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
    { year: 2024, category: "Further COMP Study", requiredUnits: 6, requiredCourses: null },
    { year: 2024, category: "Upper-Level COMP", requiredUnits: 18, requiredCourses: null },
    { year: 2024, category: "Supplementary", requiredUnits: 6, requiredCourses: null },
    { year: 2024, category: "Capstone", requiredUnits: 24, requiredCourses: null },
    { year: 2024, category: "General Electives", requiredUnits: 48, requiredCourses: null },
    // 2025 — transition year: smaller (42-unit) Core, no separate
    // Supplementary category (folded into an 18-unit Further COMP Study).
    { year: 2025, category: "Introductory", requiredUnits: 18, requiredCourses: null },
    { year: 2025, category: "Core", requiredUnits: 42, requiredCourses: core2025 },
    { year: 2025, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
    { year: 2025, category: "Further COMP Study", requiredUnits: 18, requiredCourses: null },
    { year: 2025, category: "Upper-Level COMP", requiredUnits: 18, requiredCourses: null },
    { year: 2025, category: "Capstone", requiredUnits: 24, requiredCourses: null },
    { year: 2025, category: "General Electives", requiredUnits: 48, requiredCourses: null },
    // 2026
    { year: 2026, category: "Foundational", requiredUnits: 18, requiredCourses: null },
    { year: 2026, category: "Core", requiredUnits: 48, requiredCourses: core2026And2027 },
    { year: 2026, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
    { year: 2026, category: "COMP Electives", requiredUnits: 18, requiredCourses: null },
    { year: 2026, category: "ICT-Related", requiredUnits: 12, requiredCourses: null },
    { year: 2026, category: "Capstone", requiredUnits: 24, requiredCourses: null },
    { year: 2026, category: "General Electives", requiredUnits: 48, requiredCourses: null },
    // 2027
    { year: 2027, category: "Foundational", requiredUnits: 18, requiredCourses: null },
    { year: 2027, category: "Core", requiredUnits: 48, requiredCourses: core2026And2027 },
    { year: 2027, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
    { year: 2027, category: "COMP Electives", requiredUnits: 18, requiredCourses: null },
    { year: 2027, category: "ICT-Related", requiredUnits: 12, requiredCourses: null },
    { year: 2027, category: "Capstone", requiredUnits: 24, requiredCourses: null },
    { year: 2027, category: "General Electives", requiredUnits: 48, requiredCourses: null },
  ];

  const missingRows = allRows.filter((row) => !existingYears.has(row.year));
  if (missingRows.length > 0) {
    db.insert(degreeRules).values(missingRows).run();
  }
}
seedDegreeRulesIfEmpty();
