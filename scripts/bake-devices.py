"""
The eight project devices: one engraved diagram per project.

Run by hand; every output is committed. Vercel never runs this.

    python scripts/bake-devices.py                 # src/content/plate-devices.ts
                                                   # public/portrait/device-*.webp
    python scripts/bake-devices.py --preview DIR   # also 1x PNGs on paper, to LOOK at

A device is a **printer's device**, not a logo: the mark a press puts on a
sheet to say who made it and what it does. Every one of these is a diagram of
the project's actual mechanism, read out of src/content/projects.ts, drawn as
vector geometry with PIL alone -- no new dependency, no model download, no
build step. Nothing here is decoration that happens to be near a project.

── The constraint that decides every drawing ──────────────────────────────
A device is 24 x 30 lattice cells at density 2: a 48 x 60 grid. That is the
whole budget. Forty-eight marks across is an icon, not a schematic -- no
label survives it, no arrowhead survives it, and any diagram that needs a
legend is already lost. So each device is built from the three things that DO
survive at 48 cells: a rank of marks, a rule, and a hole in the paper.

The transfer helps here, and it is worth knowing why. Because DEEP_FLOOR caps
the widest dot at 0.869 cells, a "solid black" region is a field of
nearly-touching discs rather than a black bar -- so a filled shape reads as
texture and an empty one reads as paper, which is exactly the contrast an
engraving works in. And because the cull turns anything above L 0.90 into bare
paper, a hairline that is too thin does not go grey: it disappears. There is
no half-present line in this medium. Every stroke below is at least 0.2 cells.

── The rule that cost two redraws ─────────────────────────────────────────
**A rank of n marks needs about 1.8 cells of pitch, or it is not a rank.**
Forty-five channels across forty-two cells is 0.93 cells each; the cell mean
then puts a mark in EVERY cell and the comb bakes as one flat grey field. The
first QualGent device was a solid dome and the first CLIP-H had two solid
rules for its dense layers, both for exactly this reason, and both of them
looked deliberate -- a filled shape is not obviously a bug. So a device may
not draw more marks across the plate than the grid can separate: about 24 in a
row at this size. Where the real number is larger (45 tools), it is shown as
15 x 3, which can still be counted; where it is a texture (a waveform), it is
thinned until the samples separate.
"""
from __future__ import annotations

import argparse
import math
import sys
from importlib import import_module
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
art = import_module("bake-art")
import screen  # noqa: E402

#: Supersample per cell while drawing. 16 makes a 0.2-cell hairline three
#: device pixels wide before the cell average sees it, which is the point:
#: the average is what antialiases a stroke, so the stroke has to be resolved
#: before it is averaged.
SS = 16
COLS, ROWS = 48, 60
BOX = (24, 30)
DENSITY = 2


class Sheet:
    """A drawing surface measured in CELLS, on paper.

    Values are LUMINANCE: 1.0 is bare paper, 0.0 is the deepest mark the plate
    can hold. Every primitive corrects PIL's endpoint-inclusive box, for the
    same reason the still renderer does -- a shape asked for at width W is
    painted W + 1 across, and at 16x that is a percent of a cell of extra ink on
    every edge of every mark, biased one way, on eight plates.
    """

    def __init__(self, cols: int = COLS, rows: int = ROWS):
        self.cols, self.rows = cols, rows
        self.im = Image.new("L", (cols * SS, rows * SS), 255)
        self.d = ImageDraw.Draw(self.im)

    def _v(self, v: float) -> int:
        return int(round(max(0.0, min(1.0, v)) * 255))

    def rect(self, x0: float, y0: float, x1: float, y1: float, v: float = 0.0) -> None:
        self.d.rectangle(
            (x0 * SS, y0 * SS, x1 * SS - 1, y1 * SS - 1), fill=self._v(v)
        )

    def bar(self, cx: float, cy: float, w: float, h: float, v: float = 0.0) -> None:
        self.rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, v)

    def disc(self, cx: float, cy: float, d: float, v: float = 0.0) -> None:
        r = d / 2
        self.d.ellipse(
            ((cx - r) * SS, (cy - r) * SS, (cx + r) * SS - 1, (cy + r) * SS - 1),
            fill=self._v(v),
        )

    def line(self, x0: float, y0: float, x1: float, y1: float, w: float = 0.25, v: float = 0.0) -> None:
        self.d.line(
            (x0 * SS, y0 * SS, x1 * SS, y1 * SS),
            fill=self._v(v),
            width=max(1, int(round(w * SS))),
        )

    def elbow(self, x0: float, y0: float, x1: float, y1: float, turn: float, w: float = 0.25, v: float = 0.0) -> None:
        """Down, across, down. A right angle, because these diagrams are about
        machines that do the same thing every time; a diagonal is drift."""
        self.line(x0, y0, x0, turn, w, v)
        self.line(x0, turn, x1, turn, w, v)
        self.line(x1, turn, x1, y1, w, v)

    def raster(self) -> np.ndarray:
        return np.asarray(self.im).astype(np.float32) / 255.0


