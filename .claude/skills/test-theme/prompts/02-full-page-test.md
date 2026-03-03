# Step: Full Page Test (Visual + Interactive)

## Goal
Test each page COMPLETELY — visual screenshots AND interactive functionality — before moving to the next page. **Auto-click every menu link and every button** to verify they work. This catches broken navigation, dead links, and non-functional UI immediately.

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
```

#### 1a. Desktop Menu Navigation Test — Click EVERY menu link

```javascript
// Find all menu/nav links in the header
const menuLinks = await page.$$eval(
  'header a[href], nav a[href], [role="navigation"] a[href]',
  anchors => anchors.map(a => ({
    href: a.getAttribute('href'),
    text: a.textContent.trim(),
    isVisible: a.offsetParent !== null,
  })).filter(a => a.isVisible && a.href && !a.href.startsWith('#') && !a.href.startsWith('mailto:') && !a.href.startsWith('tel:'))
);

// Remove duplicates by href
const uniqueMenuLinks = [...new Map(menuLinks.map(l => [l.href, l])).values()];

console.log(`Found ${uniqueMenuLinks.length} menu links to test`);

const menuResults = [];
for (const link of uniqueMenuLinks) {
  // Click the menu link
  const linkEl = await page.$(`header a[href="${link.href}"], nav a[href="${link.href}"]`);
  if (!linkEl) continue;

  await linkEl.click();
  await page.waitForTimeout(1500); // Wait for navigation or client-side routing

  const currentUrl = page.url();
  const navigatedCorrectly = currentUrl.includes(link.href) ||
    (link.href === '/' && currentUrl === `${BASE_URL}/`);

  // Check for errors after navigation
  const hasError = consoleErrors.length > 0;
  const pageContent = await page.textContent('body').catch(() => '');
  const shows500 = pageContent.includes('500') || pageContent.includes('Internal Server Error');
  const showsBlank = pageContent.trim().length < 50;

  menuResults.push({
    text: link.text,
    href: link.href,
    navigated: navigatedCorrectly,
    currentUrl,
    hasError,
    shows500,
    showsBlank,
    status: navigatedCorrectly && !shows500 && !showsBlank ? 'PASS' : 'FAIL',
  });

  if (!navigatedCorrectly) {
    issues.push({
      type: 'menu-navigation',
      severity: 'P1',
      message: `Menu link "${link.text}" (${link.href}) did not navigate. Landed on: ${currentUrl}`,
    });
  }
  if (shows500) {
    issues.push({
      type: 'menu-navigation',
      severity: 'P1',
      message: `Menu link "${link.text}" (${link.href}) leads to 500 error page`,
    });
  }
  if (showsBlank) {
    issues.push({
      type: 'menu-navigation',
      severity: 'P1',
      message: `Menu link "${link.text}" (${link.href}) leads to blank page`,
    });
  }

  // Navigate back to the original page for next link test
  await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}

console.log('Desktop menu results:');
menuResults.forEach(r => console.log(`  ${r.status} "${r.text}" → ${r.href}`));
```

#### 1b. Desktop Button Click Test — Click EVERY button

```javascript
// Find all visible buttons on the page
const buttons = await page.$$('button:visible, a[role="button"]:visible, [type="submit"]:visible');

