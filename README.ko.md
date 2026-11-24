# 웹 교육 및 인터랙티브 시뮬레이터 플랫폼 (iseohyun.com)

[English](README.md) | [한국어](README.ko.md)

초등/중등 기초학문, 웹 프로그래밍, 프론트엔드 웹 기술 시각화 및 다양한 웹 시뮬레이터를 제공하는 바닐라 HTML, CSS, JavaScript 기반의 인터랙티브 웹 플랫폼 저장소입니다.

---

## 📂 저장소 디렉터리 구조

```
.
├── index.html               # 메인 SPA 포털 엔트리 포인트
├── hierarchy.json           # 통합 메뉴 트리 및 카테고리 매핑 구조
├── changelog.json          # 프로젝트 변경 이력 데이터 (Keep a Changelog)
├── CHANGELOG.md             # 표준 버전 변경 이력 (Keep a Changelog)
├── LICENSE                  # 오픈소스 라이선스
│
├── math/                    # 수학 (elementary/, high/ …) — 폴더는 사이트맵과 같은 구조
├── science/                 # 과학
├── engineering/             # 공학: language/(프로그래밍 언어), web/(웹), representation/(표현 기법: 진법 · 글자 · 베지어 · 정규식 · LaTeX),
│                            #   tools/(개발 도구), certificate/(자격증)
├── column/                  # 칼럼 (AI · 홀덤 · 수영 …)
├── sh-standard/             # SH Standard: Common GUI, QuizQuiz, Web Service Open
├── small-project/           # 웹 시뮬레이터 및 소형 독립 웹 애플리케이션
│   ├── bezier-simulator/    # 인터랙티브 베지어 곡선 시뮬레이터
│   ├── son-preference/      # 남아선호사상 성비 시뮬레이터
│   ├── janggi/              # 웹 장기 대국 엔진 (독립 개발 진행 중)
│   └── ...
│
├── modules/                 # SPA 코어 프레임워크 모듈
│   └── core/                # 네비게이션, 라우팅, 단축키, 방문기록
│
└── docs/                    # 아키텍처 문서 및 개발 가이드
    └── AI_Coding_Rules.md   # AI 페어 프로그래밍 가이드라인
```

---

## 🚀 주요 분야

1. **수학 · 과학 (`/math/`, `/science/`)**: 초등/중등/고등 수학, 과학 등 기초 학문.
2. **프로그래밍 언어 (`/engineering/language/`)**: C/C++, Java, Python 및 소프트웨어 엔지니어링 개념.
3. **웹 (`/engineering/web/`)**: 웹 표준 및 비주얼 기술 (HTML, CSS, JavaScript, Canvas, SVG), React, Vite. LaTeX 수식은 `representation/`에 있습니다.
4. **작은 프로젝트 (`/small-project/`)**: 독립 실행형 인터랙티브 도구 및 그래픽 시뮬레이터.

---

## 🛠️ 로컬 개발 환경 실행

본 프로젝트는 순수 정적 웹 기반(SPA)으로 구동됩니다.

```bash
# npx serve 활용
npx serve .

# 파이썬 로컬 서버 활용
python -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속 후 테스트 가능합니다.
