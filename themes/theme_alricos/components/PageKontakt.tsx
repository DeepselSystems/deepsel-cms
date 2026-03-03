import mapImg from "../assets/images/kontakt-image-002.png";
import iconPersonSvg from "../assets/icons/icon-kontakt-person.svg";
import iconAdresseSvg from "../assets/icons/icon-kontakt-adresse.svg";
import iconDirectionsSvg from "../assets/icons/icon-kontakt-directions.svg";
import iconEmailSvg from "../assets/icons/icon-kontakt-email.svg";

const mapSrc = typeof mapImg === "string" ? mapImg : (mapImg as any).src;
const iconPerson = typeof iconPersonSvg === "string" ? iconPersonSvg : (iconPersonSvg as any).src;
const iconAdresse = typeof iconAdresseSvg === "string" ? iconAdresseSvg : (iconAdresseSvg as any).src;
const iconDirections = typeof iconDirectionsSvg === "string" ? iconDirectionsSvg : (iconDirectionsSvg as any).src;
const iconEmail = typeof iconEmailSvg === "string" ? iconEmailSvg : (iconEmailSvg as any).src;

const contactCards = [
  {
    label: "MY INFORMATION",
    lines: ["Claudio Alder", "Inhaber Eidg. dipl. Betriebswirtschafter HF"],
    icon: iconPerson,
    alt: "Person",
  },
  {
    label: "NEUE ADRESSE",
    lines: ["Weststrasse 9 \u2013 3005 Bern"],
    icon: iconAdresse,
    alt: "Adresse",
  },
  {
    label: "SO FINDEN SIE ALCORIS",
    lines: [
      "Bus Nr. 19 Richtung Elfenau",
      "Tram Nr. 6, 7 und 8",
      "Haltestelle: Helvetiaplatz",
      "Parkpl\u00e4tze in der Umgebung",
    ],
    icon: iconDirections,
    alt: "Directions",
  },
  {
    label: "INTERESSE AN ZUSAMMENARBEIT?",
    lines: ["claudio.alder@alcoris.ch"],
    isEmail: true,
    icon: iconEmail,
    alt: "Email",
  },
];

export default function PageKontakt() {
  return (
    <div className="w-full">
      {/* ─── Header Section ─── */}
      <section className="w-full px-6 lg:px-[96px] pt-[80px] lg:pt-[160px] pb-[40px] lg:pb-[80px]">
        <div className="max-w-[1248px] mx-auto flex flex-col lg:flex-row lg:items-center gap-[24px] lg:gap-[40px]">
          <h1 className="text-[32px] md:text-[40px] lg:text-[50px] font-bold leading-[65px] text-left text-[rgba(9,20,35,1)] lg:w-[635px] flex-shrink-0">
            Need more info? Let's connect!
          </h1>
          <p className="text-[16px] font-normal leading-[24px] text-left text-[rgba(9,20,35,1)] flex-1">
            Lorem ipsum dolor sit amet consectetur. Id viverra nibh nec in. Quam
            donec ac integer turpis odio integer tincidunt elit. Tortor et nibh
            id tristique faucibus mollis sodales habitant turpis. Sagittis
            porttitor nulla netus eu.
          </p>
        </div>
      </section>

      {/* ─── Contact Info Grid ─── */}
      <section className="w-full px-6 lg:px-[96px] pb-[40px] lg:pb-[80px]">
        <div className="max-w-[1248px] mx-auto flex flex-col sm:flex-row">
          {contactCards.map((card, i) => (
            <div
              key={i}
              className={`flex-1 flex flex-col gap-[16px] pt-0 pb-[20px] ${
                i < contactCards.length - 1
                  ? "border-b sm:border-b-0 sm:border-r sm:pr-[40px] border-[rgba(181,181,181,1)]"
                  : ""
              } ${i > 0 ? "sm:pl-[24px]" : ""} py-[24px] sm:py-0`}
            >
              {/* Icon */}
              <div className="mb-[20px]">
                <img src={card.icon} alt={card.alt} width={80} height={80} />
              </div>

              {/* Label */}
              <p className="text-[16px] font-bold tracking-[1.76px] leading-[20.8px] text-left uppercase text-[rgba(65,67,91,1)]">
                {card.label}
              </p>

              {/* Content */}
              <div className="flex flex-col gap-[8px]">
                {card.lines.map((line, j) =>
                  card.isEmail ? (
                    <a
                      key={j}
                      href={`mailto:${line}`}
                      className="text-[20px] font-semibold leading-[30px] text-left text-[rgba(9,20,35,1)] hover:text-[rgba(62,105,220,1)] transition-colors"
                    >
                      {line}
                    </a>
                  ) : (
                    <span
                      key={j}
                      className="text-[20px] font-semibold leading-[30px] text-left text-[rgba(9,20,35,1)]"
                    >
                      {line}
                    </span>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Map Section ─── */}
      <section className="w-full pb-[40px] lg:pb-[80px]">
        <img
          src={mapSrc}
          alt="Standort Alcoris — Weststrasse 9, 3005 Bern"
          className="w-full h-[600px] lg:h-[600px] object-cover"
        />
      </section>
    </div>
  );
}
