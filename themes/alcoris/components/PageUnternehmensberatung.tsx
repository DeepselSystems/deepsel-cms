import { useState } from "react";
import { type PageData } from "@deepsel/cms-utils";
import Layout from "./Layout";
import heroImg from "../assets/images/unternehmensberatung-image-002.png";
import img003 from "../assets/images/unternehmensberatung-image-003.png";
import img004 from "../assets/images/unternehmensberatung-image-004.png";
import img005 from "../assets/images/unternehmensberatung-image-005.png";

const heroSrc = typeof heroImg === "string" ? heroImg : (heroImg as any).src;
const img003Src = typeof img003 === "string" ? img003 : (img003 as any).src;
const img004Src = typeof img004 === "string" ? img004 : (img004 as any).src;
const img005Src = typeof img005 === "string" ? img005 : (img005 as any).src;

function AccordionItem({
  number,
  title,
  children,
  defaultOpen = false,
}: {
  number: string;
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[rgba(255,255,255,0.1)] py-[40px] lg:py-[56px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-[40px] lg:gap-[72px]"
      >
        <span className="text-[12px] font-normal leading-[16px] text-white">
          {number}
        </span>
        <h2 className="flex-1 text-[24px] lg:text-[40px] font-bold leading-[32px] lg:leading-[52px] text-left text-white">
          {title}
        </h2>
        <svg
          className={`w-[30px] h-[30px] transition-transform ${isOpen ? "rotate-45" : ""}`}
          viewBox="0 0 30 30"
          fill="none"
        >
          <path d="M0 30L30 0" stroke="rgba(62,105,220,1)" strokeWidth="2" />
          <path d="M0 0H30" stroke="rgba(62,105,220,1)" strokeWidth="2" />
          <path d="M30 0V30" stroke="rgba(62,105,220,1)" strokeWidth="2" />
        </svg>
      </button>
      {isOpen && children && (
        <div className="pl-[52px] lg:pl-[85px] mt-[32px]">{children}</div>
      )}
    </div>
  );
}

function PageUnternehmensberatungContent() {
  return (
    <div className="w-full">
      {/* ─── Hero Section ─── */}
      <section className="relative w-full h-[500px] md:h-[500px] lg:h-[450px] overflow-hidden">
        <img
          src={heroSrc}
          alt="Unternehmensberatung"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 flex items-center justify-center h-full px-6">
          <h1 className="text-[36px] md:text-[56px] lg:text-[80px] font-bold leading-[1.05] tracking-[-0.02em] text-white text-center">
            Unternehmensberatung
          </h1>
        </div>
      </section>

      {/* ─── Description Section ─── */}
      <section className="w-full px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="w-full max-w-[1440px] mx-auto">
          <p className="text-[20px] md:text-[30px] lg:text-[40px] font-normal leading-[1.4] text-[rgba(9,20,35,1)]">
            Sie wollen ihren Geschäftserfolg nicht dem Zufall überlassen und
            suchen einen Partner, der Sie in allen unternehmerischen Belangen
            kompetent berät? Wir beraten Existenzgründer, Jungunternehmer sowie
            etablierte Unternehmen — praxisnah, ehrlich und lösungsorientiert.
          </p>
        </div>
      </section>

      {/* ─── Three Images Row ─── */}
      <section className="w-full px-6 lg:px-[96px] pb-[40px] lg:pb-[80px]">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[16px] lg:gap-[24px]">
          <img
            src={img003Src}
            alt="Unternehmensberatung"
            className="w-full h-[250px] lg:h-[400px] object-cover rounded-[8px]"
          />
          <img
            src={img004Src}
            alt="Unternehmensberatung"
            className="w-full h-[400px] lg:h-[600px] object-cover rounded-[8px]"
          />
          <img
            src={img005Src}
            alt="Unternehmensberatung"
            className="w-full h-[250px] lg:h-[400px] object-cover rounded-[8px]"
          />
        </div>
      </section>

      {/* ─── Navy CTA + Accordion Section ─── */}
      <section className="w-full bg-[rgba(1,29,102,1)] px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-[40px] lg:gap-[80px]">
          {/* Left CTA */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <p className="text-[12px] font-bold tracking-[2px] leading-[14px] uppercase text-[rgba(62,105,220,1)] mb-[12px]">
              Unternehmensberatung
            </p>
            <h2 className="text-[32px] md:text-[40px] lg:text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-white mb-[24px]">
              Bereit für den nächsten Schritt
            </h2>
            <p className="text-[16px] font-normal leading-[24px] text-white opacity-70 mb-[32px]">
              Ob Jungunternehmer oder etabliertes KMU — wir begleiten Sie bei
              strategischen Entscheidungen, Wachstumsfragen und
              unternehmerischen Herausforderungen. Gemeinsam legen wir den
              Grundstein für nachhaltigen Erfolg.
            </p>
            <a
              href="/kontakt"
              className="inline-block bg-[rgba(62,105,220,1)] hover:bg-[rgba(52,90,190,1)] transition-colors rounded-[50px] px-[32px] py-[14px] text-white text-[14px] font-bold leading-[26px] tracking-[-0.16px]"
            >
              Kontakt
            </a>
          </div>

          {/* Right Accordion */}
          <div className="w-full lg:flex-1">
            <AccordionItem
              number="01"
              title="Unternehmensberatung für künftige Start-ups"
              defaultOpen={true}
            >
              <p className="text-[16px] font-normal leading-[24px] text-white opacity-70">
                Sie möchten ein Unternehmen gründen und brauchen professionelle
                Unterstützung? Wir helfen Ihnen bei der Wahl der richtigen
                Rechtsform, erstellen mit Ihnen den Businessplan, klären die
                notwendigen Versicherungen und unterstützen bei der Beschaffung
                von Fremdkapital. Von der ersten Idee bis zur erfolgreichen
                Gründung stehen wir an Ihrer Seite.
              </p>
            </AccordionItem>
            <AccordionItem
              number="02"
              title="Unternehmensberatung – auch für «alte Hasen»"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PageUnternehmensberatung({ pageData }: { pageData: PageData }) {
  return (
    <Layout pageData={pageData}>
      <PageUnternehmensberatungContent />
    </Layout>
  );
}
