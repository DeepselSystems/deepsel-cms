import { WebsiteDataProvider } from "@deepsel/cms-react";
import { WebsiteDataTypes } from "@deepsel/cms-utils";
import type { BlogListData, BlogPostListItem } from "@deepsel/cms-utils";
import { Pagination , MantineProvider} from '@mantine/core';
import Footer from "./Footer";
import hero from '../assets/images/hero.jpg';
import Menu from "./Menu";
import LangSwitcher from "./LangSwitcher";
import '@mantine/core/styles.css';

export default function BlogList({ data }: { data: BlogListData }) {

  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.BlogList, data: data }}>
      <main className="min-h-screen flex flex-col justify-between">
        <div className="relative flex flex-col justify-center items-center bg-cover bg-center h-[450px] pt-4" style={{ backgroundImage: `url(${hero.src})` }}>
          <header className="absolute top-10 shadow px-3 max-w-7xl mx-auto rounded-lg  z-50 backdrop-blur bg-white/90">
            <div className="flex justify-between items-center gap-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-2 text-2xl font-bold">
                React Starter Theme
              </div>
              <div className="flex items-center gap-6">
                <Menu />
                <LangSwitcher />
              </div>
            </div>
          </header>
          {/* <img src={hero2.src} alt="Hero" /> */}
          <h1 className="absolute bottom-[-60px] text-5xl font-bold mb-8 bg-white shadow-lg rounded-lg px-20 pt-2 pb-3">Blog</h1>
        </div>

        <div className="max-w-7xl mx-auto flex gap-4 pt-4">
          <div className="max-w-7xl mx-auto px-4 py-10">
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
        </div>

        <div className="flex justify-center">
          <MantineProvider>
            <Pagination total={data.total_pages} onChange={(page) => {
              console.log({page});
              window.history.pushState(null, '', `/blog/page/${page}`);
            }} />
          </MantineProvider>
        </div>

        <Footer />
      </main>
    </WebsiteDataProvider>
  );
}
