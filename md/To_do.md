# ✅ 할 일 목록 (To-Do List) - Just One Tap (J_O_T)

> **Goal:** "Ready? Just One Tap."
> **Strategy:** English First, System 1 Simplicity.
>
> **사용법:** 총괄 아키텍트(Gemini)와 토론 시 이 문서에서 "다음 할 일"을 선택하고, Cursor에 전달할 프롬프트를 설계한 뒤 `prompt.md` 출력 포맷으로 작성합니다. Cursor에서 작업 완료 후 해당 항목을 체크하고, 필요 시 `Work_Process.md`·`Tree.md`를 최신화합니다.

---

## 📌 참조 문서 (프롬프트 설계 시 필수 참고)

| 문서 | 용도 |
|:---|:---|
| `project_proposal.md` | 기획서 — UX/UI, User Flow, Gamification, Tech Stack |
| `Dev-Roadmap.md` | Phase별 목표 및 일정 (Day 1–14) |
| `Architecture.md` | MCV, Core Loop, Data Schema, 컴포넌트 역할 |
| `Tree.md` | 폴더·씬·스크립트 구조 |
| `CURSOR_GUIDELINES.md` | 해상도 대응(VLG/HLG/RectTransform), MCV, 금지 사항 |

---

## 📋 Current Status (현재 상태)

- **Project:** Just One Tap (J_O_T)
- **Phase:** 🛑 Phase 0: Foundation
- **Engine:** Unity 2022.3 LTS (2D URP)
- **Last Sync:** Dev-Roadmap Phase 0 ~ Phase 4 기준 정리

---

# 🛑 Phase 0: Foundation (Day 1–2)

> **목표:** 깨끗한 프로젝트 환경 및 글로벌 대응 준비.  
> **기획 참조:** project_proposal §5 Tech Stack, Dev-Roadmap Phase 0.

---

## 0.1 Project Setup

- [ ] **Unity 프로젝트 생성**
    - [ ] Unity Hub → New Project → 2D (URP) 템플릿.
    - [ ] Project Name: Just_One_Tap (또는 동일 루트).
- [ ] **해상도·플랫폼 설정**
    - [ ] Player Settings: Resolution 1080×1920 (Portrait) — Reference Resolution으로 사용.
    - [ ] Canvas: Scale With Screen Size, Match (Width/Height) 비율 프로젝트 규칙에 맞게 설정.
- [ ] **Git 및 보안**
    - [ ] `git init` (또는 기존 저장소 연결).
    - [ ] `.gitignore` 적용 — `google-services.json`, `GoogleService-Info.plist`, API 키 등 제외 확인.
- [x] **폴더 구조 및 프로젝트 초기화 툴**
    - [x] `ProjectSetupTool.cs` 생성 (`Assets/Editor/ProjectSetupTool.cs`) — `Tools > J_O_T > Initialize Project` 메뉴로 실행 가능.
    - [x] `Tree.md` 구조대로 `Assets/_Project` 하위 폴더 자동 생성 기능 구현: `Art/Icons`, `Art/UI`, `Art/Fonts`, `Resources/Localization`, `Scripts/Core`, `Scripts/UI`, `Scripts/Utils`, `Scenes`, `Prefabs`.
    - [x] `Assets/Editor` 폴더에 `ProjectSetupTool.cs` 배치 완료.

---

## 0.2 Asset Pipeline (패키지·에셋)

- [x] **Package Manager 설치**
    - [x] **PackageInstaller 에디터 툴 구현** (`Assets/Editor/PackageInstaller.cs`) — `Tools > J_O_T > Install Packages & Data` 메뉴로 실행 가능.
    - [x] **Vector Graphics:** Unity Package Manager를 통한 설치 요청 기능 구현 (`com.unity.vectorgraphics`). — 기획서 §5 Assets: Vector 필수.
    - [x] **Localization:** Unity Package Manager를 통한 설치 요청 기능 구현 (`com.unity.localization`).
    - [ ] **DOTween:** Asset Store 또는 Package Manager (애니메이션·UI 연출) — 이후 단계에서 설치 예정.
    - [ ] **Firebase:** Auth, Firestore SDK 패키지 추가 (초기 설정은 이후 단계에서).
