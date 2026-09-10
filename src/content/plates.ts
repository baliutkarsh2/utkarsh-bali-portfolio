import type { PortraitSource } from "@/components/interactive/dot-board";

/**
 * THE PLATE BOOK — every engraving on the site, stated once.
 *
 * A caption that repeats a plate's dimensions is a caption that will one day
 * be wrong about them, and nothing will say so: a field carries its own `w`,
 * `h` and `count`, so a re-bake at a different grid changes the picture and
 * leaves the words alone. Every route reads its captions from here, and
 * `node scripts/check-plates.mjs` (in `prebuild`) compares every number below
 * against the generated module it describes and fails the build on a
 * disagreement. The manifest is not documentation; it is the join.
 *
 * What is NOT here, deliberately:
 *
 *   · the portrait fields. They are the site's subject rather than its
 *     illustrations, they carry a datum and a rim that nothing else does, and
 *     scripts/bake-portrait.py owns them end to end.
 *   · the verso showthrough (below, separately). It has no field and no
 *     renderer entry at all -- it is a mark on the paper, not a board.
 *
 * ── The numbering ──────────────────────────────────────────────────────────
 * `n` is a position in this array, not a written-down number, and the array is
 * in the site's one collated order: the eight project devices in
 * `orderedProjects` order, so a device's number is the same number
 * src/lib/corpus.ts already prints for that case study, and then the plates
 * that belong to no single project. check-plates.mjs re-derives that sort from
 * src/content/projects.ts and fails if the two disagree.
 *
 * Set the numeral with `roman(plate.n)` from src/lib/corpus.ts. It is not
 * re-exported here, because there is one roman numeral function on this site.
 */

/** A field that ships as a `<DotBoard mode="still" source={id} />`. */
export type Plate = {
  /** Position in the collated order. Computed below; never written down. */
  n: number;
  /** The board source key. */
  id: PortraitSource;
  /**
   * The generated module's export name -- the join this manifest exists to be.
   * `scripts/check-plates.mjs` finds the `export const <field>: BoardField`
   * that carries it and compares the three numbers below against it.
   */
  field: string;
  /** The case study this device belongs to, where it belongs to one. */
  project?: string;
  /** Set in the caption, above the machine line. */
  title: string;
  /** One line: what the engraving is OF, not what it looks like. */
  subject: string;
  /** The accessible name. All meaning stays in DOM text (section 8.10). */
  alt: string;
  /** Field cells. Measured by the bake; check-plates.mjs is the lock. */
  w: number;
  h: number;
  /** Dots actually drawn. Equal to the field's non-zero bytes, exactly. */
  count: number;
  /** The box in page-lattice cells, and cells per lattice step. */
  box: [number, number];
  density: number;
  /** The committed still: no JS, print, and forced colours. */
  still: string;
};

type PlateSpec = Omit<Plate, "n">;

/* ── The eight project devices ─────────────────────────────────────────────
   scripts/bake-devices.py. A device is a printer's device, not a logo: each
   one is a diagram of that project's actual mechanism, drawn as vector
   geometry at 48 x 60 cells. */
