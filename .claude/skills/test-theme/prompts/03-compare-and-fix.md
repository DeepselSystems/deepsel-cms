# Step: Compare, Report, and Fix Loop

## Goal
After all pages are tested (visual + interactive), aggregate results into a comprehensive report, then run a fix loop to resolve issues.

## Comparison Process

### Visual Comparison (using subagents)

For pages that have Figma references, spawn parallel Task subagents for comparison:

```
Spawn parallel Task agents (subagent_type="general-purpose"):

- Agent 1: "Compare homepage.
  Read: $MIGRATION_DIR/screenshots/homepage-desktop.png (Figma reference)
  Read: $MIGRATION_DIR/test-results/run-NNN/homepage-desktop.png (test result)
  Read: $MIGRATION_DIR/vibe-output/homepage/<Component>.tsx (vibe_figma code reference)
  Read: themes/<name>/components/PageHome.tsx (theme code)

  For each visible element (header, hero, sections, footer):
  1. Compare visual appearance in screenshots
  2. Compare Tailwind classes between vibe_figma output and theme code
  3. Return a drift table with exact fix instructions

  Return JSON: { page: 'homepage', elementsChecked: N, elementsMatch: M, drifts: [...] }"

- Agent 2: "Compare about page..." (same structure)
- Agent 3: "Compare contact page..." (same structure)
```

Each agent returns:
- Element count and match rate
- Drift table: element name, expected Tailwind class, actual Tailwind class, fix
- Priority-ordered fix list

### Combine Interactive + Visual Results

Merge the interactive test results (from Step 4-5) with visual comparison results (from subagents) into a single report per page.

## Full Test Report

Create `$MIGRATION_DIR/test-results/run-NNN/test-report.md`:

```markdown
# Full Test Report: <theme-name>
Run: NNN | Date: <current-date> | Iteration: N

## Summary
| Metric | Result |
|--------|--------|
| Pages tested | X |
| Pages fully passed | Y/X |
| Console errors | N total across all pages |
| Network errors (4xx/5xx) | N |
| Broken internal links | N |
| Mobile menu | Works / Broken / Not found |
| Blog navigation | Works / Broken / No posts |
| 404 page | Correct / Error / Blank |
| Language switcher | Works / Broken / Not found |
| Visual match rate | Z% (across pages with Figma reference) |

## Critical Issues (must fix)
1. [P1] Console error on /about: "Cannot read property 'map' of undefined" — PageAbout.tsx:23
2. [P1] Mobile menu does not close — Menu.tsx:45 missing state toggle
3. [P1] /services returns 500 — missing PageServices component

## Per-Page Results

### Page 1: Homepage (/)
**Status: PARTIAL PASS**

#### Functional Tests
| Test | Result | Details |
|------|--------|---------|
| Desktop loads | ✓ | 200 OK, no errors |
| Tablet loads | ✓ | 200 OK |
| Mobile loads | ✓ | 200 OK |
| Console errors | ✓ | 0 errors |
| Network errors | ✓ | 0 errors |
| Buttons clickable | ✓ | 3/3 buttons work |
| Internal links | ✗ | 7/8 links work — "/kontakt" returns 404 |
| Mobile hamburger | ✓ | Opens, shows 5 items, closes |
| Mobile menu navigation | ✓ | Links navigate correctly |

#### Visual Comparison (vs Figma)
| Element | vibe_figma class | Theme class | Match | Fix |
|---------|-----------------|-------------|-------|-----|
| Header bg | bg-white | bg-white | ✓ | — |
| Header padding | px-16 py-4 | px-6 py-3 | ✗ | px-6→px-16, py-3→py-4 |
| Nav link color | text-[#4A4A68] | text-gray-600 | ✗ | → text-[#4A4A68] |
| Hero bg image | hero-bg.jpg | solid bg-[#0F172A] | ✗ | Add image + overlay |
| ... | ... | ... | ... | ... |

**Visual score: 15/20 elements match = 75%**

### Page 2: About (/about)
... (same structure)

### Page N: 404 (/nonexistent-page-xyz)
**Status: PASS**
- Shows "Page not found" message ✓
- No console errors ✓
- Header/footer render correctly ✓
```

## Fix Loop Process

### Priority Order (STRICT)

**Round 1: Fix functional issues first**
1. **P0: Pages that don't load** — missing components, 500 errors, import errors
2. **P1: Console errors** — JavaScript errors break functionality
3. **P1: Mobile menu broken** — users can't navigate on mobile
4. **P1: Broken navigation links** — dead links are critical

**Round 2: Fix visual issues**
5. **P2: Wrong colors/backgrounds** — most visually impactful
6. **P2: Missing assets** — images, icons showing as placeholders
7. **P3: Wrong layout/spacing** — padding, gap, flex direction
8. **P4: Wrong typography** — font family, size, weight, color
9. **P5: Fine details** — border-radius, shadows, hover states

### Fix Process Per Round

```
1. Read the issue list from the report (sorted by priority)
2. Apply ALL issues of the current priority level
3. Wait 3 seconds for hot-reload
4. Re-test ONLY affected pages:
   - For functional fixes: re-run the interactive test for that page
   - For visual fixes: re-take screenshots and re-compare
5. Update the test report with new results
6. If all P0-P1 issues are fixed, move to P2-P5
7. Repeat until:
   - All functional tests pass (P0-P1 = 0 issues)
   - Visual match rate >= 95%
   - OR max 5 iterations reached
```

### Iteration Tracking

```markdown
## Iteration History

### Iteration 1 (initial)
- Functional: 3 P0, 2 P1, 1 P2
- Visual: 60% match
- Fixed: 3 P0 (missing components), 2 P1 (console errors)

### Iteration 2
- Functional: 0 P0, 0 P1, 1 P2
- Visual: 75% match
- Fixed: 5 visual drifts (colors, padding)

### Iteration 3
- Functional: 0 P0, 0 P1, 0 P2
- Visual: 92% match
- Fixed: 8 visual drifts (typography, spacing)

### Iteration 4
- Functional: all pass ✓
- Visual: 96% match ✓
- Status: COMPLETE
```

## Rules
- **Functional issues ALWAYS before visual issues** — a pretty site that crashes is useless
- **Mobile menu is P1** — most users are on mobile
- **Never fix visual issues if there are console errors** — errors may cause visual problems that auto-resolve
- **Re-test only affected pages** — don't re-run everything for a single fix
- **Max 5 iterations** — if still failing after 5 rounds, generate final report with remaining issues and ask user
- **Each iteration should fix at least 2-3 issues** — if stuck (same issues reappearing), escalate to user
- **After all fixes, run ONE final complete test** of all pages to catch regressions

## Output
- `$MIGRATION_DIR/test-results/run-NNN/test-report.md` — comprehensive report
- All screenshots saved in run directory
- Fix log with before/after for each change
- Final pass/fail status with clear reasoning
