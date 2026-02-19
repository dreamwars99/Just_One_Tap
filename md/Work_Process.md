# 📝 작업 일지 (Project History & Context)

- **Project:** Just One Tap (J_O_T)
- **Editor:** Unity Tech Lead & PM
- **Unity Version:** 2022.3.x LTS
- **Platform:** Android (Portrait / 1080x1920)
- **Last Updated:** 2026-02-19 (6차)

## 📌 1. Development Environment (개발 환경 상세)
이 프로젝트를 이어받는 AI/개발자는 아래 설정을 필수로 확인해야 합니다.

### 1.1. Package Dependencies (설치된 패키지)
Unity Registry 패키지는 `Window > Package Manager`를 통해 설치하며, 외부 라이브러리는 `Window > Package Manager > + > Add package from git URL`을 통해 설치합니다.

- **Unity Vector Graphics** (Unity Registry)
  - Package ID: `com.unity.vectorgraphics`
  - Purpose: SVG 임포트 및 벡터 그래픽 지원 (기획서 §5 Assets: Vector 필수)
- **Unity Localization** (Unity Registry)
  - Package ID: `com.unity.localization`
  - Purpose: 다국어 지원 (기획서 §5 Tech Stack)
- **Firebase SDK** (Manual Import)
  - FirebaseAuth, FirebaseFirestore, FirebaseAnalytics, FirebaseCrashlytics, FirebaseMessaging
  - Purpose: 인증, 데이터 동기화, 분석, 크래시 리포팅, 푸시 알림
- **Lottie for Unity** (예정)
  - Version / Git URL: `https://github.com/gilzoide/unity-lottie-player.git#1.1.1`
  - Purpose: 벡터 애니메이션(Native Rendering) 재생용
- **Unity Figma Bridge** (예정)
  - Version / Git URL: `https://github.com/simonoliver/UnityFigmaBridge.git`
  - Purpose: Figma 디자인 → Unity UI 변환용
- **DOTween** (예정)
  - Version: v1.2.xxx (Asset Store / Package Manager)
  - Purpose: 코드 기반 UI 모션 및 애니메이션

### 1.2. Project Settings
- **Resolution:** 1080 x 1920 (Portrait).
- **Scripting Backend:** IL2CPP (Android Build 필수).
- **Api Compatibility:** .NET Standard.
- **Player Settings 자동 적용:** `Tools > J_O_T > Apply Project Settings` 메뉴를 통해 모든 Player Settings를 자동으로 적용 가능.

## 📂 2. Project Directory Structure (폴더 구조)
모든 커스텀 에셋은 `Assets/_Project` 하위에 격리됩니다.

```text
Assets/
├── _Project/
│   ├── Art/
│   │   ├── Icons/           # SVG Icons (Vector)
│   │   ├── UI/              # Sliced Sprites
│   │   └── Fonts/           # SDF Fonts (English/Korean Support)
│   │
│   ├── Resources/
│   │   └── Localization/    # 언어별 JSON/CSV 파일
│   │       ├── en.json
│   │       └── ko.json
│   │
│   ├── Scripts/
│   │   ├── Core/            # Managers
│   │   │   ├── GameManager.cs
│   │   │   ├── LocalizationManager.cs
│   │   │   ├── DataManager.cs
│   │   │   ├── RoutineManager.cs
│   │   │   └── AuthManager.cs
│   │   │
│   │   ├── UI/              # Views
│   │   │   ├── UI_Onboarding.cs
│   │   │   ├── UI_Main.cs
│   │   │   └── UI_Settings.cs
│   │   │
│   │   └── Utils/
│   │
│   ├── Scenes/
│   │   ├── Intro.unity
│   │   └── Main.unity
│   │
│   └── Prefabs/
│
├── Editor/
│   ├── ProjectSetupTool.cs  # 프로젝트 초기 설정 툴 (폴더 구조 및 매니저 스크립트 자동 생성)
│   ├── PackageInstaller.cs  # 패키지 설치 툴 (Vector Graphics, Localization 패키지 설치 요청)
│   └── UISetupTool.cs       # UI 자동 생성 툴
│
└── Plugins/
```

## 🏗️ 3. Architecture & Code Flow (설계 및 로직)

### 3.1. Design Pattern: MCV (Manager-Controller-View)
- **Managers (Core):** GameManager(상태), DataManager(로컬/Firestore), LocalizationManager(다국어), RoutineManager(One Tap·Streak), AuthManager(소셜 로그인).
- **View (UI):** Manager/Controller 명령에 따라 화면을 그리거나 사용자 입력을 전달합니다.
- **핵심 플로우:** 사용자 탭 → UI_Main → RoutineManager.TryRoutineAction() → (오늘 완료 여부) → 광고 시청 → 포인트/스트릭 저장 → Firestore 동기화.

### 3.2. Script Roles (핵심 스크립트 역할)
**GameManager.cs (Core)**
- **역할:** 앱 전반의 상태(State) 관리.
- **States:** Intro(온보딩), Auth(로그인), Main(One Tap 루틴) 등.

**RoutineManager.cs (Controller)**
- **역할:** One Tap 루틴 및 스트릭(Streak) 로직. `TryRoutineAction()`에서 오늘 이미 완료했는지 검사 후, 가능 시 광고 요청 → 완료 시 포인트/스트릭 저장 및 DataManager 동기화.

**UI_Main.cs (View)**
- **역할:** 메인 화면의 Big Button(The Button), 상단 정보(국기, 포인트, 불꽃). 탭 시 RoutineManager 호출, 광고 재생 후 보상 FX(Confetti 등).

**UI_Onboarding.cs / UI_Settings.cs**
- **Onboarding:** Intro 텍스트 애니메이션("Ready? Just One Tap."), 목표 설정 슬라이더.
- **Settings:** 언어 선택, 알림/사운드 토글.

### 3.3. UI Hierarchy (Main.unity 구조)
- **Canvas_Main** (Scale With Screen Size)
    - **SafeArea_Container**
        - `Panel_Intro`: 로고·타이핑 메시지 (온보딩).
        - `Panel_Auth`: 구글/애플 로그인 버튼.
        - `Panel_Main`: 상단(국기, Streak, Points), 중앙(The Button), 하단(랭킹, 홈, 프로필).

