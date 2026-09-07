#!/usr/bin/env node
/**
 * Compile every shader in `src/lib/field/gl-board.ts` and fail on any error.
 *
 * This exists because of a bug it would have caught in one second and that
 * instead shipped: `float ink` and `vec3 ink` in one scope of the draw vertex
 * shader. GLSL rejected the redefinition, the program did not link, the board
 * fell to the 2D floor, and *the site looked correct* — the fallback is
 * deliberately near-identical, so a dead GPU path is invisible from the
 * outside. The tier ladder that makes this site robust is the same thing that
 * hides a broken rung.
 *
 * Two design constraints shaped it:
 *
 * The uniform resolver already checks names against the shader source text, so
 * a typo in a uniform throws loudly. Nothing checked that the source *compiles*
 * — and the driver's own report for this class of failure is the program log,
 * which says "Vertex shader is not compiled" and not one word about why. The
 * message is on the shader, so this reads that.
 *
 * And it cannot be a build step. Compiling GLSL needs a real GL driver, Vercel
 * has no browser, and the plan's rule is that no build step may need anything
 * that is not already in the repo. So this is a local gate: run it after
 * touching a shader, and it skips with an explanation wherever Chrome or
 * puppeteer-core is absent rather than failing a machine that never had them.
 *
 *   node scripts/check-shaders.mjs
 *
 * Exit 0 = every shader compiled, or the check could not run and said so.
 * Exit 1 = a shader failed, with the driver's line and message.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "src", "lib", "field", "gl-board.ts");

/** The programs, as [vertex, fragment] pairs of `const` names in that file. */
const PROGRAMS = [
  ["UPDATE_VS", "UPDATE_FS"],
  ["DRAW_VS", "DRAW_FS"],
];

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((path) => path && existsSync(path));

const skip = (why) => {
  console.log(`check-shaders: skipped — ${why}`);
  process.exit(0);
};

const src = readFileSync(SOURCE, "utf8");

/**
 * Every `const NAME = <number>;` the shaders can interpolate, so the `${...}`
 * holes are filled with the same values the app uses. Reading them rather than
 * hardcoding them is the point: a constant that moves must move here too, or
 * the gate is checking a shader nobody runs. board.ts is scanned as well
 * because the renderer shares its constants — RELIGHT_GAIN and UNLIT are
 * defined there and imported here, which is what keeps the two renderers from
 * drifting apart.
 */
const numbers = new Map();
for (const file of [SOURCE, join(ROOT, "src", "lib", "board.ts")]) {
  const text = readFileSync(file, "utf8");
  for (const [, name, value] of text.matchAll(
    /^(?:export )?const (\w+) = (-?[\d.]+);$/gm,
  )) {
    numbers.set(name, Number(value));
  }
}

/** The body of `const NAME = /* glsl *​/ ` ... ` `, with holes still in it. */
function raw(name) {
  const open = `const ${name} = /* glsl */ \``;
  const start = src.indexOf(open);
  if (start < 0) throw new Error(`${name} not found in ${SOURCE}`);
  const from = start + open.length;
  const end = src.indexOf("`", from);
  if (end < 0) throw new Error(`${name} is not terminated`);
  return src.slice(from, end);
}

const COMMON = raw("COMMON");

/** Fill `${COMMON}`, `${SOME_CONST}` and `${SOME_CONST.toFixed(n)}`. */
function resolve(name) {
  let out = raw(name).replaceAll("${COMMON}", COMMON);
  out = out.replace(
    /\$\{(\w+)(?:\.toFixed\((\d+)\))?\}/g,
    (whole, ident, digits) => {
      if (!numbers.has(ident))
        throw new Error(`${name}: cannot resolve \${${ident}}`);
      const value = numbers.get(ident);
      return digits === undefined
        ? String(value)
        : value.toFixed(Number(digits));
    },
  );
  const left = out.match(/\$\{[^}]*\}/g);
  if (left) throw new Error(`${name}: unresolved ${left.join(", ")}`);
  return out;
}

const sources = {};
for (const name of PROGRAMS.flat()) sources[name] = resolve(name);

// puppeteer-core is deliberately NOT a dependency of this project. It is a
// browser download and a lockfile entry to serve one local check, on a repo
// whose whole build contract is that nothing expensive runs on the deploy. So
// it is resolved from wherever it already lives: PUPPETEER_CORE can name the
// module (a path to a checkout, or just "puppeteer-core" if it is installed).
let puppeteer;
for (const specifier of [process.env.PUPPETEER_CORE, "puppeteer-core"]) {
  if (!specifier) continue;
  try {
    puppeteer = await import(specifier);
    break;
  } catch {
    /* try the next one */
  }
}
if (!puppeteer)
  skip(
    "puppeteer-core not resolvable (set PUPPETEER_CORE, or npm i -D puppeteer-core)",
  );
if (CHROME.length === 0) skip("no Chrome found (set CHROME_PATH)");

// Headless Chrome runs SwiftShader here, which is fine: this is a compile
// check, not a performance one, and SwiftShader implements the same GLSL ES
// 3.00 grammar. Nothing is drawn.
const browser = await puppeteer.default.launch({
  executablePath: CHROME[0],
  headless: "new",
  args: ["--enable-unsafe-swiftshader"],
});
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.goto("about:blank");

const results = await page.evaluate((shaders) => {
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return null;
  const out = {};
  for (const [name, source] of Object.entries(shaders)) {
    const shader = gl.createShader(
      name.endsWith("_VS") ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER,
    );
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    out[name] = {
      ok: !!gl.getShaderParameter(shader, gl.COMPILE_STATUS),
      log: (gl.getShaderInfoLog(shader) || "").trim(),
    };
    gl.deleteShader(shader);
  }
  return out;
}, sources);

await browser.close();

if (!results) skip("this Chrome has no WebGL2");

let failed = 0;
for (const [name, { ok, log }] of Object.entries(results)) {
  const lines = sources[name].split("\n").length;
  if (ok) {
    console.log(`  ok    ${name}  (${lines} lines)`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}  (${lines} lines)`);
    for (const line of log.split("\n"))
      if (line.trim()) console.error(`        ${line.trim()}`);
  }
}

if (failed > 0) {
  console.error(
    `\ncheck-shaders: ${failed} shader${failed === 1 ? "" : "s"} failed to compile.` +
      "\nThe board would fall silently to the 2D renderer and the page would still look right.",
  );
  process.exit(1);
}
console.log(`check-shaders: ${Object.keys(results).length} shaders compiled.`);
