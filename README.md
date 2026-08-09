# @curio/tokens

The single source for Curio's brand design tokens (dark "Luminous Workbench" palette, radius
scale, type, independent status colors), compiled by [Style Dictionary](https://styledictionary.com/)
to every product's native format. One version, three products, no hand-copied files.

## What this produces

| Output | Consumer | Format |
|---|---|---|
| `dist/curio-brand.css` | pokemon-tool (app), cardops-website | Tailwind v4 `@theme` + `:root` CSS vars |
| `Sources/CurioTokens/CurioTokens.swift` | CurioCapture (iOS) | SwiftPM library `CurioTokens` |

Both are generated from `src/tokens/*.json` (DTCG token format) by `npm run build`, and are
committed to this repo at each tagged release — consumers install a pinned version and use the
generated output directly; nothing is ever hand-copied between repos.

## Consuming this package

**App / website (npm, git-URL dependency):**
```json
"dependencies": {
  "@curio/tokens": "github:benjonesdesign/curio-tokens#v1.0.0"
}
```
```css
/* app/globals.css or website/app/globals.css */
@import "@curio/tokens/dist/curio-brand.css";
```

**iOS (SwiftPM):** add this repo as a package dependency pinned to an exact version (e.g. `1.1.0`)
in Xcode / `project.yml`, then:
```swift
import CurioTokens
Color(...) // e.g. CurioTokens.Colors.brandCurioLight400
CurioTokens.Radius.radiusMd     // CGFloat corner radius
CurioTokens.Spacing.spacingMd   // CGFloat spacing (v1.2.0+)
CurioTokens.Duration.durationStandard  // TimeInterval for animations
```

**Brand fonts (`Fonts` names + the actual typefaces, v1.1.0+):** `CurioTokens.Fonts.brandTypeProduct`
etc. give you the family-name string, but on iOS a SwiftPM resource bundle's fonts are never
auto-registered the way an app target's `Info.plist` would — call `CurioTokens.registerFonts()`
once, early (e.g. your App's `init()`), before using `Font.custom(CurioTokens.Fonts.*, size:)`:
```swift
@main
struct YourApp: App {
    init() { CurioTokens.registerFonts() }
    ...
}
```

## Releasing a new version

1. Edit `src/tokens/*.json`.
2. `npm run build` — regenerates `dist/` and `Sources/CurioTokens/CurioTokens.swift`, and fails
   the process if any WCAG AA contrast check regresses.
3. `npm run check` — fails if the committed `dist/`/`Sources/` are stale vs a fresh build (drift
   guard — this is what each consumer's own `tokens:check` also runs against the installed copy).
4. Bump `version` in `package.json`, update `CHANGELOG.md`, commit, tag (`git tag vX.Y.Z`), push
   with tags.
5. Bump the pinned tag in each consumer's `package.json` (app, website) and `project.yml` /
   Xcode package version (iOS).

## Governance

One owner for `src/tokens/*.json`. Changes land via PR here first, then a version bump propagates
to the three consumers — never edit the generated `dist/`/`Sources/` files by hand, and never
re-implement a token value locally in a consumer repo (see each consumer's `tokens:check`).
