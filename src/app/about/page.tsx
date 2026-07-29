import type { Metadata } from "next";
import { About } from "@/components/sections/about";
import { Skills } from "@/components/sections/skills";
import { OffHours } from "@/components/sections/off-hours";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who I am, what I believe about building software, the toolkit I reach for, and what I'm reading, listening to, and chasing.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="pt-14">
      <About index="01" as="h1" />
      <Reveal>
        <Skills index="02" />
      </Reveal>
      <Reveal>
        <OffHours index="03" />
      </Reveal>
      <Reveal>
        <Contact index="04" />
      </Reveal>
    </div>
  );
}