- [x] **Localization 세팅**
    - [x] Unity Localization 패키지 설치 요청 기능 구현 완료.
    - [x] `_Project/Resources/Localization`에 `en.json`, `ko.json` 파일 생성 기능 구현 완료.
    - [x] 초기 JSON 키 포함: `msg_ready`, `msg_tap_to_save`, `msg_see_you_tomorrow`, `msg_saved`, `label_streak`, `label_points`.
    - [ ] Default Locale: **English** 설정 (Unity Localization 패키지 설치 후 설정 예정).
- [ ] **리소스 임포트 (Figma/에셋)**
    - [ ] Figma에서 아이콘(SVG) 추출 → `_Project/Art/Icons` 임포트. (기획서 §2.2 Cute Isometric Icons Pack 등)
    - [ ] 폰트: Jua 또는 프로젝트 지정 폰트 → TextMeshPro SDF 생성 → `_Project/Art/Fonts` 또는 TMP 기본 경로.

---

## 0.3 Base Architecture (뼈대)

- [x] **Core 매니저 스크립트 생성** — Architecture §2.1 기준.
    - [x] `ProjectSetupTool`을 통해 5개 매니저 스크립트 템플릿 자동 생성 기능 구현 완료.
    - [x] `GameManager.cs` — Singleton, DontDestroyOnLoad, GameState enum (Intro, Main) 포함 템플릿 생성.
    - [x] `LocalizationManager.cs` — 싱글톤, SetLanguage(string langCode) 메서드 스텁 포함 템플릿 생성.
    - [x] `RoutineManager.cs` — 싱글톤, IsTodayDone(), TryRoutineAction() 메서드 스텁 포함 템플릿 생성.
    - [x] `DataManager.cs` — 싱글톤, Save(), Load() 메서드 스텁 포함 템플릿 생성.
    - [x] `AuthManager.cs` — 싱글톤, Login(), Logout() 메서드 스텁 포함 템플릿 생성.
    - [ ] Unity 에디터에서 `Tools > J_O_T > Initialize Project` 실행하여 실제 스크립트 생성 확인.
- [ ] **씬 및 빌드**
    - [ ] `Intro.unity` 씬 생성 — 진입점(온보딩용).
    - [ ] `Main.unity` 씬 생성 — 메인 루틴용.
    - [ ] Build Settings에 Intro, Main 순서로 등록. Intro를 0번.
- [ ] **씬 내 매니저 배치**
    - [ ] Intro 또는 Main 씬에 빈 GameObject에 GameManager 등 필수 매니저 부착 후, 실행 시 DontDestroy 전환되는지 확인.

---

## 0.4 UISetupTool 이식 및 J_O_T 적응

> **목표:** "버튼 한 방"에 J_O_T 전용 UI 계층이 생성되도록. CURSOR_GUIDELINES §2.1, §1.3(해상도 대응) 준수.

- [ ] **UISetupTool 이식**
    - [ ] 기존 프로젝트의 `UISetupTool.cs`를 `Assets/Editor`로 복사 (또는 신규 작성).
    - [ ] 메뉴 항목 예: `Tools > Just One Tap > Setup UI` (또는 프로젝트 규칙에 맞게).
    - [x] `ProjectSetupTool.cs`가 `Assets/Editor`에 배치되어 프로젝트 초기화 기능 제공 중.
- [ ] **계층 구조 반영** — 기획서 §3.2 Main Screen, CURSOR_GUIDELINES 계층.
    - [ ] `SafeArea_Container` 하위에 `Panel_Intro`, `Panel_Auth`, `Panel_Main` 생성.
    - [ ] `Panel_Main` 하위: `Top_Bar`(국기, Streak, Points), `Center_Area`(The Button), `Bottom_Nav_Bar`(Ranking, Home, Profile).
    - [ ] 모든 패널/버튼은 **VerticalLayoutGroup** 또는 **HorizontalLayoutGroup**으로 배치. 수동 anchoredPosition 사용 금지.
- [ ] **LayoutElement 강제**
    - [ ] UISetupTool이 생성하는 모든 UI 요소에 `LayoutElement` 부착. 리스트/버튼은 `minHeight` 설정으로 해상도에서 깨지지 않도록.
- [ ] **AutoLink (자동 연결)**
    - [ ] `AutoLinkScripts` (또는 동일 역할 메서드): 오브젝트명(`Btn_Save`, `Txt_Streak` 등)과 스크립트 변수명(`btnSave`, `txtStreak`) 매칭 규칙 문서화 및 구현.
    - [ ] Main 씬에 배치할 `UI_Main.cs`(또는 동일 View 스크립트)에 `[SerializeField]`로 버튼/텍스트 참조 두고, 툴 실행 시 자동 할당되는지 확인.