# ═══════════════════════════════════════════════════════════════════════════
# 1. Recurly Agent Platform
# ═══════════════════════════════════════════════════════════════════════════
def recurly() -> Sheet:
    """A requirement enters a chain of five specialised agents and leaves as
    merged pull requests -- and the chain is BROKEN five times, once per human
    checkpoint, by a hole of bare paper.

    The holes are the whole diagram. The project's claim is not "an agent did
    it"; it is "three times faster with all five human checkpoints still in
    place, and the time came out of the waits between handoffs, not out of the
    review". A chain drawn unbroken would be a picture of the thing he
    deliberately did not build. So the last thing this function does is erase.
    """
    s = Sheet()
    # The written requirement: a document, set as four rules of type. Kept
    # thin and clear of the chain, so it reads as the thing that ENTERS rather
    # than as the first station of it.
    for y, w in ((1.4, 21), (3.4, 18), (5.4, 20), (7.4, 11)):
        s.rect(13.5, y, 13.5 + w, y + 0.85)

    # The chain: a conduit, with five agent stations across it -- planner,
    # decomposer, the Sonnet and Opus coder pair, the pull request responder.
    # The conduit is wide enough to BE something, because the holes below are
    # cut out of it and a hole in a hairline is just a shorter hairline.
    s.rect(19.0, 12.0, 29.0, 52.6)
    for y in (14.6, 22.6, 30.6, 38.6, 46.6):
        s.bar(24, y, 18, 2.8)

    # The fan: merged pull requests.
    for x in (12.0, 24, 36.0):
        s.line(24, 52.4, x, 55.2, 0.5)
        s.bar(x, 56.8, 8.4, 2.2)

    # Five human checkpoints, cut through everything above. Wider than the
    # conduit and wider than the stations, so each one is unmistakably a hole
    # punched in the plate rather than a gap left between two marks.
    for y in (18.6, 26.6, 34.6, 42.6, 50.4):
        s.bar(24, y, 24, 1.9, 1.0)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 2. Checkpoint
# ═══════════════════════════════════════════════════════════════════════════
def checkpoint() -> Sheet:
    """Five columns of adversarial test cases, thickening downward as the
    turns go deeper -- and one column that stops at row three.

    Five columns because the product generates across exactly five categories
    (happy paths, edge cases, adversarial prompts, policy boundaries, ambiguous
    inputs). Thickening downward because the cases get harder as a conversation
    goes on. The truncated column is the thesis, in his own words: "most
    interesting agent bugs only appear on turn three or later" -- so the column
    that matters is the one that is not there, and the verdict rule at the foot
    is broken under it. A green build with a hole in it.
    """
    s = Sheet()
    xs = (6.5, 15.4, 24.0, 32.6, 41.5)
    stops = (9, 9, 9, 3, 9)  # the fourth suite dies on turn three
    for x, stop in zip(xs, stops):
        s.bar(x, 4.0, 3.4, 2.2)  # the submitted agent config
        last = 8.0 + (stop - 1) * 5.0
        s.rect(x - 0.16, 5.4, x + 0.16, last + 2.4, 0.30)
        for r in range(stop):
            s.bar(x, 8.0 + r * 5.0, 2.4 + r * 0.62, 1.0 + r * 0.20)

    # The verdict: one rule under the whole suite, cut where the suite stopped.
    s.rect(3, 53.4, 45, 54.6)
    s.rect(28.6, 53.0, 36.6, 55.0, 1.0)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 3. App Crawler