const buttonResults = [];
for (const btn of buttons) {
  const text = (await btn.textContent()).trim();
  const tagName = await btn.evaluate(el => el.tagName.toLowerCase());
  const isEnabled = await btn.isEnabled();

  if (!isEnabled) {
    buttonResults.push({ text, status: 'DISABLED' });
    continue;
  }

  // Store current URL before click
  const urlBefore = page.url();
  const errorsBefore = consoleErrors.length;

  try {
    await btn.click({ timeout: 3000 });
    await page.waitForTimeout(800);

    const urlAfter = page.url();
    const errorsAfter = consoleErrors.length;
    const newErrors = consoleErrors.slice(errorsBefore);

    // Check what happened after click
    const navigated = urlAfter !== urlBefore;
    const causedError = errorsAfter > errorsBefore;

    buttonResults.push({
      text,
      status: causedError ? 'ERROR' : 'PASS',
      navigated,
      newUrl: navigated ? urlAfter : null,
      errors: newErrors,
    });

    if (causedError) {
      issues.push({
        type: 'button-click',
        severity: 'P2',
        message: `Button "${text}" caused console error: ${newErrors.join(', ')}`,
      });
    }

    // If button navigated away, go back
    if (navigated) {
      await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    buttonResults.push({ text, status: 'NOT_CLICKABLE', error: e.message });
    issues.push({
      type: 'button-click',
      severity: 'P2',
      message: `Button "${text}" is not clickable: ${e.message}`,
    });
  }
}

console.log('Button click results:');
buttonResults.forEach(r => console.log(`  ${r.status} "${r.text}"`));
```

#### 1c. Desktop Internal Links Test — Verify all links resolve

```javascript
// Collect ALL internal links on the page (not just menu)
const allLinks = await page.$$eval('a[href^="/"]', anchors =>
  [...new Set(anchors.map(a => a.getAttribute('href')))].filter(Boolean)
);

const linkResults = [];
for (const href of allLinks) {
  try {
    const response = await page.goto(`${BASE_URL}${href}`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    const status = response?.status() || 0;
    const ok = status >= 200 && status < 400;

    linkResults.push({ href, status, ok });

    if (!ok) {
      issues.push({
        type: 'broken-link',
        severity: status >= 500 ? 'P1' : 'P2',
        message: `Link ${href} returned status ${status}`,
      });
    }
  } catch (e) {
    linkResults.push({ href, status: 0, ok: false, error: e.message });
    issues.push({
      type: 'broken-link',
      severity: 'P2',
      message: `Link ${href} failed to load: ${e.message}`,
    });
  }
}

// Navigate back to current page
await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });

const brokenLinks = linkResults.filter(l => !l.ok);
console.log(`Links: ${linkResults.length} total, ${brokenLinks.length} broken`);
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
  'button[aria-label*="Menu"]',
  '[data-testid="mobile-menu"]',
  '.lg\\:hidden button',
  '.md\\:hidden button',
  'header button:not([aria-label*="lang"])',
].join(', '));

if (tabletHamburger) {
  // Open menu
  await tabletHamburger.click();
  await tabletPage.waitForTimeout(600);

  // Screenshot with menu open
  await tabletPage.screenshot({
    path: `${outputDir}/${slug}-tablet-menu-open.png`,
    fullPage: false,
  });

  // Test clicking each menu link at tablet viewport too
  const tabletMenuLinks = await tabletPage.$$('nav a:visible, [role="navigation"] a:visible');
  console.log(`Tablet: hamburger found, ${tabletMenuLinks.length} menu items visible`);

  // Close menu
  const closeBtn = await tabletPage.$([
    'button[aria-label*="close" i]',
    'button[aria-label*="menu" i]',
    '[data-testid="mobile-menu"]',
    '.lg\\:hidden button',
    'header button',
  ].join(', '));
  if (closeBtn) {
    await closeBtn.click();
    await tabletPage.waitForTimeout(400);
  }
}
```

### 3. Mobile Viewport (375x812) — Full Menu Interaction Test

```javascript
const mobileContext = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();

// Collect console errors for mobile
const mobileConsoleErrors = [];
mobilePage.on('console', msg => {
  if (msg.type() === 'error') mobileConsoleErrors.push(msg.text());
});
mobilePage.on('pageerror', err => mobileConsoleErrors.push(err.message));

await mobilePage.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
await mobilePage.waitForTimeout(2000);

// Screenshot
await mobilePage.screenshot({
  path: `${outputDir}/${slug}-mobile.png`,
  fullPage: true,
});
```

#### 3a. Mobile Hamburger Menu — Open/Close Test

```javascript
const hamburgerSelectors = [
  'button[aria-label*="menu" i]',
  'button[aria-label*="Menu"]',
  '[data-testid="mobile-menu"]',
  '.lg\\:hidden button',
  '.md\\:hidden button',
  'header button:not([aria-label*="lang"])',
].join(', ');

