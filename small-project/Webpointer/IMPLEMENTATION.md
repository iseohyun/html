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
* **근접 선택 기본 거리 (Proximity Threshold)**: **`10px` (기본값)**

---

## 2. 도형별 인터페이스 및 선택/조종점 시스템 명세 (Selection & Control Handle Specs)

### 2.1 근접 객체 자동 선택 & 선택 해제 시스템 (Proximity Nearest Object Selection)
* **허공 클릭 시 자동 근접 선택**: 선택 도구(`select`) 상태에서 허공(빈 캔버스) 클릭 시, 캔버스 상의 모든 객체와 클릭 지점 간의 최소 거리 $D_{\min}$을 실시간 연산합니다.
* **거리 판정 로직**:
  * $D_{\min} \le \text{proximityThreshold}$ (기본값 `10px`) 이내인 경우: **가장 가까운 객체를 자동 선택**
  * $D_{\min} > \text{proximityThreshold}$ 이거나 `0px` 설정인 경우: **현재 선택된 도형을 즉시 선택 해제 (Selection Clear)**
* **보기 탭 (`view`) 재설정 옵션**:
  * `10px (기본값)`
  * `20px`
  * `30px`
  * `0px (해제 - 정확한 클릭만)`

---

### 2.2 선택 영역 점선 사각형 포괄 오버레이 (Dashed Selection Bounding Box Overlay)
* **포괄 바운딩 박스 오버레이**: 단일 선택 및 Ctrl 다중 선택 시, 선택된 모든 대상들의 최소/최대 좌표 $(B_{\min X}, B_{\min Y}, B_{\max X}, B_{\max Y})$를 실시간 산출하여 **선택된 모든 대상 전체를 포괄하는 점선 사각형 오버레이**를 렌더링합니다.
* **오버레이 스펙**:
  * 여백 (Padding): $6\,\text{px}$
  * 테두리 스타일: 파란색 (`#0284c7`), 점선 (`stroke-dasharray: 4,4`), 두께 `1.2px`, 채우기 `none`

---

### 2.3 객체 바디 드래그 이동 (Object Drag-Move System)
* **객체 이동 동작**: 모든 벡터 객체(점, 선, 사각, 둥근사각, 타원, 호, 2차/3차 베지어)는 선택된 상태에서 **조종점 핸들이 아닌 객체 몸체(Body) 영역을 드래그하면 객체 전체가 실시간 이동**됩니다.
* **이동 연산**:
  $$\Delta Pixel_X = Pixel_{current.x} - Pixel_{dragStart.x}$$
  $$\Delta Pixel_Y = Pixel_{current.y} - Pixel_{dragStart.y}$$
  * 모든 제어점, 시작/끝점, 중심점 및 조종점 링이 $\Delta Pixel$만큼 동시에 동기화 이동됩니다.

---

### 2.4 점 (Point)
* **생성 인터페이스**: 도형삽입 $\rightarrow$ `점 (Point)` 클릭 후 캔버스 마우스 클릭 시 즉시 생성
* **기본 스펙**:
  * 크기: **지름 10px** (반지름 $r = 5\,\text{px}$)
  * 기본 색상: `#041e49` (채우기 및 테두리 동일)
