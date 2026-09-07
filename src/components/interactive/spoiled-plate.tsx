"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { BoardField } from "@/content/portrait-types";
import { createBoard } from "@/lib/board";
import { motionAllowed, onMotionChange } from "@/lib/motion";

/**
 * The 404's figure: "404" made of dots, pulled off the press and stopped
 * part-way.
 *
 * The site's dot renderer (src/lib/board.ts) assembles a field by growing
 * every cell in place after a delay that rises with its distance from the
 * field's centre — so an assembly caught mid-way is not a random half of the
 * picture, it is a picture whose middle is inked and whose extremities never
 * arrived. Which is exactly what a failed pull looks like: the press did not
 * come down hard enough at the edges of the plate and the ink stopped short.
 *
 * So this board runs its assembly and then simply refuses to finish it. The
 * clock the renderer reads is `now - assembleStart`, and this component owns
 * that clock: it hands the board an elapsed time clamped at FREEZE_MS and
 * stops scheduling frames once it gets there. Nothing is paused and nothing
 * is waiting to resume — there is no later state.
 *
 * Why not <DotBoard mode="text">: the assembly there is driven by an
 * open-ended rAF loop that any pointer move, scroll or resize re-enters with
 * a fresh timestamp, so a freeze would have had to be threaded through every
 * one of those paths inside a component three other surfaces share. It also
 * draws on a viewport-fixed canvas whose dots disperse on scroll, and a
 * spoiled sheet does not disperse — it sits there being wrong. This board is
 * boxed, draws once, and answers to nothing.
 *
 * Under reduced motion, from either switch, the identical frozen frame is
 * drawn on the first paint and no animation ever runs. Without JavaScript, or
 * where a 2D context cannot be had, the figure is set in type instead
 * (`.spoiled-fallback` in plates.css); the box does not change size either
 * way, so nothing moves.
 *
 * PULL IT AGAIN. The plate is a button, and pressing it brings the press down
 * again: the assembly advances to the next entry in FREEZES and stops again,
 * still short, and the readout counts the attempt. The increments shrink, so
 * the sequence is visibly asymptotic — it converges around 574 ms of an 1100
 * ms assembly and the last cells never arrive. That is the joke and it is
 * also true: no amount of pressure fixes a spoiled plate.
 *
 * It costs one draw per click and nothing else. There is no rAF, no easing
 * and no tween, in either motion mode — a press coming down is a discrete
 * event, not an animation, so reduced motion and full motion do the same
 * thing here and the site's zero-idle-frames rule is untouched.
 */

/**
 * The box, in whole lattice cells. These two pairs must agree with
 * `--plate-cols/-rows` in plates.css, which is what actually sizes the box —
 * the breakpoint is resolved in CSS, never here, so the phone box is right on
 * the first frame and nothing below it moves after hydration. 2:1, which is
 * about the aspect three lining figures set solid.
 */
const BOX = { cols: 80, rows: 40, colsSm: 64, rowsSm: 32 };

/**
 * One cell per lattice step: a 6 px dot, the same dot as everywhere else on
 * the site. Halving it to sharpen the glyph was tried and measured, and it
 * fails on the machines this has to work on — at 3 px cells the dots are
 * 2.6 px across and a 1x panel antialiases them into a mottled grey with no
 * dots left in it. The dot has to stay a dot.
 */
const DENSITY = 1;

const PHONE = "(width < 48rem)";

/** The rasteriser draws nothing while a webfont is still loading. Wait, briefly. */
const FONT_WAIT_MS = 1200;

/**
 * Where the press stopped, in milliseconds into an assembly that would have
 * taken 1100. Chosen by looking at it across the range: at 470 the sheet is
 * only faintly short at the edges and reads as finished; at 320 the fours
 * have lost their diagonals. At 400 the nought is solid, both fours are
 * unmistakably fours, and the ink visibly stops before it reaches either end
 * of the plate.
 */
