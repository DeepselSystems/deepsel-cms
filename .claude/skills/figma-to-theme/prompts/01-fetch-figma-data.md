# Phase 1: Figma Frame Discovery & Screenshots

## Goal
Discover all frames in the Figma file, capture screenshots for every frame, and save frame metadata. This is a lightweight extraction phase — **vibe_figma** handles the detailed design data and code generation in Phase 2b.

Screenshots are essential for:
- Visual classification in Phase 2 (which frames are pages vs noise)
- Visual comparison during testing in Phase 7
- Quick reference throughout the conversion

## Migration Folder Structure

```
$MIGRATION_DIR/
├── screenshots/                # Visual screenshots per frame
│   ├── homepage-desktop.png
│   ├── about-page.png
│   └── ...
├── design-data/
│   └── frames.json             # Frame index with metadata + Figma URLs
└── (later phases add more)
```

## Process

### Step 1: Create migration folder

```bash
mkdir -p $MIGRATION_DIR/screenshots $MIGRATION_DIR/design-data
```

### Step 2: Get the full file tree

Call `get_figma_data` on the root Figma file URL (strip any node-id params) to get the complete frame list.

### Step 3: Log all top-level frames

Parse the response to list every top-level frame by name and node ID. Print the total count:
```
Found N top-level frames:
1. Frame "Homepage Desktop" (node-id: 123:456)  [1440x900]
2. Frame "Homepage Mobile" (node-id: 123:457)   [375x812]
3. Frame "Notes" (node-id: 123:458)              [400x200]  ← might be non-page
...
```

### Step 4: Save frames.json

Save frame metadata to `$MIGRATION_DIR/design-data/frames.json`:
```json
[
  {
    "name": "Homepage Desktop",
    "nodeId": "123:456",
    "figmaUrl": "https://www.figma.com/design/<file-id>/<file-name>?node-id=123:456",
    "width": 1440,
    "height": 900,
    "screenshot": "screenshots/homepage-desktop.png",
    "status": "pending"
  }
]
```

**IMPORTANT:** Include the full `figmaUrl` for each frame — this URL is needed by vibe_figma in Phase 2b.

To build the URL: take the original Figma file URL (without node-id), append `?node-id=<node-id>` (URL-encode the colon as `%3A`, e.g., `node-id=123%3A456`).

### Step 5: Download screenshots (WITH RATE LIMIT HANDLING)

Download screenshots ONE AT A TIME sequentially:
- For EACH frame, call `download_figma_images` to save a screenshot
- Use descriptive filenames: `$MIGRATION_DIR/screenshots/<frame-name-kebab>.png`
- Example: `homepage-desktop.png`, `about-mobile.png`, `blog-list-tablet.png`
- **Wait 3 seconds between each download**
- If rate limited (429 or "rate limit" in response):
  1. Log: `"Rate limited on frame X. Waiting 30 seconds..."`
  2. Wait 30s → retry
  3. If still limited, wait 60s → retry
  4. If still limited, wait 120s → retry
  5. If still failing after 4 attempts: **STOP and notify user**:
     ```
     ⚠️ Figma rate limit on screenshot "<frame-name>" after 4 retries.
     Please wait 2-3 minutes, then confirm to continue.
     Progress: X/Y screenshots done. Remaining: Z frames.
     ```
  6. **Do NOT skip the frame. Do NOT continue.** Wait for user to confirm, then retry that same frame.
- Track progress: `"Downloaded screenshot 3/12: Homepage Mobile ✓"`
- Update `frames.json` status to "success" as each completes

**IMPORTANT: Do NOT proceed to Phase 2 until ALL screenshots are downloaded.** Every frame must have its screenshot — no exceptions.

### Step 6: Verify completeness

```
Extraction Summary:
- Total frames found: 12
- Screenshots downloaded: 12/12 ✓
- frames.json saved ✓
```

**If any screenshots are still missing at this point, something went wrong — you should have paused for user confirmation earlier.** Go back and retry the missing frames now.

## IMPORTANT: No Parallel API Calls

**ALL Figma API calls MUST be sequential with delays.** NEVER use parallel subagents for Figma operations. The Figma API has strict rate limits — parallel calls trigger failures.

## IMPORTANT: No Raw Data Extraction Needed

Previous versions of this skill saved raw JSON for every frame. **This is no longer needed.** vibe_figma reads Figma data directly via its own API calls and produces React code with exact visual accuracy. We only need:
- Screenshots (for classification + testing)
- Frame metadata with Figma URLs (for vibe_figma input)

## Rules
- NEVER skip a frame because it "looks like a variant" — screenshot everything, Phase 2 will filter
- If a frame name contains "mobile", "tablet", "responsive", note this in frames.json
- If `download_figma_images` fails on a specific frame, log the error and continue
- **Always respect rate limits — slow and complete beats fast and incomplete**
- **Always include figmaUrl in frames.json** — Phase 2b needs it for vibe_figma

## Output
- `$MIGRATION_DIR/screenshots/` — one PNG per frame
- `$MIGRATION_DIR/design-data/frames.json` — frame index with Figma URLs
- Console log confirming: "Downloaded X/Y screenshots"
- Any failures listed clearly for user review
