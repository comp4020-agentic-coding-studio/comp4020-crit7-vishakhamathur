import type { APIRoute } from "astro";
import { deleteCompletedCourse } from "../../../../lib/db";
import { categoryAnchor } from "../../../../lib/slug";

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
  const category = String(form.get("category") ?? "").trim();

  // Redirect straight back to the category the removed course lived in —
  // with no client JS, a plain `/?year=...` redirect always re-renders
  // scrolled to the top, losing the spot you were just looking at.
  const anchor = category ? `#${categoryAnchor(category)}` : "";
  return redirect(`/?year=${encodeURIComponent(year)}${anchor}`, 303);
};
