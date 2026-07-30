# Webpointer Vector CAD Simulator - Technical Implementation Specification

## 1. 개요 및 시스템 기본 스펙 (Canvas System Architecture)

### 1.1 캔버스 비율 및 스냅 격자 (16:9 Aspect Ratio & 481×271 Step Grid)
* **캔버스 해상도**: 기본 $960 \times 540\,\text{px}$ (16:9 비율)
* **스냅 격자 (Step Grid System)**:
  * 가로 축: $0 \le Step_X \le 480$ (총 481개 정밀 스냅 스텝 포인트)
  * 세로 축: $0 \le Step_Y \le 270$ (총 271개 정밀 스냅 스텝 포인트)
  * 좌표 변환 연산:
    $$Pixel_X = \frac{Step_X}{480} \times 960, \quad Pixel_Y = \frac{Step_Y}{270} \times 540$$
* **기본 캔버스 스타일**:
  * 배경색: **순백색 하얀색 (`#ffffff`)**
  * 격자선: 시인성 확보용 크리스프 연회색 (`#e2e8f0`, 두께 `0.8px`)

### 1.2 기본 도형 스타일 (Default Styling Tokens)
* **테두리 기본 색상 (Stroke)**: `#041e49`
* **채우기 기본 색상 (Fill)**: **투명 (`none`)**
* **기본 테두리 두께 (Stroke Width)**: `2px`

---

## 2. 도형별 인터페이스 및 조종점 핸들 상세 명세 (Shape & Control Handle Specs)

### 2.1 점 (Point)
* **생성 인터페이스**: 도형삽입 $\rightarrow$ `점 (Point)` 클릭 후 캔버스 마우스 클릭 시 즉시 생성
* **기본 스펙**:
  * 크기: **지름 10px** (반지름 $r = 5\,\text{px}$)
  * 기본 색상: `#041e49` (채우기 및 테두리 동일)
