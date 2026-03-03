import logoImg from "../assets/images/homepage-image-001.png";

const logoSrc = typeof logoImg === "string" ? logoImg : (logoImg as any).src;

export default function Footer() {
  return (
    <footer className="w-full bg-white px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
      <div className="max-w-[1110px] mx-auto flex flex-col lg:flex-row justify-between gap-[40px] lg:gap-[125px]">
        {/* Left: Logo + Email */}
        <div className="flex flex-col gap-[40px] lg:gap-[81px]">
          <div className="flex items-center">
            <img src={logoSrc} alt="alcoris" className="h-[32px] w-[90px] object-contain" />
          </div>
          <div className="flex flex-col gap-[24px]">
            <span className="text-[20px] font-bold leading-[28px] text-left text-[rgba(9,20,35,1)]">Stay in touch</span>
            <div className="relative w-full lg:w-[430px]">
              <input
                type="email"
                placeholder="Email Address"
                className="w-full text-[16px] font-normal leading-[28px] text-[rgba(118,118,118,1)] bg-transparent border-b border-[rgb(209,209,210)] pb-[12px] pr-[40px] outline-none"
              />
              <button className="absolute right-0 top-[6px]" aria-label="Subscribe">
                <svg width="21" height="6" viewBox="0 0 21 6" fill="none">
                  <path d="M21 3L17.33 0V3V6L21 3Z" fill="rgb(9, 20, 35)" />
                  <path d="M0 2.25H17.33V3.75H0V2.25Z" fill="rgb(9, 20, 35)" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Contact info */}
        <div className="flex flex-col gap-[24px] lg:mr-auto lg:ml-[80px]">
          <p className="text-[12px] font-bold tracking-[2px] leading-[14px] uppercase text-[rgba(9,20,35,1)]">Kontakt</p>
          <div className="flex flex-col gap-[24px]">
            <p className="opacity-70 text-[14px] font-semibold leading-[16px] text-left text-[rgba(26,26,31,1)]">alcoris Treuhand GmbH</p>
            <p className="opacity-70 text-[14px] font-semibold leading-[16px] text-left text-[rgba(26,26,31,1)]">Weststrasse 9, 3005 Bern</p>
            <a href="mailto:office@alcoris.ch" className="opacity-70 text-[14px] font-semibold leading-[16px] text-left underline text-[rgba(26,26,31,1)]">office@alcoris.ch</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
