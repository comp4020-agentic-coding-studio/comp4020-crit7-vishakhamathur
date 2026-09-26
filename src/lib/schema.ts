import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// One row per degree-plan category, per catalogue year — the fixed contract
// a category has to satisfy that year. Seeded once at boot (see db.ts); not
// user-editable, since the categories themselves come from Programs &
// Courses, not from anything a student decides.
export const degreeRules = sqliteTable("degree_rules", {
  id: int().primaryKey({ autoIncrement: true }),
  year: int().notNull(),
  category: text().notNull(),
  requiredUnits: int("required_units").notNull(),
  // JSON array of course codes that MUST all appear in this category, e.g.
  // '["COMP2100","COMP2120"]'. Null for categories with no fixed list
  // (electives, specialisation — genuinely open choice).
  requiredCourses: text("required_courses"),
});

// A course you've actually completed. `category` is matched against
// `degreeRules.category` for whichever year is currently selected — not a
// foreign key, deliberately: the real course you took doesn't belong to one
// catalogue year, only the rule you're judging it against does.
export const completedCourses = sqliteTable("completed_courses", {
  id: int().primaryKey({ autoIncrement: true }),
  category: text().notNull(),
  courseCode: text("course_code").notNull(),
  courseName: text("course_name"),
  units: int().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type DegreeRule = typeof degreeRules.$inferSelect;
export type CompletedCourse = typeof completedCourses.$inferSelect;
