// Token naming — the one place a DTCG source path becomes an emitted token name.
// Extracted from build.mjs so `verify-outputs.mjs` can use the SAME mapping without importing
// build.mjs, which runs the whole build on import. A second copy of this would drift, and a
// drifted copy would make the verifier agree with a generator it was meant to check.

export function cleanName(path) {
  const p = [...path];
  if (p[0] === "semantic") {
    if (p[1] === "dark") {
      const rest = p.slice(2).map((s) => (s === "brand-base" ? "base" : s === "brand-raised" ? "raised" : s));
      return `curio-${rest.join("-")}`;
    }
    if (p[1] === "light") {
      const rest = p.slice(2).map((s) => (s === "brand-base" ? "base" : s));
      return `curio-fallback-${rest.join("-")}`;
    }
    if (p[1] === "focus") return `curio-focus-${p.slice(2).join("-")}`;
  }
  if (p[0] === "status") return `curio-status-${p.slice(1).join("-")}`;
  if (p[0] === "radius") return `curio-radius-${p.slice(1).join("-")}`;
  if (p[0] === "spacing") return `curio-spacing-${p.slice(1).join("-")}`;
  if (p[0] === "font") return `curio-font-${p.slice(1).join("-")}`;
  if (p[0] === "font-feature") return `curio-font-${p.slice(1).join("-")}`;
  if (p[0] === "brand") {
    if (p[1] === "color") return `curio-brand-${p.slice(2).join("-")}`;
    if (p[1] === "opacity") return `curio-opacity-${p.slice(2).join("-").replace("glow-maximum", "glow-max")}`;
    if (p[1] === "blur") return `curio-blur-${p.slice(2).join("-").replace("glow-small", "glow-sm").replace("glow-medium", "glow-md").replace("glow-large", "glow-lg")}`;
    if (p[1] === "border") return `curio-border-${p.slice(2).join("-")}`;
    if (p[1] === "motion" && p[2] === "duration") return `curio-duration-${p.slice(3).join("-")}`;
    if (p[1] === "motion" && p[2] === "easing") return `curio-ease-${p.slice(3).join("-")}`;
    if (p[1] === "radius") return `curio-brand-radius-${p.slice(2).join("-")}`;
    if (p[1] === "type") return `curio-brand-type-${p.slice(2).join("-")}`;
  }
  return `curio-${p.join("-")}`;
}

// Type sizes and leadings are scaled by the USER's font-size setting; every other dimension is not.
// On Android that is the difference between `sp` and `dp`, and emitting a type size as `dp` means a
// seller who has enlarged their system font gets no change from the entire type scale — a failure
// that appears in no screenshot and no visual review. Named here so all three emitters agree.
export const isTypeSize = (t) => t.path[0] === "type";
export const isLeading   = (t) => t.path[0] === "leading";
export const isWeight    = (t) => (t.$type ?? t.type) === "fontWeight";
export const scalesWithUserFont = (t) => isTypeSize(t) || isLeading(t);

// ── Partitioning: which tokens are Tailwind @theme utilities vs plain vars ──
export const isColor  = (t) => (t.$type ?? t.type) === "color";
export const isRadius  = (t) => t.path[0] === "radius";
export const isSpacing = (t) => t.path[0] === "spacing";
export const isFont    = (t) => t.path[0] === "font" && t.path[1] !== undefined && t.path.length === 2 && ["display", "product", "evidence"].includes(t.path[1]);
export const themeVar  = (t) => isColor(t) || isRadius(t) || isSpacing(t) || isFont(t) || isTypeSize(t) || isLeading(t) || isWeight(t);
// iOS-only PostScript-name tokens (type-ios.json) — Swift output only, never web CSS. A
// PostScript name ("PlusJakartaSans-Regular") is meaningless as a CSS custom property; emitting
// it would just be dead, confusing output for web consumers.
export const isIosFont = (t) => t.path[0] === "font-ios";

export function themeName(t) {
  const n = cleanName(t.path); // e.g. curio-surface-base
  if (isColor(t))   return `--color-${n.replace(/^curio-/, "curio-")}`;
  if (isRadius(t))  return `--radius-${t.path.slice(1).join("-")}`.replace(/^--radius-/, "--radius-curio-");
  if (isSpacing(t)) return `--spacing-${t.path.slice(1).join("-")}`.replace(/^--spacing-/, "--spacing-curio-");
  if (isFont(t))    return `--font-curio-${t.path.slice(1).join("-")}`;
  // Tailwind v4 namespaces. `--text-*` generates text-<name>, and a paired `--text-<name>--line-height`
  // makes that ONE utility set size and leading together — which is why the leadings are worth
  // shipping rather than leaving every call site to pick one. Verified against tailwindcss 4.3.2.
  if (isTypeSize(t)) return `--text-curio-${t.path.slice(1).join("-")}`;
  if (isLeading(t))  return `--leading-curio-${t.path.slice(1).join("-")}`;
  if (isWeight(t))   return `--font-weight-curio-${t.path.slice(1).join("-")}`;
  return `--${n}`;
}


