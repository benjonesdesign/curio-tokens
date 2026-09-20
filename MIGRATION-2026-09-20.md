# Migration — spacing renumbered, line.quiet renamed

**Breaking.** Two renames in one release, deliberately: both were decided on 2026-09-20 and doing
them together costs the three platform lanes one find-and-replace pass instead of two.

Every change below is a **rename only**. No value moved. If a screen looks different after this
migration, the migration was applied wrongly.

## 1 · `spacing` is numbered, not t-shirt sized

The old scale ran `xs sm md lg xl xxl`. Two steps were needed above it, and the names ran out of
letters (`xxxl`, `xxxxl`); inserting a step *between* two existing ones would not have been nameable
at all. Numbering survives both. Two new steps, 7 and 8, are additions — nothing referenced them
before, so they need no migration.

| was | is | value | CSS | Swift | Kotlin | Android |
|---|---|--:|---|---|---|---|
| `xs`  | `1` | 4px  | `--spacing-curio-1` | `spacing1` | `spacing1` | `curio_spacing_1` |
| `sm`  | `2` | 8px  | `--spacing-curio-2` | `spacing2` | `spacing2` | `curio_spacing_2` |
| `md`  | `3` | 12px | `--spacing-curio-3` | `spacing3` | `spacing3` | `curio_spacing_3` |
| `lg`  | `4` | 16px | `--spacing-curio-4` | `spacing4` | `spacing4` | `curio_spacing_4` |
| `xl`  | `5` | 24px | `--spacing-curio-5` | `spacing5` | `spacing5` | `curio_spacing_5` |
| `xxl` | `6` | 32px | `--spacing-curio-6` | `spacing6` | `spacing6` | `curio_spacing_6` |
| —     | `7` | 48px | new | new | new | new |
| —     | `8` | 64px | new | new | new | new |

**Do the replacement longest-first** — `xxl` before `xl` before `x`, and `--spacing-curio-xxl`
before `--spacing-curio-xl`. A naive left-to-right pass turns `xxl` into `1xl`.

## 2 · `line.quiet` is `line.border`, and there is now a `line.divider`

`line.quiet` was doing two jobs at one value: the edge of a panel, and the rule between two rows.
`patterns/separation.md` rule 3 requires a divider to be **quieter than every border on the screen**,
which one token cannot express. The names now say which is which — `quiet` never did, and the whole
rule is a comparison.

| was | is | value | note |
|---|---|---|---|
| `line.quiet` | `line.border` | unchanged — paper tint at 14% | every existing use is a border; rename only |
| — | `line.divider` | white at 10% | **new.** Between items in one list, never above the first or below the last, never between sections |

| | CSS | Swift | Kotlin | Android |
|---|---|---|---|---|
| border | `--color-curio-line-border` | `lineBorder` | `lineBorder` | `curio_line_border` |
| divider | `--color-curio-line-divider` | `lineDivider` | `lineDivider` | `curio_line_divider` |

**Rename first, then adopt.** Step one is mechanical and changes nothing on screen: every
`line-quiet` becomes `line-border`. Step two is a judgement per site: a hairline **between rows of
one list** becomes `line-divider`. There were 98 uses of `line.quiet` across the drawn screens and
all 98 were borders, so step two is expected to touch very few places in app code — the dividers it
is for are mostly in screens that have not been built yet.

## What was verified

Built with Style Dictionary 4.4.0 on 2026-09-20. All four outputs regenerated, `verify-outputs.mjs`
passes at **396 value comparisons** (114 CSS · 104 Swift · 93 Kotlin · 85 Android XML), and the AA
gate passes with all 18 status/accent/focus tokens covered.

**Not verified:** that any app still compiles. This repo cannot see `app/`, `ios/` or
`curio-capture-android/`, so the three lanes own their own replacement pass.
