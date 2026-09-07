/**
 * The field on the GPU.
 *
 * This satisfies the same `Board` contract as `src/lib/board.ts` and produces
 * the same picture: the same growth-in-place assembly, the same pointer light
 * measured from each dot's home, the same pin bed, the same scroll dispersal,
 * and the same diameter and colour formula. `board.ts` stays as the fallback
 * and is the reference for all of it; when the two disagree, `board.ts` is
 * right and this is wrong.
 *
 * Why move to the GPU at all, given the 2D renderer is good: the CPU version
 * counting-sorts every dot into one of 256 buckets every frame, which is
 * ~3.6 ms for 16k dots on a laptop and drops to 30 fps on a throttled machine,
 * where the governor then halves the resolution. The same work on the GPU is
 * one transform-feedback pass and one point draw — measured at a locked 60 fps
 * for 262k particles at 2880x1800, with 0.002 ms of main thread per frame. The
 * headroom is what pays for the physics, not a bigger dot count.
 *
 * The state lives in two interleaved vertex buffers that swap each frame
 * (transform feedback, not a float framebuffer: TF buffers are always float32
 * and need no `EXT_color_buffer_float`, and float32 is what keeps an unlit
 * dot pixel-identical to the CSS lattice under it).
 */
import type { BoardField } from "@/content/portrait-types";
import type { Board, BoardOptions, Cell } from "@/lib/board";
import { RELIGHT_GAIN, UNLIT, decodeField, flipOf, surfaceNormals } from "@/lib/board";
import {
  context,
  fieldCaps,
  link,
  linked,
  must,
  parallelCompile,
  rgb,
  uniforms,
  verify,
  type Caps,
} from "./gl";

/** Mulberry32, matching board.ts so the scatter pattern is the same picture. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const ASSEMBLE_MS = 1100;
/** Frames keep being scheduled this long after the last input, then stop. */
const SETTLE_MS = 700;

/** The tear. Every one of these is board.ts's; see the note there. */
const TEAR_SPEED = 600;
const TEAR_FULL = 1800;
const TEAR_DECAY = 0.86;

// Attribute locations, shared by both programs so one VAO serves both.
const A_HOME = 0;
const A_LUM = 1;
const A_FLAGS = 2;
const A_DELAY = 3;
const A_SCATTER = 4;
const A_DISP = 5;
const A_VEL = 6;
const A_NORMAL = 7;

/**
 * Everything both shaders need to agree on. These are the constants from
 * board.ts; a change on either side is a change on both.
 */