## 📅 4. Development Log (개발 기록)

> **정리 원칙:** 최신 기록은 항상 위에 배치합니다.

## 2026-02-19 (6차) - SVG Inspector 선택/제외/하드삭제 기능 반영 + 문서 동기화
### 목표
- 트리와 합성 뷰에서 동일 컴포넌트를 선택/동기화한다.
- 비파괴 제외(`Exclude`/`Restore`)와 실제 파일 삭제(`Delete File`)를 분리 제공한다.
- 하드삭제는 네이티브 폴더 권한 모드에서만 동작하게 고정한다.
- exclusions 상태를 별도 파일(`svg-inspector-exclusions.json`)로 저장/복원 가능하게 한다.

### 수행 내용
1. SVG Inspector 기능 확장
- `svg-inspector/src/types.ts`: `ComponentSelection`, `ExclusionPreset`, `ExclusionManifest` 등 타입 추가.
- `svg-inspector/src/lib/exclusionState.ts` 신규 구현:
  - exclusions manifest parse/build
  - preset 매칭(`deviceChrome`, `keyboard`)
  - localStorage 저장/복원
- `svg-inspector/src/lib/fileSystem.ts` 확장:
  - `accessMode: "native" | "fallback"` 노출
  - 네이티브 모드 파일 삭제(`removeEntry`) 지원
- `svg-inspector/src/lib/composer.ts` 확장:
  - 수동 제외/프리셋 제외 필터 적용
  - 선택 노드 하이라이트
  - 사용자 필터로 0레이어 시 fallback 금지 + 안내 메시지
- `svg-inspector/src/App.tsx`, `svg-inspector/src/App.css`:
  - 트리/합성 단일 선택 동기화
  - `Exclude`/`Restore`/`Delete File` 액션
  - fallback 모드 하드삭제 비활성화
  - exclusions import/export UI 연결

2. 문서 업데이트(이번 요청)
- `md/To_do.md`: 완료 항목/현재 상태/Completed 섹션에 6차 내용 추가.
- `md/Tree.md`: `exclusionState.ts`, `svg-inspector-exclusions.json`, 6차 메모 반영.
- `md/Architecture.md`: 선택/제외/하드삭제 플로우 및 exclusions 스키마 반영.
- `md/Work_Process.md`: 본 6차 기록 추가(기존 기록 유지).

### 검증
- 기능 검증 기준:
  - 트리 클릭/합성 클릭 시 동일 컴포넌트 선택 동기화.
  - `Exclude`/`Restore` 즉시 합성 반영.
  - fallback 모드에서 `Delete File` 비활성화.
  - 네이티브 모드에서만 실제 파일 삭제 가능.
- 코드 검증: `npm run lint`, `npm run build` 통과 상태 유지.

### 산출물
- `svg-inspector/src/types.ts`
- `svg-inspector/src/lib/fileSystem.ts`
- `svg-inspector/src/lib/scanner.ts`
- `svg-inspector/src/lib/composer.ts`
- `svg-inspector/src/lib/exclusionState.ts`
- `svg-inspector/src/App.tsx`
- `svg-inspector/src/App.css`
- `svg-inspector/README.md`
- `md/To_do.md`
- `md/Tree.md`
- `md/Architecture.md`
- `md/Work_Process.md`

### 메모
- 사용자 질문 기준 정책 확정: 실제 하드디스크 삭제는 네이티브 모드(`showDirectoryPicker`)에서만 가능하며, fallback 모드에서는 불가/비활성화가 정상 동작이다.

## 2026-02-19 (5차) - 3차 기준 문서 복원 + 4차 업데이트 반영
### 목표
- `Architecture_original.md`, `tree_original.md`, `To_do_original.md`에 남아 있던 3차 기준 내용을 복구한다.
- 현재 구현 상태(조합 렌더 안정화, 모드 정책 변경)를 기존 문서를 지우지 않는 방식으로 업데이트한다.

### 수행 내용
1. 원본/현재 문서 비교 및 복원 기준 확정
- `md/Architecture_original.md`, `md/tree_original.md`, `md/To_do_original.md`를 기준선으로 확인.
- 기존 `md/Architecture.md`, `md/Tree.md`, `md/To_do.md`의 중복/깨진 블록을 정리하고 3차 기준 내용 복원.

2. 최신 구현 상태 업데이트 반영
- `md/Architecture.md`:
  - Core Loop 섹션 복원.
  - Inspector 조합 렌더 설계(ancestor 가지치기, screen-root 제외, zero-layer root fallback) 추가.
  - 모드 정책을 `All` 권장 / `Leaf` 진단으로 명시.
- `md/Tree.md`:
  - 실제 구조 기준으로 트리 재정리.
  - `svg-inspector` 최신 파일(`layout.ts`, `composer.ts`) 반영.
  - 4차 변경 메모 섹션 추가.
- `md/To_do.md`:
  - 3차 기준 TODO/Phase/Completed 흐름 복원.
  - 조합 렌더 안정화(중복 제거, root fallback) 완료 항목 업데이트.

3. 합성 엔진 안정화 반영 상태를 개발기록에 연결
- `svg-inspector/src/lib/composer.ts`: 부모/자식 중복 렌더 제거, root 제외, zero-layer fallback 적용.
- `svg-inspector/src/App.tsx`: 합성 모드 운영/오류 메시지 표시 개선.
- `svg-inspector/src/lib/layout.ts`: 모드 경고 정리.
- `svg-inspector/README.md`: 최신 합성 규칙 문서화.

### 검증
- 문서 파일이 기존 기록을 삭제하지 않고 “업데이트” 형태로 반영되었는지 diff 확인.
- `svg-inspector` 기준 `npm run build`, `npm run lint` 통과 상태 유지.

### 산출물
- `md/Architecture.md`
- `md/Tree.md`
- `md/To_do.md`
- `md/Work_Process.md`

