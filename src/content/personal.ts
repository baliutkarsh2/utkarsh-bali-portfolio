/**
 * The story, and the one line about how he picks work.
 *
 * This is the spine of the home page and it is deliberately the plainest
 * writing on the site: first person, in order, one fact a line, including the
 * parts that did not work. A portfolio that only lists what went well reads
 * like a press release; what makes someone legible is the sequence — what they
 * built, what happened, what they did next.
 *
 * Every line here is traceable to something else in src/content: the childhood
 * detail was the old /about lead, the dates and roles come from
 * experience.ts, the numbers from projects.ts, the YC outcome and the teaching
 * from recognition.ts. Nothing is asserted here that is not asserted there,
 * which is what keeps it honest when one of them changes.
 */

export const story: readonly string[] = [
  "As a kid I drew up quadcopters, sketched Iron Man suits with a friend, and built motor-powered cars I insisted on calling “Thrust SSC.”",
  "In high school I started building the apps and games I wished existed.",
  "Came to Purdue in 2023 for CS and AI, with a minor in psychology.",
  "Started doing AI research there in my second year, and spent a year on a Microsoft collaboration reading a few million social posts about Minecraft.",
  "Built WalleX, an AI wallpaper app, around the same time. 3,000+ people in 22 countries used it — the first thing I made that had real users in it.",
  "Built a clinical assistant that nurses tested across Indiana hospitals. It cut about 40% of their documentation time, and it runs on the hospital’s own hardware, because patient data should not leave the building.",
  "Went to San Francisco to work at QualGent (YC X25), reporting to the CTO, and put agent infrastructure into production for the first time.",
  "Spent last winter on CLIP-H, checking clinical hypotheses against MIMIC-IV. It is going into a NeurIPS submission with Purdue and Harvard Business School faculty.",
  "Co-founded Checkpoint with Ayushman Gupta and Aaditya Gaur and ran engineering. YC told us we were in the top 10% of Summer 2026 applicants, then didn’t interview us. It’s live in private beta.",
  "Spent this summer at Recurly in Colorado, building the thing that turns a product requirement into merged pull requests.",
  "TA’d AI and ran weekly ML workshops for a few hundred students along the way.",
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
