# Changelog

## 3.2.0 — 2026-08-26

**Adds Android output — the same generator, a third platform.** Two new Style Dictionary formats
in `build.mjs` alongside the existing `curio/css-theme`/`curio/swift`:

- `curio/compose` → `src/main/kotlin/com/curio/tokens/CurioTokens.kt` (+ a `dist/CurioTokens.kt`
  reference copy, mirroring `dist/CurioTokens.swift`). Emits **raw values** — packed-ARGB `Long`
  for color, `Float` for dp, `Long` milliseconds for duration — not
  `androidx.compose.ui.graphics.Color`/`Dp` directly, so this stays a plain `kotlin("jvm")` module
  with zero Compose/Android-SDK dependency to build (same posture as `@curio/contracts`' Kotlin
  target: JitPack needs only a JDK). Consumer wraps at the call site:
  `Color(CurioTokens.Colors.surfaceBase)`, `CurioTokens.Radius.radiusMd.dp`.
- `curio/android-colors-xml` / `curio/android-dimens-xml` → `dist/android/values/{colors,dimens}.xml`
  — standard Android resource XML for a non-Compose (View/XML-layout) consumer. Lower fidelity
  than the Kotlin target: there's no "pin a git tag, get resources merged automatically" mechanism
  for bare resource XML without this becoming a real `com.android.library` AAR (which would need
  the Android SDK just to build this repo) — so these are generated, committed files the Android
  app copies into its own `res/values/` at each version bump, same posture as how a web consumer
  references `dist/curio-brand.css` directly.
- New root-level Gradle project (`build.gradle.kts`, `settings.gradle.kts`, Gradle 8.10 wrapper),
  consumed via JitPack (`com.github.benjonesdesign:curio-tokens:vX.Y.Z`) — the direct Android-
  Gradle equivalent of the npm `github:` dependency and the SwiftPM git-tag pin already in use.
- **Known gap, not silently worked around:** font *files* aren't bundled for Android the way
  `Sources/CurioTokens/Fonts/*.ttf` are for iOS, so `CurioTokens.Fonts` doesn't exist yet on the
  Kotlin side — Android has no PostScript-name equivalent to emit today, and a real fix means
  bundling actual font assets + wiring a Compose `FontFamily`, which is a separate, larger piece of
  work. This is the same wiring gap the previous session flagged for iOS's own `brand.type.*`
  tokens ("tokens still aren't wired into iOS either") — Android inherits it too, one platform
  later, rather than a new problem introduced here.
- `npm run check` now also diffs `src/main/kotlin` for drift, not just `dist`/`Sources`.
- `src/test/kotlin/com/curio/tokens/CurioTokensTest.kt` (new) — locks the packed-ARGB byte layout
  (opaque tokens carry a full `FF` alpha byte, translucent tokens don't get silently forced
  opaque) and that Radius/Spacing/Duration values are directly usable as Compose dp/ms.

## 3.1.0 — 2026-08-19

**Additive, closes the weight-differentiation gap v3.0.0 flagged.** Plus Jakarta Sans was bundled
as a single variable font (`PlusJakartaSans-Variable.ttf`) whose named instances had no
individually-addressable PostScript name — only the Regular instance resolved via `Font.custom`.
Replaced it with 5 static per-weight files (Ben supplied the official Google Fonts static
archive), scoped to exactly the weights `curio-capture-ios`'s `Font.brand(weight:)` call sites
actually request (91 call sites audited: `.medium`/`.semibold`/`.bold`/`.heavy`) — not the full
7-weight family, no italics (none used):

