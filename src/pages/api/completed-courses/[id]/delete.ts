import type { APIRoute } from "astro";
import { deleteCompletedCourse } from "../../../../lib/db";

// A plain HTML form can only POST, so removing an entry is a dedicated route
// rather than a DELETE verb — keeps the "fix a bad entry" case working with
// zero client JS, same as the add form.
export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = Number(params.id);
  if (Number.isFinite(id)) {
    deleteCompletedCourse(id);
  }

  const form = await request.formData();
  const year = String(form.get("year") ?? "").trim();

  return redirect(`/?year=${encodeURIComponent(year)}`, 303);
};
