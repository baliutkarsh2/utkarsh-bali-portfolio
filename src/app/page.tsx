import { Achievements } from "@/components/achievements";
import { About } from "@/components/about";
import { BuiltExpertise } from "@/components/built-expertise";
import { Contact } from "@/components/contact";
import { Experience } from "@/components/experience";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { NowSection } from "@/components/now-section";
import { PersistentRails } from "@/components/persistent-rails";
import { Projects } from "@/components/projects";
import { SanFranciscoSection } from "@/components/sf-section";
import { Skills } from "@/components/skills";

export default function Home() {
  return (
    <>
      <Navbar />
      <PersistentRails />
      <main className="site-grid">
        <div className="mx-auto max-w-[58rem] border-x border-border bg-background/60">
          <Hero />
          <About />
          <BuiltExpertise />
          <NowSection />
          <Projects />
          <Skills />
          <Experience />
          <Achievements />
          <SanFranciscoSection />
          <Contact />
        </div>
      </main>
    </>
  );
}
