#!/usr/bin/env node
/**
 * Every file the source imports must be one git actually has.
 *
 * This exists because of a bug that a green build cannot catch and that came
 * within one push of a broken deploy: two commits landed
 * `import { Constellation } from "@/components/sections/constellation"` and
 * `@import "./constellation.css"`, while both files sat **untracked** in the
 * working tree. Every local check passed — typecheck, lint, `next build`, the
 * whole probe suite — because every check reads the working tree, and the
 * working tree had the files. A fresh clone would not have.
 *
 * The lesson generalises past this one mistake: `git status` being clean is
 * something you have to remember to look at, and staging a commit by path
 * (which is the right thing to do when several agents share a tree) is exactly
 * the operation that leaves a new file behind. So the check is not "is the tree
 * clean" — it is "does everything HEAD reaches actually exist in HEAD".
 *
 *   node scripts/check-tracked.mjs
 *
 * Skips silently where git is unavailable — on Vercel the checkout IS the
 * tracked set, so an untracked file cannot exist there and the build fails on
 * its own.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative, extname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let tracked;
try {
  tracked = new Set(
    execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((p) => p.replace(/\\/g, "/")),
  );
} catch {
  console.log("check-tracked: skipped — not a git checkout");
  process.exit(0);
}

/** Every source file we scan for imports. */
const SOURCE = /\.(tsx?|jsx?|mjs|css)$/;
/** Extensions an extensionless import may resolve to, in resolution order. */
const TRY = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".css",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE.test(name)) out.push(full);
  }
  return out;
}

const files = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "scripts"))];
const missing = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  // A Set, because the two patterns both match a CSS `@import` and a file that
  // imports the same module twice should be reported once.
  const specs = new Set(
    [
      // import ... from "x" / export ... from "x" / import("x")
      ...text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
      // CSS @import "x"
      ...text.matchAll(/@import\s+["']([^"']+)["']/g),
    ].map((m) => m[1]),
  );

  for (const spec of specs) {
    // Only our own code. A bare specifier is a package; node: is builtin.
    let base;
    if (spec.startsWith("@/")) base = join(ROOT, "src", spec.slice(2));
    else if (spec.startsWith(".")) base = resolve(dirname(file), spec);
    else continue;

    // `.css` and other explicit extensions resolve as written; the rest are
    // tried the way the bundler tries them.
    const candidates = extname(base) ? [base] : TRY.map((ext) => base + ext);
    const found = candidates.find((c) => existsSync(c) && statSync(c).isFile());
    if (!found) {
      // A specifier that resolves to nothing at all is a different bug, and
      // typecheck and build both catch it loudly. Not this check's job.
      continue;
    }
    const rel = relative(ROOT, found).replace(/\\/g, "/");
    if (!tracked.has(rel)) {
      missing.push({
        from: relative(ROOT, file).replace(/\\/g, "/"),
        spec,
        rel,
      });
    }
  }
}

if (missing.length > 0) {
  console.error("check-tracked: the source imports files git does not have.\n");
  for (const m of missing)
    console.error(
      `  ${m.from}\n    imports "${m.spec}" -> ${m.rel}  (UNTRACKED)\n`,
    );
  console.error(
    "A fresh clone of this commit would not build. `git add` them.\n" +
      "Every local check passes in this state, because every local check reads the working tree.",
  );
  process.exit(1);
}
console.log(
  `check-tracked: ${files.length} source files, every local import is in git.`,
);