const hamburger = await mobilePage.$(hamburgerSelectors);

if (hamburger) {
  // === TEST 1: Open menu ===
  await hamburger.click();
  await mobilePage.waitForTimeout(600);

  const menuPanel = await mobilePage.$('nav:visible, [role="navigation"]:visible, [data-testid="mobile-nav"]:visible');
  const menuVisible = menuPanel !== null;

  if (!menuVisible) {
    issues.push({
      type: 'mobile-menu',
      severity: 'P1',
      message: 'Hamburger clicked but no menu appeared. Menu panel not visible after click.',
    });
  }

  // Screenshot with menu open
  await mobilePage.screenshot({
    path: `${outputDir}/${slug}-mobile-menu-open.png`,
    fullPage: false,
  });

  // === TEST 2: Count and list menu items ===
  const mobileMenuLinks = await mobilePage.$$eval(
    'nav a:visible, [role="navigation"] a:visible',
    anchors => anchors.map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim(),
    })).filter(a => a.href && a.text)
  );
  console.log(`Mobile menu: ${mobileMenuLinks.length} items found`);

  if (mobileMenuLinks.length === 0 && menuVisible) {
    issues.push({
      type: 'mobile-menu',
      severity: 'P1',
      message: 'Mobile menu opened but no links found inside. Menu is empty.',
    });
  }

  // === TEST 3: Click EVERY menu link one by one ===
  const mobileMenuResults = [];
  for (let i = 0; i < mobileMenuLinks.length; i++) {
    const link = mobileMenuLinks[i];

    // Re-open menu (it closes after each navigation)
    const ham = await mobilePage.$(hamburgerSelectors);
    if (ham) {
      await ham.click();
      await mobilePage.waitForTimeout(600);
    }

    // Find and click the link
    const linkEl = await mobilePage.$(`nav a[href="${link.href}"]:visible, [role="navigation"] a[href="${link.href}"]:visible`);
    if (!linkEl) {
      mobileMenuResults.push({ ...link, status: 'NOT_FOUND', message: 'Link not found after re-opening menu' });
      continue;
    }

    const errorsBefore = mobileConsoleErrors.length;
    await linkEl.click();
    await mobilePage.waitForTimeout(1500);

    const currentUrl = mobilePage.url();
    const navigated = currentUrl.includes(link.href) ||
      (link.href === '/' && currentUrl === `${BASE_URL}/`);
    const newErrors = mobileConsoleErrors.slice(errorsBefore);
    const pageContent = await mobilePage.textContent('body').catch(() => '');
    const shows500 = pageContent.includes('500') || pageContent.includes('Internal Server Error');
    const showsBlank = pageContent.trim().length < 50;

    const status = navigated && !shows500 && !showsBlank ? 'PASS' : 'FAIL';
    mobileMenuResults.push({
      ...link,
      status,
      currentUrl,
      navigated,
      shows500,
      showsBlank,
      errors: newErrors,
    });

    if (!navigated) {
      issues.push({
        type: 'mobile-menu-nav',
        severity: 'P1',
        message: `Mobile menu link "${link.text}" (${link.href}) did not navigate. Landed on: ${currentUrl}`,
      });
    }
    if (shows500) {
      issues.push({
        type: 'mobile-menu-nav',
        severity: 'P1',
        message: `Mobile menu link "${link.text}" (${link.href}) leads to 500 error`,
      });
    }
    if (newErrors.length > 0) {
      issues.push({
        type: 'mobile-menu-nav',
        severity: 'P1',
        message: `Mobile menu link "${link.text}" caused error: ${newErrors.join(', ')}`,
      });
    }

    // Go back to original page for next link
    await mobilePage.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);
  }

  console.log('Mobile menu navigation results:');
  mobileMenuResults.forEach(r => console.log(`  ${r.status} "${r.text}" → ${r.href}`));

  // === TEST 4: Open and close menu (toggle test) ===
  const hamToggle = await mobilePage.$(hamburgerSelectors);
  if (hamToggle) {
    // Open
    await hamToggle.click();
    await mobilePage.waitForTimeout(500);
    const isOpen = await mobilePage.$('nav:visible, [role="navigation"]:visible');

    // Close
    const closeBtn = await mobilePage.$([
      'button[aria-label*="close" i]',
      'button[aria-label*="menu" i]',
      '[data-testid="mobile-menu"]',
      hamburgerSelectors,
    ].join(', '));
    if (closeBtn) {
      await closeBtn.click();
      await mobilePage.waitForTimeout(500);
    }

    // Verify closed
    const stillOpen = await mobilePage.$('nav:visible, [role="navigation"]:visible');
    if (stillOpen) {
      const isOverlay = await stillOpen.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed' || style.position === 'absolute';
      });
      if (isOverlay) {
        issues.push({
          type: 'mobile-menu',
          severity: 'P1',
          message: 'Mobile menu does not close. Toggle button not working properly.',
        });
      }
    }
  }

  results.mobileMenu = {
    hamburgerFound: true,
    menuVisible,
    menuItemCount: mobileMenuLinks.length,
    menuItems: mobileMenuLinks.map(l => l.text),
    navigationResults: mobileMenuResults,
    toggleWorks: true, // updated by test 4 if fails
  };
} else {
  issues.push({
    type: 'mobile-menu',
    severity: 'P2',
    message: 'No hamburger menu button found on mobile viewport. Expected a menu toggle in header.',
  });
  results.mobileMenu = { hamburgerFound: false };
}
```

#### 3b. Mobile Button Click Test

```javascript
// Find all visible buttons on mobile
const mobileButtons = await mobilePage.$$('button:visible, a[role="button"]:visible');