- `fontIosProductMedium` = `"PlusJakartaSans-Medium"`
- `fontIosProductSemiBold` = `"PlusJakartaSans-SemiBold"` (the most-used override, 59 sites)
- `fontIosProductBold` = `"PlusJakartaSans-Bold"`
- `fontIosProductExtraBold` = `"PlusJakartaSans-ExtraBold"` (SwiftUI's `.heavy` = the 800 weight
  class = Jakarta's ExtraBold)

All 5 PostScript names verified against each bundled `.ttf`'s own embedded name table (fontTools),
same discipline as v3.0.0. `fontIosProduct`/`fontIosDisplay`/`fontIosEvidence`/
`fontIosEvidenceMedium` are unchanged (same values, now backed by a static Regular file instead of
a variable font's default instance — no consumer-visible difference). Resource bundle grows by
~300KB (5 static files vs. 1 variable file) — a reasonable trade for weights that actually render
distinctly. Web/CSS output is, again, byte-identical.

## 3.0.0 — 2026-08-19

**Breaking on iOS only (web/CSS untouched).** SwiftUI's `Font.custom(name:)` needs a font's
PostScript name, not a CSS family name — `CurioTokens.Fonts.fontDisplay/fontProduct/fontEvidence`
held CSS family-name strings ("Plus Jakarta Sans", "IBM Plex Mono"), so `Font.custom` calls using
them (`curio-capture-ios`'s `Font.brand`/`Font.brandMono`) silently failed to resolve and fell
back to system San Francisco — no error, no warning, brand fonts likely never actually rendering
on iOS.

- Removed `fontDisplay`/`fontProduct`/`fontEvidence` from the Swift output — they were actively
  wrong for `Font.custom` use and this removes the footgun rather than leaving it alongside a
  fix. `brandTypeDisplay`/`brandTypeProduct`/`brandTypeEvidence` (raw `brand.type.*`, unused for
  `Font.custom` today) are untouched.
- Added real PostScript-name tokens, verified against each bundled font file's own embedded name
  table (fontTools), not guessed: `fontIosDisplay`/`fontIosProduct` = `"PlusJakartaSans-Regular"`,
  `fontIosEvidence` = `"IBMPlexMono-Regular"`, `fontIosEvidenceMedium` = `"IBMPlexMono-Medium"`.
  New source: `src/tokens/type-ios.json`. Never emitted into web CSS (a PostScript name is
  meaningless there).
- **Known gap, deliberately not papered over:** the bundled Plus Jakarta Sans is a single
  *variable* font (`PlusJakartaSans-Variable.ttf`) whose named instances (Medium/SemiBold/Bold/
  etc.) have no individually-addressable PostScript name — confirmed via the font's own `fvar`
  table (`postscriptNameID` is unset on every non-default instance). Only the Regular (wght=400)
  instance is resolvable via `Font.custom` today. `curio-capture-ios` calls `Font.brand(weight:
  .semibold/.bold/...)` extensively (91 call sites) and `Font.brandMono(weight: .semibold)` once
  — none of those will render as a genuinely different weight until either (a) static per-weight
  TTFs are added + tokened the same way as IBM Plex Mono, or (b) the Swift `Font` extension is
  rewritten to select the variable font's `wght` axis via `UIFontDescriptor`/`CTFont` variation
  attributes. Tracked as a follow-up, not solved by this change.

## 2.0.0 — 2026-08-10

**Breaking (rename only — zero known real consumers, see below).** iOS-cowork follow-up on CC-2
found that web renders radii almost entirely via raw Tailwind `rounded-*` classes rather than
`rounded-curio-*`, so a real-usage audit of `@curio/tokens`' own radius scale had never actually
been done. Results: `rounded-xl` (12px) is the single most-used named radius class app-wide (179
uses) — more than every existing tier except the old `md` — and had no tier at all. The old `sm`
(4px) has zero real-usage evidence anywhere in the app today.

Rather than bolt an awkwardly-named fifth tier onto the existing scale, inserted 12px into a clean
ascending 4-multiple ladder (still honouring the original "Ben's 4-multiple override" design
decision — 12 is 4×3):

- `radius.xs` = 4px (was `sm` — renamed, value unchanged)
- `radius.sm` = 8px (was `md` — renamed, value unchanged; the actual most-used real value, 190
  combined uses via `rounded-lg` + arbitrary `[8px]`)
- `radius.md` = 12px (**new** — was previously unrepresented; 179 real uses via `rounded-xl`)
- `radius.lg` = 16px (unchanged)
- `radius.feature` = 24px (unchanged)

This is a rename for `xs`/`sm`, which is breaking in principle — but `grep -r "rounded-curio-"` /
`Radius\.(sm|md)\b` across `pokemon-tool` returns zero real usages today, so the practical impact
is nil. Bumped major out of semver discipline rather than hiding a rename in a minor release, not
because anything currently shipping actually breaks.

Spacing (added in 1.2.0) was deliberately left as-is in this same follow-up — its 6-tier curation
was already a considered simplification of real usage, not an omission the way the radius gap was.

## 1.2.0 — 2026-08-10

CC-2's iOS consistency slice requested an explicit `Spacing` accessor. v1.1.0's changelog note
("spacing was never a token on either platform... nothing to add") reflected that web has no
*custom* spacing layer — it uses Tailwind v4's default 4px-based scale directly, unmodified. That
call gets reversed here: iOS still needs an explicit vocabulary regardless of whether web's is
implicit, so this formalizes web's actual most-frequently-used spacing values (by usage count
across `app/`, `components/`, `lib/`) as named tokens, the same "extract what's shipping, don't
invent" discipline used for radius/status. Not a redesign — the six values below already are the
app's real spacing rhythm.

- Added `src/tokens/spacing.json`: `xs` (4px) · `sm` (8px) · `md` (12px, the single most-used
  value in the app) · `lg` (16px) · `xl` (24px) · `xxl` (32px).
- New Swift `CurioTokens.Spacing` enum (`spacingXs`...`spacingXxl`, `CGFloat`).
- New CSS `--spacing-curio-*` custom properties in `dist/curio-brand.css`, registered as real
  Tailwind v4 theme vars (`@theme`) — so web can *optionally* adopt `p-curio-md` etc. for the same
  semantic vocabulary as iOS, though nothing in pokemon-tool currently requires it (existing raw
  Tailwind spacing utilities are unaffected either way).

No breaking changes — purely additive. Existing `Colors`/`Radius`/`Duration`/`Fonts` consumers are
unaffected.

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
