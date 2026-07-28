import { Hero } from "@/components/sections/hero";
import { MetricsMarquee } from "@/components/sections/metrics-marquee";
import { About } from "@/components/sections/about";
import { Now } from "@/components/sections/now";
import { ProjectIndex } from "@/components/sections/project-index";
import { Writing } from "@/components/sections/writing";
import { Experience } from "@/components/sections/experience";
import { Skills } from "@/components/sections/skills";
import { Recognition } from "@/components/sections/recognition";
import { OffHours } from "@/components/sections/off-hours";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MetricsMarquee />
      <Reveal>
        <About />
      </Reveal>
      <Reveal>
        <Now />
      </Reveal>
      <Reveal>
        <ProjectIndex />
      </Reveal>
      <Reveal>
        <Writing />
      </Reveal>
      <Reveal>
        <Experience />
      </Reveal>
      <Reveal>
        <Skills />
      </Reveal>
      <Reveal>
        <Recognition />
      </Reveal>
      <Reveal>
        <OffHours />
      </Reveal>
      <Reveal>
        <Contact index="09" />
      </Reveal>
    </>
  );
}
