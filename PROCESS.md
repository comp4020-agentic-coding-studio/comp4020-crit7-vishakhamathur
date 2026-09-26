# Process overview

## What I built

A degree progress tracker for the Bachelor of Advanced Computing (Honours)
(AACOM): pick a catalogue year, add completed courses (by hand or by
uploading a Statement of Result PDF), and watch a progress bar per category
fill in, with Compulsory calling out which named courses are still missing.
`README.md` has the full account of what the app is and what good looks
like here.

## How I got here

I started from the `template-dynamic` guestbook starter and replaced it
piece by piece rather than bolting a tracker on top of it: the data model
first
([`3006a10`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/commit/3006a10)),
then the UI/API
([`6873819`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/commit/6873819)),
then the spec test
([`917257a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/commit/917257a)),
dropping the guestbook's SSE plumbing entirely rather than leave it unused —
a personal degree audit has no multi-tab collaborator. Once the shape held
together I widened the model to every catalogue year Programs & Courses
still has archived (2023-2027), modelling 2025 as a genuine mid-transition
year (42-unit/7-course Core) instead of approximating it as a copy of 2024
or 2026
([`9311111`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/commit/9311111)),
then added transcript-PDF import — upload a Statement of Result, review the
detected courses, confirm before anything is saved
([`bc2af5f`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/commit/bc2af5f)).

Crit 7's session was mostly about closing the gap between what the app
modelled and what my actual degree looks like. P&C's per-year category
names (Introductory/Foundational, Further COMP Study, Upper-Level
COMP/COMP Electives, Supplementary/ICT-Related, Capstone) don't map onto
how I actually think about my own progress, so I asked for them collapsed
into 5 names I'd recognise — Compulsory, Comp Elective, University
Elective, Specialisation, Project — and for every course code shown
alongside its real name, since a bare code like `COMP2120` is easy to
forget the meaning of. That request was genuinely ambiguous (rename 1:1, or
merge several old categories into one new one?), so rather than guess, the
agent asked me directly which I meant before touching the schema — I picked
the merge. It verified the real ANU course titles against Programs &
Courses instead of inventing them, which mattered to me: a wrong title is
worse than no title.

The same session also caught two places where the merged numbers didn't
match my real degree: University Elective isn't 54/60 units depending on
year, it's a flat 48; and "Comp Elective" is really seven courses with a
level constraint (one compulsory 4000-level, two either 3000- or
4000-level, the rest any level) that the app has no mechanism to enforce.
Rather than build course-level tracking for a one-week prototype, the fix
was to correct the unit total (42 = 7 × 6) and surface the constraint as a
plain reminder note next to the category instead of pretending it's
checked — the same "unit totals are an honest stand-in, not a promise" call
the README already makes for Specialisation
([`d3ca2c6`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/commit/d3ca2c6)).
That commit also fixed the transcript-review page, which had gotten
genuinely worse the same session: an editable "course name" text field had
been added to every detected row, asking me to retype a name the app
already knew. I flagged it —

> dont ask user to enter the name of the course on that page. You have to
> show it so it reminds user

— and the fix was to drop the input and carry the looked-up name through a
hidden field instead, so it's still stored without ever being asked for.

I knew each step was right the same way throughout: `pnpm test` builds the
real server and runs the spec suite against it over HTTP (not mocks), so a
category rename or a unit-total change that broke an existing assertion
failed loudly; `pnpm astro check` caught type errors; and for anything
visual I built the app, ran it against a scratch SQLite file, and `curl`'d
the actual rendered HTML rather than trusting that a diff looked plausible.
That last check once caught a stale server left running from an earlier
session on the port I was testing against — worth noticing before trusting
what looked like a regression that wasn't real.

Full range for this week's work:
[`3006a10...d3ca2c6`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-vishakhamathur/compare/3006a10...d3ca2c6).

## Before you ship

`pnpm check:evidence` verifies that this comment is gone, that your citations
resolve to real commits, that a crit week's reflection entry is in
`reflections/`, and that your `CLAUDE.md` is there. It checks that your account
is traceable, not that it is good: that is the marker's call.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
