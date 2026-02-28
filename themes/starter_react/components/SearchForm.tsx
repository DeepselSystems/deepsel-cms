import { useState } from "react";
import { useWebsiteData } from "@deepsel/cms-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const { websiteData } = useWebsiteData();

  const currentLang = (websiteData.data as any)?.lang;
  const defaultLang = websiteData.data?.public_settings?.default_language?.iso_code;
  const isNonDefaultLang = currentLang && defaultLang && currentLang !== defaultLang;
  const langPrefix = isNonDefaultLang ? `/${currentLang}` : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    window.location.href = `${langPrefix}/search?q=${encodeURIComponent(query.trim())}`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-32 lg:w-48 px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
        </button>
      </div>
    </form>
  );
}
