// Shared between index.astro (sets the id) and the delete API route (builds
// the redirect fragment) so a category's anchor is computed identically on
// both ends.
export function categoryAnchor(category: string): string {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}
