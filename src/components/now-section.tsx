import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";

const checkpointNotes = [
  "Engineers submit an agent config: prompts, tools, and schemas.",
  "Checkpoint generates adversarial multi-turn tests and runs them in a sandbox.",
  "I am leading backend, sandbox infrastructure, and LLM orchestration as CTO.",
];

export function NowSection() {
  return (
    <section id="now" className="section-shell">
      <SectionHeading eyebrow="Now" title="Building Checkpoint in San Francisco.">
        Checkpoint is the CI/CD pipeline for AI agents. We catch harness
        failures before users do.
      </SectionHeading>

      <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-foreground">
                Checkpoint
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-foreground">
                CTO
              </span>
            </div>

            <h3 className="text-3xl font-semibold tracking-tight text-foreground">
              Pre-production testing for agent teams.
            </h3>
            <p className="mt-4 text-pretty leading-7 text-muted-foreground">
              We are building the layer between an AI agent and its first real
              user: generated test suites, stateful mocked tool calls, sandboxed
              execution, and clear failure reports. The goal is simple: catch
              the broken loop before it reaches production.
            </p>

            <a
              href="https://usecheckpoint.dev"
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-md border border-foreground bg-foreground px-5 py-3 text-sm font-bold text-background transition hover:-translate-y-0.5"
            >
              usecheckpoint.dev
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="bg-foreground p-5 text-background sm:p-6">
            <div className="rounded-lg border border-background/15 bg-background/[0.045] p-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#9be7d8]">
                What I am working on
              </p>
              <div className="mt-5 grid gap-4">
                {checkpointNotes.map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#efff63]" />
                    <p className="text-sm leading-6 text-background/76">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-background/10 pt-5">
                <p className="text-sm leading-6 text-background/62">
                  Founding team: Ayushman Gupta, Utkarsh Bali, and Aaditya Gaur.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