const COMMON = /* glsl */ `
const float DIA_MIN = 0.18;
const float DIA_MAX = 2.0;
const float UNLIT = 0.05;
const float FIELD_TONE = 0.04;
const float GROW_MS = 500.0;
const float RELIGHT_GAIN = ${RELIGHT_GAIN.toFixed(4)};

// ── Ink on paper. Every one of these was measured offline before it was
//    written here; see the Stage 0 note in the plan.
//
//    LIFT is not optional. Straight inversion, coverage = (1 - L)^GAIN, gives a
//    mean coverage of 0.55: the hair and the shadow side crush to solid, the
//    eye disappears, and the result is worse than the halftone it replaced.
//    Lifting the source first is the difference between an engraving and a
//    photocopy.
//
//    DEEP_FLOOR holds the 27% of the mask that sits below UNLIT. Taken at face
//    value those cells map to ~0.94 coverage and go nearly solid; that is the
//    single largest cause of the mud.
//
//    1.128 is 2/sqrt(pi), the radius whose disc area equals the coverage.
//    CULL_DIA is the most important line here: a dot too small to resolve is
//    grey haze, and the ABSENCE of a dot is a highlight.
const float LIFT = 0.55;
const float INK_GAIN = 1.15;
const float DEEP_FLOOR = 0.16;
const float CULL_DIA = 0.30;
// A mark smaller than one device pixel used to be culled, because before the
// fragment stage resolved edge coverage it would have printed as a whole black
// pixel -- §5.3.8's "a 0.9 px dot on a 1x panel is a grey pixel and nothing
// else". Analytic coverage answers that at its root: such a mark now prints at
// exactly its own area. So the floor is 0, and the only cull is CULL_DIA, the
// one the direction actually asks for. At DPR 1 this was deleting 13.8% of the
// drawn cells and they were, by construction, the lightest ones.
const float MIN_DEVICE_PX = 0.0;
const float INK_DIA_MAX = 1.42;   // sqrt(2): the diameter at which discs close
const float BURNISH = 0.55;       // the cursor polishes a highlight into the plate
// gl_PointSize cannot be anisotropic, so a mark cannot squash the way the
// spacing between marks does. Shrinking it with |uFlip| is the next best
// reading of the same thing -- foreshortening -- and it is what keeps the
// edge-on frame a hairline rather than a solid slab of ink.
const float FLIP_MIN = 0.32;

// The burin is gone, and the measurement is why.
//
// The idea was right and the scale was wrong. A stroke laid along the surface
// tangent is what separates a mezzotint from a fax — but it needs a plate whose
// marks are large next to its features. Here a cell is 3 CSS px and his face is
// ninety cells across, so a 1.7-cell stroke crosses an eyelid instead of drawing
// it. And the threshold was a FRACTION of the realised range, which once the
// deep floor caps coverage at 0.594 put the trigger at 0.428: that fired on
// 38.7% of all lit cells and on **46.8% of the cells in his face**, against the
// 28% the direction asked for. The tangents then closed into concentric whorls
// around every local extreme — precisely the tic §5.3a of the plan warned about
// — and blending toward a fixed hatch angle did not stop it. The face read as a
// fingerprint.
//
// Measured on the shipped field, the same 192×240 data rendered four ways:
// face sharpness (mean |laplacian|) is 122.6 with neither burin nor jitter and
// 109.3 with both, and the render correlates 0.54 with the version before
// either landed. The owner's word for it was "fuzzy", and he was right.
//
// The deepest tones are discs now, like every other tone. Value is still
// carried by area alone, which is the part of the direction that was load-
// bearing; the strokes were the part that was decorative.

uniform vec2  uOrigin;    // grid origin, CSS px
uniform float uPitch;     // cell size, CSS px
uniform float uLattice;   // page dot pitch, CSS px
uniform float uDensity;   // cells per lattice step
uniform vec2  uPointer;   // CSS px
uniform float uHasPointer;
uniform float uPush;      // pin bed enabled
uniform float uScrollT;   // dispersal, 0..1
uniform float uElapsed;   // ms since assemble(), or -1 when not assembling
uniform float uSettled;
uniform float uTear;      // 0..1, how hard the pointer is tearing
uniform vec2  uTearDir;   // unit vector, the pointer's direction of travel
uniform vec2  uSunDir;    // where the light comes FROM, faded by distance
uniform float uPull;      // 0 = the plate, 1 = the printed sheet
// The turn. An engraver cuts a plate in reverse because the sheet it prints is
// its mirror, so the field is drawn reversed until the pull and the right way
// round after it -- and it gets there by TURNING OVER rather than by being
// swapped, because a swap is a jump cut and a turn is the thing that actually
// happens at a press. uFlip is the x scale of a plate rotating about a vertical
// axis: cos(theta) as theta runs pi -> 0, so -1, through 0 edge on, to +1.
uniform float uFlip;
// The axis it turns on: the centre of the board's own box, in CSS px. Turning
// about the CANVAS centre instead would swing the portrait clear across the
// page and straight through the name, because in hero mode the canvas is the
// whole viewport and the box is one column of it.
uniform float uAxis;

float easeOutExpo(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }

float smoothstep01(float a, float b, float x) {
  float t = clamp((x - a) / (b - a), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/**
 * The dot's home in CSS px. Moves with the page; the scatter target does not.
 *
 * There is no jitter here any more. It was introduced to stop burin strokes in
 * a row lining up into scan lines, and with the strokes gone it has nothing
 * left to buy — while it goes on costing exactly what it always cost, which is
 * that every mark is displaced by up to a third of a cell from where the
 * picture says it should be. Measured: face sharpness 122.6 at jitter 0 against
 * 119.3 at 0.12 and 109.3 at the 0.34 that shipped. A face is drawn at the
 * feature scale, and a third of a cell is a large fraction of an eyelid.
 *
 * The screen door a ruled grid can show on white is real, and the answer to it
 * is resolution rather than noise: the grid stops reading as a grid when its
 * cells are small enough, which is what the density and the source resolution
 * are for.
 */
vec2 homeOf(vec2 cell) { return uOrigin + cell * uPitch + 0.5; }

/** Snap to the page lattice, the +0.5 convention of the CSS field tile. */
vec2 snapToLattice(vec2 p) { return floor((p - 0.5) / uLattice + 0.5) * uLattice + 0.5; }

/** Growth 0..1 for this dot at this moment. */
float growOf(float delay, float isDatum) {
  if (uSettled < 0.5 && uElapsed < 0.0) return 0.0;      // frame zero: the lattice
  if (uElapsed < 0.0 || isDatum > 0.5) return 1.0;
  return easeOutExpo(clamp((uElapsed - delay) / GROW_MS, 0.0, 1.0));
}

/** The light under the pointer: 0..1, measured from the dot's HOME. */
float lightAt(vec2 home) {
  if (uHasPointer < 0.5) return 0.0;
  float R = 18.0 * uLattice;
  float d = length(home - uPointer);
  if (d >= R) return 0.0;
  float s = 1.0 - smoothstep01(0.0, R, d);
  return s * s;
}

/** Where the dot wants to be, relative to home, in CSS px. */
vec2 targetOf(vec2 home, vec2 scatter, float lum, float isDatum, float f) {
  vec2 t = vec2(0.0);
  bool unlit = lum < UNLIT;
  if (uScrollT > 0.0 && isDatum < 0.5 && !unlit) {
    vec2 far = snapToLattice(home + scatter);
    t = (far - home) * uScrollT * uScrollT;
  }
  if (uPush > 0.5 && f > 0.0 && isDatum < 0.5) {
    vec2 away = home - uPointer;
    float d = length(away);
    if (d > 0.001) t += (away / d) * 1.6 * uLattice * f;
  }
  return t;
}
`;

