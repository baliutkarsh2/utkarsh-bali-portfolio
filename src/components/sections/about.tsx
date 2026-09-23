import { ArrowUpRight } from "lucide-react";
import { profile } from "@/content";

/**
 * The masthead of /about: who this is, in two paragraphs, and the facts a
 * reader would otherwise have to go looking for.
 *
 * It used to be the word "About" at display size and nothing else, so the page
 * opened on a heading and dropped straight into a framed chart -- a profile
 * that never introduced the person it was a profile of. Now the headline is
 * his own one-line description of what he does (the same line the social card
 * carries), the standfirst says where he is doing it, and the facts column
 * answers "now, studying, graduating, based, elsewhere" at a glance, with the
 * résumé one click away.
 *
 * At 64rem and up the facts hang beside the headline rather than under it, so
 * the first screen is a person on the left and a ruled card on the right, and
 * no half of it is bare paper.
 *
 * Every fact here is already on the site: projects.ts, experience.ts, the
 * story on the home page and the profile. Nothing is new, only gathered.
 *
 * The data attributes stay because the header's SectionSpy reads them.
 */
export function About() {
  const links: { label: string; href: string; external: boolean }[] = [
    ...(profile.resume
      ? [{ label: "Résumé", href: profile.resume.href, external: true }]
      : []),
    { label: "GitHub", href: profile.github, external: true },
    { label: "LinkedIn", href: profile.linkedin, external: true },
    { label: "Email", href: `mailto:${profile.email}`, external: false },
  ];

  const facts: { term: string; detail: string }[] = [
    { term: "Now", detail: "Co-founder & CTO, Checkpoint" },
    { term: "Studying", detail: "CS + AI at Purdue, minor in psychology" },
    { term: "Graduating", detail: "December 2026" },
    { term: "Based in", detail: profile.location },
  ];

  return (
    <header
      id="about"
      aria-labelledby="about-title"
      data-section-index="01"
      data-section-title="About"
      className="shell about-mast"
    >
      <p className="about-kicker meta">About</p>

      <h1 id="about-title" className="about-title text-display-l">
        Software engineer, building agent infrastructure.
      </h1>

      <div className="about-copy">
        <p className="about-lede text-lede">
          I co-founded Checkpoint, which tests AI agents before they ever reach
          a user, and I lead its engineering. This summer I was at Recurly,
          building the platform that turns a product requirement into merged
          pull requests.
        </p>
        <p className="about-body text-body">
          Before that I took agent infrastructure into production for the
          first time, working for QualGent (YC X25), a San Francisco
          startup. Since my second year at Purdue I&rsquo;ve also done AI
          research, most recently
          CLIP-H, which is under review at a NeurIPS 2026 workshop. I finish
          CS and AI at Purdue in December.
        </p>
      </div>

      <dl className="about-facts">
        {facts.map((fact) => (
          <div key={fact.term} className="about-fact">
            <dt className="meta">{fact.term}</dt>
            <dd>{fact.detail}</dd>
          </div>
        ))}
        <div className="about-fact">
          <dt className="meta">Elsewhere</dt>
          <dd>
            <ul className="about-links">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    className="about-link tap"
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    <span className="dot-underline">{link.label}</span>
                    {link.external && (
                      <>
                        <ArrowUpRight aria-hidden="true" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </header>
  );
}
