# Architecture - Just One Tap (J_O_T)

Updated: 2026-02-19 (4차, 3차 기준 복원 + 업데이트)

## 1) 전체 구성

1. Unity Runtime (게임 본체)
2. Figma Export Plugin (SVG + 메타 추출)
3. SVG Inspector (Unity 외부 검수 앱)
4. Unity 후속 자동배치 파이프라인(예정)

## 2) Core Loop (Runtime)

```mermaid
sequenceDiagram
    participant User
    participant UI as UI_Main (View)
    participant Core as RoutineManager (Controller)
    participant Loc as LocalizationManager
    participant Data as DataManager (Model)

    User->>UI: Big Button Tap
    UI->>Core: TryRoutineAction()
    Core->>Core: IsTodayDone?
    alt Already done
        Core->>Loc: GetString("msg_already_done")
        Loc-->>UI: Localized message
        UI-->>User: Show toast
    else Available
        Core->>UI: Request ad flow
        User-->>Core: Ad completed
        Core->>Data: Save points/streak
        Data->>Cloud: Sync Firestore
        Core->>Loc: GetString("msg_success")
        Loc-->>UI: Localized reward message
        UI-->>User: Reward FX
    end
```

## 3) Unity Runtime (MCV)

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

## 4) Editor/Tooling

- `Assets/Editor/ProjectSetupTool.cs`
  - 폴더 구조/매니저 템플릿 자동 생성
  - Player Settings 자동 적용
- `Assets/Editor/PackageInstaller.cs`
  - 필수 패키지 설치 요청
- `figma-plugin/export-all-svg/*`
  - Figma 전체 트리 SVG 추출
  - ZIP + `_manifest.json` + `_failed.json` + `_node_layout.json`
- `svg-inspector/*`
  - Unity 반입 전 시각 검수 및 상태 기록
  - `unity-inspection-manifest.json` 생성

## 5) Figma Export Plugin 파이프라인

경로: `figma-plugin/export-all-svg/`

1. Scope 선택 (`selection`, `current-page`, `all-pages`)
2. 노드 트리 순회/필터 (`includeHidden`, `includeLocked`, `onlyLeafNodes`)
3. SVG export (`<NodeName>__<NodeId>.svg`)
4. ZIP 생성
5. 메타 파일 출력
   - `_manifest.json`
   - `_failed.json`
   - `_node_layout.json`

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

## 6) SVG Inspector 파이프라인

경로: `svg-inspector/`

1. 사용자 폴더 선택 (`showDirectoryPicker`, fallback `webkitdirectory`)
2. Screen 판정
   - 선택 루트 하위 1-depth 디렉터리
3. Root SVG 판정
   - 우선: `<screenName>__*.svg`
   - fallback: 화면 폴더 직속 첫 SVG
4. 2패널 비교 렌더
   - 좌: Root SVG
   - 우: Composited SVG
5. 검수 상태 관리
   - `pending`, `approved`, `hold` + `reviewNote`
6. 산출
   - `unity-inspection-manifest.json`
   - CSV (옵션)

## 7) 조합 렌더 설계 (4차 업데이트)

경로: `svg-inspector/src/lib/composer.ts`

1. 입력
   - `_node_layout.json`의 `entries[]`, `screens[]`
2. 레이어 처리
   - `zIndex` 정렬 기반 합성
   - 개별 SVG를 `data:image/svg+xml;base64`로 변환 후 `<image>`로 렌더
3. 중복/오류 방지 규칙
   - `screenRootId`와 동일한 root 엔트리는 기본 제외
   - ancestor가 이미 선택되면 descendant 엔트리 가지치기
   - 가지치기 후 레이어 0건이면 root 엔트리 fallback 렌더
4. 모드 정책
   - `All`: 권장 모드
   - `Leaf`: 진단 모드

## 8) 데이터 인터페이스

### 8.1 Export -> Inspector

1. SVG 파일 트리
2. `_node_layout.json`
3. `_manifest.json`, `_failed.json` (검증용)

### 8.2 Inspector -> Unity

1. `unity-inspection-manifest.json`
2. `screens[]` 상태/메모
3. `files[]` 상대경로/노드 정보

### 8.3 Runtime Save Schema (Game)

```json
{
  "uid": "user_global_001",
  "identity": {
    "nickname": "Player1",
    "country": "US",
    "language": "en"
  },
  "settings": {
    "dailyTarget": 5.0,
    "currencySymbol": "$"
  },
  "routine": {
    "currentPoints": 15.0,
    "currentStreak": 3,
    "lastActionDate": "2026-02-19"
  }
}
```

### 8.4 Unity Inspection Manifest Schema

```json
{
  "version": 1,
  "generatedAt": "2026-02-19T00:00:00.000Z",
  "sourceRoot": "Page 1",
  "summary": {
    "screenTotal": 0,
    "approved": 0,
    "hold": 0,
    "pending": 0,
    "svgTotal": 0
  },
  "screens": [
    {
      "id": "13-3321",
      "name": "Profile",
      "folderPath": "Profile",
      "rootSvgPath": "Profile/Profile__13-3321.svg",
      "svgCount": 0,
      "reviewStatus": "pending",
      "reviewNote": "",
      "issues": []
    }
  ],
  "files": [
    {
      "screenId": "13-3321",
      "relativePath": "Profile/Profile__13-3321.svg",
      "nodeId": "13:3321",
      "nodeName": "Profile"
    }
  ]
}
```

## 9) 현재 결정 사항

1. 플러그인 메타 확장(`_node_layout.json`) 완료
2. Inspector 2패널 비교(루트 SVG vs 조합 SVG) 구현 완료
3. 조합 렌더 안정화(중복 가지치기 + root fallback) 반영 완료
4. Unity 씬/프리팹 자동 배치 도구는 다음 단계

