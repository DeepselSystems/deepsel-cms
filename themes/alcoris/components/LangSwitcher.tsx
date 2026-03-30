import { useLanguage } from "@deepsel/cms-react";

export default function LangSwitcher() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  if (!availableLanguages || availableLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-1 text-sm rounded border border-gray-200 hover:bg-gray-50"
      >
        <span>{language?.toUpperCase()}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="absolute right-0 mt-0 hidden min-w-[120px] rounded bg-white py-1 border border-gray-200 shadow-lg group-hover:block z-20">
        <ul className="flex flex-col">
          {availableLanguages
            .filter((lang: any) => lang.iso_code !== language)
            .map((lang: any) => (
              <li key={lang.iso_code} className="w-full">
                <button
                  type="button"
                  onClick={() => setLanguage(lang.iso_code)}
                  className="w-full text-left px-3 py-1 text-sm hover:bg-gray-50"
                >
                  {lang.iso_code.toUpperCase()}
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