const DEVICES: PlateSpec[] = [
  {
    id: "device-recurly",
    field: "deviceRecurly",
    project: "recurly-agent-platform",
    title: "Recurly Agent Platform",
    subject: "A requirement through five agents, cut five times by a human",
    alt:
      "An engraved diagram: a written requirement enters a chain of five specialised agents, " +
      "and the chain is broken five times by holes of bare paper — one for each human " +
      "checkpoint — before it leaves as three merged pull requests.",
    w: 48,
    h: 60,
    count: 738,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-recurly@2x.webp",
  },
  {
    id: "device-checkpoint",
    field: "deviceCheckpoint",
    project: "checkpoint",
    title: "Checkpoint",
    subject: "Five adversarial suites, thickening; one dies on turn three",
    alt:
      "An engraved diagram: five columns of adversarial test cases growing heavier as the " +
      "turns go deeper. The fourth column stops after three rows, and the verdict rule at " +
      "the foot of the plate is broken underneath it.",
    w: 48,
    h: 60,
    count: 789,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-checkpoint@2x.webp",
  },
  {
    id: "device-clip-h",
    field: "deviceClipH",
    project: "clip-h",
    title: "CLIP-H",
    subject: "A handful of named concepts standing in for a whole record",
    alt:
      "An engraved diagram of a compression: a dense rank of units, a wider rank of " +
      "mostly empty sockets with only five lit, and a dense rank out. Every path on the " +
      "plate runs through one of the five.",
    w: 48,
    h: 60,
    count: 856,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-clip-h@2x.webp",
  },
  {
    id: "device-crawler",
    field: "deviceCrawler",
    project: "autonomous-app-crawler",
    title: "App Crawler",
    subject: "A depth-first traversal of an Android UI, five screens deep",
    alt:
      "An engraved dendrogram of a depth-first traversal: every node is a screen and every " +
      "drop is a tap. The leftmost path is inked heavily all the way to the foot of the " +
      "plate; two branches end in stubs rather than screens.",
    w: 48,
    h: 60,
    count: 515,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-crawler@2x.webp",
  },
  {
    id: "device-qualgent",
    field: "deviceQualgent",
    project: "qualgent-ai-assistant",
    title: "QualGent AI Assistant",
    subject: "One orchestrator, forty-five tools, three routes taken",
    alt:
      "An engraved diagram: one orchestrator fanning to fifteen routes, each carrying three " +
      "tools or sub-agents — forty-five in all — over the three surfaces they live behind. " +
      "Three routes are inked heavily and twelve are hairlines.",
    w: 48,
    h: 60,
    count: 551,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-qualgent@2x.webp",
  },
  {
    id: "device-qa",
    field: "deviceQa",
    project: "multi-agent-qa",
    title: "LLM Multi-Agent QA System",
    subject: "Four agents in lockstep, sixteen steps, no diagonals",
    alt:
      "An engraved diagram: four lanes — planner, executor, verifier, supervisor — and a " +
      "token visiting them in that order for sixteen steps. Every connector is a right " +
      "angle; the long return leg from the supervisor to the planner crosses the plate " +
      "four times.",
    w: 48,
    h: 60,
    count: 558,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-qa@2x.webp",
  },
  {
    id: "device-clinical",
    field: "deviceClinical",
    project: "clinical-ai-assistant",
    title: "Clinical AI Assistant",
    subject: "A waveform becomes tokens becomes a note, all on one sheet",
    alt:
      "An engraved diagram of an on-device speech pipeline: two utterances as a waveform, " +
      "a rank of tokens, and six ragged rules of written text. Nothing on the plate leaves " +
      "the plate.",
    w: 48,
    h: 60,
    count: 990,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-clinical@2x.webp",
  },
  {
    id: "device-wallex",
    field: "deviceWallex",
    project: "wallex",
    title: "WalleX",
    subject: "One plate, twenty-two impressions",
    alt:
      "An engraved diagram: a bevelled copper plate above the bed of a press, and below it " +
      "twenty-two impressions pulled from it — one for each country the app reached — each " +
      "holding the plate's own proportion at a smaller size as the edition goes out. One " +
      "maker, many hands.",
    w: 48,
    h: 60,
    count: 545,
    box: [24, 30],
    density: 2,
    still: "/portrait/device-wallex@2x.webp",
  },
];

