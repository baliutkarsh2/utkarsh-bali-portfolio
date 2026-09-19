/**
 * The masthead of /about.
 *
 * It used to be a `section` in the shared grammar: a hairline, then the h1,
 * then the section's own bottom padding. With the lead, the spec list and the
 * portrait all removed there was nothing under the heading, so the page opened
 * with a ruled box containing one word and about a hundred pixels of bare
 * paper. A section with no body reads as unfinished rather than as spare.
 *
 * So it is a masthead instead, in the same shape /projects and /writing
 * already use: no rule above the title, the page's own top padding clearing
 * the fixed header, and the first real section following directly. The data
 * attributes stay because the header's SectionSpy reads them.
 */
export function About() {
  return (
    <header
      id="about"
      aria-labelledby="about-title"
      data-section-index="01"
      data-section-title="About"
      className="shell pt-20 pb-8 md:pt-24 md:pb-10"
    >
      <h1
        id="about-title"
        className="text-display-l font-medium text-balance text-ink"
      >
        About
      </h1>
    </header>
  );
}
