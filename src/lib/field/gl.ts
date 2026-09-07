/**
 * WebGL2 plumbing: capability probing, tier selection, and the small amount of
 * boilerplate the field renderer needs. Nothing here knows about dots.
 *
 * Two rules this file exists to enforce.
 *
 * 1. **Every GL nullable becomes a tier demotion, never a silent black screen.**
 *    `getContext`, `createShader`, `createProgram`, `createBuffer`,
 *    `createVertexArray` and `getUniformLocation` all return `T | null`. Under
 *    `strict: true` the path of least resistance is `!` everywhere, and then a
 *    null uniform location quietly no-ops instead of throwing. `must()` throws,
 *    the caller catches, and the board falls back to the 2D renderer.
 *
 * 2. **A capability check is not enough.** SwiftShader — Chrome's software
 *    rasteriser — reports a complete WebGL2 implementation with every
 *    extension this renderer wants, and then runs the field at 27 ms a frame.
 *    `WEBGL_debug_renderer_info` has to be read and a software renderer has to
 *    be refused, or a laptop with a blocklisted GPU gets a worse experience
 *    than the 2D canvas it replaced.
 */

export type FieldTier = "full" | "reduced" | "none";

export type Caps = {
  tier: FieldTier;
  renderer: string;
  /** Largest `gl_PointSize` the driver will rasterise. */
  maxPointSize: number;
  /** Why the tier is what it is. Logged once in development. */
  reason: string;
};

/** A driver that rasterises on the CPU. Faster to draw nothing than to use it. */
const SOFTWARE = /swiftshader|llvmpipe|software|basic render|microsoft basic/i;

/**
 * The largest point this renderer ever asks for is the datum at
 * `0.96 * density * pitch * dpr` — about 24 device px. A handful of drivers
 * clamp `ALIASED_POINT_SIZE_RANGE` to 1, which would render every dot as a
 * single pixel and collapse the design silently rather than loudly.
 */
const MIN_POINT_SIZE = 24;

export function must<T>(value: T | null, what: string): T {
  if (value === null) throw new Error(`WebGL: ${what} is null`);
  return value;
}

/**
 * Capability, decided once per page on a throwaway 1x1 canvas.
 *
 * This indirection is load-bearing. A canvas that has been given a WebGL
 * context can never return a 2D one — `getContext("2d")` is null on it
 * forever — so probing on the real canvas and then failing would poison the
 * element and take the 2D fallback down with it. Probe somewhere disposable,
 * and only touch the real canvas once the answer is yes.
 */
let cachedCaps: Caps | null = null;

export function fieldCaps(): Caps {
  if (cachedCaps) return cachedCaps;
  if (typeof document === "undefined") {
    return { tier: "none", renderer: "", maxPointSize: 0, reason: "no document" };
  }
  const scratch = document.createElement("canvas");
  scratch.width = 1;
  scratch.height = 1;
  const probed = probe(scratch);
  cachedCaps = probed
    ? probed.caps
    : { tier: "none", renderer: "", maxPointSize: 0, reason: "no webgl2" };
  if (probed) {
    try {
      probed.gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      /* nothing to release */
    }
  }
  return cachedCaps;
}

export function context(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const probed = probe(canvas);
  return probed ? probed.gl : null;
}

function probe(canvas: HTMLCanvasElement): { gl: WebGL2RenderingContext; caps: Caps } | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false, // the dots are analytic discs; MSAA only softens them
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      // Never "high-performance": on a dual-GPU laptop that spins up the
      // discrete card for the life of the page, for a portfolio.
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
    });
  } catch {
    return null;
  }
  if (!gl) return null;

  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(
    info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  );
  const pointRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array;
  const maxPointSize = pointRange ? pointRange[1] : 0;

  let tier: FieldTier = "full";
  let reason = "webgl2";
  if (SOFTWARE.test(renderer)) {
    tier = "none";
    reason = "software renderer";
  } else if (maxPointSize < MIN_POINT_SIZE) {
    tier = "none";
    reason = `point size clamped to ${maxPointSize}`;
  } else if (isLowBudget()) {
    tier = "reduced";
    reason = "low device budget";
  }

  return { gl, caps: { tier, renderer, maxPointSize, reason } };
}

function isLowBudget(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) {
    return true;
  }
  return false;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = must(gl.createShader(type), "createShader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  // COMPILE_STATUS is deliberately not read here: asking blocks until the
  // driver has finished, which is the entire cost this file exists to avoid.
  // A compile failure surfaces as a link failure in `verify`.
  return shader;
}

