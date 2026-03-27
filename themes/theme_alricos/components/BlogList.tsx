import { useState, useEffect } from "react";
import { WebsiteDataProvider, useWebsiteData } from "@deepsel/cms-react";
import { WebsiteDataTypes } from "@deepsel/cms-utils";
import type { BlogListData, BlogPostListItem } from "@deepsel/cms-utils";
import Header from "./Menu";

function ClientPagination({ totalPages }: { totalPages: number }) {
  const [mounted, setMounted] = useState(false);
  const [Mantine, setMantine] = useState<{ Pagination: any; MantineProvider: any } | null>(null);

  useEffect(() => {
    setMounted(true);
    import('@mantine/core').then((mod) => {
      import('@mantine/core/styles.css');
      setMantine({ Pagination: mod.Pagination, MantineProvider: mod.MantineProvider });
    });
  }, []);

  if (!mounted || !Mantine) return null;

  return (
    <Mantine.MantineProvider>
      <Mantine.Pagination
        total={totalPages}
        onChange={(page: number) => {
          window.location.href = `/blog/page/${page}`;
        }}
      />
    </Mantine.MantineProvider>
  );
}

export default function BlogList({ data }: { data: BlogListData }) {
  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.BlogList, data: data }}>
      <BlogListContent />
    </WebsiteDataProvider>
  );
}

function BlogListContent() {
  const { websiteData } = useWebsiteData();
  const blogData = websiteData.data as BlogListData;

  return (
    <>
      <Header />

      {/* Hero */}
      <div className="relative flex flex-col justify-center items-center bg-[rgba(1,29,102,1)] h-[300px] lg:h-[450px]">
        <h1 className="text-[40px] lg:text-[72px] font-bold text-white">Blog</h1>
      </div>

      {/* Blog Grid */}
      <div className="max-w-[1248px] mx-auto px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        {blogData?.blog_posts?.length === 0 ? (
          <p className="text-[rgba(9,20,35,1)]">No blog posts available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogData?.blog_posts?.map((post: BlogPostListItem) => (
              <a
                key={post.id}
                href={`/blog${post.slug}`}
                className="bg-white rounded-[16px] shadow-md overflow-hidden hover:shadow-lg transition-shadow"
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
                  <h2 className="text-[20px] font-bold mb-2 text-[rgba(9,20,35,1)]">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-[14px] text-[rgba(9,20,35,0.7)] mb-4 line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-[rgba(9,20,35,0.5)]">
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

      {blogData?.total_pages > 1 && (
        <div className="flex justify-center mb-6">
          <ClientPagination totalPages={blogData.total_pages} />
        </div>
      )}

    </>
  );
}
