# Web Educational & Utility Platform (iseohyun.com)

[English](README.md) | [한국어](README.ko.md)

An open-source interactive web application platform featuring educational content, web technologies, interactive tools, and mini-simulators built with vanilla HTML, CSS, JavaScript, and Web APIs.

---

## 📂 Repository Directory Structure

```
.
├── index.html               # Main SPA portal entry point
├── hierarchy.json           # Unified navigation tree & category mapping
├── changelog.json          # Structured project change history (Keep a Changelog)
├── CHANGELOG.md             # Standardized version history
├── LICENSE                  # Open source license
│
├── math/                    # Math (elementary/, high/, ...) — folders follow the sitemap
├── science/                 # Science
├── engineering/             # Engineering: language/ (C, Java, Python), web/ (HTML, CSS, JS, SVG, Canvas, React, Vite),
│                            #   representation/ (number systems, fonts, Bezier, regex, LaTeX), tools/ (VScode, git), certificate/
├── column/                  # Technical essays and columns (AI, Hold'em, Swimming, ...)
├── sh-standard/             # SH Standard: Common GUI, QuizQuiz, Web Service Open
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

1. **Math · Science (`/math/`, `/science/`)**: Mathematics, science, and fundamental school subjects.
2. **Programming languages (`/engineering/language/`)**: C/C++, Java, Python, and software concepts.
3. **Web (`/engineering/web/`)**: Core web platform standards (HTML, CSS, JavaScript, Canvas 2D, SVG) plus React and Vite. LaTeX lives in `representation/`.
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
