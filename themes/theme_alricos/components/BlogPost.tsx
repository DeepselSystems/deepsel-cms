import { WebsiteDataProvider, useWebsiteData } from "@deepsel/cms-react";
import { WebsiteDataTypes } from "@deepsel/cms-utils";
import type { BlogPostData } from "@deepsel/cms-utils";
import Footer from "./Footer";
import Header from "./Menu";

export default function BlogPost({ data }: { data: BlogPostData }) {
  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.BlogPost, data: data }}>
      <BlogPostContent />
    </WebsiteDataProvider>
  );
}

function BlogPostContent() {
  const { websiteData } = useWebsiteData();
  const post = websiteData.data as BlogPostData;
  const heroImage = post?.featured_image_name
    ? `/api/v1/attachment/serve/${post.featured_image_name}`
    : null;

  return (
    <main className="min-h-screen flex flex-col justify-between bg-white">
      <Header />

      <div
        className="relative flex flex-col justify-center items-center bg-cover bg-center h-[300px] lg:h-[450px]"
        style={heroImage ? {
          backgroundImage: `linear-gradient(rgba(1,29,102,0.7), rgba(1,29,102,0.7)), url(${heroImage})`,
        } : { backgroundColor: 'rgba(1,29,102,1)' }}
      >
        <h1 className="text-[28px] lg:text-[50px] font-bold text-white text-center px-6 max-w-[800px]">
          {post?.title}
        </h1>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-[40px] lg:py-[80px]">
        {post?.author && (
          <div className="flex items-center gap-3 mb-6">
            {post.author.image && (
              <img
                src={`/api/v1/attachment/serve/${post.author.image}`}
                alt={post.author.display_name || post.author.username}
                className="w-10 h-10 rounded-full"
              />
            )}
            <span className="font-semibold text-[rgba(9,20,35,1)]">
              {post.author.display_name || post.author.username}
            </span>
          </div>
        )}
        {post?.publish_date && (
          <time dateTime={post.publish_date} className="text-sm text-[rgba(9,20,35,0.5)] mb-8 block">
            {new Date(post.publish_date).toLocaleDateString()}
          </time>
        )}
        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: post?.content || "" }}
        />
      </div>

      <Footer />
    </main>
  );
}
