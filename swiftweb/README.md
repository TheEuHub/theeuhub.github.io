# SWTK — SwiftUI, Rendered by HTML

A fan-made SwiftUI→HTML engine built for **The OldOS Project: Web Edition**.
Write real SwiftUI syntax in the browser, press **Run**, and watch it render.
No build step. No WebAssembly. No dependencies.

**Live playground:** <https://theeuhub.github.io/swiftweb/>

## What it is

Three files, ~1,200 lines total, plain static hosting:

| File | What it does |
|------|--------------|
| `swiftc.js` (~980 lines) | Hand-written lexer + recursive-descent parser + emitter. Translates a readable SwiftUI subset into JS that calls SWTK’s runtime. Errors carry line numbers. |
| `swtk.js` (~440 lines) | The runtime. Declarative view descriptors, `@State` cells with SwiftUI-style invalidation, full subtree re-render with field-focus restoration, and an iOS-light design system (stacks, lists, toggles, sliders, buttons). |
| `samples.js`| Playground presets (Counter, Live Greeting, Fruit List, Settings Panel). |

## Why not SwiftWasm?

SwiftWasm + Tokamak is the "real" answer and may supersede this later. It was
deliberately not used here: GitHub Release assets are unreachable from the
environment this site is built in, and shipping a 1 GB toolchain for a static
page is a poor trade even where it’s reachable. SWTK gets you the important
part today — **SwiftUI syntax as the authoring format** — with zero runtime
cost and full transparency into what it emits. (The "Show generated JS" button
prints exactly what your Swift became.)

## Supported surface

- `struct Name: View`, exactly one view per file
- `@State private var x = <literal>` with SwiftUI invalidation semantics
- `var body: some View { … }` — ViewBuilder with multiple children
- `VStack` / `HStack` / `ZStack` / `Group` / `ScrollView` / `List` (`alignment:`/`spacing:`)
- `Text` with `\(interpolation)`, `Button("…") { }`, `Image(systemName:)` (SF Symbol subset → glyphs)
- `Spacer()`, `Rectangle()`, `Circle()`
- `TextField("…", text: $x)` · `Toggle("…", isOn: $x)` · `Slider(value: $x, in: 0...1)`
- `ForEach(0..<n) { i in … }` and `ForEach(collection) { item in … }` (two parameters = index, element)
- `if … { } else if … { } else { … }` inside builders, `let` inside builders
- Modifiers: `.padding` `.foregroundColor` `.background` `.fill` `.font` `.fontWeight`
  `.bold` `.italic` `.cornerRadius` `.frame(width:height:)` `.opacity` `.shadow(radius:)`
  `.tint` `.tracking` `.lineLimit` `.multilineTextAlignment` `.disabled` `.onTapGesture { }`
- Expressions: ternaries, `&& || !`, comparisons, arrays, `Int()`/`Double()`/`String()`/`abs()`/`min()`/`max()`, ternaries, method-call chaining, `arr.count`, `arr.first`, `arr.isEmpty`, `Color(.red)` / `.red` literals
- Statements: `x = e`, `x += e`, `x -= e`, `x *= e`, `x /= e`, `flag.toggle()`

## Honest limitations

- **Not a Swift compiler.** It’s a respectful subset — anything outside it fails
  with a line-numbered error at compile time rather than miscompiling silently.
- No `@ObservedObject` / `@Binding` / `@Environment` (single-view scope only).
- No navigation stacks, sheets, alerts, animations, or property observers.
- No subscript syntax (`arr[0]`) or member functions yet.
- Full subtree re-render — fine for apps this size, would need keyed diffing for 60 fps lists.
- `SF Symbol` names map to a small glyph subset, not the real font.

## Attribution

SWTK is part of **OldOS · Web Edition**, a fan recreation of
[**The OldOS Project**](https://github.com/zzanehip/The-OldOS-Project) by
**zzanehip** (Zane), used under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
Apple, iPhone, iOS, Swift and SwiftUI are trademarks of Apple Inc., who are not
affiliated with and do not endorse this project.