# ═══════════════════════════════════════════════════════════════════════════
def crawler() -> Sheet:
    """A depth-first traversal of an Android UI, as a dendrogram.

    Every node is a screen; every drop is a tap. The leftmost root-to-leaf
    path is inked heavily and everything else is a hairline, because that is
    what depth-first MEANS: the agent commits to one branch all the way down
    before it will look at the second. One leaf is a stub rather than a node --
    the sub-1% of tasks that die in a state nobody designed for, which the
    self-healing CronJobs pick back up.
    """
    s = Sheet()
    # Screens, as they branch. The leftmost spine is five deep on purpose: it
    # is the only path drawn heavy, and it has to reach the foot of the plate
    # for "depth-first" to be a picture rather than a caption.
    tree = (
        ((((None, None), None), (None, None)), ((None,), (None, None))),
        (((None, None), (None,)), (None, (None, None))),
        ((None, (None, None)), ((None,), None)),
    )
    levels = (3.6, 14.0, 24.4, 34.8, 45.2, 54.5)
    dead = {5, 13}  # states nobody designed for; the CronJobs pick these back up

    def leaves(node) -> int:
        return 1 if node is None else sum(leaves(k) for k in node)

    n_leaves = leaves(tree)
    slot = [0]

    def draw(node, depth: int, hot: bool) -> float:
        y = levels[depth]
        if node is None:
            i = slot[0]
            slot[0] += 1
            x = 3.2 + i * (41.6 / (n_leaves - 1))
            if i in dead:
                s.bar(x, y, 2.8, 0.85, 0.06)  # a stub: the traversal died here
            else:
                s.disc(x, y, 2.8 if hot else 1.6, 0.0 if hot else 0.26)
            return x
        kids = [draw(k, depth + 1, hot and i == 0) for i, k in enumerate(node)]
        x = sum(kids) / len(kids)
        for i, kx in enumerate(kids):
            heavy = hot and i == 0
            s.elbow(x, y, kx, levels[depth + 1], (y + levels[depth + 1]) / 2,
                    0.62 if heavy else 0.20, 0.0 if heavy else 0.36)
        s.disc(x, y, 3.4 if hot else 1.9, 0.0 if hot else 0.20)
        return x

    draw(tree, 0, True)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 4. QualGent AI Assistant
# ═══════════════════════════════════════════════════════════════════════════
def qualgent() -> Sheet:
    """One orchestrator, fifteen routes, forty-five tools and sub-agents --
    and three routes taken.

    Forty-five marks, counted: fifteen columns of three. Not forty-five rays,
    which is the version that was drawn first and baked as a solid dome (see
    the rule in the module docstring). The three heavy rays are the whole
    engineering claim in his own words -- "with 45+ tools available, picking
    the right three is the whole problem" -- so the device is about the twelve
    routes NOT taken as much as the three that were. The rank sits on the three
    surfaces the tools actually live behind: RAG retrieval, the MCP
    Postgres/pgvector toolbox, and Jira and Linear through OAuth.
    """
    s = Sheet()
    n = 15
    apex = (24.0, 7.6)
    bus = 25.0
    xs = [4.0 + i * (40.0 / (n - 1)) for i in range(n)]
    taken = {2, 7, 11}
    for i, x in enumerate(xs):
        hot = i in taken
        s.line(apex[0], apex[1] + 2.8, x, bus, 0.62 if hot else 0.20, 0.0 if hot else 0.34)
    s.disc(*apex, 6.4, 0.0)
    for i, x in enumerate(xs):
        hot = i in taken
        for r in range(3):
            y = bus + 3.4 + r * 5.2
            if hot:
                s.disc(x, y, 3.0, 0.0)
            else:
                s.bar(x, y, 1.3, 1.3, 0.32)
    for x0, x1 in ((2.6, 16.2), (17.2, 30.8), (31.8, 45.4)):
        s.rect(x0, 48.4, x1, 49.6, 0.0)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 5. CLIP-H
