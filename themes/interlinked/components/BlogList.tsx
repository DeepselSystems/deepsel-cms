import { usePageData } from "@deepsel/cms-react";
import type { BlogPostListItem } from "@deepsel/cms-utils";

export default function BlogList() {
  const { pageData } = usePageData();

  if (!pageData) {
    return null;
  }

  const blogPosts = pageData.blog_posts || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      
      {blogPosts.length === 0 ? (
        <p className="text-gray-600">No blog posts available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post: BlogPostListItem) => (
            <article
              key={post.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {post.featured_image_id && (
                <div className="aspect-video bg-gray-200">
                  <img
                    src={`/api/attachment/${post.featured_image_id}`}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-2">
                  <a
                    href={`/blog${post.slug}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {post.title}
                  </a>
                </h2>
                
                {post.excerpt && (
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    {post.author && (
                      <>
                        {post.author.image && (
                          <img
                            src={`/api/attachment/${post.author.image}`}
                            alt={post.author.display_name || post.author.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span>{post.author.display_name || post.author.username}</span>
                      </>
                    )}
                  </div>
                  
                  {post.publish_date && (
                    <time dateTime={post.publish_date}>
                      {new Date(post.publish_date).toLocaleDateString()}
                    </time>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
