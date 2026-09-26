import type { APIRoute } from "astro";
import { addCompletedCourse } from "../../../lib/db";

// Commits the rows the user confirmed on /upload-preview. Field names are
// keyed by course code (units_<code>, category_<code>) rather than an array
// index — safe because extractCourseCodes already de-duplicates the codes
// that reach that page. Same POST -> insert -> 303 redirect pattern as
// api/completed-courses.ts.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const year = String(form.get("year") ?? "").trim();

  for (const rawCode of form.getAll("include").map(String)) {
    const courseCode = rawCode.trim().toUpperCase().slice(0, 12);
    const category = String(form.get(`category_${rawCode}`) ?? "").trim();
    const courseName = String(form.get(`courseName_${rawCode}`) ?? "").trim();
    const units = Number(form.get(`units_${rawCode}`));

    if (courseCode && category && Number.isFinite(units) && units > 0) {
      addCompletedCourse(category, courseCode, units, courseName);
    }
  }

  return redirect(`/?year=${encodeURIComponent(year)}`, 303);
};
