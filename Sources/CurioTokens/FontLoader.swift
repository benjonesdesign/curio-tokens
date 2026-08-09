// Hand-authored (not Style Dictionary output) — CurioTokens.swift's `Fonts` enum has always
// exposed the brand typeface FAMILY NAMES ("Plus Jakarta Sans", "IBM Plex Mono"), but a SwiftPM
// resource bundle's fonts are never picked up automatically the way an app target's Info.plist
// `UIAppFonts` entries are — nothing registers them with the system, so `Font.custom(...)` or
// `UIFont(name:...)` silently falls back to the system face. This file bundles the actual font
// binaries as package resources and provides the one-time registration call that makes the
// existing `Fonts` name strings actually resolve.
//
// WORK-BACKLOG.md Packet CC-2 slice 0: confirmed `@curio/tokens` v1.0.0 already exposes
// Colors/Radius/Duration/Fonts(names) to Swift — the real gap was font FILES, not a missing
// accessor. Bundled here rather than adding a new token category.
//
// Files: PlusJakartaSans-Variable.ttf (variable font, weights 200–800 via the `wght` axis — covers
// every weight pokemon-tool's `next/font` config requests: 400/500/600/700/800) and
// IBMPlexMono-Regular.ttf / IBMPlexMono-Medium.ttf (static weights — matches web's 400/500).
// Both typefaces are SIL Open Font License 1.1 (see licenses/ at the repo root) — free to bundle
// and redistribute.

import CoreText
import Foundation

extension CurioTokens {
    /// Registers the bundled brand fonts with the system so `Font.custom(CurioTokens.Fonts.*, ...)`
    /// / `UIFont(name: CurioTokens.Fonts.*, ...)` resolve to the real Curio typefaces instead of
    /// silently falling back to system SF. Call once, early (e.g. in the App's `init()`) —
    /// idempotent, safe to call more than once (a "duplicate name" registration error is ignored,
    /// not thrown, since that just means a previous call already succeeded).
    public static func registerFonts() {
        let names = ["PlusJakartaSans-Variable", "IBMPlexMono-Regular", "IBMPlexMono-Medium"]
        for name in names {
            guard let url = Bundle.module.url(forResource: name, withExtension: "ttf", subdirectory: "Fonts") else {
                assertionFailure("CurioTokens.registerFonts: \(name).ttf not found in the resource bundle")
                continue
            }
            var error: Unmanaged<CFError>?
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error)
            // Ignore "already registered" (duplicate) — every other failure is a real bundling bug.
            if let error, CFErrorGetCode(error.takeUnretainedValue()) != CTFontManagerError.duplicatedName.rawValue {
                assertionFailure("CurioTokens.registerFonts: failed to register \(name): \(error.takeUnretainedValue())")
            }
        }
    }
}
