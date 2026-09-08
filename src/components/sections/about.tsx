/**
 * The head of /about, and now only the head.
 *
 * It used to carry a lead in display-s, a spec list of Education / At Purdue /
 * GPA / Based in, and the portrait in `still` mode on a rail — a three-item
 * grid over twelve columns. All three are gone at Utkarsh's call. The facts in
 * the spec list are either said better elsewhere (the degree and the dates are
 * the first and last lines of the story on the home page; the town is in the
 * footer) or are the kind of number a CV carries and a page does not need to
 * lead with. The portrait is on the home page, where meeting it once is the
 * point.
 *
 * What is left is the page's h1 in the same grammar as every other section
 * head — hairline, title — carrying the data attributes the header's
 * SectionSpy reads, and `section-first` for the fixed header's clearance.
 */
export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      data-section-index="01"
      data-section-title="About"
      className="section section-first shell"
    >
      <div className="section-head">
        <h1
          id="about-title"
          className="text-display-l font-medium text-balance text-ink"
        >
          About
        </h1>
      </div>
    </section>
  );
}
