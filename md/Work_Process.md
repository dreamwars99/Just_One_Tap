# 📝 작업 일지 (Project History & Context)

- **Project:** Just One Tap (J_O_T)
- **Editor:** Unity Tech Lead & PM
- **Unity Version:** 2022.3.x LTS
- **Platform:** Android (Portrait / 1080x1920)
- **Last Updated:** 2026-02-09 (3차)

## 📌 1. Development Environment (개발 환경 상세)
이 프로젝트를 이어받는 AI/개발자는 아래 설정을 필수로 확인해야 합니다.

### 1.1. Package Dependencies (설치된 패키지)
외부 라이브러리는 `Window > Package Manager > + > Add package from git URL`을 통해 설치합니다.

- **Lottie for Unity**
  - Version / Git URL: `https://github.com/gilzoide/unity-lottie-player.git#1.1.1`
  - Purpose: 벡터 애니메이션(Native Rendering) 재생용
- **Unity Figma Bridge**
  - Version / Git URL: `https://github.com/simonoliver/UnityFigmaBridge.git`
  - Purpose: Figma 디자인 → Unity UI 변환용
- **DOTween**
  - Version: v1.2.xxx (Asset Store / Package Manager)
  - Purpose: 코드 기반 UI 모션 및 애니메이션

### 1.2. Project Settings
- **Resolution:** 1080 x 1920 (Portrait).
- **Scripting Backend:** IL2CPP (Android Build 필수).
- **Api Compatibility:** .NET Standard 2.1.

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
