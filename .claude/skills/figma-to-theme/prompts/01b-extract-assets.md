# Phase 1b: Asset Management (Post-vibe_figma)

## Goal
Ensure all visual assets from the Figma design are properly collected and organized in the theme. This phase runs AFTER Phase 2b (vibe_figma code generation), not after Phase 1.

## Why This Phase Still Exists
vibe_figma extracts assets automatically into each page's `assets/` subfolder. However, we need to:
1. Consolidate assets from all pages into a single theme directory
2. Verify no assets are missing
3. Name files descriptively
4. Handle any assets vibe_figma may have missed

## Input
- `$MIGRATION_DIR/vibe-output/*/assets/` — assets extracted by vibe_figma per page
- `$MIGRATION_DIR/screenshots/` — visual reference to cross-check

## Process

### Step 1: Collect all vibe_figma assets

```bash
# List all assets from vibe_figma output
find $MIGRATION_DIR/vibe-output/ -path "*/assets/*" -type f | sort
```

### Step 2: Copy to theme assets directory

```bash
mkdir -p themes/<theme-name>/assets/images/

# Copy all assets, avoiding duplicates
for page_dir in $MIGRATION_DIR/vibe-output/*/assets/; do
  cp -n "$page_dir"* themes/<theme-name>/assets/images/ 2>/dev/null
done
```

If multiple pages have assets with the same name but different content, rename with page prefix (e.g., `homepage-hero-bg.jpg`, `about-hero-bg.jpg`).

### Step 3: Verify against screenshots

Read each page screenshot and compare with the collected assets:
- Every photo visible in screenshots should have a corresponding file
- Every icon visible in screenshots should have a corresponding file
- Every background image should have a corresponding file

If any are missing and vibe_figma didn't extract them:
1. Try `download_figma_images` with the specific node-id (from frames.json)
2. Wait 3s between downloads
3. On rate limit (429): wait 30s → retry → wait 60s → retry → wait 120s → retry
4. If still failing after 4 attempts: **STOP and notify the user** to wait 2-3 minutes, then retry
5. **Do NOT skip the asset** — missing assets cause visual inaccuracy in the theme

### Step 4: Update asset references in vibe_figma code

The vibe_figma `.tsx` files may reference assets with relative paths like `./assets/image.jpg`. Note these paths — Phase 4 will update them to match the theme's asset directory structure: `../../assets/images/image.jpg` or similar.

### Step 5: Summary

```
Asset Collection Summary:
- Assets from vibe_figma: 12 files
- Additional downloads: 2 files (vibe_figma missed these)
- Total in themes/<name>/assets/images/: 14 files
- Missing: 0
```

## Rules
- **Prefer vibe_figma's extracted assets** — they're already optimized
- **Only download additional assets if vibe_figma missed them** — don't re-download everything
- **NEVER replace actual assets with placeholders or FontAwesome** — if an asset is missing, flag it
- **Name files descriptively** — `hero-background.jpg` not `image-1.jpg`

## Output
- All assets in `themes/<theme-name>/assets/images/`
- Summary of collected assets
- List of any missing assets for manual attention
