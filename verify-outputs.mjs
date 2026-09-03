#!/usr/bin/env node
// verify-outputs.mjs — do the four generated outputs actually say what src/tokens says?
//
// `npm run check` regenerates and diffs, which proves the outputs match THIS build of build.mjs.
// The AA gate proves the colours are legible. Neither proves the generator transformed anything
// correctly: a wrong transform writes the same wrong value into all four outputs, the diff is
// clean, the gate measures the wrong colour and passes it, and everything is green.
//
// That was named as the top blind spot of the design lane's cross-platform parity check —
// "it establishes that four outputs AGREE, not that a value is RIGHT" — and it can only be closed
// from inside this repo, against the source.
//
// So this reads src/tokens/*.json, resolves aliases ITSELF, converts each value to what each
// platform should contain using its OWN conversions, and compares against the emitted files. The
// independence is the entire point: reusing build.mjs's converters would only prove the build
// agrees with itself, which is what everything else here already proves.
//
//   node verify-outputs.mjs
//
// MUTATION-CHECKED 2026-09-03. Nine breakages of build.mjs, each caught naming the token and both
// values; green when restored:
//   Swift red channel scaled by 254 · Swift duration in ms not seconds · Kotlin ARGB reversed to
//   BGR · Swift radius doubled · Kotlin weight off by 100 · Android type size emitted dp not sp ·
//   sp/dp swapped for every dimension · the paired --line-height dropped from @theme · every size
//   paired with the WRONG leading. Plus: Sources/CurioTokens.swift edited out of step with dist/.
//
// Three of those passed at first and are the reason this file has the shape it has: the sp/dp one
// (the unit was parsed and discarded), the dropped --line-height (nothing checked the pair), and
// the same again after the pairing check was written, because it pushed to `problems` AFTER the
// block that reports them — an assertion that ran and could not fail.
//
// BLIND SPOTS — what a green run here does NOT establish:
//   1. That a token is NAMED correctly. `cleanName` is shared with build.mjs by design — a second
//      copy would drift — so a token emitted under a wrong name is invisible here.
//   2. That a token SHOULD exist, or that its source value is the right design decision. This
//      compares emitted against source; a wrong source is faithfully verified as wrong.
//   3. Anything about tokens the emit filter deliberately drops. An absent token is the parity
//      check's subject (canon/design/TOKENS.md), not this one's.
//   4. Font stacks and cubic-beziers, which are passed through as strings and compared literally
//      only where a platform emits them at all.
//   5. Android XML `sp` vs `dp`: the unit is compared, but nothing here knows which tokens OUGHT to
//      scale with the user's font setting — that judgement lives in lib-names.mjs and is shared
//      with the generator, so a wrong call there is invisible to this file.
//   6. That Style Dictionary resolved aliases the same way this file does. Both implementations
//      could be wrong together on a construct neither has met — nothing here cross-checks the
//      resolver itself.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cleanName, themeName, themeVar, isIosFont, isTypeSize, isLeading, isWeight, scalesWithUserFont } from "./lib-names.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "src/tokens");
const fail = (m) => { console.error("\n✗ " + m + "\n"); process.exit(1); };

// ── Read the source, flatten, resolve aliases (independently of Style Dictionary) ─────────────
const raw = {};
for (const f of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const tree = JSON.parse(readFileSync(join(SRC, f), "utf8"));
  (function walk(node, path, inheritedType) {
    if (node === null || typeof node !== "object") return;
    const type = node.$type ?? inheritedType;
    if ("$value" in node) { raw[path.join(".")] = { value: node.$value, type, file: f }; return; }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      walk(v, [...path, k], type);
    }
  })(tree, [], undefined);
}

const ALIAS = /^\{([^}]+)\}$/;
function resolve(path, seen = new Set()) {
  const t = raw[path];
  if (!t) return null;
  if (typeof t.value !== "string") return t;
  const m = t.value.match(ALIAS);
  if (!m) return t;
  if (seen.has(path)) fail(`alias cycle at ${path}`);
  seen.add(path);
  const target = resolve(m[1], seen);
  if (!target) fail(`${path} aliases {${m[1]}}, which does not exist in src/tokens`);
  return { value: target.value, type: t.type ?? target.type, file: t.file };
}

