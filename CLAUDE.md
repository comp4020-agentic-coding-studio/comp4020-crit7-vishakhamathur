# Your harness

Rules I hold the agent to on this repo, built up over the weeks I've worked
on it — not a style guide, just the things I've had to say more than once.

## Ask before guessing on anything domain-specific

If a request could mean more than one real change (a rename vs. a merge, a
new field vs. reusing an existing one), ask which one before touching the
schema or the data. Guessing wrong here isn't a quick fix — it's a second
round of migrations and rewritten tests. This has been worth it every time
I've been asked.

## I'm the authority on my own degree, not the agent's arithmetic

Programs & Courses' published structure is the source of truth, and where I
say a number is wrong (a unit total, a course count, a level constraint),
that correction wins over whatever the agent already derived and tested
green. "The tests pass" means the code does what it was told; it doesn't
mean what it was told is true. Verify course names and structure against
programsandcourses.anu.edu.au (or ask me) rather than inventing plausible
ones.

## Show information the app already has — don't ask me to retype it

If a course's name, category, or any other value is already known (looked
up, previously entered, derived), display it. Don't add a text input asking
me to type in something the app could just show me. An editable field is
for something that's actually ambiguous or missing, not a second copy of
data that already exists.

## Don't build more than the week needs

Match the scope of the fix to the prototype. A real constraint the app
can't fully model (a specialisation's course list, a level requirement
within an elective category) gets a plain note or a documented judgement
call in the README, not a half-built enforcement mechanism. If it's not
tested and not asked for, it doesn't belong in this week's slice.

## Prove it, don't just say it

Before telling me something works: run `pnpm test` (builds the real server,
runs the spec suite against it over HTTP), run `pnpm astro check`, and for
anything visual, actually run the built server against a scratch database
and `curl`/load the page rather than trusting that a diff looks right.
Clean up scratch files and background processes afterwards — check for
stale servers left running from an earlier session before trusting what a
fresh curl returns.

## Commit and push only when I ask

Don't commit proactively, even when a change is finished and verified.
Wait until I say so, and don't push further than the round of changes I
actually approved.
