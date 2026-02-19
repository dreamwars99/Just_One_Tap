# Architecture - Just One Tap (J_O_T)

Updated: 2026-02-19 (4차)

## 1) 전체 구성
1. Unity Runtime (게임 본체)
2. Figma Export Plugin (SVG + 메타 추출)
3. SVG Inspector (Unity 외부 검수 앱)

## 2) Unity Runtime (MCV)
1. Manager(Core)
   - `GameManager`: 상태 전환/라이프사이클
   - `RoutineManager`: 1일 1탭 규칙, 포인트/스트릭
   - `DataManager`: 로컬 저장 + 원격 동기화 진입점
   - `LocalizationManager`: 다국어 조회
   - `AuthManager`: 인증 상태
2. View(UI)
   - `UI_Main`, `UI_Onboarding`, `UI_Settings`
3. Controller 성격
   - UI 입력 -> Routine/Auth/Data 호출 -> 결과 렌더

## 3) Figma Export Plugin 파이프라인
경로: `figma-plugin/export-all-svg/`

1. Scope 선택 (`selection`, `current-page`, `all-pages`)
2. 노드 트리 순회/필터
   - `includeHidden`, `includeLocked`, `onlyLeafNodes`
3. SVG export
   - 파일명 규칙: `<NodeName>__<NodeId>.svg`
4. ZIP 묶음 생성
5. 메타 파일 출력
   - `_manifest.json` (기존 유지)
   - `_failed.json` (기존 유지)
   - `_node_layout.json` (신규)

### `_node_layout.json` 핵심 필드
1. 최상위
   - `version`, `generatedAt`, `fileName`, `scope`
2. `entries[]`
   - `nodeId`, `parentId`, `nodeName`, `nodeType`
   - `pageName`, `screenRootId`, `screenFolder`
   - `isLeaf`, `depth`, `zIndex`
   - `bbox` (`absoluteRenderBounds` 우선, fallback `absoluteBoundingBox`, 없으면 `null`)
   - `zipPath`, `relativePath`
3. `screens[]`
   - `pageName`, `screenRootId`, `screenFolder`, `bbox`

## 4) SVG Inspector 파이프라인
경로: `svg-inspector/`

1. 사용자 폴더 선택 (`showDirectoryPicker`, fallback `webkitdirectory`)
2. Screen 판정
   - 선택 루트 하위 1-depth 디렉터리
3. Root SVG 판정
   - 우선: `<screenName>__*.svg`
   - fallback: 화면 폴더 직속 첫 SVG
4. 2패널 비교 렌더
   - 좌: Root SVG
   - 우: Composited SVG (`leaf` 권장 / `all` 진단)
5. 조합 렌더 방식
   - `_node_layout.json`의 `bbox`, `zIndex` 기준 레이어 정렬
   - 각 SVG를 `data:image/svg+xml;base64`로 임베딩해 `<image>`로 합성
   - `innerHTML` 직접 병합 대비 `defs/clipPath/mask` 충돌 위험 완화
6. 검수 상태 관리
   - `pending`, `approved`, `hold` + `reviewNote`
7. 산출
   - `unity-inspection-manifest.json`
   - CSV (옵션)

## 5) 데이터 인터페이스

### 5.1 Export -> Inspector
1. SVG 파일 트리
2. `_node_layout.json`
3. `_manifest.json`, `_failed.json` (검증용)

### 5.2 Inspector -> Unity
1. `unity-inspection-manifest.json`
2. `screens[]` 상태/메모 기반 후속 자동화 입력

## 6) 현재 결정 사항
1. 1차는 플러그인 메타 확장까지 완료
2. Inspector 2패널 비교(루트 SVG vs 조합 SVG) 구현 완료
3. 조합 모드는 `leaf` 기본 검수, `all` 진단 용도로 운영
4. Unity 씬 자동 배치는 후속 단계에서 진행
