# Webpointer 개발 마일스톤 (Milestone Roadmap)

Webpointer 벡터 CAD 에디터의 단계별 마일스톤 및 기능 구현 로드맵 문서입니다.

---

## 🟢 Phase 1: 핵심 확장기능 & 진단 스위트 (구현 완료)

- [x] **Milestone 1**: 폰트 크기 단축키 (`+`/`-`) & 비파괴 이미지/도형 오리기 (`ClipPath`)
- [x] **Milestone 2**: 외부 SVG 파일 네이티브 가져오기 및 파서 진단 모듈 (`TC17`)
- [x] **Milestone 3**: 심볼 관리자 (Symbol Manager - 썸네일 라이브러리 및 Import/Export, `TC18`)
- [x] **Milestone 4**: 중첩 그림 필터 효과 스위트 (Picture Filter Effects, `TC20`)
- [x] **Milestone 5**: 스마트 객체 정렬 스냅 가이드선 (Smart Alignment Snap Guides, `TC22`)

---

## 🟢 Phase 2: 고급 편집 & 자동 저장 스위트 (구현 완료)

- [x] **Milestone 6**: 3슬롯 자동 저장 관리 및 파일 불러오기 방어 (`TC24`)
  - 3개 슬롯 순환 자동 저장 (`webpointer_slot_1, 2, 3`)
  - 슬롯 카드 썸네일 미리보기 UI 모달
  - 파일 불러오기 시 Dirty Canvas 확인 방어 팝업 연동
- [x] **Milestone 7**: 이미지 채우기 모드 옵션 (늘리기 / 반복 / 1회만 채우기 - `TC25`)
- [x] **Milestone 8**: 대화형 멀티스탑 그라데이션 에디터 & 캔버스 2-Point 핸들 (`TC26`)
- [x] **Milestone 9**: 도형 내 텍스트 수평/수직 정렬 및 바운딩 박스 연산 보정 (`TC27`)
- [x] **Milestone 10**: 실시간 필터 미리보기 & 필터 스택 순서 재배치 (`TC28`)

---

## 🟢 Phase 3: UI 병합, SVG 애니메이션 & 캔버스 단축키 (구현 완료)

- [x] **Milestone 11: 그림서식 아이콘 3종 순환 병합**
  - **선 끝모양 4종 병합**: 단일 토글 버튼 (`cycleStartMarker`, `cycleEndMarker`)
  - **끝처리 3종 병합**: 단일 토글 버튼 (`cycleStrokeCap`)
  - **꺾임 3종 병합**: 단일 토글 버튼 (`cycleStrokeJoin`)
- [x] **Milestone 12: 그림서식 알파 제거 & 편집 탭 필터 병합**
  - 그림 서식 > 선 및 색상 카테고리의 알파 슬라이더 제거 (필터 스위트로 일원화)
  - 독립 필터 모달 UI를 `편집` 탭 내 카테고리로 직접 병합
- [x] **Milestone 13: 글 서식 색상 알파 제거 및 필터 아이콘 삽입**
  - 글 서식 > 색상 영역 알파 슬라이더 제거
  - 필터 팝업 바로가기 아이콘 삽입
- [x] **Milestone 14: SMIL SVG 고급 애니메이션 기능 확장 (11개 속성 제어, `TC29`)**
  - SVG `<animate>` / `<animateTransform>` 생성 및 11종 재생/정지 제어
- [x] **Milestone 15: 캔버스 마우스 줌 & 휠 스크롤 (`TC29`)**
  - 마우스 휠 스크롤로 캔버스 줌 조절
- [x] **Milestone 16: 캔버스 전체 객체 선택 (`Ctrl + A`, `TC29`)**
  - `Ctrl + A` 조작 시 전체 객체 선택
- [x] **Milestone 17: 객체 회전 & 수직/수평 대칭 E2E TC 추가 (`TC29`)**
  - `flipH`, `flipV`, `rotate90`, `rotateNeg90`, `playAnimation`, `cycleStartMarker` 전용 검증 스위트 통과
