# Degree progress tracker

A visual progress tracker for the Bachelor of Advanced Computing (Honours)
(AACOM): pick a catalogue year, add the courses you've completed under each
category, and watch a progress bar fill for each one. It replaces the ritual
of re-reading [Programs & Courses](https://programsandcourses.anu.edu.au/)
every time you want to know how close you are to graduating, whether you've
missed a compulsory course, or whether you're done with your electives.

Categories and their unit requirements are seeded from the real AACOM
structure for every catalogue year Programs & Courses currently has
archived for it — 2023, 2024 (my own commencing year), 2025, 2026, and 2027
(the currently published one) — since students commencing in different
years are genuinely bound by different rules. 2025 turned out to be a real
mid-transition year: its compulsory block is 42 units across 7 courses
(COMP1600 and the newly-added COMP2400 required at once) rather than the
48-unit/8-course Core every other modelled year has. 2023 shares 2024's
exact 48-unit/8-course Core and category shape — its own page just slices
the remaining "further study" units into finer either/or bullets that don't
amount to a genuine structural difference. Completed courses are stored
once and re-checked against whichever year's rules you're viewing, so
switching years doesn't mean re-entering your history.

## What good looks like here

A progress bar per category is an honest answer to "how close am I" for
categories that are genuinely just a unit total (electives, specialisation,
capstone). It is not an honest answer to "have I missed a compulsory
course" — you could hit 48/48 units in Core without ever taking a specific
required course. So **Core** additionally tracks its eight named compulsory
courses and lists any that are still missing; every other category stays a
plain unit total, because they either have no fixed course list (electives)
or involve OR-choices (COMP1100 vs COMP1130) and a five-way specialisation
choice that a one-week prototype isn't going to model faithfully.

What's enforced by `spec/tracker.test.ts` and `spec/invariants.test.ts`:

- adding a completed course persists across a reload and moves its
  category's progress bar
- Core's missing-course list drops a course once it's added, and a course
  compulsory across multiple catalogue years counts under all of them
- 2025's smaller, 7-course Core is modelled distinctly from 2024's and
  2027's 8-course ones, not approximated as a copy of either
- 2023 shares 2024's 48-unit/8-course Core rather than being silently
  omitted or mismodelled
- the usual accessibility/structure floor (nav landmark, one heading, alt
  text, viewport, axe) on every page

What's a judgement call, not a test: whether the 2023–2027 model (rather
than every year AACOM has ever published — the archive goes back to at
least 2016) is the right scope, and whether unit-totals are a fair stand-in
for categories this prototype doesn't fully model (Specialisation,
Foundational).

## What I chose not to build

- **Live sync across tabs.** The starter's guestbook broadcasts new messages
  over SSE so every open tab sees them. A personal degree audit has no
  collaborator — I'm the only one editing my own progress — so I dropped
  `lib/events.ts` and `api/events.ts` entirely rather than keep unused
  plumbing. The add-course form still round-trips through the real API →
  SQLite → redirect → re-render; that's what actually proves persistence.
- **A degree-structure editor.** Categories and their unit/compulsory-course
  requirements are fixed seed data for the two years I modelled, not
  something you define through the UI. Building an editor for arbitrary
  degree structures is a different, bigger prototype than a personal
  tracker for one degree.
- **Live integration with Canvas or Programs & Courses.** Neither exposes a
  usable public API for this; scraping either would be a fragile dependency
  for a one-week slice. Their real published requirements are the seed data
  instead.
- **Duplicate-course detection.** Adding the same course twice to a category
  double-counts its units. Not guarded against — a small enough foot-gun for
  a single-user prototype that I chose not to spend the week on it.

## Attribution

`public/anu-crest.svg` is ["Arms of the Australian National
University"](https://commons.wikimedia.org/wiki/File:Arms_of_the_Australian_National_University.svg)
from Wikimedia Commons, licensed CC BY-SA 4.0.
