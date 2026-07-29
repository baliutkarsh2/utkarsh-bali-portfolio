import type { Metadata } from "next";
import { Experience } from "@/components/sections/experience";
import { Recognition } from "@/components/sections/recognition";
import { Contact } from "@/components/sections/contact";
import { Reveal } from "@/components/interactive/reveal";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Where I've worked: Recurly, QualGent (YC X25), Purdue University, and Microsoft Research, plus awards and rankings along the way.",
  alternates: { canonical: "/experience" },
};

export default function ExperiencePage() {
  return (
    <div className="pt-14">
      <Experience index="01" as="h1" />
      <Reveal>
        <Recognition index="02" />
      </Reveal>
      <Reveal>
        <Contact index="03" />
      </Reveal>
    </div>
  );
}