const UPDATE_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = ${A_HOME})    in vec2  aHome;
layout(location = ${A_LUM})     in float aLum;
layout(location = ${A_FLAGS})   in float aFlags;   // 1 = sun, 2 = datum
layout(location = ${A_DELAY})   in float aDelay;
layout(location = ${A_SCATTER}) in vec2  aScatter;
layout(location = ${A_DISP})    in vec2  aDisp;
layout(location = ${A_VEL})     in vec2  aVel;

uniform float uPhysics;

out vec2 vDisp;
out vec2 vVel;

${COMMON}

const float SPRING_K = 0.2;
const float SPRING_DAMP = 0.6;
const float TEAR_CELLS = 10.0;
const float TEAR_IMPULSE = 2.2;

void main() {
  float isDatum = step(1.5, aFlags);
  vec2 home = homeOf(aHome);
  float f = lightAt(home);
  vec2 target = targetOf(home, aScatter, aLum, isDatum, f);

  if (uPhysics < 0.5) {
    vDisp = target;
    vVel = vec2(0.0);
  } else {
    // Semi-implicit, exactly board.ts: the eigenvalues of this pair are
    // 0.74 +/- 0.229i, so it rings once by about 7% and then rests. That
    // overshoot is why the board feels alive; do not "correct" it.
    vec2 a = (target - aDisp) * SPRING_K;
    vVel = (aVel + a) * SPRING_DAMP;

    // The tear: after the spring, before the integrate, so the impulse
    // survives a whole frame. Measured from the dot's LIVE position, unlike
    // the light, which is measured from home -- that is what makes this feel
    // like material being dragged rather than a field being bent.
    if (uTear > 0.0 && isDatum < 0.5) {
      float R = TEAR_CELLS * uLattice;
      vec2 rel = (home + aDisp) - uPointer;
      float d = length(rel);
      if (d < R) {
        float g = 1.0 - d / R;
        float w = g * g * uTear * TEAR_IMPULSE * uLattice;
        vec2 out2 = d > 0.001 ? rel / d : vec2(0.0);
        vVel += (uTearDir * 0.75 + out2 * 0.25) * w;
      }
    }
    vDisp = aDisp + vVel;
  }
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

const DRAW_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = ${A_HOME})    in vec2  aHome;
layout(location = ${A_LUM})     in float aLum;
layout(location = ${A_FLAGS})   in float aFlags;
layout(location = ${A_DELAY})   in float aDelay;
layout(location = ${A_SCATTER}) in vec2  aScatter;
layout(location = ${A_DISP})    in vec2  aDisp;
layout(location = ${A_NORMAL})  in vec2  aNormal;

uniform vec2  uRes;      // device px
uniform float uDpr;
uniform vec3  uInk;
uniform vec3  uSun;
uniform vec3  uOff;
uniform vec3  uBone;      // the ink the plate is worked in, before the pull

out vec4 vColor;
// The mark's true radius in device px, and the size of the square GL actually
// rasterises. The fragment stage needs both to work out how much of each
// boundary pixel the disc really covers; see the AA note over gl_PointSize.
out float vRad;
out float vSize;
out float vDia;
// xy = the stroke's unit tangent, z = its width as a fraction of the sprite.
// z == 0 means "this mark is a disc".

${COMMON}

