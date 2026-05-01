import { SectionHeading } from "@/components/ui/section-heading";

const notes = [
  {
    title: "I love building real products",
    body: "The best work is not just clever. It is understandable, useful, and stable enough for people to depend on.",
  },
  {
    title: "I love travelling to new places",
    body: "Travelling is one of my favorite ways to learn about the world and more importantly, to understand myself.",
  },
  {
    title: "I love all forms of art and expression",
    body: "I believe that doing art and being creative is a core human survival trait, whether it is music, dance, movies, or anything else.",
  },
];

export function About() {
  return (
    <section id="about" className="section-shell">
      <SectionHeading eyebrow="About" title="Hi, I am Utkarsh Bali.">
        I am a CS + AI student at Purdue, currently working on Checkpoint and
        looking to meet people who care about agents, devtools, and thoughtful
        engineering.
      </SectionHeading>

      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <article className="overflow-hidden rounded-[1.6rem] border-2 border-foreground/10 bg-card shadow-sm">
          <div className="border-b border-border bg-surface/70 px-6 py-4">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Personal note
            </p>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            <p className="text-pretty text-xl font-medium leading-8 text-foreground">
              I am a builder. As a kid, I used to make designs for quadcopters (even design iron man suits with my friend!), and build motor powered cars and call them "Thrust SSC". In high school, I built mobile apps and games that I wish I had. At Purdue and beyond, I have built AI agents, devtools, healthcare tools, and research prototypes. Each project has taught me something new about building real products that people can use and rely on.
            </p>
            <p className="text-pretty leading-7 text-muted-foreground">
              My work has crossed AI agents, LLM pipelines, healthcare tools,
              mobile apps, and research prototypes. I am most interested in the
              projects where taste and systems thinking both matter.
            </p>
          </div>
        </article>

        <div className="grid gap-4">
          {notes.map((item, index) => (
            <article key={item.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-foreground bg-highlight text-sm font-black text-foreground">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
