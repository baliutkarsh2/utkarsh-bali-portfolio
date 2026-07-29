import { Hero } from "@/components/sections/hero";
import { MetricsMarquee } from "@/components/sections/metrics-marquee";
import { Now } from "@/components/sections/now";
import { ProjectIndex } from "@/components/sections/project-index";
import { Writing } from "@/components/sections/writing";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";

/**
 * A landing page, not the whole site: hero, proof (marquee), what I'm doing
 * now, the top three projects, recent writing, and the outro. About, the full
 * work index, and experience live on their own routes.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <MetricsMarquee />
      <Reveal>
        <Now index="01" />
      </Reveal>
      <Reveal>
        <ProjectIndex index="02" />
      </Reveal>
      <Reveal>
        <Writing index="03" />
      </Reveal>
      <Reveal>
        <Contact index="04" />
      </Reveal>
    </>
  );
}