### 메모
- 문서 갱신 원칙 재확인: 기존 기록은 보존하고, 최신 변경은 상단에 누적 기록한다.

## 2026-02-19 (4차) - SVG Inspector 합성 렌더 안정화
### 목표
- Root SVG와 Composited SVG 비교 시 발생하던 주요 시각 오차(검은 채움, 마스크/클립 불일치)를 줄인다.
- 검수 UI에서 `leaf`/`all` 모드의 용도를 명확하게 분리한다.

### 수행 내용
1. 문제 재현 및 원인 분석
- `Fill Your Profile`, `Intro` 계열 화면에서 root 대비 composite(all) 불일치 확인.
- 기존 방식이 SVG 내부 마크업 병합(`innerHTML`) 기반이라 `defs/clipPath/mask` 충돌 및 루트 속성 손실에 취약함을 확인.

2. 합성 엔진 개선 (`svg-inspector/src/lib/composer.ts`)
- 각 레이어 SVG를 파싱 후 루트 정규화.
- 레이어를 raw markup 합치기 대신 `data:image/svg+xml;base64`로 임베딩.
- 최종 캔버스에 `<image>` 단위로 배치하도록 변경.
- 결과적으로 레이어별 SVG 컨텍스트 보존성이 향상됨.

3. 모드/진단 UX 개선
- `all` 모드 선택 시 "부모+자식 중복으로 차이 발생 가능" 경고 이슈 추가.
- 버튼 라벨을 `Leaf (recommended)`, `All (diagnostic)`로 변경.
- 파일 트리 배지 힌트 문구 정리.

### 검증
- `npm run lint` 통과.
- `npm run build` 통과.
- 동일 샘플 화면에서 기존 대비 검은 배경/불투명 오차 증상 감소 확인.

### 산출물
- `svg-inspector/src/lib/composer.ts`
- `svg-inspector/src/lib/layout.ts`
- `svg-inspector/src/App.tsx`

### 문서 동기화 (4차)
- `md/Tree.md`: 기존 형식 유지 + `layout.ts`, `composer.ts` 반영.
- `md/To_do.md`: 2패널 비교/합성 안정화 완료 상태 반영.
- `md/Architecture.md`: Inspector 2패널 및 data URI 합성 방식 반영.
- `md/Work_Process.md`: Last Updated 및 4차 문서 동기화 기록 반영.

## 2026-02-19 (3차) - Figma 플러그인 메타데이터 확장 1차
### 목표
- Inspector 합성에 필요한 좌표/계층 메타를 Figma export 산출물에 포함한다.

### 수행 내용
1. `figma-plugin/export-all-svg/code.js` 확장.
2. ZIP 루트에 `_node_layout.json` 추가.
3. `_manifest.json`, `_failed.json`, SVG 네이밍 하위호환 유지.
4. README/UI 로그에 메타 출력 정보 반영.

### 검증
- `node --check figma-plugin/export-all-svg/code.js` 통과.
- 샘플 export 루트에서 `_node_layout.json` 존재 확인.

### 2026-02-19 (2차) - SVG Inspector(외부 검수 앱) 구축 및 검수 파이프라인 분리
**[목표]** Unity에 SVG를 투입하기 전, 추출 산출물을 빠르게 확인할 수 있는 독립 검수 앱을 루트 레벨에 구축하고, 검수 결과를 Unity 후속 자동화 입력(JSON)으로 표준화함.

#### 구현 내용
- **독립 앱 신규 생성**: `svg-inspector/` (Unity `Assets/`와 분리).
  - 스택: Vite + React + TypeScript.
  - 실행: `npm run dev` 로컬 서버.
- **입력/스캔 로직 구현**
  - `showDirectoryPicker()` 우선, 미지원 환경은 `input[webkitdirectory]` fallback.
  - 화면(Screen) 판정: 선택 루트 하위 1-depth 폴더.
  - root SVG 판정:
    - 우선: `<screenName>__*.svg`
    - fallback: 화면 폴더 직속 첫 SVG.
  - 노드 ID 파싱 규칙: `X__13-3318.svg -> 13:3318`.
- **검수 UI 구현**
  - 좌측: 화면 목록, 검색, 상태 필터(전체/승인/보류/대기).
  - 중앙: root SVG 미리보기 + 줌/팬 + 배경 토글(흰색/체커).
  - 우측: 화면 메타, 상태 버튼, 메모 입력, 이슈 목록.
  - 이슈 처리: root 누락/파싱 실패/빈 폴더를 warning으로 표기하고 앱은 중단하지 않음.
- **검수 데이터 입출력 구현**
  - 매니페스트 출력: `unity-inspection-manifest.json`.
  - 매니페스트 불러오기(import) 지원.
  - CSV 내보내기(검수 리포트용) 지원.
  - localStorage 자동 저장/복원 지원.

#### 코드/파일 반영
- `svg-inspector/src/types.ts`: InspectorProject/ScreenEntry/UnityManifest 타입 정의.
- `svg-inspector/src/lib/fileSystem.ts`: 폴더 선택/재귀 스캔 어댑터.
- `svg-inspector/src/lib/scanner.ts`: 화면 판정, root SVG 선택, source file 인덱싱.
- `svg-inspector/src/lib/manifest.ts`: 매니페스트 직렬화/역직렬화/CSV 생성.
- `svg-inspector/src/lib/reviewState.ts`: localStorage 상태 저장/복원.
- `svg-inspector/src/lib/utils.ts`: 경로 정규화, nodeId 파싱, 해시 유틸.
- `svg-inspector/src/App.tsx`, `svg-inspector/src/App.css`, `svg-inspector/src/index.css`: 메인 UI 및 상호작용 구현.
- `svg-inspector/README.md`: 실행법/규칙/출력 문서화.

#### 검증 결과
- `npm run build`: 성공.
- `npm run lint`: 성공.
- 브라우저 fallback 고려: `showDirectoryPicker` 미지원 시 `webkitdirectory` 동작하도록 구현.

