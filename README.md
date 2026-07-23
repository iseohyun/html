# Web Educational & Utility Platform (iseohyun.com)

[English](README.md) | [한국어](README.ko.md)

An open-source interactive web application platform featuring educational content, web technologies, interactive tools, and mini-simulators built with vanilla HTML, CSS, JavaScript, and Web APIs.

---

## 📂 Repository Directory Structure

```
.
├── index.html               # Main SPA portal entry point
├── hierarchy.json           # Unified navigation tree & category mapping
├── update.json              # Structured project update logs
├── CHANGELOG.md             # Standardized version history
├── LICENSE                  # Open source license
│
├── basicStudy/              # Fundamental study subjects (Math, Science, History)
├── coding/                  # Programming language tutorials & algorithms
├── column/                  # Technical essays and columns
├── web-tech/                # Web technology docs & visualizers (HTML, CSS, JS, SVG, Canvas, LaTeX)
├── small-project/           # Interactive web simulators & standalone applications
│   ├── bezier-simulator/    # Interactive Bezier curve visualizer
│   ├── son-preference/      # Son preference demographic simulator
│   ├── janggi/              # Web Janggi (Korean Chess) Engine (Under active development)
│   └── ...
│
├── modules/                 # SPA Core Framework Modules
│   └── core/                # Navigation, routing, keybindings, history
│
└── docs/                    # Architectural documents & development guides
    └── AI_Coding_Rules.md   # Guidelines for AI pair programming
```

---

## 🚀 Features & Main Categories

1. **Basic Study (`/basicStudy/`)**: Mathematics, science, and fundamental school subjects.
2. **Coding (`/coding/`)**: Algorithms, C/C++, Java, Python, and software concepts.
3. **Web Tech (`/web-tech/`)**: Core web platform standards (HTML, CSS, JavaScript, Canvas 2D, SVG, LaTeX).
4. **Small Projects (`/small-project/`)**: Standalone simulators, utilities, and browser tools.

---

## 🛠️ Development & Local Run

This project runs as a static SPA or standard web server application.

### Running Locally
```bash
# Using Node.js npx serve
npx serve .

# Or using Python http.server
python -m http.server 8000
```
Open `http://localhost:8000` in your browser.

---

## 📄 License & Contributing

* **Changelog**: See [CHANGELOG.md](CHANGELOG.md) for full change history.
* **Development Rules**: See [docs/AI_Coding_Rules.md](docs/AI_Coding_Rules.md) for AI collaboration rules.