for (const btn of mobileButtons) {
  const text = (await btn.textContent()).trim();
  // Skip hamburger button (already tested)
  const ariaLabel = await btn.getAttribute('aria-label') || '';
  if (ariaLabel.toLowerCase().includes('menu')) continue;

  const isEnabled = await btn.isEnabled();
  if (!isEnabled) continue;

  const urlBefore = mobilePage.url();
  const errorsBefore = mobileConsoleErrors.length;

  try {
    await btn.click({ timeout: 3000 });
    await mobilePage.waitForTimeout(800);

    const urlAfter = mobilePage.url();
    const newErrors = mobileConsoleErrors.slice(errorsBefore);

    if (newErrors.length > 0) {
      issues.push({
        type: 'mobile-button',
        severity: 'P2',
        message: `Mobile: Button "${text}" caused error: ${newErrors.join(', ')}`,
      });
    }

    // Go back if navigated
    if (urlAfter !== urlBefore) {
      await mobilePage.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
      await mobilePage.waitForTimeout(1000);
    }
  } catch (e) {
    issues.push({
      type: 'mobile-button',
      severity: 'P2',
      message: `Mobile: Button "${text}" not clickable: ${e.message}`,
    });
  }
}
```

### 4. Blog-Specific Tests (only for /blog page)

```javascript
if (pagePath === '/blog') {
  // Test clicking a blog post link
  const blogPostLink = await page.$('a[href*="/blog/"]');
  if (blogPostLink) {
    const postHref = await blogPostLink.getAttribute('href');
    const postText = (await blogPostLink.textContent()).trim();
    await blogPostLink.click();
    await page.waitForTimeout(2000);

    // Verify blog post page loaded with content
    const hasArticle = await page.$('article, .blog-post, .content-renderer, main');
    if (!hasArticle) {
      issues.push({
        type: 'blog',
        severity: 'P1',
        message: `Blog post "${postText}" at ${postHref} has no article content`,
      });
    }

    // Check for console errors on blog post page
    if (consoleErrors.length > 0) {
      issues.push({
        type: 'blog',
        severity: 'P1',
        message: `Blog post page has console errors: ${consoleErrors.join(', ')}`,
      });
    }

    // Take blog post screenshot
    await page.screenshot({
      path: `${outputDir}/blog-post-desktop.png`,
      fullPage: true,
    });

    await page.goBack();
    await page.waitForTimeout(1000);
  } else {
    issues.push({
      type: 'blog',
      severity: 'P2',
      message: 'Blog list page has no blog post links (a[href*="/blog/"])',
    });
  }

  // Test pagination if exists
  const paginationLinks = await page.$$('[class*="pagination"] a, nav[aria-label*="pagination"] a, .pagination a');
  if (paginationLinks.length > 0) {
    const nextPage = paginationLinks[paginationLinks.length - 1];
    const paginationHref = await nextPage.getAttribute('href');
    await nextPage.click();
    await page.waitForTimeout(2000);
    const urlAfterPagination = page.url();
    console.log(`Pagination: clicked → ${urlAfterPagination}`);
    await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
  }
}
```

### 5. 404 Page Test (only for /nonexistent-page-xyz)

```javascript
if (pagePath === '/nonexistent-page-xyz') {
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

  const shows500 = bodyText.includes('500') || bodyText.includes('Internal Server Error');
  if (shows500) {
    issues.push({
      type: '404',
      severity: 'P1',
      message: '404 page shows server error instead of friendly 404 page',
    });
  }

  // Verify header/footer still render on 404
  const hasHeader = await page.$('header');
  const hasFooter = await page.$('footer');
  if (!hasHeader || !hasFooter) {
    issues.push({
      type: '404',
      severity: 'P2',
      message: `404 page missing layout: header=${!!hasHeader}, footer=${!!hasFooter}`,
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
    const secondLang = langOptions[1];
    const langText = await secondLang.textContent();
    await secondLang.click();
    await page.waitForTimeout(2000);

    const newUrl = page.url();
    // Check URL changed (e.g., /de/about or /fr/about)
    const langSwitched = newUrl !== `${BASE_URL}${pagePath}`;

    results.langSwitcher = {
      found: true,
      optionCount: langOptions.length,
      switchedTo: langText.trim(),
      switchedUrl: newUrl,
      urlChanged: langSwitched,
    };

    if (!langSwitched) {
      issues.push({
        type: 'lang-switcher',
        severity: 'P2',
        message: `Language switcher clicked "${langText.trim()}" but URL did not change`,
      });
    }

    // Go back to original
    await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
  }
}
```

## Per-Page Result Format

After testing each page, log results in this structure:

```
Page 3/8 tested: /about
  Desktop:
    Screenshot: ✓
    Console errors: 0
    Network errors: 0
    Menu navigation: 5/5 links work ✓
      ✓ "Home" → /
      ✓ "About" → /about
      ✓ "Services" → /services
      ✓ "Blog" → /blog
      ✓ "Contact" → /contact
    Buttons: 3/3 clickable ✓
    Internal links: 12/12 resolve ✓
  Tablet:
    Screenshot: ✓
    Hamburger menu: found ✓, 5 items visible
  Mobile:
    Screenshot: ✓
    Hamburger menu:
      ✓ Opens on click
      ✓ Shows 5 menu items
      ✓ "Home" → / navigates correctly
      ✓ "About" → /about navigates correctly
      ✓ "Services" → /services navigates correctly
      ✓ "Blog" → /blog navigates correctly
      ✓ "Contact" → /contact navigates correctly
      ✓ Closes on toggle
    Buttons: 2/2 clickable ✓
  Issues: 0
  Status: PASS ✓
```

## Rules
- **Test ONE page completely before moving to the next** — do NOT batch all pages
- **Click EVERY menu link** — both desktop and mobile, verify each one navigates correctly
- **Click EVERY button** — verify no console errors, no crashes
- **Test ALL internal links** — verify none return 500 or are broken
- **Console errors are P1** — fix before visual issues
- **Broken menu navigation is P1** — users can't navigate the site
- **Mobile menu failures are P1** — mobile users can't navigate
- **Take screenshots at every viewport even if interactive tests fail** — we need visuals for comparison
- **If a page fails to load entirely (500/timeout), log it as critical and continue to next page** — don't stop the whole test
- **After all pages tested, print a summary** showing pass/fail per page with menu/button/link counts
