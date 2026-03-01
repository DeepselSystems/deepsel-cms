import { WebsiteDataProvider, useWebsiteData } from "@deepsel/cms-react";
import { WebsiteDataTypes } from "@deepsel/cms-utils";
import type { BlogPostData } from "@deepsel/cms-utils";
import Footer from "./Footer";
import Menu from "./Menu";
import LangSwitcher from "./LangSwitcher";
import SearchForm from "./SearchForm";
import hero from "../assets/images/hero.jpg";

export default function BlogPost({ data }: { data: BlogPostData }) {
  return (
    <WebsiteDataProvider
      websiteData={{ type: WebsiteDataTypes.BlogPost, data: data }}
    >
      <BlogPostContent />
    </WebsiteDataProvider>
  );
}

function BlogPostContent() {
  const { websiteData } = useWebsiteData();
  const post = websiteData.data as BlogPostData;
  const heroImage = post?.featured_image_name
    ? `/api/v1/attachment/serve/${post.featured_image_name}`
    : hero.src;

  return (
    <main className="min-h-screen flex flex-col justify-between items-stretch">
      <div
        className="relative flex flex-col justify-center items-center bg-cover bg-center h-[500px] pt-4"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage})`,
        }}
      >
        <header className="absolute top-10 shadow px-3 max-w-7xl mx-auto rounded-lg  z-50 backdrop-blur bg-white/90">
          <div className="flex justify-between items-center gap-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-2xl font-bold">
              React Starter Theme
            </div>
            <div className="flex items-center gap-6">
              <Menu />
              <SearchForm />
              <LangSwitcher />
            </div>
          </div>
        </header>
        <h1 className="text-4xl font-bold mb-8 shadow rounded-lg px-10 pt-2 pb-3 text-white">
          {post?.title}
        </h1>
      </div>

      <div className="flex flex-col gap-4 pb-4">
        <div className="min-w-screen flex justify-center px-2 md:px-4 mt-4">
          <div className="grow max-w-[1024px]">
            {post?.author && (
              <div className="flex items-center gap-2">
                {post.author.image && (
                  <img
                    src={`/api/v1/attachment/serve/${post.author.image}`}
                    alt={post.author.display_name || post.author.username}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <span className="font-medium">
                  {post.author.display_name || post.author.username}
                </span>
              </div>
            )}

            {post?.publish_date && (
              <time
                dateTime={post.publish_date}
                className="text-sm text-gray-600"
              >
                {new Date(post.publish_date).toLocaleDateString()}
              </time>
            )}
          </div>
        </div>

        <div className="min-w-screen flex justify-center px-2 md:px-4">
          <article
            className="prose prose-lg grow max-w-[1024px]"
            dangerouslySetInnerHTML={{ __html: post?.content || "" }}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
}
