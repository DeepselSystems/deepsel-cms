import { type PageData } from "@deepsel/cms-utils";
import Layout from "./Layout";
import heroImg from "../assets/images/homepage-image-002.png";
import portraitImg from "../assets/images/homepage-image-003.png";
import ctaBgImg from "../assets/images/homepage-image-004.png";
import iconWirtschaftlichkeitSvg from "../assets/icons/icon-wirtschaftlichkeit.svg";
import iconRessourcenausbauSvg from "../assets/icons/icon-ressourcenausbau.svg";
import iconTransparenzSvg from "../assets/icons/icon-transparenz.svg";
import iconRisikominderungSvg from "../assets/icons/icon-risikominderung.svg";

const heroSrc = typeof heroImg === "string" ? heroImg : (heroImg as any).src;
const portraitSrc =
  typeof portraitImg === "string" ? portraitImg : (portraitImg as any).src;
const ctaBgSrc = typeof ctaBgImg === "string" ? ctaBgImg : (ctaBgImg as any).src;
const iconWirtschaftlichkeit = typeof iconWirtschaftlichkeitSvg === "string" ? iconWirtschaftlichkeitSvg : (iconWirtschaftlichkeitSvg as any).src;
const iconRessourcenausbau = typeof iconRessourcenausbauSvg === "string" ? iconRessourcenausbauSvg : (iconRessourcenausbauSvg as any).src;
const iconTransparenz = typeof iconTransparenzSvg === "string" ? iconTransparenzSvg : (iconTransparenzSvg as any).src;
const iconRisikominderung = typeof iconRisikominderungSvg === "string" ? iconRisikominderungSvg : (iconRisikominderungSvg as any).src;

const benefits = [
  {
    title: "Wirtschaftlichkeit",
    text: "Unternehmer investieren Ihre Kraft lieber in die Markttauglichkeit , statt sich mit Buchhaltung, AHV-Abrechnungen und Steuererklärungen abzumühen.",
    icon: iconWirtschaftlichkeit,
    alt: "Wirtschaftlichkeit",
  },
  {
    title: "Kontrollierter Ressourcenausbau",
    text: "Wenn das Personal fehlt, um die Papierberge zu stemmen, nimmt Alcoris das Gewicht von den Schultern \u2013 mit vertretbarem Aufwand.",
    icon: iconRessourcenausbau,
    alt: "Ressourcenausbau",
  },
  {
    title: "Transparenz",
    text: "Alcoris hilft, das Betriebsgeschehen zu durchschauen, zum Beispiel anhand aussagekr\u00e4ftiger Kennzahlen im Rahmen des Quartalsabschlusses.",
    icon: iconTransparenz,
    alt: "Transparenz",
  },
  {
    title: "Risikominderung",
    text: "Unternehmen kaufen das Know-how von Alcoris ein, um rechtliche oder taktische Fallstricke zu umgehen, etwa im Zusammenhang mit \u00f6ffentlichen Ausschreibungen.",
    icon: iconRisikominderung,
    alt: "Risikominderung",
  },
];

