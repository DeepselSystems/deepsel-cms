import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import WebsiteHeader from '../components/website/WebsiteHeader.jsx';
import WebsiteFooter from '../components/website/WebsiteFooter.jsx';
import { Pagination } from '@mantine/core';
import useAuthentication from '../common/api/useAuthentication.js';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';
import { lazy, Suspense } from 'react';
import BlogCard from './BlogCard.jsx';
import BackendHostURLState from '../common/stores/BackendHostURLState.js';
import { apiRequest } from '../utils/apiUtils.js';
import CustomCodeRenderer from '../components/website/CustomCodeRenderer.jsx';
import CustomCodeErrorBoundary from '../components/website/CustomCodeErrorBoundary.jsx';

// Lazy load the AdminHeader component
const AdminHeader = lazy(() => import('../components/website/AdminHeader.jsx'));

export default function WebsiteBlogList(props) {
  const { initialPageData, isPreviewMode, siteSettings } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 9; // 9 posts per page
  const { user } = useAuthentication();
  const { i18n } = useTranslation();
  const { backendHost } = BackendHostURLState();

  // State for client-side data fetching (when no server data available)
  const [clientPosts, setClientPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if we have server-side data
  const hasServerData = initialPageData && initialPageData.posts;

  // Fetch data client-side if no server data available
  useEffect(() => {
    const fetchClientSideData = async () => {
      if (hasServerData || !backendHost) return;

      setLoading(true);
      setError(null);

      try {
        const currentLang = i18n.language || 'en';

        // Prepare headers with authentication if user is logged in
        const headers = {};
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }

        const response = await apiRequest(`${backendHost}/blog_post/website/${currentLang}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setClientPosts(data);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError(err.message);
        setClientPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClientSideData();
  }, [hasServerData, backendHost, i18n.language, user?.token]);

  // Use server data if available, otherwise use client data
  const rawPosts = hasServerData ? initialPageData.posts : clientPosts;

  // Transform data to expected format for BlogCard component
  const transformedPosts = rawPosts.map((post) => ({
    id: post.id,
    slug: post.slug,
    publish_date: post.publish_date,
    author: post.author,
    contents: [
      {
        title: post.title,
        subtitle: post.excerpt,
        featured_image: post.featured_image_id
          ? {
              id: post.featured_image_id,
              name: `${post.featured_image_id}`, // Will be resolved by getAttachmentUrl
            }
          : null,
        featured_image_id: post.featured_image_id,
        locale: {
          iso_code: post.lang,
        },
      },
    ],
  }));

  const allPosts = transformedPosts;
  const total = allPosts.length;

  // Apply client-side pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const posts = allPosts.slice(startIndex, endIndex);

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
  };

  return (
    <>
      <Helmet>
        <title>News</title>
      </Helmet>
      <main className="min-h-screen flex flex-col">
        {user && (
          <Suspense fallback={<div className="bg-gray-100 shadow-lg py-2"></div>}>
            <AdminHeader dashboardPath={'/admin/blog_posts'} />
          </Suspense>
        )}

        <WebsiteHeader />

        <div className="flex-grow container mx-auto px-4 py-8 max-w-screen-lg">
          <div className="typography">
            <h1 className=" mb-8 text-center">What&apos;s new</h1>
          </div>

          {loading && (
            <div className="text-center py-8">
              <p>Loading blog posts...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              <p>Error loading blog posts: {error}</p>
            </div>
          )}

          {/* Blog post grid with variable columns per row */}
          {!loading && !error && (
            <div className="grid gap-8">
              {/* First row: 1 card */}
              {posts && posts.length > 0 && (
                <div className="mb-8">
                  <BlogCard post={posts[0]} size="lg" />
                </div>
              )}

              {/* Second row: 2 cards */}
              {posts && posts.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {posts.slice(1, 3).map((post) => (
                    <BlogCard post={post} size="md" key={post.id} />
                  ))}
                </div>
              )}

              {/* Third row: 3 cards */}
              {posts && posts.length > 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  {posts.slice(3, 6).map((post) => (
                    <BlogCard post={post} size="sm" key={post.id} />
                  ))}
                </div>
              )}

              {/* Remaining rows: 3 cards per row */}
              {posts && posts.length > 6 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {posts.slice(6).map((post) => (
                    <BlogCard post={post} size="sm" key={post.id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex justify-center mt-12">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={handlePageChange}
                radius="md"
                withEdges
              />
            </div>
          )}

          {/* Custom Code Injection after content - Site-wide only for blog list */}
          <CustomCodeErrorBoundary>
            <CustomCodeRenderer pageData={null} contentData={null} type="blog_list" />
          </CustomCodeErrorBoundary>
        </div>

        <WebsiteFooter />
      </main>
    </>
  );
}
