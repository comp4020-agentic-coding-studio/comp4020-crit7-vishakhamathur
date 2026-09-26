# Crit 7

**What was the breakthrough that moved the work forward?**

The breakthrough was noticing the difference between decisions that were
mine to make and facts I had to supply. Early on I asked the agent to
collapse Programs & Courses' 7-8 per-year category names into 5 I'd
recognise, and instead of guessing whether that meant a rename or a merge,
it asked me directly — the schema change matched what I wanted the first
time, not after a second pass. The bigger version came later, reading the
merged totals back and realising two were wrong: University Elective isn't
54 or 60 units depending on the year, it's a flat 48, and "Comp Elective" is
really seven courses with a level constraint the app had no way to
represent. That's not something derivable from P&C's page structure alone —
it's my degree, and I'm the authority on what's true about it. Once I said
so plainly, fixing it was fast: correct the unit total, and note the
constraint instead of half-building a course-level tracker for a one-week
prototype.

**What did this work change about who I want to be as a software developer?**

I want to be someone who treats a domain fact as more trustworthy than an
internally-consistent derivation from it. The merged unit totals all summed
correctly and passed every test, but "correctly sums" isn't the same as
"true" — I'm the one who actually knows what my degree requires, and should
say so early rather than let a plausible number sit unchallenged because
the tests were green. That's a habit worth carrying past this course: green
tests mean the code does what it was told, not that what it was told is
right.
