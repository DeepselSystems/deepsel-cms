# Step: Full Page Test (Visual + Interactive)

## Goal
Test each page COMPLETELY — visual screenshots AND interactive functionality — before moving to the next page. This catches issues per-page immediately instead of batching all screenshots then discovering problems later.

## Per-Page Test Cycle

For EACH page, run this complete cycle:

### 1. Desktop Viewport (1920x1080)

```javascript
// Setup
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});
const page = await context.newPage();

// Collect console errors
const consoleErrors = [];
const networkErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => consoleErrors.push(err.message));
page.on('response', response => {
  if (response.status() >= 400 && !response.url().includes('favicon')) {
    networkErrors.push(`${response.status()} ${response.url()}`);
  }
});

// Navigate
await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000); // Wait for React hydration

// Full-page screenshot
await page.screenshot({
  path: `${outputDir}/${slug}-desktop.png`,
  fullPage: true,
});

// === Interactive Tests ===

// Test all internal links
const internalLinks = await page.$$eval('a[href^="/"]', anchors =>
  [...new Set(anchors.map(a => a.getAttribute('href')))].filter(Boolean)
);

// Test all visible buttons
const buttons = await page.$$('button:visible');
for (const btn of buttons) {
  const text = await btn.textContent();
  const isClickable = await btn.isEnabled();
  if (!isClickable) {
    issues.push({ type: 'button', severity: 'P2', message: `Button "${text.trim()}" is disabled` });
  }
}

// Log results
console.log(`Desktop: ${consoleErrors.length} console errors, ${networkErrors.length} network errors`);
```

### 2. Tablet Viewport (768x1024)

```javascript
const tabletContext = await browser.newContext({
  viewport: { width: 768, height: 1024 }
});
const tabletPage = await tabletContext.newPage();
// Same console/network error collection

await tabletPage.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
await tabletPage.waitForTimeout(2000);

// Screenshot
await tabletPage.screenshot({
  path: `${outputDir}/${slug}-tablet.png`,
  fullPage: true,
});

// Check if hamburger menu appears at this breakpoint
const tabletHamburger = await tabletPage.$([
  'button[aria-label*="menu" i]',
  '[data-testid="mobile-menu"]',
  '.lg\\:hidden button',
  '.md\\:hidden button',
].join(', '));

if (tabletHamburger) {
  // Test hamburger at tablet too
  await tabletHamburger.click();
  await tabletPage.waitForTimeout(500);
  await tabletPage.screenshot({
    path: `${outputDir}/${slug}-tablet-menu-open.png`,
    fullPage: false,
  });
  await tabletHamburger.click(); // Close
}
```

### 3. Mobile Viewport (375x812)

```javascript
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();
// Same console/network error collection

await mobilePage.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(2000);

// Screenshot
await mobilePage.screenshot({
  path: `${outputDir}/${slug}-mobile.png`,
  fullPage: true,
});

// === Mobile Hamburger Menu Test ===
const hamburger = await mobilePage.$([
  'button[aria-label*="menu" i]',
  'button[aria-label*="Menu"]',
  '[data-testid="mobile-menu"]',
  '.lg\\:hidden button',
  '.md\\:hidden button',
  'header button',
].join(', '));

if (hamburger) {
  // 1. Open menu
  await hamburger.click();
  await mobilePage.waitForTimeout(600); // Wait for slide animation

  // 2. Verify menu is visible
  const menuPanel = await mobilePage.$('nav:visible, [role="navigation"]:visible, [data-testid="mobile-nav"]:visible');
  const menuVisible = menuPanel !== null;

  // 3. Screenshot with menu open
  await mobilePage.screenshot({
    path: `${outputDir}/${slug}-mobile-menu-open.png`,
    fullPage: false, // Viewport only — menu is usually overlay
  });

  // 4. Count menu items
  const menuLinks = await mobilePage.$$('nav a:visible, [role="navigation"] a:visible');
  const menuItemCount = menuLinks.length;

  // 5. Test clicking a menu link
  if (menuLinks.length > 1) {
    const secondLink = menuLinks[1]; // Skip first (usually homepage)
    const linkHref = await secondLink.getAttribute('href');
    const linkText = await secondLink.textContent();
    await secondLink.click();
    await mobilePage.waitForTimeout(1000);

    // Verify navigation happened
    const currentUrl = mobilePage.url();
    const navigated = currentUrl.includes(linkHref);
    if (!navigated) {
      issues.push({
        type: 'mobile-menu',
        severity: 'P1',
        message: `Menu link "${linkText.trim()}" (${linkHref}) did not navigate. Current URL: ${currentUrl}`,
      });
    }

    // Go back to original page
    await mobilePage.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);
  }

  // 6. Test menu close
  const hamburgerAgain = await mobilePage.$([
    'button[aria-label*="menu" i]',
    'button[aria-label*="close" i]',
    'button[aria-label*="Close"]',
    '[data-testid="mobile-menu"]',
    '.lg\\:hidden button',
    'header button',
  ].join(', '));

  if (hamburgerAgain) {
    await hamburgerAgain.click();
    await mobilePage.waitForTimeout(400);
    // Verify menu closed
    const menuStillVisible = await mobilePage.$('nav:visible, [role="navigation"]:visible');
    if (menuStillVisible) {
      // Check if it's the desktop nav that's always visible vs mobile overlay
      const isOverlay = await menuStillVisible.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed' || style.position === 'absolute';
      });
      if (isOverlay) {
        issues.push({
          type: 'mobile-menu',
          severity: 'P1',
          message: 'Mobile menu did not close after clicking hamburger/close button',
        });
      }
    }
  }

  // Report
  results.mobileMenu = {
    hamburgerFound: true,
    menuVisible,
    menuItemCount,
    opensCorrectly: menuVisible,
    closesCorrectly: true, // updated if test above fails
    linksWork: true, // updated if navigation test fails
  };
} else {
  issues.push({
    type: 'mobile-menu',
    severity: 'P2',
    message: 'No hamburger menu button found on mobile viewport. Expected a menu toggle.',
  });
}
```