#### 문서 동기화
- `md/ai_human_discuss.md`: "SVG 검수 앱 방향 정리 (2026-02-19)" 섹션 추가.
- `md/Tree.md`: 루트 구조에 `svg-inspector/` 반영.
- `md/Architecture.md`: External Inspection Pipeline 및 Manifest Schema 반영.
- `md/To_do.md`: 검수 앱 완료 항목 및 Unity 후속 TODO 반영.
- `md/Work_Process.md`: 본 2차 기록 추가 및 Last Updated 갱신.

#### 현재 상태
- Figma 추출(플러그인) + 외부 검수(SVG Inspector) + Unity 전달(JSON Manifest)까지 파이프라인 1차 완성.
- 다음 핵심 과제는 `unity-inspection-manifest.json`을 입력으로 받는 Unity 자동 배치/생성 툴 연결.

### 2026-02-19 (1차) - Figma 전체 트리 SVG 추출 플러그인 구현 및 검증
**[목표]** Figma 디자인을 수동 노가다 없이 트리 전체 기준으로 SVG 추출하기 위해 개발 플러그인을 직접 구현하고, 실제 파일에서 추출 검증 후 문서/보안 설정을 동기화함.

#### 구현 내용
- **Figma 개발 플러그인 신규 추가** (`figma-plugin/export-all-svg`)
  - `manifest.json`: 개발 플러그인 등록 정보.
  - `code.js`: 노드 재귀 수집, 노드별 `exportAsync({ format: "SVG" })`, ZIP 생성, `_manifest.json`/`_failed.json` 기록.
  - `ui.html`: Scope 선택(`selection`, `current-page`, `all-pages`) 및 옵션 토글(`includeHidden`, `includeLocked`, `onlyLeafNodes`, `outlineText`) + 진행 로그.
  - `README.md`: 설치/실행 방법 문서화.
- **런타임 호환성 버그 수정**
  - `Unexpected token ...` 오류 대응: object/array spread 문법 제거 (`Object.assign`, `concat` 사용).
  - `TextEncoder is not defined` 오류 대응: 내장 UTF-8 인코더(`utf8Encode`)로 교체.
- **실제 추출 검증 완료**
  - 결과 파일: `Page 1/`, `_manifest.json`, `_failed.json`.
  - 검증 수치: `totalTargets=4104`, `exportedCount=3302`, `failedCount=802`.
  - 실패 802건은 전부 동일 사유: `Failed to export node. This node may not have any visible layers.`
  - 결론: 추출 파이프라인 자체는 정상 동작, 실패는 보조/비가시 노드 중심.

#### 보안/커밋 정책 정리
- **코드(플러그인)는 커밋 가능**
  - 커밋 대상: `figma-plugin/export-all-svg/*`, 문서, 툴 스크립트.
- **생성 산출물은 Git 제외 권장**
  - `Page 1/`, `_manifest.json`, `_failed.json`, ZIP 결과물은 로컬 검증용 산출물이므로 `.gitignore` 반영.

#### 문서 동기화
- `md/To_do.md`: Figma 추출 파이프라인 완료 및 후속 TODO(실패 항목 후처리) 반영.
- `md/Tree.md`: 실제 구조 + Figma 플러그인 폴더/로컬 산출물 구조 반영.
- `md/Architecture.md`: Editor/Tooling + Figma Export Pipeline 아키텍처 반영.
- `md/Work_Process.md`: 본 1차 기록 추가 및 Last Updated 갱신.

---

### 2026-02-09 (7차) - PackageInstaller 단순화 및 Phase 0.2 필수 패키지 설치 기능 최적화
**[목표]** Phase 0.2의 필수 항목인 `Vector Graphics` 패키지 설치를 위해 `PackageInstaller.cs`를 단순화하고, 패키지 설치 요청 기능만 수행하도록 최적화함.

#### 구현 내용
- **PackageInstaller.cs 수정** (`Assets/Editor/PackageInstaller.cs`):
  - 메뉴 이름 변경: `Tools > J_O_T > Install Essential Packages`.
  - 기능 단순화: JSON 파일 생성 기능 제거, 패키지 설치 요청만 수행.
  - `UnityEditor.PackageManager.Client.Add`를 사용하여 다음 패키지를 순차적으로 설치 요청:
    - `com.unity.vectorgraphics` (핵심 목표)
    - `com.unity.localization` (다국어 - 기 설치되었으면 스킵됨)
  - 복잡한 로직 없이 심플한 스크립트로 작성 (`Client.Add`만 수행).
  - 로그 메시지:
    - "📦 Requesting Vector Graphics & Localization Packages..."
    - "Check the 'Package Manager' window for progress."
  - 패키지 설치 진행 상황은 Package Manager 창에서 확인 가능.

#### Dev Action (코드 수정)
- **`Assets/Editor/PackageInstaller.cs`**: 패키지 설치 기능만 수행하도록 단순화.
  - `InstallEssentialPackages()`: 메인 메뉴 실행 메서드 (메뉴 이름 변경).
  - `UnityEditor.PackageManager.Client.Add`를 사용하여 패키지 설치 요청만 수행.
  - JSON 파일 생성 관련 메서드 및 로직 제거 (기존 파일이 이미 존재하므로 불필요).

#### 문서 업데이트
- **`md/To_do.md`**: Phase 0.2의 PackageInstaller 관련 항목 업데이트, 메뉴 이름 및 기능 변경 반영.
- **`md/Architecture.md`**: 2.3 Editor Tools 섹션의 PackageInstaller 설명 업데이트 (단순화된 기능 반영).
- **`md/Tree.md`**: Editor 폴더의 PackageInstaller.cs 설명 업데이트.
- **`md/Work_Process.md`**: 본 7차 개발 기록을 최상단에 추가, Last Updated 7차로 갱신.

#### Current Status
- PackageInstaller가 단순화되어 Unity 에디터에서 `Tools > J_O_T > Install Essential Packages` 메뉴를 통해 필수 패키지(`com.unity.vectorgraphics`, `com.unity.localization`) 설치 요청을 간단하게 수행할 수 있음. 복잡한 로직 없이 `Client.Add`만 사용하여 심플하고 명확한 스크립트로 작성됨. 패키지 설치 진행 상황은 Package Manager 창에서 확인 가능. Phase 0.2의 Vector Graphics 패키지 설치 항목이 완료됨. 모든 문서가 현재 구현 상태와 동기화됨.

