import {useState, useEffect} from 'react';
import {useParams, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {Avatar} from '@mantine/core';
import WebsiteHeader from '../components/website/WebsiteHeader.jsx';
import WebsiteFooter from '../components/website/WebsiteFooter.jsx';
import SitePublicSettingsState from '../common/stores/SitePublicSettingsState.js';
import BackendHostURLState from '../common/stores/BackendHostURLState.js';
import {getAttachmentUrl} from '../common/utils/index.js';
import useAuthentication from '../common/api/useAuthentication.js';
import {Helmet} from 'react-helmet';
import RichTextRenderer from '../common/ui/RichTextRenderer.jsx';
import {lazy, Suspense} from 'react';
import {apiRequest} from '../utils/apiUtils.js';
import CustomCodeRenderer from '../components/website/CustomCodeRenderer.jsx';
import CustomCodeErrorBoundary from '../components/website/CustomCodeErrorBoundary.jsx';
import {useProtectedAuth} from '../common/auth/ProtectedAuth.jsx';
import SpecialTemplateRenderer from '../components/website/SpecialTemplateRenderer.jsx';

// Lazy load the AdminHeader component
const AdminHeader = lazy(() => import('../components/website/AdminHeader.jsx'));

export default function WebsiteBlogPost(props) {
  const {initialPageData, isPreviewMode, siteSettings} = props;
  const {slug} = useParams();
  const {settings} = SitePublicSettingsState();
  const {backendHost} = BackendHostURLState();
  const {user} = useAuthentication();
  const {t, i18n} = useTranslation();
  const {setRequiresLogin} = useProtectedAuth();

  // State for client-side data fetching (when no server data available)
  const [clientBlogPost, setClientBlogPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const location = useLocation();

  const actualSiteSettings = siteSettings || settings;

  // Check if we have server-side data that matches current slug
  const hasServerData =
    initialPageData &&
    !initialPageData.notFound &&
    initialPageData.id &&
    initialPageData.slug === slug;

  // Fetch data client-side if no server data available
  useEffect(() => {
    const fetchClientSideData = async () => {
      if (hasServerData || !slug || !backendHost) return;

      setLoading(true);
      setNotFound(false);

      try {
        // Use the same language resolution as server-side
        const currentLang =
          i18n.language ||
          actualSiteSettings?.default_language?.iso_code ||
          'en';

        // Prepare headers with authentication if user is logged in
        const headers = {};
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }

        // Format the slug properly - remove /blog/ prefix if present
        const formattedSlug = slug
          .replace(/^\/blog\//, '')
          .replace(/^blog\//, '');

        const response = await apiRequest(
          `${backendHost}/blog_post/website/${currentLang}/${formattedSlug}`,
          {
            method: 'GET',
            headers,
          }
        );

        if (response.status === 401) {
          // Authentication required - signal to ProtectedAuth
          setRequiresLogin(true);
          return;
        }

        if (response.status === 404) {
          setNotFound(true);
          setClientBlogPost(null);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setClientBlogPost(data);
        setNotFound(false);
      } catch (err) {
        console.error('Error fetching blog post:', err);
        setNotFound(true);
        setClientBlogPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClientSideData();
  }, [hasServerData, slug, backendHost, i18n.language, user?.token]);

  // Use server data if available, otherwise use client data
  const blogPostData = hasServerData ? initialPageData : clientBlogPost;

  // Check if blog post requires login and signal to ProtectedAuth
  useEffect(() => {
    if (blogPostData && blogPostData.require_login && !user) {
      setRequiresLogin(true);
    }
  }, [blogPostData, user, setRequiresLogin]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = document.querySelector('main');
    if (!container) return;

    const clearHighlights = (root) => {
      const highlights = root.querySelectorAll('.search-highlight');
      highlights.forEach((highlight) => {
        const parentNode = highlight.parentNode;
        if (!parentNode) return;
        parentNode.replaceChild(
          document.createTextNode(highlight.textContent),
          highlight
        );
        parentNode.normalize();
      });
    };

    const params = new URLSearchParams(location.search);
    const keyword = params.get('search')?.trim() || '';

    if (!keyword) {
      clearHighlights(container);
      return;
    }

    const highlightMatches = (root, term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!escaped) return null;

      const regex = new RegExp(escaped, 'gi');
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      let firstHighlight = null;
      textNodes.forEach((node) => {
        const parentElement = node.parentElement;
        if (
          !node.textContent ||
          (parentElement &&
            ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parentElement.tagName)) ||
          parentElement?.classList?.contains('search-highlight')
        ) {
          return;
        }

        const matches = [...node.textContent.matchAll(regex)];
        if (!matches.length) return;

        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        matches.forEach((match) => {
          const {index} = match;
          if (index > lastIndex) {
            fragment.appendChild(
              document.createTextNode(node.textContent.slice(lastIndex, index))
            );
          }

          const highlight = document.createElement('mark');
          highlight.className = 'search-highlight';
          highlight.textContent = node.textContent.slice(
            index,
            index + match[0].length
          );
          fragment.appendChild(highlight);

          if (!firstHighlight) {
            firstHighlight = highlight;
          }

          lastIndex = index + match[0].length;
        });

        if (lastIndex < node.textContent.length) {
          fragment.appendChild(
            document.createTextNode(node.textContent.slice(lastIndex))
          );
        }

        node.parentNode.replaceChild(fragment, node);
      });

      return firstHighlight;
    };

    let animationFrame;
    let scrollTimeout;
    animationFrame = window.requestAnimationFrame(() => {
      clearHighlights(container);
      const firstMatch = highlightMatches(container, keyword);
      if (firstMatch) {
        scrollTimeout = window.setTimeout(() => {
          firstMatch.scrollIntoView({behavior: 'smooth', block: 'center'});
        }, 400);
      }
    });

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout);
      }

      clearHighlights(container);
    };
  }, [location.search, blogPostData]);

  // Show loading state for client-side fetching
  if (!hasServerData && loading) {
    return (
      <>
        <main className="min-h-screen flex flex-col">
          <WebsiteHeader />
          <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
            <div className="text-center py-8">
              <p>Loading blog post...</p>
            </div>
          </div>
          <WebsiteFooter />
        </main>
      </>
    );
  }

  // Show 404 if no blog post data
  if (!blogPostData || blogPostData.notFound || notFound) {
    return (
      <SpecialTemplateRenderer
        templateKey="not_found"
        siteSettingsOverride={actualSiteSettings}
      />
    );
  }

  // Transform blog post data to expected format (if needed)
  const blogPost = blogPostData.contents
    ? blogPostData
    : {
        id: blogPostData.id,
        author: blogPostData.author,
        publish_date: blogPostData.publish_date,
        blog_post_custom_code: blogPostData.blog_post_custom_code,
        contents: [
          {
            title: blogPostData.title,
            subtitle: null,
            content: blogPostData.content,
            featured_image_id: blogPostData.featured_image_id,
            locale: {iso_code: blogPostData.lang},
            custom_code: blogPostData.custom_code,
          },
        ],
      };

  const allowEdit =
    !user?.roles.some((role) => role.string_id === 'website_author_role') ||
    (user?.roles.some((role) => role.string_id === 'website_author_role') &&
      !user?.roles.some((role) =>
        [
          'admin_role',
          'super_admin_role',
          'website_admin_role',
          'website_editor_role',
        ].includes(role.string_id)
      ) &&
      blogPost?.owner_id === user?.id);

  // Get the first (and only) content from the transformed post
  const postContent = blogPost?.contents?.[0];

  return (
    <>
      <Helmet>
        <title>{postContent?.title ? postContent.title : 'Blog Post'}</title>
      </Helmet>
      <main className="min-h-screen flex flex-col">
        {user && blogPost && (
          <Suspense
            fallback={<div className="bg-gray-100 shadow-lg py-2"></div>}
          >
            <AdminHeader
              dashboardPath={'/admin/blog_posts'}
              allowEdit={allowEdit}
              editPath={`/admin/blog_posts/${blogPost.id}/edit`}
            />
          </Suspense>
        )}

        <WebsiteHeader />

        <div className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
          {postContent && (
            <article className="typography mx-auto">
              <h1 className="text-4xl font-bold mb-2">{postContent.title}</h1>

              {postContent.subtitle && (
                <h2 className="text-2xl text-gray-600 mb-4">
                  {postContent.subtitle}
                </h2>
              )}

              <div className="flex items-center gap-3 text-gray-600 text-sm mb-6">
                {/* Show author if enabled in site settings */}
                {actualSiteSettings?.show_post_author && blogPost.author && (
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={
                        blogPost.author.image
                          ? getAttachmentUrl(
                              actualSiteSettings?.backend_host || '',
                              blogPost.author.image.name
                            )
                          : null
                      }
                      size="md"
                      radius="xl"
                      color="blue"
                    >
                      {!blogPost.author.image &&
                        (blogPost.author.name?.[0] ||
                          blogPost.author.username?.[0])}
                    </Avatar>
                    <div>
                      <div className="font-semibold">
                        {blogPost.author.name || blogPost.author.username}
                      </div>
                      {/* Show publication date if enabled in site settings */}
                      {actualSiteSettings?.show_post_date && (
                        <div>
                          {new Date(
                            blogPost.publish_date || blogPost.created_at
                          ).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {postContent.featured_image_id && (
                <div className="mb-6">
                  <img
                    src={getAttachmentUrl(
                      actualSiteSettings?.backend_host || '',
                      postContent.featured_image?.name
                    )}
                    alt={postContent.title}
                    className="w-full h-auto rounded-lg shadow-md"
                  />
                </div>
              )}

              <RichTextRenderer
                content={postContent.content || ''}
                className="blog-content"
              />

              {/* Custom Code Injection after content */}
              <CustomCodeErrorBoundary>
                <CustomCodeRenderer
                  pageData={blogPost}
                  contentData={postContent}
                  type="blog_post"
                />
              </CustomCodeErrorBoundary>
            </article>
          )}
        </div>

        <WebsiteFooter />
      </main>
    </>
  );
}
