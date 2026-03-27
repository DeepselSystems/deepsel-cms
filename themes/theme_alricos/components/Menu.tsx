import { useState } from "react";
import { useWebsiteData } from "@deepsel/cms-react";
import { isActiveMenu, type MenuItem } from "@deepsel/cms-utils";
import LangSwitcher from "./LangSwitcher";
import logoSrc from "../assets/images/homepage-image-001.png";

const logo = typeof logoSrc === "string" ? logoSrc : (logoSrc as any).src;

export const designMenuItems: MenuItem[] = [
  { id: 1, title: "Finanz- und Rechnungswesen", url: "/finance", children: [], position: 0, open_in_new_tab: false },
  { id: 2, title: "Unternehmensberatung", url: "/unternehmensberatung", children: [], position: 1, open_in_new_tab: false },
  { id: 3, title: "Steuerberatung", url: "/steuerberatung", children: [], position: 2, open_in_new_tab: false },
  { id: 4, title: "Personaladministration", url: "/personaladministration", children: [], position: 3, open_in_new_tab: false },
];

export default function Header() {
  const { websiteData } = useWebsiteData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menus = websiteData?.settings?.menus?.length
    ? websiteData.settings.menus
    : designMenuItems;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-6 lg:px-[96px] py-[12px]">
        {/* Logo */}
        <a href="/" className="flex-shrink-0">
          <img src={logo} alt="alcoris" className="h-[36px] w-auto" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-[24px]">
          {menus.map((menu) => {
            const active = isActiveMenu(menu, websiteData);
            return (
              <a
                key={menu.id}
                href={menu.url || "#"}
                className={`text-[14px] tracking-[-0.16px] leading-[26px] py-[8px] transition-colors ${
                  active
                    ? "font-semibold text-[rgba(62,105,220,1)] border-b border-[rgba(62,105,220,1)]"
                    : "font-medium text-[rgba(9,20,35,1)] hover:text-[rgba(62,105,220,1)]"
                }`}
              >
                {menu.title}
              </a>
            );
          })}
        </nav>

        {/* Right side: lang switcher + Kontakt button (desktop) */}
        <div className="hidden lg:flex items-center gap-4">
          <LangSwitcher />
          <a
            href="/kontakt"
            className="bg-[rgba(62,105,220,1)] hover:bg-[rgba(52,90,190,1)] transition-colors rounded-[50px] px-6 py-[12px] text-white text-[14px] font-bold leading-[26px] tracking-[-0.16px]"
          >
            Kontakt
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-[2px] bg-[rgba(9,20,35,1)] transition-transform duration-300 ${
              mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`block w-6 h-[2px] bg-[rgba(9,20,35,1)] transition-opacity duration-300 ${
              mobileMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-6 h-[2px] bg-[rgba(9,20,35,1)] transition-transform duration-300 ${
              mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[60px] z-40 bg-white">
          <nav className="flex flex-col px-6 py-8 gap-2">
            {menus.map((menu) => {
              const active = isActiveMenu(menu, websiteData);
              return (
                <a
                  key={menu.id}
                  href={menu.url || "#"}
                  className={`text-[16px] tracking-[-0.16px] leading-[26px] py-[12px] border-b border-gray-100 ${
                    active
                      ? "font-semibold text-[rgba(62,105,220,1)]"
                      : "font-medium text-[rgba(9,20,35,1)]"
                  }`}
                >
                  {menu.title}
                </a>
              );
            })}
            <a
              href="/kontakt"
              className="mt-4 bg-[rgba(62,105,220,1)] rounded-[50px] px-6 py-[12px] text-white text-[14px] font-bold leading-[26px] tracking-[-0.16px] text-center"
            >
              Kontakt
            </a>
            <div className="mt-4">
              <LangSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