---

### 2026-02-09 (6차) - ProjectSetupTool에 Player Settings 자동 적용 기능 추가 및 API 호환성 문제 해결
**[목표]** 프로젝트 초기 설정을 완벽하게 자동화하기 위해, `ProjectSetupTool`에 Player Settings(해상도, 안드로이드 빌드 설정 등)를 적용하는 기능을 추가하고, Unity 2022.3 LTS 버전에 맞는 올바른 API로 수정하여 컴파일 에러를 해결함.

#### 구현 내용
- **ProjectSetupTool.cs 수정** (`Assets/Editor/ProjectSetupTool.cs`):
  - 새로운 메뉴 항목 추가: `Tools > J_O_T > Apply Project Settings`.
  - `ApplyProjectSettings()` 메서드 구현 및 메뉴 연결.
  - **Identity 설정 자동 적용**:
    - Company Name: "J_O_T Studio"
    - Product Name: "Just One Tap"
    - Package Name (Android): "com.jotstudio.justonetap" (`PlayerSettings.SetApplicationIdentifier` 메서드 사용)
    - Version: "0.1.0"
    - Bundle Version Code: 1
  - **Resolution 설정 자동 적용**:
    - Default Orientation: `UIOrientation.Portrait` (세로 고정)
    - Allowed Auto-Rotate: 모두 비활성화 (Portrait, Portrait Upside Down, Landscape Right, Landscape Left)
  - **Android 설정 자동 적용**:
    - Minimal API Level: Android 7.0 (Nougat) - SDK 24 (`AndroidSdkVersions.AndroidApiLevel24`)
    - Target API Level: Automatic (`AndroidSdkVersions.AndroidApiLevelAuto`)
    - Scripting Backend: `IL2CPP` (`PlayerSettings.SetScriptingBackend` 메서드 사용)
    - Api Compatibility Level: `.NET Standard` (`PlayerSettings.SetApiCompatibilityLevel` 메서드 사용)
    - Target Architectures: ARM64 + ARMv7 (비트 연산 사용)
    - Custom Keystore: false
  - **기타 설정 자동 적용**:
    - Accelerometer Frequency: 60Hz
  - 설정 적용 완료 후 "✅ Player Settings Applied Successfully! (Target: Android)" 및 플랫폼 변경 안내 로그 출력.
  - Unity 2022.3 LTS API 호환성 문제 해결:
    - `PlayerSettings.applicationIdentifier` 직접 할당 대신 `PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, ...)` 메서드 사용.
    - `PlayerSettings.SetScriptingBackend`, `PlayerSettings.SetApiCompatibilityLevel` 메서드 사용으로 API 호환성 보장.
    - `PlayerSettings.Android.targetArchitectures`에 비트 연산(`AndroidArchitecture.ARM64 | AndroidArchitecture.ARMv7`) 사용.

#### Dev Action (코드 수정)
- **`Assets/Editor/ProjectSetupTool.cs`**: Player Settings 자동 적용 기능 추가 및 API 호환성 문제 수정.
  - `ApplyProjectSettings()`: 메인 메뉴 실행 메서드 추가.
  - `ApplyIdentitySettings()`: Identity 설정 적용 메서드 (SetApplicationIdentifier 사용).
  - `ApplyResolutionSettings()`: Resolution 설정 적용 메서드.
  - `ApplyAndroidSettings()`: Android 설정 적용 메서드 (SetScriptingBackend, SetApiCompatibilityLevel 사용).
  - `ApplyOtherSettings()`: 기타 설정 적용 메서드.
  - 기존 `InitializeProject()` 기능 유지 (폴더 구조 및 매니저 스크립트 생성).

#### 문서 업데이트
- **`md/To_do.md`**: Phase 0.1의 해상도·플랫폼 설정 항목 완료 표시, ProjectSetupTool의 Player Settings 기능 완료 항목 추가.
- **`md/Architecture.md`**: 2.3 Editor Tools 섹션에 ProjectSetupTool의 Apply Project Settings 기능 설명 추가.
- **`md/Tree.md`**: 변경 없음 (이미 ProjectSetupTool.cs 반영됨).
- **`md/Work_Process.md`**: 본 6차 개발 기록을 최상단에 추가, Last Updated 6차로 갱신, Project Settings 섹션 업데이트.

#### Current Status
- ProjectSetupTool에 Player Settings 자동 적용 기능이 추가되어 Unity 에디터에서 `Tools > J_O_T > Apply Project Settings` 메뉴를 통해 모든 Player Settings를 한 번에 적용할 수 있음. Unity 2022.3 LTS 버전에 맞는 올바른 API를 사용하여 컴파일 에러 없이 정상 작동함. Identity, Resolution, Android 설정이 모두 자동으로 적용되며, 플랫폼 변경은 사용자가 Build Settings에서 수동으로 수행하도록 안내됨. Phase 0.1의 해상도·플랫폼 설정 항목이 완료됨. 모든 문서가 현재 구현 상태와 동기화됨.

---

### 2026-02-09 (5차) - PackageInstaller 구현 및 Unity 패키지 수동 설치, Firebase SDK 수동 임포트
**[목표]** Phase 0.2 작업을 위해 필수 Unity 패키지 설치 및 다국어 데이터 생성 자동화 툴 구현, 그리고 Phase 0.2(데이터/분석) 및 Phase 3(소셜/알림) 구현을 위해 필수 Firebase 패키지를 수동으로 임포트하고, 프로젝트 의존성을 설정함.