# ═══════════════════════════════════════════════════════════════════════════
def cliph() -> Sheet:
    """A Top-K sparse autoencoder: a dense rank in, a rank of mostly-empty
    sockets, a dense rank out -- and every path in the plate running through
    five units.

    The middle rank is drawn WIDER than the two it sits between, because an
    overcomplete code is wider; but only five of its forty-four units are lit,
    so in INK the plate reads wide-narrow-wide, which is the shape the
    mechanism actually has. Sparsity is the product here: features "sparse
    enough to be named and inspected". A dense middle rank would be a picture
    of an ordinary autoencoder, which is the thing this is not.
    """
    s = Sheet()
    # Twenty in, twenty-five out: overcomplete, and both ranks still countable.
    # At thirty and forty-four the two dense layers baked as solid rules and the
    # code rank as one faint hairline -- the grid cannot separate marks closer
    # than about 1.8 cells, and a layer you cannot count is not a layer.
    n_in, n_code = 20, 25
    y_in, y_code, y_out = 8.5, 30.0, 51.5
    xin = [4.0 + i * (40.0 / (n_in - 1)) for i in range(n_in)]
    xcode = [2.6 + i * (42.8 / (n_code - 1)) for i in range(n_code)]
    active = [2, 7, 11, 17, 22]

    # Seven paths per feature, not fifty in total, and each one thick enough to
    # BE a path. Drawn denser, the plate baked as a grey lozenge at its real
    # size of 144 x 180 CSS pixels with the five features lost inside it, which
    # inverts the picture the device is for: the claim is that a handful of
    # named features carry the whole reconstruction, so the five have to be the
    # loudest marks on the sheet and the paths have to be countable. Judged at
    # 1x on paper, not at the 3x it is comfortable to draw at.
    for a in active:
        for j in range(1, n_in, 5):
            s.line(xin[j], y_in + 3.0, xcode[a], y_code - 4.2, 0.22, 0.28)
        for j in range(3, n_in, 6):
            s.line(xcode[a], y_code + 4.2, xin[j], y_out - 3.0, 0.22, 0.28)

    for x in xin:
        s.disc(x, y_in, 1.7, 0.0)
        s.disc(x, y_out, 1.7, 0.0)
    for i, x in enumerate(xcode):
        if i in active:
            continue
        s.bar(x, y_code, 0.72, 2.3, 0.22)  # an empty socket
    for a in active:
        s.disc(xcode[a], y_code, 4.2, 0.0)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 6. Clinical AI Assistant
