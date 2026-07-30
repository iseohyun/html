# Webpointer 벡터 CAD 시뮬레이터 - 한글 기술 구현 명세서 (Technical Implementation Specification)

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
* **근접 선택 기본 거리 (Proximity Threshold)**: **`30px` (기본값)**
* **기본 도형 크기 (Default Shape Size)**: **`100px` (기본값)**

---

## 2. 도형별 인터페이스 및 선택/조종점 시스템 명세 (Selection & Control Handle Specs)

### 2.1 마우스 커서 상태 스타일 명세 (Mouse Cursor States)
* **선택 도구(`select`) 모드**:
  * **선택 가능 상태 (Hover over Unselected Object)**: 마우스 커서 **`pointer` (손가락 모양)**
  * **선택/이동 가능 상태 (Hover over Selected Object / Object Dragging)**: 마우스 커서 **`move` (이동 화살표 십자가 모양)**
  * **조종점 핸들 Hover**: 마우스 커서 **`grab`**
  * **캔버스 빈 영역**: 마우스 커서 **`default` (기본 화살표)**
* **도형 드로잉 모드 (Draw Tool)**:
  * 캔버스 영역 마우스 커서 **`crosshair` (십자가)**

### 2.2 연속 다중 클릭 베지어 곡선 입력 및 제어점 핸들 규격
* **단일 SVG `<path>` 통합 경로**: 연속으로 클릭되는 베지어 좌표들은 단일 SVG `<path>` 요소의 `d` 속성에 `M ... Q ... T ...` 또는 `M ... C ... S ...` 문법으로 연속 연결됩니다.
* **2차/3차 베지어 대칭 핸들 조작**: $Q$ 및 $C_1, C_2$ 제어점 간 점연동 지원.

### 2.3 근접 객체 자동 선택 & 선택 해제 시스템 (Proximity Nearest Object Selection)
* 허공 클릭 시 모든 객체와의 최소 거리 $D_{\min}$을 계산하여 $\text{proximityThreshold}$ 이내인 경우 가장 가까운 객체를 자동 선택합니다.

---

## 3. 계층적 중첩 그룹화 & 1단계 차례 해제 시스템 (Hierarchical Grouping Specs)
* **독립 단위(Top-level Unit)**: 최상위 `<g>` 그룹 또는 독립 객체를 1개 단위로 계산.
* **그룹화/해제 조건**: 2개 이상 독립 단위 선택 시 그룹화 가능, 그룹 포함 시 해제 가능.

---

## 4. 정밀 기하학적 정렬 및 회전/대칭 시스템 (Alignment, Rotation & Flip Specs)
* **정렬 8종**: 좌, 우, 상, 하, 가로중앙, 세로중앙, 가로 동일간격, 세로 동일간격 연산 지원.
* **회전/대칭 4종**: 좌우 대칭(`flipH`), 상하 대칭(`flipV`), 시계방향 90도 회전(`rotate90`), 반시계방향 90도 회전(`rotateNeg90`).

---

## 5. 자동화 테스트 시스템 (`TC.csv`) 명세
Playwright E2E 테스트 실행 시 아래 CSV 포맷으로 결과를 `test-results/TC.csv` 파일에 자동 기록합니다:

```csv
TC_ID,TC_Name,Start_Time,End_Time,Duration_Sec,Result,Fail_Reason,Console_Errors,Diff_Ratio,Artifact_Path,Commit_Hash
```