/** `KHR_parallel_shader_compile`, or null. */
export type ParallelCompile = { COMPLETION_STATUS_KHR: number } | null;

export function parallelCompile(gl: WebGL2RenderingContext): ParallelCompile {
  return gl.getExtension("KHR_parallel_shader_compile") as ParallelCompile;
}

/**
 * Start linking a program, optionally capturing `varyings` with transform
 * feedback, and return before asking whether it worked.
 *
 * The pair of programs here costs 130 ms of blocked main thread on a cold
 * cache, which is one long task and most of the page's total blocking time.
 * Almost none of that is `linkProgram`; it is the `LINK_STATUS` query, which
 * blocks until the driver's compiler thread is done. So the status is not read
 * here. Poll `linked()` from a frame and call `verify()` once it says yes, and
 * the same work costs nothing on the main thread.
 *
 * `transformFeedbackVaryings` has to be called between attach and link, which
 * is why this is one function rather than a builder.
 */
export function link(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  varyings?: string[],
): WebGLProgram {
  const program = must(gl.createProgram(), "createProgram");
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  if (varyings) gl.transformFeedbackVaryings(program, varyings, gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(program);
  // The shaders are attached to the program and can go now; the program keeps
  // them alive until it is itself deleted.
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

/**
 * Has the driver finished with this program? Without the extension there is no
 * way to ask without blocking, so the answer is yes and `verify` pays the cost
 * — one frame late instead of during startup.
 */
export function linked(
  gl: WebGL2RenderingContext,
  ext: ParallelCompile,
  program: WebGLProgram,
): boolean {
  if (!ext) return true;
  return gl.getProgramParameter(program, ext.COMPLETION_STATUS_KHR) === true;
}

/** Throws if the program did not link. Only call once `linked()` is true. */
export function verify(gl: WebGL2RenderingContext, program: WebGLProgram): void {
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  // The program log for a failed compile says "Vertex shader is not compiled"
  // and nothing else, which names the shader and not one thing about the
  // mistake. The line and the message are on the SHADERS, so collect those too
  // — this is the only report anybody gets before the tier silently drops.
  const shaders = (gl.getAttachedShaders(program) ?? [])
    .map((shader) => gl.getShaderInfoLog(shader))
    .filter((log) => log && log.trim().length > 0)
    .join(" | ");
  const log = gl.getProgramInfoLog(program);
  gl.deleteProgram(program);
  throw new Error(`WebGL: program failed to link — ${log}${shaders ? ` — ${shaders}` : ""}`);
}

/** `uniform vec2  uOrigin;` -> `uOrigin`, over a shader's source text. */
const DECLARED = /(?:^|[^\w])uniform\s+\w+\s+([A-Za-z_]\w*)/g;

/**
 * Uniform locations, looked up once, verified against the shader source.
 *
 * A null location has two very different causes and they must not be treated
 * alike. A name the shader never declares is a typo, and setting it would
 * silently do nothing forever — that throws. A name the shader declares but
 * does not reach is eliminated by the compiler, which is correct and expected:
 * both programs here `#include` the same COMMON block, so the update program
 * legitimately has no `uDensity` and the draw program no `uPhysics`. Per the
 * spec, `uniform*(null, ...)` is a defined no-op, so those pass through as null
 * and the shared setter stays one function instead of two divergent ones.
 */
export function uniforms<K extends string>(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  names: readonly K[],
  sources: readonly string[],
): Record<K, WebGLUniformLocation | null> {
  const declared = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(DECLARED)) declared.add(match[1]);
  }
  const out = {} as Record<K, WebGLUniformLocation | null>;
  for (const name of names) {
    if (!declared.has(name)) throw new Error(`WebGL: uniform ${name} is not declared`);
    out[name] = gl.getUniformLocation(program, name);
  }
  return out;
}

/** "#F2F1EC" or "rgb(242 241 236)" to 0..1 floats, the renderer's palette. */
export function rgb(value: string): [number, number, number] {
  const hex = value.trim();
  if (hex.startsWith("#")) {
    const n = parseInt(hex.length === 4 ? hex.slice(1).replace(/./g, "$&$&") : hex.slice(1, 7), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const parts = hex.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return [1, 1, 1];
  return [Number(parts[0]) / 255, Number(parts[1]) / 255, Number(parts[2]) / 255];
}