// ── Independent conversions ───────────────────────────────────────────────────────────────────
// Deliberately NOT build.mjs's. Written from the output formats, not from its code.
// DTCG stores colour as an OBJECT — {colorSpace, components:[0..1], alpha} — and this file first
// handled only hex strings, so 29 of the 41 source colours (the whole brand ramp) fell out of the
// comparison and the run still reported ✓. Both forms are handled, and the zero-comparison guard
// below is what makes a future third form fail rather than vanish.
const hex = (v) => {
  if (v && typeof v === "object" && Array.isArray(v.components)) {
    const [r, g, b] = v.components.map((x) => x * 255);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: v.alpha ?? 1 };
  }
  const s = String(v).trim();
  const m = s.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (m) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    return { r, g, b, a: m[2] === undefined ? 1 : parseInt(m[2], 16) / 255 };
  }
  const rg = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rg) return { r: +rg[1], g: +rg[2], b: +rg[3], a: rg[4] === undefined ? 1 : +rg[4] };
  return null;
};
// Same object-vs-string story as colour: DTCG stores dimension and duration as {value, unit}, and
// a string-only parser compared 2 of 23 numeric tokens while reporting success.
const num = (v) => {
  if (v && typeof v === "object" && typeof v.value === "number") return { n: v.value, unit: v.unit ?? "" };
  const m = String(v).trim().match(/^(-?[\d.]+)\s*(px|ms|s|dp|pt)?$/);
  return m ? { n: +m[1], unit: m[2] ?? "" } : null;
};
const b2 = (n) => Math.round(n).toString(16).toUpperCase().padStart(2, "0");
const near = (a, b, eps = 5e-4) => Math.abs(a - b) <= eps;

// ── The emitted files ─────────────────────────────────────────────────────────────────────────
const files = {
  swift: join(HERE, "dist/CurioTokens.swift"),
  kotlin: join(HERE, "src/main/kotlin/com/curio/tokens/CurioTokens.kt"),
  colors: join(HERE, "dist/android/values/colors.xml"),
  dimens: join(HERE, "dist/android/values/dimens.xml"),
  css: join(HERE, "dist/curio-brand.css"),
};
for (const [k, p] of Object.entries(files)) if (!existsSync(p)) fail(`missing generated output: ${p}\n  Run: npm run build`);
const text = Object.fromEntries(Object.entries(files).map(([k, p]) => [k, readFileSync(p, "utf8")]));

// The type scale is emitted under TWO css names — the Tailwind namespace and the canonical
// --curio-* one — from a single source token. Checking one and not the other would leave half the
// web output unverified, which is the shape this file exists to catch.
const cssNamesFor = (tok, name) => {
  const names = [];
  if (themeVar(tok)) names.push(themeName(tok));
  if (!themeVar(tok) || isTypeSize(tok) || isLeading(tok) || isWeight(tok)) names.push(`--${name}`);
  return names;
};

const camel = (n) => n.replace(/^curio-/, "").replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const snake = (n) => n.replace(/-/g, "_");

const COMPARABLE = new Set(["color", "dimension", "duration"]);
// The SwiftPM module source is a SECOND copy of the Swift output, and it is the one iOS actually
// builds against — Package.swift points at Sources/, not dist/. Everything below verifies dist, so
// without this the file consumers compile is unverified. They are generated together and must be
// identical; a difference means one of them was hand-edited or a build half-ran.
{
  const a = readFileSync(join(HERE, "dist/CurioTokens.swift"), "utf8");
  const bPath = join(HERE, "Sources/CurioTokens/CurioTokens.swift");
  if (!existsSync(bPath)) fail("missing Sources/CurioTokens/CurioTokens.swift — run: npm run build");
  if (readFileSync(bPath, "utf8") !== a) {
    fail("dist/CurioTokens.swift and Sources/CurioTokens/CurioTokens.swift differ.\n" +
         "  Sources/ is what SwiftPM builds; dist/ is what everything below verifies.\n" +
         "  Run: npm run build");
  }
}

const problems = [];
const skipped = [];
const checked = { swift: 0, kotlin: 0, android: 0, css: 0 };
// A token that is in the source and in an output but which this file could not compare is the
// failure mode that hid here first: the CSS lookup was built from the wrong naming scheme, so 63 of
// 75 CSS values were never compared and the run still said ✓. Uncomparable is now counted and
// reported, never silent.
const uncompared = [];
const zeroCompared = [];

