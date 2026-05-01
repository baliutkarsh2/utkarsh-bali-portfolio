import { SectionHeading } from "@/components/ui/section-heading";

const affiliations = [
  {
    name: "Purdue",
    src: "https://upload.wikimedia.org/wikipedia/commons/f/f7/Purdue_University_system_logo.svg",
  },
  {
    name: "QualGent",
    src: "/logos/qualgent-logo.png",
  },
  {
    name: "Microsoft",
    src: "/logos/microsoft-logo.jpg",
  },
  {
    name: "Recurly",
    src: "/logos/recurly-logo.png",
  },
];

export function BuiltExpertise() {
  return (
    <section className="section-shell">
      <SectionHeading eyebrow="Built expertise at" title="A few places that shaped how I build." />

      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {affiliations.map((item) => (
          <div
            key={item.name}
            className="flex min-h-36 items-center justify-center rounded-[1.35rem] border border-border bg-card px-8 py-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={`${item.name} logo`}
              className="max-h-20 max-w-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}