function PageHomeContent() {
  return (
    <div className="w-full">
      {/* ─── Hero Section ─── */}
      <section className="relative w-full h-[800px] md:h-[800px] lg:h-[900px] overflow-hidden">
        <img
          src={heroSrc}
          alt="Alcoris Treuhand"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 flex flex-col justify-end h-full px-6 lg:px-[96px] pb-[60px] lg:pb-[61px]">
          <div className="max-w-[1248px] mx-auto w-full flex flex-col gap-[32px]">
            <h1 className="text-[48px] md:text-[80px] lg:text-[128px] font-bold tracking-[-0.16px] leading-[1.3] capitalize text-white">
              Alcoris Treuhand
            </h1>
            <div className="lg:pl-[391px]">
              <p className="max-w-[857px] text-[16px] md:text-[18px] lg:text-[22px] font-normal leading-[33px] capitalize text-white">
                Alcoris Treuhand GmbH entlastet Kleinunternehmen sowie
                Nonprofit-Organisationen und Private in Fragen der Finanzen, der
                Steuern und des Personals &ndash; administrativ und beratend.
                Angehende Firmengr&uuml;nder erhalten fachlichen Support beim
                Entwickeln eines l&uuml;ckenlosen Businessplans.
              </p>
              <p className="max-w-[857px] mt-[8px] text-[14px] md:text-[16px] lg:text-[18px] font-semibold leading-[27px] capitalize text-[rgba(255,255,255,0.8)]">
                &ndash; Claudio Alder, Inhaber Alcoris
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bio Section: "Ökonom mit Bodenhaftung" ─── */}
      <section className="w-full px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="max-w-[1248px] mx-auto flex flex-col lg:flex-row gap-[32px] lg:gap-[48px] items-start lg:justify-between">
          {/* Left: Title + text */}
          <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col justify-between lg:h-[492px]">
            <h2 className="text-[32px] md:text-[40px] lg:text-[50px] font-bold leading-[65px] text-left text-[rgba(26,26,31,1)]">
              &Ouml;konom mit Bodenhaftung
            </h2>
            <p className="mt-[24px] lg:mt-auto text-[16px] font-normal leading-[24px] text-left text-[rgba(9,20,35,1)]">
              Alcoris &ndash; das ist Claudio Alder. Der eidg. dipl.
              Betriebswirtschafter HF absolvierte sein Studium an der
              Wirtschafts- und Kaderschule Bern. Was ihm besonders wichtig ist:
              &Ouml;konomie darf nicht abheben, wenn sie&nbsp; Unternehmen
              und&nbsp; Kunden dienen soll.&nbsp;
            </p>
          </div>

          {/* Center: Photo */}
          <div className="w-full lg:w-[350px] flex-shrink-0">
            <img
              src={portraitSrc}
              alt="Portrait"
              className="w-full lg:h-[492px] object-cover"
            />
          </div>

          {/* Right: Second text block */}
          <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col justify-end lg:h-[492px]">
            <p className="text-[16px] font-normal leading-[24px] text-left text-[rgba(9,20,35,1)]">
              Alcoris &ndash; das ist Claudio Alder. Der eidg. dipl.
              Betriebswirtschafter HF absolvierte sein Studium an der
              Wirtschafts- und Kaderschule Bern. Was ihm besonders wichtig ist:
              &Ouml;konomie darf nicht abheben, wenn sie&nbsp; Unternehmen
              und&nbsp; Kunden dienen soll.&nbsp;
            </p>
          </div>
        </div>
      </section>

      {/* ─── Benefits Section: "Ihre Vorteile" ─── */}
      <section className="w-full bg-[rgba(1,29,102,1)] px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="max-w-[1248px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-[24px] lg:gap-[80px] mb-[40px] lg:mb-[64px]">
            <h2 className="text-[32px] md:text-[40px] lg:text-[50px] font-bold leading-[65px] text-left text-[rgba(236,241,255,1)] lg:min-w-[400px] flex-shrink-0">
              Ihre Vorteile
            </h2>
            <p className="text-[16px] font-normal leading-[24px] text-left text-[rgba(236,241,255,1)]">
              Alcoris leistet mit ihrem Angebot einen Beitrag zur
              Wettbewerbsf&auml;higkeit ihrer Kunden. Im Vorfeld eines Start-ups
              oder im operativen Gesch&auml;ft von Kleinbetrieben gibt es vier
              Hauptgr&uuml;nde, um&nbsp;mit Alcoris zusammenarbeiten:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
            {benefits.map((b) => (
              <div key={b.title} className="flex flex-col rounded-[16px]">
                <div className="mb-[20px]">
                  <img src={b.icon} alt={b.alt} width={80} height={80} />
                </div>
                <h3 className="text-[18px] lg:text-[24px] font-bold leading-[31.2px] text-left text-white mb-[16px]">
                  {b.title}
                </h3>
                <p className="text-[16px] font-normal leading-[24px] text-left text-white">
                  {b.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="w-full px-6 lg:px-[96px] py-[40px] lg:py-[80px]">
        <div className="max-w-[1248px] mx-auto flex flex-col items-center py-[40px] lg:py-[80px] rounded-[16px] relative overflow-hidden">
          <img
            src={ctaBgSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ borderRadius: 16 }}
          />
          <div className="relative z-10 flex flex-col items-center gap-[48px] max-w-[924px] px-6">
            <div className="flex flex-col items-center gap-[24px]">
              <h2 className="text-[28px] md:text-[36px] lg:text-[50px] font-bold leading-[1.5] text-center text-[rgba(62,105,220,1)]">
                Brauchen Sie Unterst&uuml;tzung &uuml;ber Gr&uuml;ndungsdokumente hinaus?
              </h2>
              <p className="text-[16px] font-normal leading-[24px] text-center text-[rgba(9,20,35,1)]">
                Wir verbinden Sie mit vertrauensw&uuml;rdigen Anw&auml;lten,
                Wirtschaftspr&uuml;fern und Steuerexperten &ndash; sowie mit einem
                Makler in Bern f&uuml;r Gesch&auml;ftsversicherungen wie
                Haftpflicht, Transport oder technische Absicherung. So erhalten
                Sie die richtige Beratung &ndash; ganz ohne Aufwand.
              </p>
            </div>
            <a
              href="/kontakt"
              className="flex items-center justify-center bg-[rgba(62,105,220,1)] hover:bg-[rgba(52,90,200,1)] transition-colors rounded-[50px] px-[32px] py-[12px] text-[16px] font-bold leading-[20.8px] capitalize text-white"
            >
              Kontakt
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PageHome({ pageData }: { pageData: PageData }) {
  return (
    <Layout pageData={pageData}>
      <PageHomeContent />
    </Layout>
  );
}