# ═══════════════════════════════════════════════════════════════════════════
def clinical() -> Sheet:
    """An on-device speech pipeline: a waveform becomes tokens becomes text,
    and nothing on the plate leaves the plate.

    Three bands, top to bottom, and the whole point is that they are all on one
    sheet: "a zero-API, on-device speech pipeline, so protected health
    information never leaves the device". The waveform is two utterances with a
    breath between them, the token rank is what the local model emits, and the
    six ragged rules are the note it writes -- the ~40% of documentation
    overhead that stops being the nurse's problem.
    """
    s = Sheet()
    mid = 14.6
    n = 30
    # Thirty strokes at 1.4 cells, not forty-five at 0.96. At the tighter pitch
    # the cell average merges neighbouring strokes and the waveform bakes as a
    # cloud -- recognisably organic, not recognisably SOUND. A waveform is only
    # a waveform if you can see the individual samples against the axis.
    xs = [3.6 + i * (40.6 / (n - 1)) for i in range(n)]
    for i, x in enumerate(xs):
        u = i / (n - 1)
        # Two utterances with a breath between: an envelope, then the fine
        # structure that makes it speech rather than a sine.
        env = math.exp(-(((u - 0.23) / 0.18) ** 2)) + 0.94 * math.exp(-(((u - 0.71) / 0.19) ** 2))
        fine = 0.42 + 0.58 * abs(math.sin(u * 18.5 + 0.7))
        a = max(10.8 * min(1.0, env) * fine, 0.55)
        s.bar(x, mid, 0.66, a * 2)
    s.rect(2.6, mid - 0.16, 45.4, mid + 0.16, 0.30)  # the axis

    # What the local model emits: a token rank, evenly spaced, no longer sound.
    for i in range(21):
        s.disc(4.4 + i * 1.96, 30.4, 1.9, 0.0)

    # The note the nurse does not have to write.
    for r, w in enumerate((40, 37, 41, 31, 39, 21)):
        y = 36.0 + r * 4.1
        s.rect(4.0, y, 4.0 + w, y + 1.45)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 7. LLM Multi-Agent QA
# ═══════════════════════════════════════════════════════════════════════════
def qa() -> Sheet:
    """Four agents in deterministic lockstep: planner, executor, verifier,
    supervisor, and a token that visits them in that order, always.

    Every connector is a right angle and every step is the same height,
    because the claim being made is ">99% deterministic execution": the
    picture has to be a mechanism, not a walk. The long return leg from the
    supervisor back to the planner is the recovery path -- it is the only
    stroke that crosses the whole plate, and it happens once per episode,
    four times on the sheet.
    """
    s = Sheet()
    lanes = (7.0, 18.0, 29.0, 40.5)
    rows_n = 16
    y0, dy = 9.0, 3.0
    for x in lanes:
        s.bar(x, 4.2, 5.2, 2.0)
        s.rect(x - 0.16, 5.6, x + 0.16, 55.0, 0.42)
    prev = None
    for r in range(rows_n):
        x = lanes[r % 4]
        y = y0 + r * dy
        if prev is not None:
            px, py = prev
            s.elbow(px, py, x, y, py + dy * 0.55, 0.30, 0.14)
        s.disc(x, y, 2.4, 0.0)
        prev = (x, y)
    return s


