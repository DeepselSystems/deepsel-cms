import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";
import { useLanguage } from "@deepsel/cms-react";

export default function LangSwitcher() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  console.log({ language, availableLanguages });

  if (availableLanguages?.length === 1) {
    return null;
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-1 text-sm rounded border border-primary-200 hover:bg-primary-100"
      >
        <span>{language?.toUpperCase()}</span>
        <FontAwesomeIcon icon={faCaretDown} className="text-xs" />
      </button>

      <div className="absolute right-0 mt-0 hidden min-w-[120px] rounded bg-white py-1 border border-primary-200 shadow-lg group-hover:block z-20">
        <ul className="flex flex-col">
          {availableLanguages
            .filter((lang: any) => lang.iso_code !== language)
            .map((lang: any) => (
              <li key={lang.iso_code} className="w-full">
                <button
                  type="button"
                  onClick={() => setLanguage(lang.iso_code)}
                  className={`w-full text-left px-3 py-1 text-sm hover:bg-primary-100 ${
                    lang.iso_code === language
                      ? "bg-primary-50 font-semibold"
                      : ""
                  }`}
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