---

# 🏃 Phase 1: The Core Loop (Day 3–5)

> **목표:** "Ready? Just One Tap." 루틴 동작. Architecture §1 Core Loop, project_proposal §3.2–3.3.

---

## 1.1 Main UI 구축

- [ ] **3단 레이아웃**
    - [ ] UISetupTool 실행 시 Top_Bar / Center_Area / Bottom_Nav_Bar가 해상도 대응(VLG/HLG)으로 자동 배치되는지 확인.
- [ ] **Top Bar**
    - [ ] 국기(Image, SVG 가능) — User Country 플레이스홀더.
    - [ ] Streak (Text/TextMeshPro) — 연속 일수, Gray → Fire 색 조건부 표시 준비.
    - [ ] Points (Text/TextMeshPro) — 현재 포인트.
- [ ] **Center — The Button**
    - [ ] 중앙에 거대 버튼 하나. SVG 또는 Sprite.
    - [ ] 상태 텍스트: Active — "Tap to Save", Inactive — "See you tomorrow" (Localization 키 사용 권장).
- [ ] **Bottom Nav**
    - [ ] 🏆 Ranking, 🏠 Home, 👤 Profile 버튼. 아이콘+라벨 분리 구조 유지 (CURSOR_GUIDELINES Global Ready).

---

## 1.2 메인 버튼 인터랙션

- [ ] **탭 피드백**
    - [ ] 버튼 클릭 시 DOTween 스케일/색 연출 (눌림).
    - [ ] 햅틱 피드백 (Handheld.Vibrate 또는 유니티 햅틱 API).
- [ ] **UI_Main 연동**
    - [ ] 버튼 클릭 시 `RoutineManager.TryRoutineAction()` 호출 (View는 로직 없이 전달만).

---

## 1.3 RoutineManager 로직

- [ ] **1일 1회 제한**
    - [ ] `lastActionDate` (YYYY-MM-DD) 저장·비교. 오늘 이미 수행했으면 `IsTodayDone() == true`.
- [ ] **Streak 계산**
    - [ ] 어제 연속이었는지 판단해 오늘 완료 시 streak 증가. 날짜가 끊기면 0으로 리셋.
- [ ] **날짜 변경 감지**
    - [ ] 앱 재실행 또는 자정 넘김 시 날짜 비교 로직 (로컬 또는 DataManager와 연동).

---

## 1.4 Ad 연동 (보상 흐름)

- [ ] **전면 광고 플로우**
    - [ ] TryRoutineAction()에서 오늘 미완료일 때만: UI에 "광고 재생" 요청 → (AdMob 등) Interstitial 재생 → 완료 콜백에서 포인트·스트릭 증가 및 DataManager 저장.
- [ ] **AdMob 연동** (또는 프로젝트 지정 광고 SDK)
    - [ ] 전면 광고 15초 가정. 테스트용 플레이스홀더(딜레이만)로 먼저 구현해도 됨.

---

# 🧩 Phase 2: User Context & Data (Day 6–8)

> **목표:** 온보딩 및 데이터 동기화. project_proposal §3.1 Onboarding, §5 Backend.

---

## 2.1 Onboarding UX

- [ ] **Intro 씬**
    - [ ] 로고: J_O_T Studio — Fade In/Out (DOTween).
    - [ ] 메시지: 검은 배경 + 흰 글씨, 타이핑 효과. Copy: "Ready? Just One Tap." (기획서 §3.1).
- [ ] **User Info** (선택)
    - [ ] Age / Gender 단순 선택 UI (기획서 명시). 스킵 가능 여부는 기획 확정 후.
- [ ] **Goal Setting**
    - [ ] Slider: "How much can you save daily?" — 텍스트 입력 없음.
    - [ ] 슬라이더 값에 따라 아이콘 전환: ☕ Coffee → 🍔 Burger → 🍗 Chicken (기획서 §3.1).
    - [ ] 통화 단위: 접속 국가(IP) 또는 설정에 따라 $/₩/€ 표시. 기본 USD.

---

## 2.2 Data Persistence

- [ ] **로컬 JSON**
    - [ ] DataManager: identity, settings(dailyTarget, currencySymbol), routine(currentPoints, currentStreak, lastActionDate) — Architecture §3 Data Schema 형식으로 저장/로드.
