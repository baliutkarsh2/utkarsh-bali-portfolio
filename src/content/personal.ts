/**
 * The story, in Utkarsh's own words.
 *
 * He wrote these twelve lines and they are set verbatim, with two characters
 * changed: a full stop after "Thrust SSC", because every other line carries
 * one, and the hyphen in the Recurly line raised to an em dash, which is the
 * dash this site sets everywhere else. Nothing else is edited, and nothing is
 * added -- if a fact is missing from this list it is missing because he did
 * not put it there.
 *
 * It is the spine of the home page and deliberately the plainest writing on
 * the site: first person, in order, one thing a line, including the parts
 * that did not work. A portfolio that lists only what went well reads like a
 * press release; what makes someone legible is the sequence.
 */
export const story: readonly string[] = [
  "As a kid, I drew up quadcopters, sketched Iron Man suits, and built motor-powered cars I insisted on calling “Thrust SSC.”",
  "In high school, I started building the apps and games I wished existed.",
  "Came to Purdue in 2023 for CS and AI, with a minor in psychology.",
  "Started doing AI research there in my second year, and spent a year on a Microsoft collaboration reading a few million social posts about Minecraft.",
  "Built WalleX, an AI wallpaper app, around the same time. 3,000+ people in 22 countries used it. The first thing I made that had real users in it.",
  "Built a clinical assistant that nurses tested across Indiana hospitals. It cut about 40% of their documentation time, and it runs on the hospital’s own hardware, because patient data should not leave the building.",
  "Worked at a San Francisco-based YC startup, QualGent (YC X25), reporting to the CTO, and built agent infrastructure into production for the first time.",
  "Co-founded Checkpoint to build agent testing infrastructure. YC told us we were in the top 10% of Summer 2026 applicants, then didn’t interview us. It’s live in private beta.",
  "Spent this summer at Recurly, building the thing that automates the company’s Product Development Lifecycle (PDLC) — turns a product requirement into shipped production software. Also, built a Sales outbound automation tool to assist SDRs.",
  "Spent the last few months on CLIP-H, a framework that helps generate trustworthy clinical hypotheses. It is going into a NeurIPS workshop submission with Purdue and Harvard Business School faculty.",
  "TA’d AI courses twice and ran weekly ML workshops for a few hundred students along the way.",
  "Finishing at Purdue in December.",
];

/**
 * The About lead: one line, and it is the only opinion on the page.
 *
 * The childhood paragraph that used to open here is the first two lines of
 * `story` now, on the home page where someone actually meets it. A second
 * line used to follow this one saying "everything below is the record: where
 * I worked, what I shipped there, and what I was recognised for" -- a page
 * introducing its own contents, which is the thing this pass exists to stop.
 */
export const aboutNote = {
  lead: "The projects I want are the ones where the hard part isn’t the model. It’s deciding what the thing should actually do.",
};

export const mission = "Connecting the dots...";
