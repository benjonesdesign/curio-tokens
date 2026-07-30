# Changelog

## 1.0.0 — 2026-07-30

Initial versioned release, extracted from `pokemon-tool/packages/curio-tokens` so the app,
website, and iOS repos can each install a pinned copy instead of vendoring their own generated
files. Token values are unchanged from the pre-extraction build (verified byte-identical CSS
output aside from the header comment).

- Dark "Luminous Workbench" brand palette (archive/midnight surfaces, paper text, mint/violet/amber
  accents, independent status success/warning/danger scale).
- Radius scale: 4 / 8 / 16 / 24 (design-system override of the brand pack's 6/10/16/24).
- Type: Plus Jakarta Sans (display/product), IBM Plex Mono (evidence/identifiers).
- Outputs: `dist/curio-brand.css` (app + website, same Tailwind v4 format), `Sources/CurioTokens/CurioTokens.swift`
  (iOS SwiftPM library).