void main() {
  float isDatum = step(1.5, aFlags);
  float isSun = step(0.5, mod(aFlags, 2.0));
  vec2 home = homeOf(aHome);
  float f = lightAt(home);
  float grow = growOf(aDelay, isDatum);

  bool unlit = aLum < UNLIT;

  // The relight, on the dot's own luminance and before the pointer's light.
  // Clamped at UNLIT from below: a lit dot that fell through would stop being
  // part of the portrait and become a lattice dot, which reads as a hole.
  // The rim is left flat -- see surfaceNormals in board.ts for why.
  float lum = aLum;
  if (!unlit && isSun < 0.5) {
    lum = clamp(aLum * (1.0 + RELIGHT_GAIN * dot(aNormal, uSunDir)), UNLIT, 1.0);
  }

  // An unlit cell under the light lifts to exactly UNLIT, which routes it into
  // the lit branch at full ink tone: the mask's dark interior glows faintly.
  float L = unlit ? (f > 0.0 ? UNLIT : 0.0) : min(1.0, lum + 0.25 * f);

  // ── Ink, not light ────────────────────────────────────────────────────
  // Value is carried by AREA alone. On a dark ground the renderer encoded
  // luminance twice, in tone and in diameter, and tone did most of the
  // perceptual work; invert the ground and that same formula gives mid-grey
  // dots on near-white which the eye integrates into one flat grey. So the
  // tone channel is gone: the ink is always full black, the paper always full
  // white, and the grey is an optical average of hard-edged marks. That is
  // what an engraving is, and why an engraving is not a smudge.
  float lifted = pow(max(L, DEEP_FLOOR), LIFT);
  float coverage = pow(1.0 - lifted, INK_GAIN);
  // Light on paper is LESS ink. The pointer does not illuminate, it burnishes:
  // dots shrink, paper opens, and a highlight is polished into the plate.
  coverage *= 1.0 - BURNISH * f;
  // Assembly: the ink arrives rather than the light coming up.
  coverage *= grow;

  float dia = min(1.128 * sqrt(max(coverage, 0.0)), INK_DIA_MAX);
  if (uScrollT > 0.0) dia *= 1.0 - uScrollT;

  bool culled = dia < CULL_DIA || dia * uPitch * uDpr < MIN_DEVICE_PX;
  if (isDatum > 0.5) {
    dia = 0.96 * uDensity;
    culled = false;
  }
  // Fully dispersed dots have left the plate.
  if (uScrollT >= 1.0 && isDatum < 0.5) culled = true;

  vec2 pos = home + aDisp;
  vec2 device = pos * uDpr;
  // The turn, about the box's own axis. Applied here rather than in clip space
  // so the off-screen test below sees where the mark actually lands.
  float axis = uAxis * uDpr;
  device.x = axis + (device.x - axis) * uFlip;
  // ── Snap the mark to the device pixel grid ──────────────────────────────
  // A cell is a whole number of CSS pixels, but a DISPLAY is under no
  // obligation to be a whole number of device pixels per CSS pixel. Windows
  // at 125% -- the most common scaling setting there is -- makes a 2px cell
  // 2.5 device px, so alternate dots land on half-pixels and a hard-edged
  // disc rasterises differently on each. That alternation is a difference in
  // ink density, and it beats against the lattice into a low-frequency grid
  // of light holes punched through every dark passage.
  //
  // It is the screen door the direction spends so much effort avoiding,
  // arriving through the back door -- and the finer the grid, the worse it
  // gets, which is why it appeared when the density went to 3. Resolution
  // does not fix this one; phase does.
  //
  // Snapping every centre to a pixel CENTRE makes every mark of a given size
  // rasterise identically, so the density alternation is gone. What is left
  // is the lattice spacing alternating 2, 3, 2, 3 device px, which is a fixed
  // texture at the pixel scale rather than a beat at ten times it.
  //
  // ONLY WHERE IT IS NEEDED, and that qualifier is the whole of a second bug.
  // When the device pitch is a whole number there is no phase variation to
  // remove -- every cell centre already sits at the same place in the pixel
  // grid -- and snapping does not fix anything, it MOVES every mark half a
  // pixel, from a pixel corner to a pixel centre. At 100% with a 2px cell
  // that is the difference between a 1.74px disc covering a 2x2 block of
  // fragments and covering exactly one, so the entire tonal range collapses
  // into a flat one-pixel stipple and the portrait washes out. It measured
  // 0.1075 ink against 0.2001 at DPR 2: half the picture, gone.
  //
  // So: correct the phase only when the phase is wrong.
  float devPitch = uPitch * uDpr;
  if (abs(devPitch - floor(devPitch + 0.5)) > 0.01) {
    device = floor(device) + 0.5;
  }
  if (device.x < -uPitch * uDpr || device.y < -uPitch * uDpr ||
      device.x > uRes.x + uPitch * uDpr || device.y > uRes.y + uPitch * uDpr) {
    culled = true;
  }

  if (culled) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);   // outside clip space
    gl_PointSize = 0.0;
    vColor = vec4(0.0);
    vRad = 0.0;
    vDia = 0.0;
    vSize = 1.0;
    return;
  }

  // One ink, at full strength, always. The datum -- the catchlight in his eye
  // -- is the single mark on the page allowed to be the second ink.
  // A plate is worked in the light and prints in the dark. Before the pull the
  // marks are bone on a near-black plate; the pull crossfades them to ink while
  // the page under them crossfades to paper, and the sheet comes off the press.
  vec3 ink = mix(uBone, uInk, uPull);
  vColor = vec4(isDatum > 0.5 ? uSun : ink, 1.0);

  // ── The mark, and the one pixel of margin its edge needs ──
  //
  // gl_PointSize used to be max(1.0, ...) with a hard discard outside r=0.5,
  // and that is a correct hard-edged mark ONLY while a mark spans several
  // fragments. At 100% on a 1x panel it does not: a cell is 2 device px, the
  // realised diameters run 0.60 to 1.74 device px, and homeOf puts every centre
  // exactly on a pixel centre. A GL point is a SQUARE of side gl_PointSize, so
  // at any size under 2.0 centred on a pixel centre it covers exactly ONE
  // fragment -- and the disc test keeps that fragment, because it is the middle
  // of the disc. Every mark on the board therefore rasterised to one identical
  // fully-inked pixel. Measured: 39,630 lit pixels, 100% of them at full alpha,
  // all on one parity. The entire tonal range of the portrait was one bit, and
  // that is what "washed out at 100%" was.
  //
  // The answer is not a bigger dot or a coarser grid, it is to stop throwing
  // away the fraction. A boundary fragment is PART covered by the disc, and the
  // honest thing to draw is that part. This is not the tone channel §5.3.1
  // deletes -- no mark is mixed toward the ground by its luminance, every mark
  // is still one ink at full strength, and value is still carried by AREA. It
  // is the area, actually resolved, instead of the area rounded to a whole
  // pixel. It is also exactly what the 2D floor has been doing all along: a
  // canvas arc fill is antialiased, so until now the two renderers disagreed at
  // DPR 1 and §8.7 says they must not.
  //
  // The sprite grows by 1.5 px so the ramp has somewhere to land, and vSize
  // carries that padded size because a fragment shader cannot read gl_PointSize.
  float squash = mix(FLIP_MIN, 1.0, abs(uFlip));
  float diaPx = dia * uPitch * uDpr * squash;
  vRad = 0.5 * diaPx;
  vDia = diaPx;
  vSize = max(2.0, diaPx + 1.5);
  gl_PointSize = vSize;
  vec2 clip = device / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
}
`;

const DRAW_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 vColor;
in float vRad;
in float vSize;
in float vDia;
uniform float uAlpha;
out vec4 outColor;

void main() {
  // Hard edges, no smoothing. An antialiased mark measures 0.2 to 0.5
  // crispness at these sizes and reads as mush. Ink either covers the paper or
  // it does not, and the grey is the optical average of the two.
  // How far this fragment's centre is from the mark's centre, in device px.
  float dist = length(gl_PointCoord - 0.5) * vSize;
  // The fraction of this pixel the disc covers: 1 well inside, 0 well outside,
  // and the linear ramp between is a one-pixel box filter over the edge. Full
  // ink, partial area -- an engraved mark smaller than a pixel is a lighter
  // pixel, which is the whole of how a halftone carries tone at this scale.
  float cover = clamp(vRad - dist + 0.5, 0.0, 1.0);
  // A one-pixel box filter is the coverage of a straight EDGE, and a mark
  // smaller than a pixel has no straight edge -- the ramp hands its centre
  // fragment a full 1.0 when the disc's whole area is 0.79 of a pixel. So cap
  // the coverage at the mark's actual ink mass, pi/4 d^2, which is exact for
  // everything up to d = 1.128 px (where the disc first fills a pixel) and
  // inert above it. Without this the faintest marks -- the highlights, the
  // modelling on his cheek and brow -- print up to 27% too dark relative to
  // the deepest ones, which is the tonal range closing from the light end.
  cover = min(cover, 0.78539816 * vDia * vDia);
  if (cover <= 0.0) discard;
  float a = uAlpha * cover;
  outColor = vec4(vColor.rgb * a, a);
}
`;