#### 구현 내용
- **PackageInstaller.cs 생성** (`Assets/Editor/PackageInstaller.cs`):
  - Unity 에디터 메뉴: `Tools > J_O_T > Install Packages & Data`로 실행 가능.
  - **기능 1 (Package Install)**: `UnityEditor.PackageManager.Client.Add`를 사용하여 다음 패키지 설치 요청:
    - `com.unity.vectorgraphics` (SVG 지원) — 기획서 §5 Assets: Vector 필수.
    - `com.unity.localization` (다국어 지원) — 기획서 §5 Tech Stack 명시.
  - 패키지 설치는 비동기로 동작하므로, 설치 요청을 보냈음을 로그로 명확히 알림.
  - 패키지 설치 상태는 Package Manager 창에서 확인 가능.
  - **기능 2 (Data Creation)**: `Assets/_Project/Resources/Localization` 폴더(없으면 생성)에 `en.json`, `ko.json` 파일 생성:
    - 기존 JSON 파일이 존재할 경우 덮어쓰지 않도록 체크 로직 포함.
    - UTF-8 인코딩 사용 (`System.IO` 및 `UTF-8` 인코딩).
    - 초기 JSON 내용 (기획서 기반):
      - **en.json**: `msg_ready`, `msg_tap_to_save`, `msg_see_you_tomorrow`, `msg_saved`, `label_streak`, `label_points` 키 포함.
      - **ko.json**: 동일 키에 대한 한국어 번역 포함.
  - 설치 및 생성 완료 후 "Packages Installing... Check Package Manager & JSON Files Created!" 로그 출력.
- **Unity 패키지 수동 설치 완료**:
  - `com.unity.vectorgraphics`: Unity Package Manager를 통해 수동 설치 완료.
  - `com.unity.localization`: Unity Package Manager를 통해 수동 설치 완료.
- **Firebase SDK Import (Manual)**:
  - 기획서 및 아키텍처에 정의된 필수 패키지 5종 임포트 완료.
  - **Core/Auth/Database**:
    - `FirebaseAuth` (Phase 2: 로그인/익명 인증)
    - `FirebaseFirestore` (Phase 2: 데이터 동기화/랭킹)
  - **Quality/Analytics**:
    - `FirebaseAnalytics` (Phase 0: BM 분석/광고 효율)
    - `FirebaseCrashlytics` (Phase 4: 품질 보증)
  - **Feature (Pre-load)**:
    - `FirebaseMessaging` (Phase 3: 푸시 알림 - 선행 설치)
- **Project Configuration**:
  - Android Auto-resolution: **Enable** 설정 (Gradle 의존성 자동 해결).
  - API Compatibility Level: `.NET Standard 2.1` 확인 및 유지.

#### Dev Action (코드 생성 및 수동 작업)
- **`Assets/Editor/PackageInstaller.cs`**: 패키지 설치 및 다국어 데이터 생성 에디터 툴 신규 생성.
  - `InstallPackagesAndData()`: 메인 메뉴 실행 메서드.
  - `InstallPackages()`: Unity Package Manager를 통한 패키지 설치 요청 로직.
  - `CreateLocalizationData()`: Localization 폴더 생성 및 JSON 파일 생성 로직.
  - `CreateJsonFile()`: 기존 파일 체크 후 JSON 파일 생성 (덮어쓰기 방지).
  - `GetEnglishJsonContent()`, `GetKoreanJsonContent()`: 기획서 기반 JSON 내용 반환.
- **Unity Package Manager 수동 설치**: `Window > Package Manager`를 통해 `com.unity.vectorgraphics`, `com.unity.localization` 패키지 수동 설치 완료.
- **Unity Package Import**: `Assets > Import Package > Custom Package`를 통해 Firebase SDK 파일(.unitypackage) 5개 순차적 설치.
- **Dependency Resolving**: External Dependency Manager를 통해 안드로이드 라이브러리 의존성 해결.

#### 문서 업데이트
- **`md/To_do.md`**: Phase 0.2 항목 완료 표시, PackageInstaller 관련 완료 항목 추가, Unity 패키지 및 Firebase 패키지 설치 완료 체크.
- **`md/Architecture.md`**: 2.3 Editor Tools 섹션에 PackageInstaller 설명 추가.
- **`md/Tree.md`**: Editor 폴더에 `PackageInstaller.cs` 추가 반영.
- **`md/Work_Process.md`**: 본 5차 개발 기록을 최상단에 추가, Last Updated 5차로 갱신.

#### Current Status
- PackageInstaller가 Unity 에디터에서 실행 가능한 상태로 구현 완료. `Tools > J_O_T > Install Packages & Data` 메뉴를 통해 다국어 JSON 파일 생성을 수행할 수 있음. Unity Registry 패키지(`com.unity.vectorgraphics`, `com.unity.localization`)는 Unity Package Manager를 통해 수동으로 설치 완료됨. Firebase SDK 5종(Core, Auth, Database, Analytics, Crashlytics, Messaging)도 수동 임포트 완료되어 프로젝트에 포함되었으며, 안드로이드 의존성 설정(Auto-resolution)이 활성화됨. Phase 0.2의 패키지 설치 및 Localization 세팅 항목이 완료됨. 이제 `google-services.json` 파일 배치와 초기화 코드 작업만 남은 상태. 모든 문서가 현재 구현 상태와 동기화됨.

### 2026-02-09 (4차) - PackageInstaller 구현 및 Phase 0.2 패키지 설치·다국어 데이터 생성 자동화
**[목표]** Phase 0.2 작업을 위해 필수 Unity 패키지를 설치하고, 다국어 기초 데이터(JSON)를 생성하는 에디터 툴 `PackageInstaller`를 구현하여, 패키지 설치 요청과 다국어 JSON 파일 생성을 자동화함.