/* ── The plates that belong to no single project ───────────────────────────── */
const OTHERS: PlateSpec[] = [
  {
    id: "clinical-voice",
    field: "clinicalVoice",
    project: "clinical-ai-assistant",
    title: "The voice-first home screen",
    subject: "A white app, engraved: bare paper with the type as a scatter of ink",
    alt:
      "The clinical assistant's home screen, engraved as a dot field: the prompt “How can " +
      "I help you today?”, the microphone as the primary control, and shortcuts to add a " +
      "task or view patient vitals.",
    w: 60,
    h: 128,
    count: 1816,
    box: [30, 64],
    density: 2,
    still: "/portrait/clinical-voice@2x.webp",
  },
  {
    id: "clinical-tasks",
    field: "clinicalTasks",
    project: "clinical-ai-assistant",
    title: "Tasks and reminders",
    subject: "Dictated hands-free during a shift",
    alt:
      "The clinical assistant's task and reminder list, engraved as a dot field: five " +
      "entries dictated during a shift.",
    w: 60,
    h: 128,
    count: 2020,
    box: [30, 64],
    density: 2,
    still: "/portrait/clinical-tasks@2x.webp",
  },
  {
    id: "clinical-vitals",
    field: "clinicalVitals",
    project: "clinical-ai-assistant",
    title: "Patient vitals",
    subject: "Captured without touching a keyboard",
    alt:
      "The clinical assistant's patient vitals screen, engraved as a dot field: a chart " +
      "above a column of readings, all of it captured by voice.",
    w: 60,
    h: 128,
    count: 3836,
    box: [30, 64],
    density: 2,
    still: "/portrait/clinical-vitals@2x.webp",
  },
  {
    id: "rule-quarters",
    field: "quarterlyRule",
    title: "The quarterly rule",
    subject: "Projects per quarter, Q4 2024 to Q2 2026",
    alt:
      "A register strip: seven quarters from the last months of 2024 to the middle of 2026, " +
      "each band carrying ink in proportion to the number of projects begun in it. The " +
      "first quarter of 2025 is bare paper — a hole in the rule.",
    w: 240,
    h: 8,
    count: 1640,
    box: [120, 4],
    density: 2,
    still: "/portrait/rule-quarters@2x.webp",
  },
  {
    id: "sky",
    field: "skyField",
    title: "The sky over West Lafayette",
    subject: "11 July 2025, 23:00 — 2,307 stars",
    alt:
      "The night sky over West Lafayette at eleven o'clock on the eleventh of July 2025, " +
      "engraved as a dot field: a solid disc of ink with 2,307 stars showing through as " +
      "bare paper, the Summer Triangle overhead and the Milky Way running across it.",
    w: 192,
    h: 192,
    count: 27803,
    box: [96, 96],
    density: 2,
    still: "/portrait/sky-field@2x.webp",
  },
];

/** Every plate, in collated order. `n` is the index; nothing writes it down. */
export const plates: Plate[] = [...DEVICES, ...OTHERS].map((spec, i) => ({
  ...spec,
  n: i + 1,
}));

export const plateById: ReadonlyMap<Plate["id"], Plate> = new Map(
  plates.map((plate) => [plate.id, plate]),
);

/** The device for a case study, where it has one. */
export function deviceOf(slug: string): Plate | undefined {
  return plates.find((plate) => plate.project === slug && plate.id.startsWith("device-"));
}

/**
 * The machine line under a plate, in the board's own grammar
 * (`DotBoard`'s `restLabel`): the grid, then the dot count. The pointer
 * readout replaces it with coordinates and puts it back on leave, so this has
 * to be exactly what the board would have said for itself.
 */
export function plateGrid(plate: Plate): string {
  return `${plate.w} × ${plate.h} · ${plate.count.toLocaleString("en-US")} dots`;
}

/* ── The verso showthrough ─────────────────────────────────────────────────
   scripts/bake-verso.py. Not a plate and not a board: the portrait's deepest
   passages only, flipped, at 12% -- what comes through a sheet from the plate
   on its other side.

   It ships as a plain image, and it needs all four of these or it breaks a
   non-negotiable: `aria-hidden` (it carries no meaning and is the portrait
   again, so a screen reader must not meet it twice), `loading="lazy"`,
   `decoding="async"`, and the `width`/`height` below written onto the element
   — an intrinsic size is what keeps CLS at 0.0000, and this is the one image
   on the site that is not inside a `<figure>` with a reserved box. */
export type Verso = { src: string; width: number; height: number };

export const verso: Record<"hero" | "phone" | "about", Verso> = {
  hero: { src: "/portrait/verso-96.webp", width: 1152, height: 1440 },
  phone: { src: "/portrait/verso-64.webp", width: 768, height: 960 },
  about: { src: "/portrait/verso-about.webp", width: 768, height: 960 },
};