* **선택 및 조종점 (Handles)**:
  * 외곽선: 선택 시 점 주위에 반지름 $r + 4\,\text{px}$ 점선 링(`stroke-dasharray: 3,3`) 렌더링
  * **중심점 핸들 (`point_center`)**: `(cx, cy)` 위치에 배치 (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  * 이동 연산: 핸들 드래그 시 가장 가까운 Step 스냅 좌표로 점의 위치 `(cx, cy)` 변경

---

### 2.5 타원 / 원 (Ellipse / Circle)
* **생성 인터페이스**: 마우스 대각선 드래그하여 중심 `(cx, cy)` 및 가로/세로 반지름 `(rx, ry)` 결정
* **기본 채우기**: **투명 (`none`)**
* **조종점 핸들 구성 (4종)**:
  1. **원 중심 핸들 (`ellipse_center`)**: `(cx, cy)` (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ 전체 위치 이동
  2. **가로길이 핸들 (`ellipse_width`)**: `(cx + rx, cy)` (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ `rx` 변경
  3. **세로길이 핸들 (`ellipse_height`)**: `(cx, cy - ry)` (하얀색 `#ffffff` / 검은 테두리 `#000000`) $\rightarrow$ `ry` 변경
  4. **회전각 핸들 (`ellipse_rotate`)**: 상단 25px 연장 노란색 핸들 (노란색 `#facc15` / 검은 테두리 `#000000`) $\rightarrow$ `transform="rotate(angle, cx, cy)"` 실시간 적용

---

### 2.6 호 (Arc)
* **생성 인터페이스**: 중심점 클릭 후 반지름/끝각 드래그 생성 (12시 방향 시작)
* **조종점 핸들 구성 (6종)**:
  1. **중심점 핸들 (`arc_center`)**: `(cx, cy)` (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  2. **가로지름 핸들 (`arc_rx`)**: 0° 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  3. **세로지름 핸들 (`arc_ry`)**: -90° 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  4. **회전각 핸들 (`arc_rotate`)**: 상단 25px 연장 노란색 핸들 (노란색 `#facc15` / 검은 테두리 `#000000`)
  5. **시작각 핸들 (`arc_start_angle`)**: 호 시작점 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  6. **끝각 핸들 (`arc_end_angle`)**: 호 끝점 위치 (하얀색 `#ffffff` / 검은 테두리 `#000000`)

---

### 2.7 베지어 곡선 (Bezier Curves: 2차 & 3차)
* **2차 베지어 (Quadratic Bezier, 1 핸들)**: 시작점/끝점 (하얀색 `#ffffff` / 검은 테두리 `#000000`), 중간 제어점 (**노란색 `#facc15` / 검은 테두리 `#000000`**)
* **3차 베지어 (Cubic Bezier, 2 핸들)**: 시작점/끝점 (하얀색 `#ffffff` / 검은 테두리 `#000000`), 제어점 1/2 (**노란색 `#facc15` / 검은 테두리 `#000000`**)

---

### 2.8 둥근 사각형 (Rounded Rectangle)
* **조종점 핸들 구성 (3종)**:
  1. **좌상단 핸들 (`top_left`)**: $(x, y)$ (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  2. **우하단 핸들 (`bottom_right`)**: $(x + w, y + h)$ (하얀색 `#ffffff` / 검은 테두리 `#000000`)
  3. **굴곡각 핸들 (`corner_rx`)**: 좌상단 모서리 굴곡 종료점 **`(x + rx, y)`** (**노란색 `#facc15` / 검은 테두리 `#000000`**)

---

## 3. 조종점 핸들 외형 및 UI 디자인 표준 (Handle UI Standards)

| 핸들 유형 | Fill 색상 | Stroke 색상 | Stroke 두께 | 반지름 ($r$) |
| :--- | :--- | :--- | :--- | :--- |
| **일반 조종점** (시작, 끝, 중심, 지름, 각도, 상단/하단) | `#ffffff` (하얀색) | `#000000` (검은색) | `1.5px` | `5px` |
| **특수/제어/회전/굴곡 조종점** (베지어 중간점, 회전각, 둥근사각 굴곡각) | `#facc15` (노란색) | `#000000` (검은색) | `1.5px` | `6px` |

---

## 4. MS 리본 레이아웃 및 SPA 라우팅 명세

1. **메뉴바 (Menu Bar)**: `width: 100%` 회색 배경 (`#e2e8f0`), 선택 탭 흰색 배경 (`#ffffff`) 및 리본 일체형 융합
2. **리본바 (Ribbon Bar)**: `width: 100%` 흰색 배경 (`#ffffff`), 3행 아이콘 Grid 및 최하단 중앙 카테고리 제목
3. **보기 탭 설정**:
   * 격자 보이기 (체크박스)
   * 격자 크기 ($481\times 271$, $241\times 136$, $121\times 68$)
   * **근접 선택 거리** (`10px 기본값`, `20px`, `30px`, `0px 해제`)
   * 캔버스 크기 (16:9 960x540, 1280x720, 4:3 800x600, 1:1 600x600)
   * 캔버스 색상 선택기