#### 구현 내용
- **PackageInstaller.cs 생성** (`Assets/Editor/PackageInstaller.cs`):
  - Unity 에디터 메뉴: `Tools > J_O_T > Install Packages & Data`로 실행 가능.
  - **기능 1 (Package Install)**: `UnityEditor.PackageManager.Client.Add`를 사용하여 다음 패키지 설치 요청:
    - `com.unity.vectorgraphics` (SVG 지원) — 기획서 §5 Assets: Vector 필수.
    - `com.unity.localization` (다국어 지원) — 기획서 §5 Tech Stack 명시.
  - 패키지 설치는 비동기로 동작하므로, 설치 요청을 보냈음을 로그로 명확히 알림.
  - 패키지 설치 상태는 Package Manager 창에서 확인 가능.
  - **기능 2 (Data Creation)**: `Assets/_Project/Resources/Localization` 폴더(없으면 생성)에 `en.json`, `ko.json` 파일 생성:
    - 기존 JSON 파일이 존재할 경우 덮어쓰지 않도록 체크 로직 포함.
    - UTF-8 인코딩 사용 (`System.IO` 및 `UTF-8` 인코딩).
    - 초기 JSON 내용 (기획서 기반):
      - **en.json**: `msg_ready`, `msg_tap_to_save`, `msg_see_you_tomorrow`, `msg_saved`, `label_streak`, `label_points` 키 포함.
      - **ko.json**: 동일 키에 대한 한국어 번역 포함.
  - 설치 및 생성 완료 후 "Packages Installing... Check Package Manager & JSON Files Created!" 로그 출력.

#### Dev Action (코드 생성)
- **`Assets/Editor/PackageInstaller.cs`**: 패키지 설치 및 다국어 데이터 생성 에디터 툴 신규 생성.
  - `InstallPackagesAndData()`: 메인 메뉴 실행 메서드.
  - `InstallPackages()`: Unity Package Manager를 통한 패키지 설치 요청 로직.
  - `CreateLocalizationData()`: Localization 폴더 생성 및 JSON 파일 생성 로직.
  - `CreateJsonFile()`: 기존 파일 체크 후 JSON 파일 생성 (덮어쓰기 방지).
  - `GetEnglishJsonContent()`, `GetKoreanJsonContent()`: 기획서 기반 JSON 내용 반환.

#### 문서 업데이트
- **`md/To_do.md`**: Phase 0.2 항목 완료 표시, PackageInstaller 관련 완료 항목 추가.
- **`md/Architecture.md`**: 2.3 Editor Tools 섹션에 PackageInstaller 설명 추가.
- **`md/Tree.md`**: Editor 폴더에 `PackageInstaller.cs` 추가 반영.
- **`md/Work_Process.md`**: 본 4차 개발 기록을 최상단에 추가, Last Updated 4차로 갱신.

#### Current Status
- PackageInstaller가 Unity 에디터에서 실행 가능한 상태로 구현 완료. `Tools > J_O_T > Install Packages & Data` 메뉴를 통해 필수 패키지 설치 요청과 다국어 JSON 파일 생성을 한 번에 수행할 수 있음. 패키지 설치는 비동기로 진행되며 Package Manager 창에서 확인 가능. JSON 파일은 기존 파일 덮어쓰기 방지 로직으로 안전하게 생성됨. Phase 0.2의 패키지 설치 및 Localization 세팅 항목이 완료됨. 모든 문서가 현재 구현 상태와 동기화됨.

---

### 2026-02-09 (3차) - ProjectSetupTool 구현 및 프로젝트 초기화 자동화
**[목표]** 프로젝트 초기 설정을 자동화하는 에디터 툴 `ProjectSetupTool`을 구현하여, 핵심 폴더 구조와 매니저 스크립트를 자동 생성하도록 함.

#### 구현 내용
- **ProjectSetupTool.cs 생성** (`Assets/Editor/ProjectSetupTool.cs`):
  - Unity 에디터 메뉴: `Tools > J_O_T > Initialize Project`로 실행 가능.
  - Tree.md에 정의된 폴더 구조를 `Assets/_Project/` 하위에 자동 생성.
    - 생성 폴더: `Art/Icons`, `Art/UI`, `Art/Fonts`, `Resources/Localization`, `Scripts/Core`, `Scripts/UI`, `Scripts/Utils`, `Scenes`, `Prefabs`.
    - 이미 존재하는 폴더는 건너뛰도록 안전 처리.
  - 5개 핵심 매니저 스크립트 템플릿 자동 생성 (`Assets/_Project/Scripts/Core/` 경로):
    - **GameManager.cs**: Singleton 패턴, `DontDestroyOnLoad` 적용, `GameState` enum (Intro, Main) 포함.
    - **RoutineManager.cs**: Singleton 패턴, `IsTodayDone()`, `TryRoutineAction()` 메서드 스텁 포함.
    - **DataManager.cs**: Singleton 패턴, `Save()`, `Load()` 메서드 스텁 포함.
    - **LocalizationManager.cs**: Singleton 패턴, `SetLanguage(string langCode)` 메서드 스텁 포함.
    - **AuthManager.cs**: Singleton 패턴, `Login()`, `Logout()` 메서드 스텁 포함.
  - 모든 스크립트는 UTF-8 인코딩으로 생성, 한국어 주석 적용, 영어 변수명/로그 사용.
  - 완료 시 "J_O_T Project Initialized Successfully!" 로그 출력.

#### Dev Action (코드 생성)
- **`Assets/Editor/ProjectSetupTool.cs`**: 프로젝트 초기화 에디터 툴 신규 생성.
  - `CreateFolderStructure()`: Tree.md 구조에 맞는 폴더 자동 생성 로직.
  - `CreateManagerScripts()`: 5개 매니저 스크립트 템플릿 생성 로직.
  - 각 매니저별 템플릿 생성 메서드 구현 (GenerateGameManagerTemplate, GenerateRoutineManagerTemplate 등).

#### 문서 업데이트
- **`md/To_do.md`**: Phase 0.1 및 0.3 항목 일부 완료 표시, ProjectSetupTool 관련 완료 항목 추가.
- **`md/Architecture.md`**: 2.3 Editor Tools 섹션 추가, ProjectSetupTool 설명 추가.
- **`md/Tree.md`**: Editor 폴더에 `ProjectSetupTool.cs` 추가 반영.
- **`md/Work_Process.md`**: 본 3차 개발 기록을 최상단에 추가, Last Updated 3차로 갱신.