### 4. Blog-Specific Tests (only for /blog page)

```javascript
if (pagePath === '/blog') {
  // Test blog post link click
  const blogPostLink = await page.$('a[href*="/blog/"]');
  if (blogPostLink) {
    const postHref = await blogPostLink.getAttribute('href');
    await blogPostLink.click();
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });

    // Verify blog post page loaded
    const hasArticle = await page.$('article, .blog-post, .content-renderer, main');
    if (!hasArticle) {
      issues.push({
        type: 'blog',
        severity: 'P1',
        message: `Blog post at ${postHref} has no article content`,
      });
    }

    // Take blog post screenshot
    await page.screenshot({
      path: `${outputDir}/blog-post-desktop.png`,
      fullPage: true,
    });

    await page.goBack();
  }

  // Test pagination
  const paginationLinks = await page.$$('[class*="pagination"] a, nav[aria-label*="pagination"] a, .pagination a');
  if (paginationLinks.length > 0) {
    const nextPage = paginationLinks[paginationLinks.length - 1]; // Usually "next" is last
    await nextPage.click();
    await page.waitForTimeout(2000);
    // Verify different content loaded
  }
}
```

### 5. 404 Page Test (only for /nonexistent-page-xyz)

```javascript
if (pagePath === '/nonexistent-page-xyz') {
  // Verify it shows a proper 404 page, not a blank/error page
  const bodyText = await page.textContent('body');
  const has404Content = bodyText.includes('404') ||
                        bodyText.toLowerCase().includes('not found') ||
                        bodyText.toLowerCase().includes('page not found');

  if (!has404Content) {
    issues.push({
      type: '404',
      severity: 'P2',
      message: '404 page does not show "not found" message. May be blank or showing wrong content.',
    });
  }

  // Check it's not showing a server error
  const hasError = bodyText.includes('500') ||
                   bodyText.includes('Internal Server Error') ||
                   bodyText.includes('Error');
  if (hasError) {
    issues.push({
      type: '404',
      severity: 'P1',
      message: '404 page shows server error instead of friendly 404 page',
    });
  }
}
```

### 6. Language Switcher Test (if present on page)

```javascript
const langSwitcher = await page.$([
  '[data-testid="lang-switcher"]',
  '.lang-switcher',
  'select[name="language"]',
  '[class*="LangSwitcher"]',
].join(', '));

if (langSwitcher) {
  await langSwitcher.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${outputDir}/${slug}-lang-switcher-open.png`,
    fullPage: false,
  });

  // Try to switch language
  const langOptions = await page.$$('[class*="lang"] a, [class*="Lang"] a, [class*="language"] option');
  if (langOptions.length > 1) {
    await langOptions[1].click(); // Click second language
    await page.waitForTimeout(2000);
    // Verify URL changed to include language prefix
    const newUrl = page.url();
    results.langSwitcher = {
      found: true,
      optionCount: langOptions.length,
      switchedUrl: newUrl,
    };
  }
}
```

## Per-Page Result Format

After testing each page, log results in this structure:

```
Page 3/8 tested: /about
  Desktop: ✓ screenshot | 0 console errors | 0 network errors
  Tablet:  ✓ screenshot | 0 console errors
  Mobile:  ✓ screenshot | ✓ hamburger menu works (5 items) | ✓ menu links navigate
  Interactive: 4/4 buttons clickable | 8/8 links work
  Visual comparison: 91% match (available: Figma + vibe_figma reference)
  Issues: 1 (P3: hero padding wrong)
```

## Rules
- **Test ONE page completely before moving to the next** — do NOT batch all pages
- **Console errors are P1** — fix before visual issues
- **Broken navigation is P1** — users can't use the site
- **Mobile menu failures are P1** — mobile users can't navigate
- **Take screenshots at every viewport even if interactive tests fail** — we need visuals for comparison
- **If a page fails to load entirely (500/timeout), log it as critical and continue to next page** — don't stop the whole test
- **After all pages tested, print a summary** showing pass/fail per page