- [ ] **Firebase Firestore 동기화**
    - [ ] 익명 로그인 또는 AuthManager 연동 후, 저장 시 Firestore 문서 업데이트.
    - [ ] 동기화 실패 시 로컬만 유지해도 되도록 설계.

---

# 🏆 Phase 3: Social & Localization (Day 9–11)

> **목표:** 경쟁 요소 및 다국어. project_proposal §4, §3.2 Bottom Bar.

---

## 3.1 Ranking System

- [ ] **리더보드 UI**
    - [ ] Tab 1: Collect (Reliability) — Streak/Total Clicks 기준.
    - [ ] Tab 2: Buy (Flex) — 소비(포인트 사용) 기준. (기획서 §4.1)
- [ ] **국가별 국기**
    - [ ] 랭킹 항목에 국가 코드 → 국기 SVG/이미지 매핑.

---

## 3.2 Localization

- [ ] **UI 텍스트 매핑**
    - [ ] 영어(기본)·한국어 JSON (또는 패키지 테이블)에 모든 UI 문자열 등록.
    - [ ] LocalizationManager.GetString(key)로 View에서만 참조.
- [ ] **설정에서 언어 변경**
    - [ ] UI_Settings: 언어 드롭다운. 변경 시 LocalizationManager.SetLanguage("ko") 등 호출 후 UI 갱신.

---

## 3.3 Profile & Settings

- [ ] **Profile**
    - [ ] 닉네임, 아바타, Streak Calendar 시각화 (기획서 §4.3).
- [ ] **Settings**
    - [ ] Language (드롭다운).
    - [ ] Notifications On/Off — Copy: "Your streak is about to break!", "Just one tap needed."
    - [ ] Sound / Haptic On/Off.
    - [ ] Account: Google/Apple Sign-in (AuthManager 연동).
    - [ ] Reset Data / Delete Account.

---

## 3.4 Progression (Milestone)

- [ ] **마일스톤 표시**
    - [ ] 10 Taps: 🍟, 20: 🍔, 30: 🍗 (기획서 §4.2). 메인 또는 프로필에서 진행도 표시.

---

# 🚀 Phase 4: Polish & Launch (Day 12–14)

> **목표:** 글로벌 스탠다드 마감. Dev-Roadmap Phase 4.

---

## 4.1 Juice

- [ ] **Confetti** — 보상 시 파티클 연출 (기획서 §3.3 Reward).
- [ ] **사운드** — 탭 시 Heavy Click, 보상 시 효과음. BGM 선택 사항.
- [ ] **햅틱** — 탭·보상 시점 정리.

---

## 4.2 Theme & QA

- [ ] **Nintendo White 테마**
    - [ ] Pure White 배경, Vivid Point Colors (Blue, Red, Yellow). 텍스트 최소화, 아이콘 위주 (기획서 §2.1).
- [ ] **QA**
    - [ ] 다양한 해상도 테스트 (1080×1920, 1440×2560 등). VLG/HLG로 깨지지 않는지 확인.
    - [ ] OS 언어 변경 시 앱 언어 전환 확인.

---

# ✅ Completed (완료된 작업)

### 2026-02-09
- **PackageInstaller 구현 완료**
  - `Assets/Editor/PackageInstaller.cs` 생성 완료.
  - `Tools > J_O_T > Install Packages & Data` 메뉴로 패키지 설치 및 다국어 데이터 생성 기능 제공.
  - Unity Package Manager를 통한 패키지 설치 요청 기능 구현 (`com.unity.vectorgraphics`, `com.unity.localization`).
  - `Assets/_Project/Resources/Localization` 폴더에 `en.json`, `ko.json` 파일 자동 생성 기능 구현.
  - 기존 파일 덮어쓰기 방지 로직 포함, UTF-8 인코딩 사용.
- **ProjectSetupTool 구현 완료**
  - `Assets/Editor/ProjectSetupTool.cs` 생성 완료.
  - `Tools > J_O_T > Initialize Project` 메뉴로 프로젝트 초기화 기능 제공.
  - Tree.md 구조에 맞는 폴더 구조 자동 생성 기능 구현.
  - 5개 핵심 매니저 스크립트(GameManager, RoutineManager, DataManager, LocalizationManager, AuthManager) 템플릿 자동 생성 기능 구현.
  - 모든 스크립트는 싱글톤 패턴, UTF-8 인코딩, 한국어 주석 적용.

---

**문서 버전:** 2026-02-09 — project_proposal, Dev-Roadmap, Architecture, CURSOR_GUIDELINES 반영.
