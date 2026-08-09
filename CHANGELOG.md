# Changelog

## 1.1.0 — 2026-08-09

WORK-BACKLOG.md Packet CC-2 slice 0 (`curio-shared`) — checked whether v1.0.0 already exposed
type/spacing/radius to Swift before assuming it needed adding. Findings: `Colors`, `Radius`,
`Duration`, and `Fonts` (family-name strings) were **already generated and exported** — no new
token category needed. `spacing` was never a token on either platform (web has no spacing token
category to mirror; it uses Tailwind's default scale directly), so there's nothing to add there.

The one real gap: the `Fonts` names ("Plus Jakarta Sans", "IBM Plex Mono") had no matching font
**files** anywhere in this package, so on iOS `Font.custom(CurioTokens.Fonts.brandTypeProduct, ...)`
silently fell back to system SF — nothing had ever registered the actual typeface with the system
(unlike an app target's `Info.plist` `UIAppFonts`, a SwiftPM resource bundle's fonts are never
auto-registered).

- Added `Sources/CurioTokens/Fonts/` — the actual font binaries, bundled as SwiftPM resources:
  `PlusJakartaSans-Variable.ttf` (variable font, `wght` axis covers 200–800, i.e. every weight
  `next/font` requests on web: 400/500/600/700/800) and `IBMPlexMono-Regular.ttf` /
  `IBMPlexMono-Medium.ttf` (static weights, matching web's 400/500). Both SIL Open Font License
  1.1 (`licenses/OFL-*.txt`), sourced from the upstream `google/fonts` repo — free to bundle.
- Added `CurioTokens.registerFonts()` (`Sources/CurioTokens/FontLoader.swift`, hand-authored, not
  Style Dictionary output) — call once at app launch; registers the bundled fonts via
  `CTFontManagerRegisterFontsForURL` so the existing `Fonts` name strings actually resolve.
  Idempotent (a duplicate-registration error is swallowed, not thrown).
- Verified: `xcodebuild -scheme CurioTokens -destination "generic/platform=iOS Simulator" build`
  succeeds; the built resource bundle contains all three `.ttf` files under `Fonts/`.

No breaking changes — purely additive (`registerFonts()` + bundled resources). Existing `Colors`/
`Radius`/`Duration`/`Fonts` consumers are unaffected.

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