* **선택 및 조종점 (Handles)**:
  * 외곽선: 선택 시 점 주위에 반지름 $r + 4\,\text{px}$ 점선 링(`stroke-dasharray: 3,3`) 렌더링
  * **중심점 핸들 (`point_center`)**: `(cx, cy)` 위치에 배치 (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  * 이동 연산: 핸들 드래그 시 가장 가까운 Step 스냅 좌표로 점의 위치 `(cx, cy)` 변경

---

### 2.2 타원 / 원 (Ellipse / Circle)
* **생성 인터페이스**: 마우스 대각선 드래그하여 중심 `(cx, cy)` 및 가로/세로 반지름 `(rx, ry)` 결정
* **기본 채우기**: **투명 (`none`)**
* **조종점 핸들 구성 (4종)**:
  1. **원 중심 핸들 (`ellipse_center`)**:
     * 위치: `(cx, cy)`
     * 외형: **하얀색 배경 (`#ffffff`), 검은색 테두리 (`#000000`, 1.5px)**
     * 동작: 드래그 시 원/타원 전체 위치 `(cx, cy)`를 스냅 이동
  2. **가로길이 핸들 (`ellipse_width`)**:
     * 위치: `(cx + rx, cy)` (회전 적용 시 각도 변환 반영)
     * 외형: **하얀색 배경 (`#ffffff`), 검은색 테두리 (`#000000`, 1.5px)**
     * 동작: 드래그 시 가로 반지름 `rx` 변경
  3. **세로길이 핸들 (`ellipse_height`)**:
     * 위치: `(cx, cy - ry)` (회전 적용 시 각도 변환 반영)
     * 외형: **하얀색 배경 (`#ffffff`), 검은색 테두리 (`#000000`, 1.5px)**
     * 동작: 드래그 시 세로 반지름 `ry` 변경
  4. **회전각 핸들 (`ellipse_rotate`)**:
     * 위치: 세로길이 핸들 상단 25px 연장 위치 `(cx, cy - ry - 25px)`
     * 연장선: 세로길이 핸들과 회전 핸들 사이 파란색 점선 (`stroke-dasharray: 3,3`) 연결
     * 외형: **노란색 배경 (`#facc15`), 검은색 테두리 (`#000000`, 1.5px)**
     * 동작: 드래그 시 `atan2` 각도 계산을 거쳐 SVG `transform="rotate(angle, cx, cy)"` 변환 실시간 적용

---

### 2.3 호 (Arc)
* **생성 인터페이스**:
  * **시작점 클릭**: 호의 **중심점 `(cx, cy)`** 설정
  * **드래그 이동**: 반지름 `(rx, ry)` 및 끝각 설정
  * **기본 시작각**: **12시 방향 (상단, $-90^\circ$)**에서 시작
* **SVG Path 연산 공식**:
  $$P_1 = \text{getArcPoint}(cx, cy, rx, ry, \text{startAngle}, \text{angle})$$
  $$P_2 = \text{getArcPoint}(cx, cy, rx, ry, \text{endAngle}, \text{angle})$$
  $$\text{d} = \text{"M } P_1.x\text{ }P_1.y\text{ A } rx\text{ } ry\text{ } \text{angle } \text{largeArcFlag } 1\text{ } P_2.x\text{ }P_2.y\text{"}$$
* **조종점 핸들 구성 (6종)**:
  1. **중심점 핸들 (`arc_center`)**: `(cx, cy)` (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ 호 위치 스냅 이동
  2. **가로지름 핸들 (`arc_rx`)**: 0° 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ 가로 반지름 `rx` 변경
  3. **세로지름 핸들 (`arc_ry`)**: -90° 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ 세로 반지름 `ry` 변경
  4. **회전각 핸들 (`arc_rotate`)**: 상단 25px 연장 노란색 핸들 (노란색 `#facc15` / 검은 테두리 `#000000`) $\rightarrow$ 전체 회전각 `angle` 연산
  5. **시작각 핸들 (`arc_start_angle`)**: 호 시작점 $P_1$ 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ 반지름 변경 없이 `startAngle` 각도만 독립 연산
  6. **끝각 핸들 (`arc_end_angle`)**: 호 끝점 $P_2$ 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ 반지름 변경 없이 `endAngle` 각도만 독립 연산

---

## 3. 조종점 핸들 외형 및 UI 디자인 표준 (Handle UI Standards)

| 핸들 유형 | Fill 색상 | Stroke 색상 | Stroke 두께 | 반지름 ($r$) |
| :--- | :--- | :--- | :--- | :--- |
| **일반 조종점** (중심, 지름, 시작/끝각) | `#ffffff` (하얀색) | `#000000` (검은색) | `1.5px` | `5px` |
| **회전각 조종점** (Rotation Handle) | `#facc15` (노란색) | `#000000` (검은색) | `1.5px` | `6px` |

---

## 4. MS 리본 레이아웃 및 SPA 라우팅 명세

1. **메뉴바 (Menu Bar)**:
   * 너비: `width: 100%` (회색 배경 `#e2e8f0`)
   * 선택 탭: 흰색 배경(`background-color: #ffffff`), 하단 테두리 제거 및 마진 오버랩으로 리본바와 일체형 융합
2. **리본바 (Ribbon Bar)**:
   * 너비: `width: 100%` (흰색 배경 `#ffffff`)
   * 카테고리 구성: 좌측에서 우측으로 가로 정렬 (`display: flex; flex-direction: row;`)
   * 아이콘 3단 배열: 각 카테고리는 `display: grid; grid-template-rows: repeat(3, 34px);`로 3행을 채운 후 다음 열로 전개
   * 카테고리 제목: 카테고리 블록 최하단 중앙에 명시 (`text-align: center; font-size: 0.74rem;`)
3. **SPA 캡슐화**:
   * `<article>` 내부에 `<div class="webpointer-app">` 래퍼 배치 및 inline fallback style 내장으로 SPA 라우터 스타일 유실 원천 방지