const UPDATE_FS = /* glsl */ `#version 300 es
precision highp float;
out vec4 unused;
void main() { unused = vec4(0.0); }
`;

const SHARED = [
  "uTear",
  "uTearDir",
  "uSunDir",
  "uPull",
  "uFlip",
  "uAxis",
  "uOrigin", "uPitch", "uLattice", "uDensity", "uPointer",
  "uHasPointer", "uPush", "uScrollT", "uElapsed", "uSettled",
] as const;

/**
 * Returns null whenever the GPU path is not available or not worth taking, and
 * the caller falls back to `createBoard`. The capability question is settled on
 * a throwaway canvas first (see `fieldCaps`), so a "no" here leaves the real
 * canvas untouched and able to give out a 2D context.
 *
 * `poisoned` is the one case that cannot be undone: the context was created and
 * setup then failed, so this canvas can never return a 2D context again and the
 * caller has to swap the element before falling back.
 */
export function createGLBoard(
  canvas: HTMLCanvasElement,
  field: BoardField,
  opts: BoardOptions,
  /**
   * Called at most once when the GPU path gives up after having started.
   *
   * `"lost"` is the driver taking the context away — a GPU reset, a driver
   * update, a laptop switching graphics cards, or Chrome evicting the oldest
   * context because too many are alive. That is worth one rebuild.
   * `"failed"` is a program that did not link, which will not link on a retry
   * either, so the caller should go straight to the 2D board.
   *
   * The board stops drawing at that point and never calls back after
   * `dispose`.
   */
  onFail?: (reason: "lost" | "failed") => void,
): (Board & { caps: Caps }) | null {
  const caps = fieldCaps();
  if (caps.tier === "none") return null;

  const gl = context(canvas);
  if (!gl) return null;

  try {
    return build(gl, caps, canvas, field, opts, onFail);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.warn(error);
    loseContext(gl);
    (canvas as HTMLCanvasElement & { poisoned?: boolean }).poisoned = true;
    return null;
  }
}

function loseContext(gl: WebGL2RenderingContext) {
  // Contexts are a scarce per-tab resource: Chrome evicts the oldest once
  // about sixteen are live, and this component remounts on every route change.
  try {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* already gone */
  }
}

