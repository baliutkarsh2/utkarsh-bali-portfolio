import { SectionHeading } from "@/components/ui/section-heading";
import { aboutNote, beliefs } from "@/content";

export function About({ index = "01", as }: { index?: string; as?: "h1" | "h2" }) {
  return (
    <section id="about" aria-labelledby="about-title" className="shell section-y">
      <SectionHeading
        index={index}
        eyebrow="About"
        title="I have always been building something."
        id="about-title"
        as={as}
      />

      <div className="grid-editorial !mx-0 !max-w-none !px-0 mt-12">
        <div className="col-span-full md:col-span-5 lg:col-span-7">
          <p className="text-pretty text-display-s font-display leading-tight">
            {aboutNote.lead}
          </p>
          <p className="measure mt-6 text-pretty text-lede text-muted">{aboutNote.body}</p>
        </div>

        <ul className="col-span-full mt-10 md:col-span-3 md:col-start-6 md:mt-0 lg:col-span-4 lg:col-start-9">
          {beliefs.map((belief, index) => (
            <li key={belief.title} className="border-t border-rule py-5 first:border-t-0 first:pt-0">
              <div className="flex items-baseline gap-3">
                <span aria-hidden className="meta text-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-sans font-medium">{belief.title}</h3>
              </div>
              <p className="mt-2 pl-9 text-sm leading-6 text-muted">{belief.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