const FREEZE_MS = 400;

/**
 * Where the press stops on each successive pull, in ms into the same 1100 ms
 * assembly. The first press-again advances 66 ms — six per cent of the whole
 * pull — and every one after it advances 0.62 of the increment before it, so
 * the series converges at 400 + 66/(1 − 0.62) ≈ 574 and the plate is done
 * moving long before it is done printing.
 *
 * Seven is the cap, and it is not arbitrary either: by PULL VII the increment
 * is six milliseconds, which is under half a frame at 60 Hz. A pull that
 * cannot change a pixel is not a pull, so the press stops offering one.
 *
 * board.ts starts each cell growing at `600 × (0.55·dist + 0.25·(1−L) +
 * 0.2·rand)` and takes 500 ms to grow it, so the last cells of this glyph
 * begin at about 545 ms and finish at about 1045. At 564 they have barely
 * started. The edges of the sheet never take.
 */
const FREEZES = [FREEZE_MS, 466, 507, 532, 548, 558, 564];

/** The attempt, as a printer would number it. One entry per FREEZES entry. */
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** Below this the glyph's coverage is not ink, it is the edge of the paper. */
const INK_FLOOR = 0.1;

/**
 * The renderer's ink transfer, inverted.
 *
 * board.ts reads a cell's stored value as the LUMINANCE of a photograph and
 * lays ink down in inverse proportion: `inked = max(L, 0.16) ** 0.55`, then
 * `area = (1 - inked) ** 1.15`, and the dot's diameter is the square root of
 * that. Storing a glyph as its plain negative (L = 1 - coverage) therefore
 * attenuates it twice, and the measured result was a Didone with no Didone
 * left in it: the fat stems survived at full ink, every hairline came out
 * under the renderer's cull diameter, and "404" read as "1 0 1".
 *
 * So the field is written by running that curve backwards. `inkFor(a)` returns
 * the luminance that makes the renderer lay down ink in proportion to the
 * glyph's own coverage at that cell — a stem gets a full dot, a hairline gets
 * a small one, and the shape of the letter survives the screen.
 *
 * MAX_AREA is the ceiling the curve can reach at all (the DEEP_FLOOR clamp
 * inside board.ts) and is here only to keep the inverse honest. INK_CEIL is
 * what a solid cell actually asks for, and it is lower on purpose: the
 * ceiling puts a 5.2 px dot in a 6 px cell, and on a 1x panel a 0.8 px gap
 * is not a gap — it antialiases away and the field stops being dots and
 * becomes a smear. 0.50 is a 4.8 px dot with 1.2 px of paper around it,
 * which survives being drawn at one device pixel per CSS pixel. GAMMA lifts
 * the middle of the range so a hairline is still a dot rather than nothing.
 */
const MAX_AREA = 0.5931; // (1 - 0.16 ** 0.55) ** 1.15
const INK_CEIL = 0.5;
const GAMMA = 0.62;

function inkFor(a: number): number {
  const area = Math.min(MAX_AREA, Math.pow(a, GAMMA) * INK_CEIL);
  const inked = 1 - Math.pow(area, 1 / 1.15);
  return Math.pow(inked, 1 / 0.55);
}

