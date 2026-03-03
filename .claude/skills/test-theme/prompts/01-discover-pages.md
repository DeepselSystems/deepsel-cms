# Step: Discover All Pages from Database

## Goal
Query the database to get a complete list of all pages that need testing. This ensures we test EVERY page, not just the ones we assume exist.

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

From the query results, build:
```
Pages to test:
- / (homepage — always test)
- /about (from DB query)
- /services (from DB query)
- ... (every slug from DB)
- /blog (blog list — always test)
- /blog/<first-post-slug> (from blog query)
- /nonexistent-page-xyz (404 — always test)
```

### Map pages to Figma screenshots

For each page, find the corresponding Figma screenshot in `$MIGRATION_DIR/screenshots/`:
- Homepage → `homepage-desktop.png` or similar
- Custom pages → look for matching frame names

If a Figma screenshot exists for a page, it will be used for comparison.
If no Figma screenshot exists (e.g., a CMS page with no Figma design), test it anyway for layout/rendering correctness but skip the visual comparison.

## Output
- List of all URLs to test
- Mapping of pages to their Figma reference screenshots (if available)
