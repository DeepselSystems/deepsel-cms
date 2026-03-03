# Phase 4g: Convert Blog Components

## Goal
Implement `BlogList.tsx` and `BlogPost.tsx` matching the Figma design.

## Input
- Screenshots of blog list and blog post pages (if present in Figma)
- If no blog frames in Figma: use a clean design consistent with the rest of the theme
- `$MIGRATION_DIR/design-map.md`

## BlogList.tsx Pattern

```tsx
import { WebsiteDataProvider, useWebsiteData } from '@deepsel/cms-react';
import type { BlogListData } from '@deepsel/cms-utils';
import { Pagination } from '@mantine/core';
import Menu from './Menu';
import Footer from './Footer';
import LangSwitcher from './LangSwitcher';

interface Props {
  pageData: BlogListData;
}

export default function BlogList({ pageData }: Props) {
  return (
    <WebsiteDataProvider pageData={pageData}>
      <div className="min-h-screen flex flex-col">
        <header>{/* Header matching Page.tsx */}<Menu /></header>
        <main className="flex-1">
          <BlogListContent />
        </main>
        <Footer />
      </div>
      <LangSwitcher />
    </WebsiteDataProvider>
  );
}

function BlogListContent() {
  const { websiteData } = useWebsiteData();
  const data = websiteData as BlogListData;
  const posts = data.blog_posts || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      {/* Hero/title area */}
      <div className="mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Blog</h1>
        <p className="mt-2 text-lg text-gray-600">Latest articles and updates</p>
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post) => (
          <a key={post.id} href={`/blog${post.slug}`} className="group">
            <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Featured image */}
              {post.featured_image_name && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={`/api/v1/attachment/serve/${post.featured_image_name}`}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-6">
                {post.publish_date && (
                  <time className="text-sm text-gray-500">
                    {new Date(post.publish_date).toLocaleDateString()}
                  </time>
                )}
                <h2 className="mt-2 text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {post.title}
                </h2>
              </div>
            </article>
          </a>
        ))}
      </div>

      {/* Pagination */}
      {data.total_pages > 1 && (
        <div className="mt-12 flex justify-center">
          <Pagination
            total={data.total_pages}
            value={data.page}
            onChange={(page) => {
              window.location.href = `?page=${page}`;
            }}
          />
        </div>
      )}
    </div>
  );
}
```

## BlogPost.tsx Pattern

```tsx
import { WebsiteDataProvider, ContentRenderer, useWebsiteData } from '@deepsel/cms-react';
import type { BlogPostData } from '@deepsel/cms-utils';
import Menu from './Menu';
import Footer from './Footer';
import LangSwitcher from './LangSwitcher';

interface Props {
  pageData: BlogPostData;
}

export default function BlogPost({ pageData }: Props) {
  return (
    <WebsiteDataProvider
      pageData={pageData}
      languageAlternatives={pageData.language_alternatives}
    >
      <div className="min-h-screen flex flex-col">
        <header>{/* Header matching Page.tsx */}<Menu /></header>
        <main className="flex-1">
          <BlogPostContent />
        </main>
        <Footer />
      </div>
      <LangSwitcher />
    </WebsiteDataProvider>
  );
}

function BlogPostContent() {
  const { websiteData } = useWebsiteData();
  const data = websiteData as BlogPostData;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      {/* Featured image */}
      {data.featured_image_name && (
        <div className="aspect-video rounded-xl overflow-hidden mb-8">
          <img
            src={`/api/v1/attachment/serve/${data.featured_image_name}`}
            alt={data.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        {data.author && <span>By {data.author}</span>}
        {data.publish_date && (
          <time>{new Date(data.publish_date).toLocaleDateString()}</time>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
        {data.title}
      </h1>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <ContentRenderer />
      </div>

      {/* Back link */}
      <div className="mt-12 pt-8 border-t">
        <a href="/blog" className="text-primary-600 hover:text-primary-700 font-medium">
          &larr; Back to Blog
        </a>
      </div>
    </article>
  );
}
```

## Rules
- Blog components MUST share the same header/footer as Page.tsx for visual consistency
- If Figma has a specific blog design, match it exactly
- If Figma has no blog design, create a clean layout consistent with the theme's style
- Use `prose` class from Tailwind Typography for blog content
- Always handle missing featured images gracefully
- Blog post links: always use `/blog${post.slug}` format
- Pagination: always use Mantine `<Pagination>` component

## Responsive Rules
- Blog grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Blog post: max-width `max-w-3xl` centered
- Featured image: `aspect-video` on both list and post
- Reduce padding on mobile

## Checklist
- [ ] BlogList renders posts in a grid
- [ ] Blog post cards have featured image, date, title
- [ ] Cards link to `/blog${post.slug}`
- [ ] Pagination works with Mantine component
- [ ] BlogPost renders full article with ContentRenderer
- [ ] Featured image, author, date displayed
- [ ] Back to blog link present
- [ ] Same header/footer as main pages
- [ ] Responsive layout works
