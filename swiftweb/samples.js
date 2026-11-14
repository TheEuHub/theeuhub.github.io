/* SWTK playground presets — real SwiftUI syntax, compiled in-browser */
var SWTK_SAMPLES = [
  {
    id: 'counter',
    name: 'Tap Counter',
    file: 'CounterView.swift',
    code:
'struct CounterView: View {\n' +
'    @State private var count = 0\n' +
'\n' +
'    var body: some View {\n' +
'        VStack(spacing: 16) {\n' +
'            Text("TAPS")\n' +
'                .font(.caption)\n' +
'                .tracking(2)\n' +
'                .foregroundColor(.gray)\n' +
'            Text("\\(count)")\n' +
'                .font(.largeTitle)\n' +
'                .bold()\n' +
'            HStack(spacing: 14) {\n' +
'                Button("−") { count -= 1 }\n' +
'                    .tint(.gray)\n' +
'                Button("+") { count += 1 }\n' +
'            }\n' +
'            Button("Reset") { count = 0 }\n' +
'                .tint(.red)\n' +
'        }\n' +
'        .padding(28)\n' +
'        .background(Color(.white))\n' +
'        .cornerRadius(22)\n' +
'        .shadow(radius: 14)\n' +
'    }\n' +
'}\n'
  },
  {
    id: 'greeting',
    name: 'Live Greeting',
    file: 'GreetingView.swift',
    code:
'struct GreetingView: View {\n' +
'    @State private var name = "2010"\n' +
'\n' +
'    var body: some View {\n' +
'        VStack(spacing: 14) {\n' +
'            Text("Hello, \\(name)!")\n' +
'                .font(.title)\n' +
'                .bold()\n' +
'            TextField("Your name", text: $name)\n' +
'            Text("Typed live, in your browser.")\n' +
'                .font(.caption)\n' +
'                .foregroundColor(.gray)\n' +
'            Image(systemName: "star")\n' +
'                .foregroundColor(.yellow)\n' +
'                .font(.largeTitle)\n' +
'        }\n' +
'        .padding(28)\n' +
'        .background(Color(.white))\n' +
'        .cornerRadius(22)\n' +
'        .shadow(radius: 14)\n' +
'    }\n' +
'}\n'
  },
  {
    id: 'fruits',
    name: 'Fruit List',
    file: 'FruitView.swift',
    code:
'struct FruitView: View {\n' +
'    let fruits = ["Apple", "Comet Halley", "Star Fruit", "Lunar Melon"]\n' +
'    @State private var picked = 0\n' +
'\n' +
'    var body: some View {\n' +
'        VStack(alignment: .leading, spacing: 12) {\n' +
'            Text("Picked: \\(picked)")\n' +
'                .font(.headline)\n' +
'            ForEach(fruits) { f in\n' +
'                Button(f) { picked += 1 }\n' +
'                    .tint(.green)\n' +
'            }\n' +
'            Text("First on the shelf: \\(fruits.first)")\n' +
'                .font(.caption)\n' +
'                .foregroundColor(.gray)\n' +
'        }\n' +
'        .padding(24)\n' +
'        .background(Color(.white))\n' +
'        .cornerRadius(22)\n' +
'        .shadow(radius: 14)\n' +
'    }\n' +
'}\n'
  },
  {
    id: 'settings',
    name: 'Settings Panel',
    file: 'SettingsView.swift',
    code:
'struct SettingsView: View {\n' +
'    @State private var wifi = true\n' +
'    @State private var brightness = 0.6\n' +
'\n' +
'    var body: some View {\n' +
'        VStack(alignment: .leading, spacing: 16) {\n' +
'            Text("Settings")\n' +
'                .font(.headline)\n' +
'            Toggle("Wi-Fi", isOn: $wifi)\n' +
'            if wifi {\n' +
'                Text("Networks nearby: 12")\n' +
'                    .font(.caption)\n' +
'                    .foregroundColor(.green)\n' +
'            } else {\n' +
'                Text("Wi-Fi is off")\n' +
'                    .font(.caption)\n' +
'                    .foregroundColor(.red)\n' +
'            }\n' +
'            Text("Brightness \\(Int(brightness * 100))%")\n' +
'                .font(.caption)\n' +
'                .foregroundColor(.gray)\n' +
'            Slider(value: $brightness, in: 0...1)\n' +
'        }\n' +
'        .padding(24)\n' +
'        .background(Color(.white))\n' +
'        .cornerRadius(22)\n' +
'        .shadow(radius: 14)\n' +
'    }\n' +
'}\n'
  }
];
