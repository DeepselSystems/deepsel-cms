import { useState } from "react";
import heroImg from "../assets/images/finance-image-002.png";
import img3 from "../assets/images/finance-image-003.png";
import img4 from "../assets/images/finance-image-004.png";
import img5 from "../assets/images/finance-image-005.png";

const heroSrc = typeof heroImg === "string" ? heroImg : (heroImg as any).src;
const img3Src = typeof img3 === "string" ? img3 : (img3 as any).src;
const img4Src = typeof img4 === "string" ? img4 : (img4 as any).src;
const img5Src = typeof img5 === "string" ? img5 : (img5 as any).src;

const accordionItems = [
  {
    num: "01",
    title: "Budget: in\u00a0Zahlen vorausdenken",
    content:
      "Mit dem Budget veranschlagen Sie konsequent die Einnahmen und Ausgaben des kommenden Jahres. Das macht es einfacher, Priorit\u00e4ten zu setzen, zudem bleibt die Firma dadurch besser im finanziellen Gleichgewicht. Ferner sorgt das Budget f\u00fcr Kostenwahrheit. Falls gew\u00fcnscht, definiert Alcoris die Kostenstellen, berechnet die Kalkulationss\u00e4tze und legt die Ausgaben auf die Kostenstellen um.",
  },
  {
    num: "02",
    title: "Buchhaltung: alles sch\u00f6n geordnet",
    content:
      "Unsere Buchhaltungsdienstleistungen sorgen f\u00fcr eine l\u00fcckenlose und transparente Erfassung aller Gesch\u00e4ftsvorf\u00e4lle. Von der laufenden Buchf\u00fchrung bis zum Jahresabschluss \u2014 wir halten Ihre Finanzen in Ordnung.",
  },
  {
    num: "03",
    title: "Controlling und Revision: der pr\u00fcfende Blick",
    content:
      "Durch systematisches Controlling und unabh\u00e4ngige Revision stellen wir sicher, dass Ihre Unternehmenssteuerung auf soliden Daten basiert. Wir identifizieren Optimierungspotenziale und sichern die Qualit\u00e4t Ihrer Finanzprozesse.",
  },
  {
    num: "04",
    title: "Finanzberatung: Klarheit gewinnen",
    content:
      "Unsere Finanzberatung hilft Ihnen, komplexe finanzielle Zusammenh\u00e4nge zu verstehen und fundierte Entscheidungen zu treffen. Ob Investitionsplanung, Liquidit\u00e4tsmanagement oder Finanzierungsfragen \u2014 wir bringen Klarheit.",
  },
];

function AccordionArrow({ open }: { open: boolean }) {
  return (
    <div className="w-[32px] h-[33px] flex-shrink-0 flex items-center justify-center">
      <svg
        className={`w-[30px] h-[31.5px] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        width={30}
        height="31.5"
        viewBox="-0.7241 -1 31.7241 33.1897"
        preserveAspectRatio="none"
      >
        <path
          d="M30 0L31 0L31 -1L30 -1L30 0ZM0 31.5L0.724138 32.1897L30.7241 0.689655L30 0L29.2759 -0.689655L-0.724138 30.8103L0 31.5ZM30 0L30 -1L0 -1L0 0L0 1L30 1L30 0ZM30 0L29 0L29 31.5L30 31.5L31 31.5L31 0L30 0Z"
          fill="rgb(62, 105, 220)"
          fillRule="nonzero"
        />
      </svg>
    </div>
  );
}

export default function PageFinance() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="w-full">
      {/* ─── Hero Section ─── */}
      <section className="relative w-full h-[500px] md:h-[500px] lg:h-[450px] overflow-hidden">
        <img
          src={heroSrc}
          alt="Finanz- und Rechnungswesen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <h1 className="text-[32px] md:text-[52px] lg:text-[72px] font-bold tracking-[-0.16px] leading-[1.3] text-center capitalize text-white px-6">
            Finanz- und Rechnungswesen
          </h1>
        </div>
      </section>

      {/* ─── Description + Images ─── */}
      <section className="w-full px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="max-w-[1248px] mx-auto flex flex-col gap-[48px]">
          <h2 className="text-[22px] md:text-[30px] lg:text-[40px] font-bold leading-[1.5] text-center text-[rgba(9,20,35,1)]">
            Alcoris &uuml;bernimmt die Verwaltung Ihres Finanz- und
            Rechnungswesens &ndash; ganz oder teilweise, exakt wie Sie es
            ben&ouml;tigen. Dank aktueller Buchhaltung, strukturiertem
            Controlling und situativer Finanzberatung haben Sie die Zahlen
            jederzeit im Griff.
          </h2>
          <div className="flex flex-col md:flex-row gap-[32px]">
            <div className="flex-1">
              <img
                src={img3Src}
                alt=""
                className="w-full h-[250px] md:h-[395px] object-cover"
              />
            </div>
            <div className="flex-1">
              <img
                src={img4Src}
                alt=""
                className="w-full h-[350px] md:h-[525px] object-cover"
              />
            </div>
            <div className="flex-1">
              <img
                src={img5Src}
                alt=""
                className="w-full h-[250px] md:h-[395px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Navy Section: Services Accordion ─── */}
      <section className="w-full bg-[rgba(1,29,102,1)] px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="max-w-[1248px] mx-auto flex flex-col lg:flex-row gap-[32px] lg:gap-[125px]">
          {/* Left: Heading + description + button */}
          <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col gap-[32px]">
            <h2 className="text-[32px] md:text-[40px] lg:text-[50px] font-bold leading-[65px] text-left text-[rgba(236,241,255,1)]">
              Struktur und transparenter Geldfluss
            </h2>
            <p className="text-[16px] font-normal leading-[24px] text-left text-[rgba(236,241,255,1)]">
              Meistern sie die Komplexit&auml;t ihres Finanz- und
              Rechnungswesens. Mit einem flexiblen Angebot sorgt Alcoris f&uuml;r
              die gew&uuml;nschte Zahlentransparenz. Sie w&auml;hlen, was Sie
              brauchen: Alcoris unterst&uuml;tzt Sie mit
              Verwaltungsaufgaben,&nbsp; Beratung und planerischen Massnahmen.
            </p>
            <a
              href="/kontakt"
              className="w-[140px] h-[45px] flex items-center justify-center bg-white rounded-[50px] text-[16px] font-bold tracking-[-0.16px] leading-[20.8px] capitalize text-[rgba(62,105,220,1)]"
            >
              Kontakt
            </a>
          </div>

          {/* Right: Accordion */}
          <div className="w-full lg:flex-1">
            {accordionItems.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.num}
                  className="border-t border-[rgba(255,255,255,0.1)]"
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-[40px] lg:gap-[72px] py-[40px] lg:py-[56px] text-left"
                    onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  >
                    <span className="text-[12px] font-normal leading-[16px] text-white flex-shrink-0">
                      {item.num}
                    </span>
                    <span className="flex-1 text-[24px] lg:text-[40px] font-bold leading-[1.3] text-white">
                      {item.title}
                    </span>
                    <AccordionArrow open={isOpen} />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-[400px] pb-[24px]" : "max-h-0"
                    }`}
                  >
                    <p className="text-[16px] font-normal leading-[24px] text-[rgba(236,241,255,1)] pl-[52px] lg:pl-[85px]">
                      {item.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
