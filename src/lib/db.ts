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

// Real AACOM (Bachelor of Advanced Computing Honours) structure for the two
// catalogue years this prototype models: 2024 (the student's actual
// commencing year) and 2027 (Programs & Courses' current published year),
// pulled from https://programsandcourses.anu.edu.au/<year>/program/AACOM.
// Fixed seed data, not user-editable — only completed courses are entered
// interactively.
function seedDegreeRulesIfEmpty(): void {
  if (listYears().length > 0) return;

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
  const core2027 = JSON.stringify([
    "COMP2100",
    "COMP2120",
    "COMP2300",
    "COMP2310",
    "COMP2400",
    "COMP3600",
    "COMP3630",
    "COMP4450",
  ]);

  db.insert(degreeRules)
    .values([
      // 2024
      { year: 2024, category: "Introductory", requiredUnits: 18, requiredCourses: null },
      { year: 2024, category: "Core", requiredUnits: 48, requiredCourses: core2024 },
      { year: 2024, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
      { year: 2024, category: "Further COMP Study", requiredUnits: 6, requiredCourses: null },
      { year: 2024, category: "Upper-Level COMP", requiredUnits: 18, requiredCourses: null },
      { year: 2024, category: "Supplementary", requiredUnits: 6, requiredCourses: null },
      { year: 2024, category: "Capstone", requiredUnits: 24, requiredCourses: null },
      { year: 2024, category: "General Electives", requiredUnits: 48, requiredCourses: null },
      // 2027
      { year: 2027, category: "Foundational", requiredUnits: 18, requiredCourses: null },
      { year: 2027, category: "Core", requiredUnits: 48, requiredCourses: core2027 },
      { year: 2027, category: "Specialisation", requiredUnits: 24, requiredCourses: null },
      { year: 2027, category: "COMP Electives", requiredUnits: 18, requiredCourses: null },
      { year: 2027, category: "ICT-Related", requiredUnits: 12, requiredCourses: null },
      { year: 2027, category: "Capstone", requiredUnits: 24, requiredCourses: null },
      { year: 2027, category: "General Electives", requiredUnits: 48, requiredCourses: null },
    ])
    .run();
}
seedDegreeRulesIfEmpty();