function build(
  gl: WebGL2RenderingContext,
  caps: Caps,
  canvas: HTMLCanvasElement,
  field: BoardField,
  opts: BoardOptions,
  onFail?: (reason: "lost" | "failed") => void,
): Board & { caps: Caps } {
  const bytes = decodeField(field);
  const W = field.w;
  const H = field.h;

  // ── Static per-cell data, built exactly as board.ts builds it ────────────
  let n = 0;
  for (let i = 0; i < bytes.length; i++) if (bytes[i] > 0) n++;

  const relightable = opts.pointer && (opts.mode === "hero" || opts.mode === "still");
  const normals = relightable ? surfaceNormals(bytes, W, H) : null;
  // home.xy, lum, flags, delay, scatter.xy, normal.xy
  const staticData = new Float32Array(n * 9);
  const cellIndex = new Int32Array(W * H).fill(-1);
  const gxArr = new Uint16Array(n);
  const gyArr = new Uint16Array(n);
  const lumArr = new Float32Array(n);

  const rim = new Set(field.rim);
  const rand = rng(opts.seed ?? 11);
  const [cx0, cy0] = field.center;
  const [dx0, dy0] = field.datum;
  const maxDist = Math.hypot(W, H) * 0.6;
  let lit = 0;

  {
    let k = 0;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const v = bytes[j * W + i];
        if (v === 0) continue;
        const L = v / 255;
        const datum = i === dx0 && j === dy0;
        const sun = datum || rim.has(j * W + i);
        if (L >= UNLIT) lit++;
        const dist = Math.hypot(i - cx0, j - cy0) / maxDist;
        const delay = datum ? 0 : 600 * (0.55 * Math.min(1, dist) + 0.25 * (1 - L) + 0.2 * rand());
        const ang = rand() * Math.PI * 2;
        const len = 60 + rand() * 200;

        const o = k * 9;
        staticData[o] = i;
        staticData[o + 1] = j;
        staticData[o + 2] = L;
        staticData[o + 3] = (sun ? 1 : 0) + (datum ? 2 : 0);
        staticData[o + 4] = delay;
        staticData[o + 5] = Math.cos(ang) * len;
        staticData[o + 6] = Math.sin(ang) * len - 40;
        if (normals && !sun) {
          staticData[o + 7] = normals.nx[j * W + i];
          staticData[o + 8] = normals.ny[j * W + i];
        }

        gxArr[k] = i;
        gyArr[k] = j;
        lumArr[k] = L;
        cellIndex[j * W + i] = k;
        k++;
      }
    }
  }

  // ── GL objects ──────────────────────────────────────────────────────────
  // Linking starts now and is not waited on. Uniform locations need a linked
  // program, so they are looked up in `ready()` on the first frame the driver
  // says it has finished — which keeps the whole compile off the main thread.
  const parallel = parallelCompile(gl);
  const updateProgram = link(gl, UPDATE_VS, UPDATE_FS, ["vDisp", "vVel"]);
  const drawProgram = link(gl, DRAW_VS, DRAW_FS);
  type Uniforms = Record<string, WebGLUniformLocation | null>;
  let uUpdate: Uniforms | null = null;
  let uDraw: Uniforms | null = null;

  const staticBuffer = must(gl.createBuffer(), "createBuffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);

  const state: WebGLBuffer[] = [];
  for (let i = 0; i < 2; i++) {
    const buffer = must(gl.createBuffer(), "createBuffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(n * 4), gl.DYNAMIC_COPY);
    state.push(buffer);
  }

  const vaos: WebGLVertexArrayObject[] = [];
  for (let i = 0; i < 2; i++) {
    const vao = must(gl.createVertexArray(), "createVertexArray");
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);
    const stride = 9 * 4;
    gl.enableVertexAttribArray(A_HOME);
    gl.vertexAttribPointer(A_HOME, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(A_LUM);
    gl.vertexAttribPointer(A_LUM, 1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(A_FLAGS);
    gl.vertexAttribPointer(A_FLAGS, 1, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(A_DELAY);
    gl.vertexAttribPointer(A_DELAY, 1, gl.FLOAT, false, stride, 16);
    gl.enableVertexAttribArray(A_SCATTER);
    gl.vertexAttribPointer(A_SCATTER, 2, gl.FLOAT, false, stride, 20);
    gl.enableVertexAttribArray(A_NORMAL);
    gl.vertexAttribPointer(A_NORMAL, 2, gl.FLOAT, false, stride, 28);
    gl.bindBuffer(gl.ARRAY_BUFFER, state[i]);
    gl.enableVertexAttribArray(A_DISP);
    gl.vertexAttribPointer(A_DISP, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(A_VEL);
    gl.vertexAttribPointer(A_VEL, 2, gl.FLOAT, false, 16, 8);
    vaos.push(vao);
  }
  gl.bindVertexArray(null);
  // The generic ARRAY_BUFFER binding is not VAO state, so unbinding the VAO
  // leaves it pointing at state[1] — and WebGL2 refuses to write transform
  // feedback into a buffer that is simultaneously bound to a non-feedback
  // target. Without this the very first update pass is INVALID_OPERATION and
  // the field never moves.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const feedback = must(gl.createTransformFeedback(), "createTransformFeedback");

  // preventDefault is not optional: without it the context is gone for good and
  // `webglcontextrestored` never fires, so a recoverable blip becomes a
  // permanent black rectangle. Every draw path already checks isContextLost, so
  // the handler's only other job is to tell the caller to rebuild.
  let lost = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    onFail?.("lost");
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const ink = rgb(opts.colors.ink);
  const sun = rgb(opts.colors.sun);
  const off = rgb(opts.colors.off);
  // The plate's own ink, before the sheet is pulled. Read from CSS so the
  // palette lives in one place.
  const bone = rgb(opts.colors.bone ?? "#efe9dc");
  /** 0 while the plate is being worked, 1 once the sheet is printed. */
  let pull = 1;
  const afterimage = opts.mode === "afterimage";
  const alpha = afterimage ? 0.45 : 1;

  let pushEnabled = opts.pointer && opts.mode === "hero";
  const lightEnabled =
    opts.pointer && (opts.mode === "hero" || opts.mode === "still" || opts.mode === "text");

  // ── Geometry and state ──────────────────────────────────────────────────
  let width = 0;
  let height = 0;
  let originX = 0;
  let originY = 0;
  let pitch = 5;
  let lattice = 5;
  let density = 1;
  let dpr = 1;
  let pointerX: number | null = null;
  let pointerY: number | null = null;
  /** 0..1: how hard the pointer is currently tearing, and which way. */
  let tear = 0;
  let tearNow = 0;
  let tearX = 0;
  let tearY = 0;
  let sunX = 0;
  let sunY = 0;
  let scrollT = 0;
  let assembling = false;
  let assembleStart = 0;
  let settled = afterimage;
  let ping = 0;
  let disposed = false;
  /** Frames are scheduled until this moment. The GPU holds the state, and a
   *  readback to ask "is anything still moving" would stall the pipeline for
   *  more than the frames it saves, so the deadline is predicted instead. */
  let busyUntil = 0;

  const wake = (ms: number) => {
    busyUntil = Math.max(busyUntil, performance.now() + ms);
  };

  function setShared(u: Record<string, WebGLUniformLocation | null>, elapsed: number) {
    gl.uniform2f(u.uOrigin, originX, originY);
    gl.uniform1f(u.uPitch, pitch);
    gl.uniform1f(u.uLattice, lattice);
    gl.uniform1f(u.uDensity, density);
    gl.uniform2f(u.uPointer, pointerX ?? 0, pointerY ?? 0);
    gl.uniform1f(u.uHasPointer, pointerX !== null && pointerY !== null && lightEnabled ? 1 : 0);
    gl.uniform1f(u.uPush, pushEnabled ? 1 : 0);
    gl.uniform1f(u.uScrollT, opts.mode === "hero" ? scrollT : 0);
    gl.uniform1f(u.uElapsed, elapsed);
    gl.uniform1f(u.uSettled, settled ? 1 : 0);
    gl.uniform1f(u.uTear, tearNow);
    gl.uniform2f(u.uTearDir, tearX, tearY);
    gl.uniform2f(u.uSunDir, sunX, sunY);
    gl.uniform1f(u.uPull, pull);
    gl.uniform1f(u.uFlip, flipOf(pull));
    gl.uniform1f(u.uAxis, originX + (W * pitch) / 2);
  }

  /**
   * True once both programs have linked and their uniforms are resolved.
   *
   * Until then the canvas stays empty and the page's own CSS lattice shows
   * through, which is the same picture the board draws at rest anyway — so the
   * wait is invisible, where blocking on it would have been 130 ms of frozen
   * main thread during the most sensitive part of the load.
   */
  let programsReady = false;
  let programsFailed = false;

  function ready(): boolean {
    if (programsReady) return true;
    if (programsFailed) return false;
    if (!linked(gl, parallel, updateProgram) || !linked(gl, parallel, drawProgram)) return false;
    try {
      verify(gl, updateProgram);
      verify(gl, drawProgram);
      uUpdate = uniforms(gl, updateProgram, [...SHARED, "uPhysics"], [UPDATE_VS, UPDATE_FS]);
      uDraw = uniforms(
        gl,
        drawProgram,
        [...SHARED, "uRes", "uDpr", "uInk", "uSun", "uOff", "uBone", "uAlpha"],
        [DRAW_VS, DRAW_FS],
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.warn(error);
      programsFailed = true;
      // Out of the frame loop before the caller tears this board down.
      queueMicrotask(() => onFail?.("failed"));
      return false;
    }
    programsReady = true;
    return true;
  }

  function pass(now: number, physics: boolean): boolean {
    if (disposed || lost || width === 0 || gl.isContextLost()) return false;
    // Keep frames coming while the driver compiles; there is nothing to draw
    // yet and nothing to settle, so this is a wait, not an idle loop.
    if (!ready()) return !programsFailed;

    // Read once per frame, then decay, exactly as board.ts does: a pointer
    // that stops moving stops tearing in about a fifth of a second.
    // The sun: the direction the light comes from, one direction for the whole
    // face, faded out past a board and a half. board.ts computes this the same
    // way and the two must not drift.
    sunX = 0;
    sunY = 0;
    if (normals && pointerX !== null && pointerY !== null && lightEnabled) {
      const dx = pointerX - (originX + (W * pitch) / 2);
      const dy = pointerY - (originY + (H * pitch) / 2);
      const d = Math.hypot(dx, dy);
      const reach = Math.hypot(W * pitch, H * pitch) * 0.5;
      if (d > 1) {
        const u = Math.min(1, Math.max(0, (d - reach) / reach));
        const fade = 1 - u * u * (3 - 2 * u);
        sunX = (dx / d) * fade;
        sunY = (dy / d) * fade;
      }
    }

    tearNow = pointerX !== null && pointerY !== null ? tear : 0;
    if (physics) tear = tear < 0.01 ? 0 : tear * TEAR_DECAY;
    if (tearNow > 0) wake(SETTLE_MS);

    let elapsed = assembling ? now - assembleStart : -1;
    if (assembling && elapsed >= ASSEMBLE_MS) {
      assembling = false;
      settled = true;
      elapsed = -1;
    }

    // 1. Advance the state into the other buffer.
    gl.useProgram(updateProgram);
    setShared(uUpdate!, elapsed);
    gl.uniform1f(uUpdate!.uPhysics, physics ? 1 : 0);
    gl.bindVertexArray(vaos[ping]);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, state[ping ^ 1]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    ping ^= 1;

    // 2. Draw from the buffer just written.
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied
    gl.useProgram(drawProgram);
    setShared(uDraw!, elapsed);
    gl.uniform2f(uDraw!.uRes, canvas.width, canvas.height);
    gl.uniform1f(uDraw!.uDpr, dpr);
    gl.uniform3fv(uDraw!.uInk, ink);
    gl.uniform3fv(uDraw!.uSun, sun);
    gl.uniform3fv(uDraw!.uOff, off);
    gl.uniform3fv(uDraw!.uBone, bone);
    gl.uniform1f(uDraw!.uAlpha, alpha);
    gl.bindVertexArray(vaos[ping]);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.bindVertexArray(null);

    return assembling || now < busyUntil;
  }

  return {
    caps,
    count: lit,

    layout(g) {
      const resized = g.width !== width || g.height !== height || g.dpr !== dpr;
      width = g.width;
      height = g.height;
      originX = g.originX;
      originY = g.originY;
      pitch = g.pitch;
      lattice = g.lattice;
      density = Math.max(1, Math.round(lattice / pitch));
      dpr = g.dpr;
      if (resized) {
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      wake(SETTLE_MS);
    },

    assemble(now) {
      assembling = true;
      settled = false;
      assembleStart = now;
      busyUntil = now + ASSEMBLE_MS + SETTLE_MS;
    },

    settle() {
      assembling = false;
      settled = true;
      wake(SETTLE_MS);
    },

    pointer(x, y, vx = 0, vy = 0) {
      pointerX = x;
      pointerY = y;
      wake(SETTLE_MS);
      const speed = Math.hypot(vx, vy);
      if (x === null || y === null || !pushEnabled || speed <= TEAR_SPEED) return;
      const k = Math.min(1, (speed - TEAR_SPEED) / (TEAR_FULL - TEAR_SPEED));
      if (k <= tear) return;
      tear = k;
      tearX = vx / speed;
      tearY = vy / speed;
    },

    /**
     * The pull. 0 is the plate -- bone marks, mirrored; 1 is the printed sheet.
     * Crossing 0.5 flips the mirror, which is why the crossfade is staggered
     * against the ground's in dot-board.tsx: a simultaneous inversion passes
     * through a mid grey where nothing is legible.
     */
    setPull(t) {
      const next = Math.min(1, Math.max(0, t));
      if (next !== pull) wake(SETTLE_MS);
      pull = next;
    },

    scroll(t) {
      const next = Math.min(1, Math.max(0, t));
      if (next !== scrollT) wake(SETTLE_MS);
      scrollT = next;
    },

    disablePush() {
      pushEnabled = false;
      wake(SETTLE_MS);
    },

    frame(now) {
      return pass(now, true);
    },

    drawSettled() {
      settled = true;
      assembling = false;
      // Two passes with physics off: the first writes the resting state into
      // the buffer, the second draws from it.
      pass(performance.now(), false);
      pass(performance.now(), false);
    },

    cellAt(x, y): Cell | null {
      const i = Math.floor((x - originX) / pitch);
      const j = Math.floor((y - originY) / pitch);
      if (i < 0 || j < 0 || i >= W || j >= H) return null;
      const k = cellIndex[j * W + i];
      if (k < 0) return null;
      return { x: gxArr[k], y: gyArr[k], L: lumArr[k] };
    },

    dispose() {
      disposed = true;
      canvas.removeEventListener("webglcontextlost", onLost);
      try {
        gl.deleteProgram(updateProgram);
        gl.deleteProgram(drawProgram);
        gl.deleteBuffer(staticBuffer);
        for (const b of state) gl.deleteBuffer(b);
        for (const v of vaos) gl.deleteVertexArray(v);
        gl.deleteTransformFeedback(feedback);
      } catch {
        /* context already lost */
      }
      loseContext(gl);
    },
  };
}