function cssVar(el: Element, name: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/**
 * "404" rasterised into a dot field.
 *
 * Supersampled 4x and averaged down to the cell grid, then each cell's glyph
 * coverage is put through `inkFor` so the renderer lays down a dot of
 * proportional area. Anything under INK_FLOOR is not a cell at all — below
 * that the renderer would cull the dot anyway, and cells that draw nothing
 * still cost an entry in every per-cell array.
 */
function plateField(text: string, w: number, h: number, family: string): BoardField | null {
  const ss = 4;
  const canvas = document.createElement("canvas");
  canvas.width = w * ss;
  canvas.height = h * ss;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Measure at a reference size and scale to the ink box, not the advance
  // box: lining figures carry side bearings, and fitting the advance would
  // leave the plate looking mis-registered before it even failed.
  const weight = 500;
  ctx.font = `${weight} 100px ${family}`;
  const ref = ctx.measureText(text);
  const refW = ref.actualBoundingBoxLeft + ref.actualBoundingBoxRight;
  const refH = ref.actualBoundingBoxAscent + ref.actualBoundingBoxDescent;
  if (!(refW > 0) || !(refH > 0)) return null;

  const size =
    100 * Math.min((canvas.width * 0.99) / refW, (canvas.height * 0.94) / refH);
  ctx.font = `${weight} ${size}px ${family}`;
  const box = ctx.measureText(text);
  // Flush left on the ink and centred on the ink's own height, so the first
  // dot of the figure lands on the same column edge as the headline under it.
  const inkH = box.actualBoundingBoxAscent + box.actualBoundingBoxDescent;
  ctx.fillText(
    text,
    box.actualBoundingBoxLeft,
    (canvas.height - inkH) / 2 + box.actualBoundingBoxAscent,
  );

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bytes = new Uint8Array(w * h);
  let count = 0;
  let sx = 0;
  let sy = 0;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let sum = 0;
      for (let y = 0; y < ss; y++) {
        for (let x = 0; x < ss; x++) {
          sum += data[((j * ss + y) * canvas.width + i * ss + x) * 4];
        }
      }
      const a = sum / (ss * ss * 255); // glyph coverage, 0..1
      if (a < INK_FLOOR) continue;
      bytes[j * w + i] = Math.min(255, Math.max(1, Math.round(inkFor(a) * 255)));
      count++;
      sx += i;
      sy += j;
    }
  }
  if (count === 0) return null;

  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return {
    w,
    h,
    count,
    // No datum: the one always-vermilion dot belongs to his eye on the home
    // page. The accent on this page is the register mark, and it is markup.
    datum: [-1, -1],
    // The centre the assembly radiates from, which is what decides where the
    // pull fails first.
    center: [Math.round(sx / count), Math.round(sy / count)],
    rim: [],
    data: btoa(bin),
  };
}