#### Current Status
- ProjectSetupTool이 Unity 에디터에서 실행 가능한 상태로 구현 완료. `Tools > J_O_T > Initialize Project` 메뉴를 통해 프로젝트 초기 설정을 한 번에 수행할 수 있음. 폴더 구조와 매니저 스크립트 템플릿이 자동 생성되어 개발 시작 시 수동 작업을 최소화할 수 있음. 모든 문서가 현재 구현 상태와 동기화됨.

---

### 2026-02-09 (2차) - To_do.md 상세화, 문서 동기화 및 .gitignore/.cursorignore 보완
**[목표]** 총괄 아키텍트(Gemini)와 Cursor AI 간 효율적인 협업을 위해 `To_do.md`를 상세하게 재작성하고, `Architecture.md`, `Tree.md`, `Work_Process.md`를 현재 상황에 맞게 동기화. 또한 프로젝트 보안 및 AI 효율성을 위해 `.gitignore`와 `.cursorignore` 파일을 보완.

#### 반영된 문서·상태 요약
- **To_do.md 전면 재작성:**
  - 프롬프트 설계용으로 Phase별 세부 작업 항목화 (0.1~0.4, 1.1~1.4, 2.1~2.2, 3.1~3.4, 4.1~4.2).
  - 각 항목에 기획 참조(`project_proposal` §번호, `Architecture` §번호) 명시하여 총괄 아키텍트가 프롬프트 생성 시 인용 가능하도록 구성.
  - 사용법 안내 추가: 총괄 아키텍트가 이 문서에서 "다음 할 일" 선택 → Cursor 프롬프트 설계 → 작업 완료 후 체크·문서 최신화 흐름 명시.
  - 참조 문서 테이블 추가: `project_proposal`, `Dev-Roadmap`, `Architecture`, `Tree`, `CURSOR_GUIDELINES` 용도 정리.
- **Tree.md 동기화:**
  - `Scripts/Core/` 하위에 `AuthManager.cs` 추가 (Architecture.md §2.1과 일치하도록).
- **Architecture.md:**
  - 이미 Just One Tap 기준으로 정리되어 있어 변경 없음 (MCV, Core Loop, Data Schema, 컴포넌트 역할 모두 정확).
- **.gitignore 보완:**
  - Firebase 보안 파일 강화: `**/google-services.json`, `**/GoogleService-Info.plist` 등 와일드카드 패턴으로 모든 경로 커버.
  - Firebase Large Binaries: `.bundle`, `.so`, `.dll` 파일들 제외.
  - UserSettings/ 폴더 제외 (개인 설정).
  - Local Save Files: `savefile.json`, `savefile_*.json` 등 런타임 생성 파일 제외.
  - Unity Cloud Build: `cloudbuild/` 폴더 제외.
  - `desktop.ini` 추가 (Windows 시스템 파일).
- **.cursorignore 보완:**
  - Firebase 보안 파일 제외: Cursor AI가 읽을 필요 없는 `google-services.json`, `GoogleService-Info.plist` 등.
  - Firebase Large Binaries 제외: `.bundle`, `.so`, `.dll` 파일들.
  - Local Save Files 제외: 런타임 생성 저장 파일들.
  - Unity Cloud Build 제외: `cloudbuild/` 폴더.
  - `desktop.ini` 추가.
  - Localization JSON 파일(`en.json`, `ko.json`)은 읽어야 하므로 제외하지 않음 (`.meta`만 제외).

#### Dev Action (문서 동기화)
- **`md/To_do.md`:** Phase별 상세 작업 항목으로 전면 재작성, 프롬프트 설계 워크플로우 반영.
- **`md/Tree.md`:** AuthManager.cs 추가하여 Architecture.md와 동기화.
- **`md/Architecture.md`:** 변경 없음 (이미 정확).
- **`.gitignore`:** Firebase 보안 파일, UserSettings, Local Save Files, Unity Cloud Build 등 추가.
- **`.cursorignore`:** Firebase 보안 파일, Large Binaries, Local Save Files, Unity Cloud Build 등 추가 (Localization JSON은 제외하지 않음).
- **`md/Work_Process.md`:** 본 2차 개발 기록을 4번 개발 기록 최상단에 추가, Last Updated 2차로 갱신.

#### Current Status
- To_do.md가 총괄 아키텍트→Cursor 협업 프로세스에 최적화된 상세 작업 목록으로 재작성 완료. Tree.md에 AuthManager.cs 추가하여 Architecture.md와 동기화 완료. .gitignore와 .cursorignore에 Firebase 보안 파일, 런타임 생성 파일, Unity Cloud Build 등 필수 항목 추가 완료. 모든 문서가 Just One Tap (J_O_T) 프로젝트 기준으로 일치함. 최신 버전 항상 위에 유지.

---

### 2026-02-09 (1차) - 프로젝트 Just One Tap (J_O_T) 문서 전환 
- **목표:** 이전 프로젝트(Chicken Fund) 기준이었던 `Architecture.md`, `Work_Process.md`, `Tree.md`를 Just One Tap (J_O_T) 프로젝트에 맞게 수정.
- **반영 내용:** 프로젝트명·폴더 구조·아키텍처(MCV, RoutineManager, UI_Main, Localization 등)를 `project_proposal.md` 및 Just One Tap 기획에 맞게 정리. 개발 로그는 본일부터 신규 작성.

---
irebase 보안 파일, 런타임 생성 파일, Unity Cloud Build 등 필수 항목 추가 완료. 모든 문서가 Just One Tap (J_O_T) 프로젝트 기준으로 일치함. 최신 버전 항상 위에 유지.

---

### 2026-02-09 (1차) - 프로젝트 Just One Tap (J_O_T) 문서 전환 
- **목표:** 이전 프로젝트(Chicken Fund) 기준이었던 `Architecture.md`, `Work_Process.md`, `Tree.md`를 Just One Tap (J_O_T) 프로젝트에 맞게 수정.
- **반영 내용:** 프로젝트명·폴더 구조·아키텍처(MCV, RoutineManager, UI_Main, Localization 등)를 `project_proposal.md` 및 Just One Tap 기획에 맞게 정리. 개발 로그는 본일부터 신규 작성.

---
