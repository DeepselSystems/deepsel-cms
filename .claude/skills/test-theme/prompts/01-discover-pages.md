# Step: Discover All Pages from Database

## Goal
Query the database to get a complete list of all pages and blog posts that need testing. This ensures we test EVERY page, not just the ones we assume exist.

## Process

### Query all page slugs
```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -t -A -c "
SELECT slug FROM page
WHERE organization_id = (SELECT id FROM organization LIMIT 1)
ORDER BY slug;
"
```

### Query blog posts (for blog post testing)
```bash
PGPASSWORD=dummy psql -h localhost -p 5432 -U user -d deepsel_cms -t -A -c "
SELECT slug FROM blog_post
WHERE organization_id = (SELECT id FROM organization LIMIT 1)
ORDER BY publish_date DESC
LIMIT 3;
"
```

### Build the complete test page list

From the query results, build the ordered test list:
```
Pages to test (in order):
1. / (homepage — always first)
2. /about (from DB)
3. /services (from DB)
4. ... (every other slug from DB)
5. /blog (blog list — always test)
6. /blog/<first-post-slug> (from blog query)
7. /nonexistent-page-xyz (404 — always last)
```

### Map pages to Figma screenshots

For each page, find the corresponding Figma screenshot in `$MIGRATION_DIR/screenshots/`:
- Homepage → `homepage-desktop.png` or similar
- Custom pages → look for matching frame names (e.g., `about-desktop.png`, `contact-desktop.png`)

Also map to vibe_figma output for code-level comparison:
- Homepage → `$MIGRATION_DIR/vibe-output/homepage/`
- Custom pages → `$MIGRATION_DIR/vibe-output/<slug>/`

If a Figma screenshot exists for a page, it will be used for visual comparison.
If a vibe_figma output exists, it will be used for element-level Tailwind class comparison.
If neither exists (e.g., a CMS page with no Figma design), test it for functionality only (navigation, console errors, interactions) — skip visual comparison.

## Output
- Ordered list of all URLs to test
- Mapping of pages to Figma reference screenshots (if available)
- Mapping of pages to vibe_figma output directories (if available)
- Total count: "Found X pages + blog + 404 = Y total test targets"
