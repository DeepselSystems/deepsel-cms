import { WebsiteDataProvider, useWebsiteData } from "@deepsel/cms-react";
import { WebsiteDataTypes } from "@deepsel/cms-utils";
import type { SearchResultsData } from "@deepsel/cms-utils";
import Menu from "./Menu";
import LangSwitcher from "./LangSwitcher";
import Footer from "./Footer";
import SearchForm from "./SearchForm";

export default function SearchResults({ data }: { data: SearchResultsData }) {
  return (
    <WebsiteDataProvider websiteData={{ type: WebsiteDataTypes.SearchResults, data }}>
      <SearchResultsContent />
    </WebsiteDataProvider>
  );
}

function SearchResultsContent() {
  const { websiteData } = useWebsiteData();
  const data = websiteData.data as SearchResultsData;

  return (
    <main className="min-h-screen flex flex-col justify-between">
      <header className="shadow px-3 backdrop-blur bg-white/90">
        <div className="flex justify-between items-center gap-6 max-w-7xl mx-auto">
          <a href="/" className="flex items-center gap-2 text-2xl font-bold">
            React Starter Theme
          </a>
          <div className="flex items-center gap-6">
            <Menu />
            <SearchForm />
            <LangSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-8 grow">
        <h1 className="text-2xl font-bold mb-2">
          Search results for &ldquo;{data.query}&rdquo;
        </h1>
        <p className="text-gray-500 mb-6">{data.total} results found</p>

        {data.suggestions?.length > 0 && data.total === 0 && (
          <p className="text-gray-600 mb-4">
            Did you mean:{" "}
            {data.suggestions.map((s, i) => (
              <a
                key={i}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="text-primary-600 hover:underline"
              >
                {s}
                {i < data.suggestions.length - 1 ? ", " : ""}
              </a>
            ))}
          </p>
        )}

        {data.results?.length > 0 ? (
          <div className="flex flex-col gap-4">
            {data.results.map((result) => (
              <a
                key={result.id}
                href={result.url}
                className="block p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {result.contentType}
                  </span>
                  {result.publishDate && (
                    <time className="text-xs text-gray-400">
                      {new Date(result.publishDate).toLocaleDateString()}
                    </time>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-primary-700 hover:text-primary-500">
                  {result.title}
                </h2>
                <p className="text-sm text-gray-500">{result.url}</p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No results found for your search.</p>
        )}
      </div>

      <Footer />
    </main>
  );
}
