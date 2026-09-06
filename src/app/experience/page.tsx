import type { Metadata } from "next";
import { Experience } from "@/components/sections/experience";
import { Recognition } from "@/components/sections/recognition";
import { Contact } from "@/components/sections/contact";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Where I've worked: Recurly, QualGent (YC X25), Purdue University, and Microsoft (a Microsoft Research collaboration at the Data Mine), plus awards and rankings along the way.",
  alternates: { canonical: "/experience" },
};

/**
 * /experience (§7.7): the entries with the spine between the columns, the
 * recognition rows, then the shared outro. The spine's sun head is the one
 * accent element on this page; nothing else here is --sun, which is what
 * lets both current roles say "Current" honestly without two LEDs.
 */
export default function ExperiencePage() {
  return (
    <>
      <Experience />
      <Recognition />
      <Contact index="03" />
    </>
  );
}