# ═══════════════════════════════════════════════════════════════════════════
# 8. WalleX
# ═══════════════════════════════════════════════════════════════════════════
def wallex() -> Sheet:
    """One plate, and the edition pulled from it: twenty-two impressions,
    receding.

    Every other project on this page is a system with stages. This one is a
    person and an audience -- solo product build, October 2024, the earliest
    thing on the site and the only one he made alone end to end -- so the
    mechanism worth cutting is that asymmetry itself: **one maker, many
    hands**. A bevelled copper plate at the head of the sheet, the bed of the
    press under it, and twenty-two impressions below, one per country, each
    the plate's own 3:2 proportion at a smaller size as the edition goes out.

    This replaces a ranked bar chart of users per country. That drawing was
    legible and honest and it was still the wrong plate: it described an
    OUTCOME where the other seven describe a MACHINE, so it broke the set's
    grammar in the last position on the page, which is the one a reader leaves
    on. A chart is also the one thing an engraving cannot do better than a
    spreadsheet.

    ── Why the impressions shrink instead of fading ───────────────────────────
    They shrink because in this medium tone is not a channel. The transfer maps
    luminance 0.00 to a 0.869-cell dot and 0.48 -- a mid grey, half as dark --
    to 0.774, an 11% difference nobody sees, while HALVING the mark's area
    halves the ink exactly. That is the whole of section 5.3 of the direction
    stated as a drawing rule: if you want a mark to read as less, make it
    smaller, because value here is area and nothing else.
    """
    s = Sheet()

    # The plate: an inked bevel, a band of bare paper, an inked field. The
    # bevel is what makes a rectangle read as an OBJECT rather than as a filled
    # shape, and every band of it has to be at least 2.4 cells wide. At 1.3 it
    # vanished: a dot is up to 0.869 cells across and the screen jitters it
    # +/-0.34, so two facing rows of ink close a gap of 1.56 cells between them
    # on their own and the plate baked as one solid block. A paper gap in this
    # medium is 2.4 cells or it is not a gap.
    s.rect(15.0, 2.2, 33.0, 15.2)
    s.rect(17.4, 4.6, 30.6, 12.8, 1.0)
    s.rect(19.8, 7.0, 28.2, 10.4)

    # The bed of the press: the moment of the pull, and the line the singular
    # side of the plate sits on.
    s.rect(3.0, 18.6, 45.0, 19.3)

    # The edition. Twenty-two, in rows of six, six, five and five -- countable
    # at a glance, which at this size beats measurable. Each impression holds
    # the plate's 3:2 proportion, so the field below the rule is recognisably
    # the object above it, repeated.
    rows = ((6, 4.2, 24.4), (6, 3.5, 33.0), (5, 2.8, 41.6), (5, 2.1, 50.2))
    for count, w, y in rows:
        span = 38.0
        for i in range(count):
            x = 24.0 - span / 2 + i * (span / (count - 1))
            s.bar(x, y, w, w / 1.5)
    return s


DEVICES = [
    ("deviceRecurly", "device-recurly", recurly, "Recurly Agent Platform"),
    ("deviceCheckpoint", "device-checkpoint", checkpoint, "Checkpoint"),
    ("deviceCrawler", "device-crawler", crawler, "App Crawler"),
    ("deviceQualgent", "device-qualgent", qualgent, "QualGent AI Assistant"),
    ("deviceClipH", "device-clip-h", cliph, "CLIP-H"),
    ("deviceClinical", "device-clinical", clinical, "Clinical AI Assistant"),
    ("deviceQa", "device-qa", qa, "LLM Multi-Agent QA System"),
    ("deviceWallex", "device-wallex", wallex, "WalleX"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="directory for 1x review PNGs, on paper")
    ap.add_argument("--only", help="one export name, while drawing")
    args = ap.parse_args()

    chosen = [d for d in DEVICES if not args.only or d[0] == args.only]
    plates = []
    for export, slug, fn, title in chosen:
        sheet = fn()
        plates.append(
            art.Plate(
                export=export,
                raster=sheet.raster(),
                cols=COLS,
                rows=ROWS,
                profile=art.PROFILES["lineart"],
                still=f"{slug}@2x.webp",
                note=f"{title}: the mechanism as a printer's device. "
                f"A {BOX[0]} x {BOX[1]} lattice box at density {DENSITY}.",
                density=DENSITY,
            )
        )

    measured = art.bake_module(
        "plate-devices",
        plates,
        "scripts/bake-devices.py",
        "Eight project devices, one per src/content/projects.ts entry.\n"
        "Each is a diagram of that project's mechanism, drawn as vector\n"
        f"geometry: a {BOX[0]} x {BOX[1]} lattice box at density {DENSITY}, {COLS} x {ROWS} cells.\n"
        "One ink, no datum, no rim: the second ink is licensed elsewhere.",
    )
    art.check_manifest(measured)

    if args.preview:
        out = Path(args.preview)
        out.mkdir(parents=True, exist_ok=True)
        for p in plates:
            assert p.field is not None
            img = screen.render(p.field, 9 / DENSITY, transparent=False)
            img.convert("RGB").save(out / f"{p.export}.png")
        print("previews in", out)


if __name__ == "__main__":
    main()