export function SpoiledPlate({ text = "404" }: { text?: string }) {
  const figureRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The motion policy can flip mid-session (the palette's toggle, the OS
  // setting). Each change rebuilds: a frozen frame drawn once when reduced,
  // the assembly-and-stall when restored.
  const [motionEpoch, setMotionEpoch] = useState(0);
  useEffect(() => onMotionChange(() => setMotionEpoch((n) => n + 1)), []);

  /**
   * Which pull this is, 1-based. State, because it is on the page in words;
   * `freezeRef` carries the same fact to the draw loop, which must not be
   * torn down and rebuilt to learn it — a rebuild would restart the assembly
   * from zero and the pulls would stop being cumulative.
   */
  const [attempt, setAttempt] = useState(1);
  const freezeRef = useRef(FREEZES[0]);
  /** Set by the running board; the click handler's one call into it. */
  const pullRef = useRef<(() => void) | null>(null);
  /**
   * The press exists. False without JavaScript and false where the 2D context
   * could not be had — in both of those the figure is type, and a button over
   * a piece of type would be a lie. It costs no layout either way: the button
   * is absolutely positioned over the plate.
   */
  const [pressable, setPressable] = useState(false);

  const spent = attempt >= FREEZES.length;

  const pull = useCallback(() => {
    if (spent) return;
    const next = attempt + 1;
    freezeRef.current = FREEZES[next - 1];
    setAttempt(next);
    // One draw. No rAF, no tween, no easing, in either motion mode: the press
    // came down, and that is a state change rather than an animation.
    pullRef.current?.();
  }, [attempt, spent]);

  useEffect(() => {
    const figure = figureRef.current;
    const canvas = canvasRef.current;
    if (!figure || !canvas) return;

    let disposed = false;
    let generation = 0;
    let stop: (() => void) | null = null;

    const phoneQuery = window.matchMedia(PHONE);
    const motion = motionAllowed();

    const start = (field: BoardField): (() => void) | null => {
      const colors = {
        ink: cssVar(figure, "--ink", "#efe9dc"),
        sun: cssVar(figure, "--sun", "#e2673c"),
        off: cssVar(figure, "--dot-off", "rgba(239,233,220,0.08)"),
      };
      const board = createBoard(canvas, field, { mode: "still", colors, pointer: false });
      if (!board) {
        figure.dataset.plate = "fallback";
        setPressable(false);
        return null;
      }
      figure.dataset.plate = "spoiled";
      setPressable(true);

      let raf = 0;
      let t0 = 0;

      // The grid origin snaps to the page lattice, so an unlit cell and the
      // field dot beneath it would be the same pixel; the canvas bleeds one
      // pitch on every side so a snapped origin just outside the box is not
      // clipped. Read fresh every time: the pitch steps at 80rem and the DPR
      // changes with zoom or a display move.
      const relayout = () => {
        const pitch = parseFloat(cssVar(figure, "--pitch", "6")) || 6;
        const rect = figure.getBoundingClientRect();
        board.layout({
          width: rect.width + 2 * pitch,
          height: rect.height + 2 * pitch,
          originX: Math.round(rect.left / pitch) * pitch - rect.left + pitch,
          originY: Math.round(rect.top / pitch) * pitch - rect.top + pitch,
          // The cell is a fraction of the page lattice, so every second dot
          // still sits on a page dot.
          pitch: pitch / DENSITY,
          lattice: pitch,
          dpr: Math.min(window.devicePixelRatio || 1, 2),
        });
      };

      // The board's assembly clock is `now - assembleStart`. Anchoring the
      // start at zero makes the number handed to frame() the elapsed time
      // itself, which is the whole mechanism: clamp it and the picture stops.
      board.assemble(0);

      // The clamp is read fresh on every draw rather than closed over, which
      // is the whole of "pull it again": the click moves the clamp and asks
      // for one frame, and this board never learns that anything happened.
      const draw = (elapsed: number) => board.frame(Math.min(elapsed, freezeRef.current));

      const loop = (now: number) => {
        raf = 0;
        if (disposed) return;
        if (!t0) t0 = now;
        const elapsed = now - t0;
        draw(elapsed);
        // No `more` check and no finish: there is no state after this one.
        if (elapsed < freezeRef.current) raf = requestAnimationFrame(loop);
      };

      // `Infinity` clamps to whatever the current freeze is, which is what a
      // press does: it comes down all the way, and the plate stops it.
      pullRef.current = () => {
        if (!disposed) draw(Infinity);
      };

      // Synchronous, not coalesced into the next frame: reallocating the
      // bitmap clears it, and a board that only ever draws once would show a
      // blank rectangle for however long the frame took to arrive. It is a
      // few thousand cells; the redraw costs well under a millisecond.
      const onResize = () => {
        if (disposed) return;
        relayout();
        // Whatever the clock says now, clamped: a resize repaints the same
        // spoiled sheet at the new size, it does not restart the press.
        draw(t0 ? performance.now() - t0 : Infinity);
      };

      relayout();
      window.addEventListener("resize", onResize);

      if (motion) {
        raf = requestAnimationFrame(loop);
      } else {
        // Reduced motion: the finished state is the frozen one, drawn once —
        // at whichever pull the visitor has reached, so a click still lands.
        t0 = performance.now() - freezeRef.current;
        draw(Infinity);
      }

      return () => {
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        pullRef.current = null;
        board.dispose();
      };
    };

    /** The figure carries the face the plate is set in; read it off the DOM. */
    const boot = async () => {
      const gen = ++generation;
      const phone = phoneQuery.matches;
      const w = (phone ? BOX.colsSm : BOX.cols) * DENSITY;
      const h = (phone ? BOX.rowsSm : BOX.rows) * DENSITY;
      const family = getComputedStyle(figure).fontFamily || "serif";
      const first = family.split(",")[0].trim();

      // A webfont that has not loaded draws nothing on a canvas. Wait for it,
      // but never longer than FONT_WAIT_MS: a figure set in the fallback face
      // is a worse 404 than a late one, and no figure at all is worse still.
      const ready =
        typeof document.fonts?.load === "function"
          ? document.fonts.load(`500 ${h * 4}px ${first}`).then(
              () => undefined,
              () => undefined,
            )
          : Promise.resolve();
      await Promise.race([
        ready,
        new Promise<void>((resolve) => window.setTimeout(resolve, FONT_WAIT_MS)),
      ]);
      if (disposed || gen !== generation) return;

      const field = plateField(text, w, h, family);
      if (disposed || gen !== generation) return;
      if (!field) {
        figure.dataset.plate = "fallback";
        setPressable(false);
        return;
      }
      stop = start(field);
    };

    // The field and the pixel grid follow the 48rem breakpoint and have to
    // match the CSS box exactly, so a flip rebuilds the plate.
    const onBreakpoint = () => {
      stop?.();
      stop = null;
      void boot();
    };
    phoneQuery.addEventListener("change", onBreakpoint);

    void boot();

    return () => {
      disposed = true;
      generation++;
      phoneQuery.removeEventListener("change", onBreakpoint);
      stop?.();
    };
  }, [text, motionEpoch]);

  return (
    <>
      {/* The figure is no longer aria-hidden, because it contains the press.
          Everything inside it that is a picture still is: the canvas and the
          register mark carry their own. */}
      <figure
        ref={figureRef}
        className="spoiled-plate plate-face"
        data-plate="lattice"
        style={
          {
            "--plate-cols-lg": BOX.cols,
            "--plate-rows-lg": BOX.rows,
            "--plate-cols-sm": BOX.colsSm,
            "--plate-rows-sm": BOX.rowsSm,
          } as CSSProperties
        }
      >
        <canvas ref={canvasRef} aria-hidden="true" className="spoiled-canvas" />

        {/* The plate IS the button. It is rendered only once a board is
            actually running — without JavaScript, and where the canvas could
            not be had, this page is type and there is no press to work — and
            it is absolutely positioned over the image, so it takes no layout
            in either case and CLS cannot move.

            aria-disabled rather than disabled at the cap: a disabled button
            leaves the tab order and the visitor never learns why the press
            stopped answering. This one stays reachable and its name says. */}
        {pressable && (
          <button
            type="button"
            className="spoiled-pull"
            data-spent={spent ? "" : undefined}
            aria-disabled={spent || undefined}
            onClick={pull}
          >
            <span className="sr-only">
              {spent
                ? "The plate is spoiled. No further pull will take."
                : "Pull the sheet again"}
            </span>
          </button>
        )}

        {/* The register mark: the cross a printer looks at to see whether the
            sheet came through square. It sits in the margin the plate mark
            makes, outside the image, where a real one does. */}
        <svg
          className="spoiled-register"
          width="19"
          height="19"
          viewBox="0 0 19 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          aria-hidden="true"
        >
          <circle cx="9.5" cy="9.5" r="5.5" />
          <path d="M9.5 0v19M0 9.5h19" />
        </svg>
      </figure>

      {/* The press docket, under the sheet. It is rendered on the server too,
          at PULL I, so its box exists on the first paint and hydration adds
          no line — the live region only ever announces a change a visitor
          asked for. Without JavaScript it is still true: the page loaded, the
          plate did not take, and that was pull one. */}
      <p className="spoiled-readout meta" aria-live="polite">
        Pull {NUMERALS[attempt - 1]} ·{" "}
        {spent ? "the plate is spoiled" : "the plate didn’t take"}
      </p>
    </>
  );
}
