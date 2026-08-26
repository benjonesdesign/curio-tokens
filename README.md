# @curio/tokens

The single source for Curio's brand design tokens (dark "Luminous Workbench" palette, radius
scale, type, independent status colors), compiled by [Style Dictionary](https://styledictionary.com/)
to every product's native format. One version, four products, no hand-copied files.

## What this produces

| Output | Consumer | Format |
|---|---|---|
| `dist/curio-brand.css` | pokemon-tool (app), cardops-website | Tailwind v4 `@theme` + `:root` CSS vars |
| `Sources/CurioTokens/CurioTokens.swift` | CurioCapture (iOS) | SwiftPM library `CurioTokens` |
| `src/main/kotlin/com/curio/tokens/CurioTokens.kt` | Android | Kotlin/JVM library `CurioTokens` (raw values — see "Consuming this package") |
| `dist/android/values/{colors,dimens}.xml` | Android (non-Compose) | Standard Android resource XML |

All are generated from `src/tokens/*.json` (DTCG token format) by `npm run build`, and are
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

**Android (Gradle, via JitPack):** JitPack builds straight from a GitHub tag with no separate
publish step — the same posture as web's `github:` dependency and iOS's SwiftPM pin.

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories { maven { url = uri("https://jitpack.io") } }
}
```
```kotlin
// app/build.gradle.kts
dependencies {
    implementation("com.github.benjonesdesign:curio-tokens:v3.2.0")
}
```
```kotlin
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.curio.tokens.CurioTokens

val surface = Color(CurioTokens.Colors.surfaceBase)   // packed ARGB Long -> Color
val corner = CurioTokens.Radius.radiusMd.dp            // Float -> Dp
val anim = tween<Float>(durationMillis = CurioTokens.Duration.durationStandard.toInt())
```
Values are raw (not `androidx.compose.ui` types) so this module has zero Compose/Android-SDK
dependency to build — see CHANGELOG.md 3.2.0 for why, and its "known gap" note on `Fonts` (not
emitted yet — no font files bundled for Android today, same wiring gap iOS's own `brand.type.*`
tokens already have).

**Android (non-Compose, XML resources):** copy `dist/android/values/colors.xml` and `dimens.xml`
into the app's own `res/values/` at each version bump — see CHANGELOG.md 3.2.0 for why this one
output is copy-in rather than a pinned dependency like everything else here.

## Releasing a new version

1. Edit `src/tokens/*.json`.
2. `npm run build` — regenerates `dist/`, `Sources/CurioTokens/CurioTokens.swift`, and
   `src/main/kotlin/com/curio/tokens/CurioTokens.kt`, and fails the process if any WCAG AA
   contrast check regresses.
3. `npm run check` — fails if any committed generated output (`dist/`, `Sources/`,
   `src/main/kotlin`) is stale vs a fresh build (drift guard — this is what each consumer's own
   `tokens:check` also runs against the installed copy). Optionally also `./gradlew test` —
   `CurioTokensTest.kt` exercises the generated Kotlin's actual values, not just the build's exit
   code.
4. Bump `version` in `package.json`, update `CHANGELOG.md`, commit, tag (`git tag vX.Y.Z`), push
   with tags.
5. Bump the pinned tag in each consumer's `package.json` (app, website), `project.yml` / Xcode
   package version (iOS), and the Android app's `build.gradle.kts` dependency version. JitPack
   builds the Android artifact lazily on first request for a tag — no push-side publish step.

## Governance

One owner for `src/tokens/*.json`. Changes land via PR here first, then a version bump propagates
to the four consumers — never edit the generated `dist/`/`Sources/`/`src/main/kotlin` files by
hand, and never re-implement a token value locally in a consumer repo (see each consumer's
`tokens:check`).
