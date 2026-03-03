# Step: Capture Screenshots with Playwright

## Goal
Take full-page screenshots of every discovered page at all 3 viewports (desktop, tablet, mobile).

## Viewports
| Name | Width | Height | Use Case |
|------|-------|--------|----------|
| desktop | 1920 | 1080 | Full desktop experience |
| tablet | 768 | 1024 | iPad portrait |
| mobile | 375 | 812 | iPhone SE/standard |

## Screenshot Settings
- `fullPage: true` — capture entire scrollable page
- `waitUntil: 'networkidle'` — wait for all resources to load
- Wait 2 seconds after load for React hydration and animations
- If a page has lazy-loaded content, scroll to bottom first then back to top

## File Naming Convention
```
$MIGRATION_DIR/test-results/run-NNN/<slug>-<viewport>.png
```

Examples:
- `homepage-desktop.png`
- `homepage-mobile.png`
- `about-desktop.png`
- `about-tablet.png`
- `blog-list-desktop.png`
- `blog-post-desktop.png`
- `404-desktop.png`

## Special Cases

### Blog post discovery
Navigate to `/blog` first, find the first blog post link, and screenshot that post:
```javascript
const blogLink = await page.$('a[href^="/blog/"]');
if (blogLink) {
  const href = await blogLink.getAttribute('href');
  // Navigate and screenshot
}
```

### Pages that redirect
If a page returns a redirect (3xx), follow it and screenshot the final destination. Note the redirect in the test report.

### Pages that error
If a page returns an error (5xx) or shows a blank page, screenshot it anyway and flag it as a critical issue in the report.

### Mobile menu testing
On mobile viewport, also capture a screenshot with the mobile menu OPEN:
```javascript
// Click hamburger button
const hamburger = await page.$('button[aria-label*="menu"], button[aria-label*="Menu"], .lg\\:hidden button');
if (hamburger) {
  await hamburger.click();
  await page.waitForTimeout(500); // Wait for animation
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${slug}-mobile-menu-open.png`),
    fullPage: false, // Viewport only for menu overlay
  });
}
```

## Output
- All screenshots saved to versioned run directory
- Console log confirming each capture
- List of any pages that failed to load