for (const path of Object.keys(raw)) {
  const t = resolve(path);
  if (!t) continue;
  const segs = path.split(".");
  const name = cleanName(segs);
  const tok = { path: segs, $type: t.type };
  const c = hex(t.value), n = num(t.value);
  let comparisons = 0;
  if (isIosFont(tok)) { skipped.push(`${name} — iOS-only font token, never emitted to CSS`); }

  // CSS — the output every consumer imports.
  if (c) {
    const want = c.a >= 1
      ? `#${b2(c.r)}${b2(c.g)}${b2(c.b)}`.toUpperCase()
      : `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
    for (const cssVar of cssNamesFor(tok, name)) {
    const m = text.css.match(new RegExp(`${cssVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`));
    if (!m) uncompared.push(`${name} — no ${cssVar} in the CSS`);
    if (m) {
      checked.css++;
      comparisons++;
      const got = m[1].trim();
      const gc = hex(got) ?? (got.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/) &&
        (([, r, g, b, a]) => ({ r: +r, g: +g, b: +b, a: a === undefined ? 1 : +a }))(got.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)));
      if (!gc || gc.r !== c.r || gc.g !== c.g || gc.b !== c.b || !near(gc.a, c.a, 0.004))
        problems.push(`${name} — CSS has ${got}, src/tokens says ${want} (${t.file})`);
    }
    }
  }

  // CSS numerics — px dimensions and ms durations. Compared separately from colour because a token
  // compared on the three mobile outputs and NOT on web passes the zero-comparison guard while
  // leaving the output every web consumer imports unverified.
  if (!c && n) {
    for (const cssVar of cssNamesFor(tok, name)) {
    const m = text.css.match(new RegExp(`${cssVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`));
    if (!m) uncompared.push(`${name} — no ${cssVar} in the CSS`);
    if (m) {
      checked.css++;
      comparisons++;
      const g = num(m[1]);
      if (!g || !near(g.n, n.n, 1e-6) || (n.unit && g.unit && g.unit !== n.unit))
        problems.push(`${name} — CSS has ${m[1].trim()}, src/tokens says ${t.value} (${t.file})`);
    }
    }
  }

  // Swift — Color(red:green:blue:[opacity:]) as 0–1 floats; TimeInterval in SECONDS; CGFloat px.
  const sm = text.swift.match(new RegExp(`public static let ${camel(name)}\\s*(?::\\s*([A-Za-z]+)\\s*)?=\\s*([^\\n]+)`));
  if (sm) {
    checked.swift++;
    comparisons++;
    const [, type, got] = sm;
    if (c) {
      const g = got.match(/Color\(red:\s*([\d.]+),\s*green:\s*([\d.]+),\s*blue:\s*([\d.]+)(?:,\s*opacity:\s*([\d.]+))?\s*\)/);
      if (!g) problems.push(`${name} — Swift is not a Color literal: ${got}`);
      else if (!near(+g[1], c.r / 255) || !near(+g[2], c.g / 255) || !near(+g[3], c.b / 255) ||
               !near(g[4] === undefined ? 1 : +g[4], c.a, 0.005))
        problems.push(`${name} — Swift ${got.trim()}, src/tokens says rgb(${c.r}, ${c.g}, ${c.b}) a=${c.a} (${t.file})`);
    } else if (n && n.unit === "ms") {
      if (!near(parseFloat(got), n.n / 1000, 1e-6))
        problems.push(`${name} — Swift ${got.trim()}, src/tokens says ${n.n}ms = ${n.n / 1000}s (${t.file})`);
    } else if (n && (n.unit === "px" || n.unit === "")) {
      if (/^-?[\d.]+$/.test(got.trim()) && !near(parseFloat(got), n.n, 1e-6))
        problems.push(`${name} — Swift ${got.trim()}, src/tokens says ${n.n} (${t.file})`);
    }
  }

  // Kotlin — packed 0xAARRGGBB Long; duration Long in MILLISECONDS; Float dp.
  const km = text.kotlin.match(new RegExp(`public val ${camel(name)}\\s*:\\s*([A-Za-z]+)\\s*=\\s*([^\\n]+)`));
  if (km) {
    checked.kotlin++;
    comparisons++;
    const [, type, got] = km;
    if (c) {
      const g = got.trim().match(/^0x([0-9a-fA-F]{8})L?$/);
      const want = `${b2(c.a * 255)}${b2(c.r)}${b2(c.g)}${b2(c.b)}`;
      if (!g || g[1].toUpperCase() !== want)
        problems.push(`${name} — Kotlin ${got.trim()}, src/tokens says 0x${want}L (${t.file})`);
    } else if (n && n.unit === "ms") {
      if (!near(parseFloat(got), n.n, 1e-6))
        problems.push(`${name} — Kotlin ${got.trim()}, src/tokens says ${n.n}ms (${t.file})`);
    } else if (n && (n.unit === "px" || n.unit === "")) {
      if (/^-?[\d.]+f?$/.test(got.trim()) && !near(parseFloat(got), n.n, 1e-6))
        problems.push(`${name} — Kotlin ${got.trim()}, src/tokens says ${n.n} (${t.file})`);
    }
  }

  // Android XML — #AARRGGBB, and dp.
  const am = text.colors.match(new RegExp(`<color name="${snake(name)}"\\s*>([^<]+)<`)) ??
             text.dimens.match(new RegExp(`<dimen name="${snake(name)}"\\s*>([^<]+)<`));
  if (am) {
    checked.android++;
    comparisons++;
    const got = am[1].trim();
    if (c) {
      const want = `#${b2(c.a * 255)}${b2(c.r)}${b2(c.g)}${b2(c.b)}`;
      if (got.toUpperCase() !== want)
        problems.push(`${name} — Android XML ${got}, src/tokens says ${want} (${t.file})`);
    } else if (n) {
      const g = num(got);
      if (g && !near(g.n, n.n, 1e-6))
        problems.push(`${name} — Android XML ${got}, src/tokens says ${n.n} (${t.file})`);
      // The UNIT is the whole point on Android. `sp` scales with the user's font-size setting and
      // `dp` does not, so a type size emitted as dp means a seller who enlarged their system font
      // gets no change from the entire type scale — invisible in every screenshot. Comparing only
      // the number passed that mutation, which is how this line came to exist.
      const wantUnit = scalesWithUserFont(tok) ? "sp" : "dp";
      if (g && g.unit !== wantUnit)
        problems.push(`${name} — Android XML ${got} is ${g.unit || "unitless"}, must be ${wantUnit}` +
          (wantUnit === "sp" ? " (type scales with the user's font-size setting; dp does not)" : ""));
    }
  }

  if (comparisons === 0 && COMPARABLE.has(t.type) && !isIosFont(tok)) {
    zeroCompared.push(`${name} (${t.type}, ${t.file}) — value ${JSON.stringify(t.value).slice(0, 60)}`);
  }
}

// Every type size must carry its paired `--<name>--line-height` in @theme, matching its leading
// token. That pairing is what makes one `text-curio-*` class set size AND leading; without it the
// class sets size only and the element inherits whatever line-height is above it — the exact defect
// the scale exists to end. Dropping the pair changed nothing else, so nothing else caught it.
for (const path of Object.keys(raw)) {
  const segs = path.split(".");
  const tok = { path: segs, $type: raw[path].type };
  if (!isTypeSize(tok)) continue;
  const lead = resolve(`leading.${segs[1]}`);
  if (!lead) { problems.push(`type.${segs[1]} has no matching leading.${segs[1]} in src/tokens`); continue; }
  const want = num(lead.value);
  const pair = `${themeName(tok)}--line-height`;
  const m = text.css.match(new RegExp(`${pair.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`));
  if (!m) problems.push(`${pair} is missing — text-curio-${segs[1]} would set size but not leading`);
  else {
    const got = num(m[1]);
    if (!got || !near(got.n, want.n, 1e-6))
      problems.push(`${pair} is ${m[1].trim()}, leading.${segs[1]} says ${want.n}${want.unit}`);
  }
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} generated value(s) do not match src/tokens:`);
  for (const p of problems) console.error(`    ${p}`);
  console.error("\n  The outputs agree with each other and disagree with the SOURCE, so neither the");
  console.error("  staleness diff nor the contrast gate can see this. Fix the transform in build.mjs.\n");
  process.exit(1);
}
// The zero-comparison guard. A source token of a comparable type that came out of the loop having
// been compared against NOTHING is this check failing quietly, which is the shape it has already
// failed in twice — once on a CSS naming scheme, once on DTCG's object colour form.
if (zeroCompared.length) {
  console.error(`\n✗ ${zeroCompared.length} source token(s) were compared against no output at all:`);
  for (const z of zeroCompared) console.error(`    ${z}`);
  console.error("\n  Uncompared is not the same as correct. Fix the parsing, do not widen the filter.\n");
  process.exit(1);
}

// Every colour/dimension/duration in the source must have been compared somewhere. A source token
// that reached no output at all is the parity check's subject, not this one's — but one that is
// PRESENT and uncompared is this one failing quietly.
const realGaps = uncompared.filter((u) => !/font|ease/.test(u));
if (realGaps.length) {
  console.error(`\n✗ ${realGaps.length} source token(s) could not be compared against the CSS:`);
  for (const u of realGaps) console.error(`    ${u}`);
  console.error("\n  Uncomparable is not the same as correct. Fix the lookup, do not widen it.\n");
  process.exit(1);
}
const total = Object.values(checked).reduce((a, b) => a + b, 0);
console.log(`✓ outputs match src/tokens — ${total} value comparisons (${checked.css} CSS · ${checked.swift} Swift · ${checked.kotlin} Kotlin · ${checked.android} Android XML)`);
