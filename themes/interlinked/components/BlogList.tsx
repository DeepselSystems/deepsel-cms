import { WebsiteDataProvider } from "@deepsel/cms-react";
import { WebsiteDataTypes } from "@deepsel/cms-utils";
import type { BlogListData, BlogPostListItem } from "@deepsel/cms-utils";
import Header from "./Header";
import Footer from "./Footer";

export default function BlogList({ data }: { data: BlogListData }) {

  return (
    <WebsiteDataProvider websiteData={{type: WebsiteDataTypes.BlogList, data: data}}>
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-8">Blog</h1>

        {data.blog_posts?.length === 0 ? (
          <p className="text-gray-600">No blog posts available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.blog_posts?.map((post: BlogPostListItem) => (
              <a
                key={post.id}
                href={`/blog${post.slug}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {post.featured_image_name && (
                  <div className="aspect-video bg-gray-200">
                    <img
                      src={`/api/v1/attachment/serve/${post.featured_image_name}`}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-2">
                    {post.title}
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
                              src={`/api/v1/attachment/serve/${post.author.image}`}
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
              </a>
            ))}
          </div>
        )}
      </div>
      <Footer/>
    </WebsiteDataProvider>
  );
}
