import type { APIRoute } from "astro";
import { addCompletedCourse } from "../../lib/db";

// Adds a completed course to a category, then redirects back to the same
// year view the form was submitted from. No client JS: the 303 redirect
// re-renders the page from SQLite, which is what proves persistence.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const category = String(form.get("category") ?? "").trim();
  const courseCode = String(form.get("courseCode") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 12);
  const courseName = String(form.get("courseName") ?? "").trim();
  const units = Number(form.get("units"));
  const year = String(form.get("year") ?? "").trim();

  if (category && courseCode && Number.isFinite(units) && units > 0) {
    addCompletedCourse(category, courseCode, units, courseName);
  }

  return redirect(`/?year=${encodeURIComponent(year)}`, 303);
};
