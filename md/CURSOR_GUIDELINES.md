# 📱 Just One Tap (J_O_T): AI Coding Guidelines

이 문서는 **Just One Tap (J_O_T)** 개발 시 Cursor AI가 반드시 준수해야 할 **절대 원칙(Core Principles)**과 **작업 규칙(Operational Rules)**을 정의합니다.

---

## 🛡️ 1. 절대 원칙 (The Golden Rules)

### 1.1. Zero Regression (기존 기능 보존)

> **절대 금지**: 사용자가 명시적으로 "삭제"를 요청하지 않는 한, 기존에 잘 작동하는 코드(Legacy Logic)를 삭제하거나 주석 처리하지 마십시오.

**특히 보호해야 할 핵심 로직:**
- `GameManager`
- `RoutineManager`
- `DataManager`

새로운 기능이 필요하면 **추가(Add)**하는 방식으로 구현하십시오.

---

### 1.2. Architecture Compliance (구조 준수)

본 프로젝트는 **Manager - Controller - View** 패턴을 따릅니다.

| 계층 | 역할 | 예시 |
|:---:|:---|:---|
| **Core/Manager** | 데이터와 상태 관리 | `DataManager`, `GameManager`, `LocalizationManager` |
| **Controller** | 비즈니스 로직 | `RoutineManager` (One Tap·Streak) |
| **View (UI)** | 화면 표시 및 입력 전달 | `UI_Main`, `UI_Onboarding`, `UI_Settings`, `UISetupTool` |

**⚠️ 주의사항:**
- UI 스크립트에 비즈니스 로직을 직접 작성하지 마십시오.
- 예: One Tap·스트릭 로직은 `RoutineManager`에 있어야 하며, `UI_Main`에 두면 안 됨

---

### 1.3. Resolution-Independent UI (해상도 대응 필수)

> **이 앱은 어떤 해상도에서도 레이아웃이 깨지면 안 됩니다.**  
> 수동 좌표 대신 **레이아웃 그룹**과 **RectTransform**으로만 배치하십시오.

**필수 사용:**
- **Vertical Layout Group**: 세로 방향 UI 배치 (리스트, 설정 섹션, 버튼 스택 등)
- **Horizontal Layout Group**: 가로 방향 UI 배치 (탭바, 상단 바, 한 줄 버튼 등)
- **RectTransform**: `anchorMin` / `anchorMax`, `pivot`, `sizeDelta`, `offsetMin` / `offsetMax`로 부모 대비 상대 배치

**절대 금지:**
- `anchoredPosition`, `localPosition`, `position` 등으로 고정 좌표 지정
- 해상도별로 값이 달라지는 픽셀 단위 하드코딩

**이유:** 다양한 해상도(1080×1920, 1440×2560, 폴더블, 태블릿 등)에서 UI가 자동으로 늘어나거나 비율을 유지해야 합니다. 레이아웃 그룹과 RectTransform만 사용해야 해상도가 바뀌어도 깨지지 않습니다.

---

### 1.4. Asset-Driven UI (에셋 기반 UI)

**원칙:**
- UI는 코드로 뼈대를 만들되, 비주얼은 지정된 에셋 경로의 피그마/벡터 에셋을 로드하여 적용합니다.
- Unity 기본 스프라이트(Knob, Background 등) 사용을 지양하고, 프로젝트 명명 규칙을 따르십시오.

**에셋 명명 규칙 (참고):**
- 배경: `bg_*`
- 버튼: `btn_*`
- 아이콘: `ic_*` (SVG/벡터 우선)

---

## 🛠️ 2. 작업 세부 규칙 (Operational Rules)

### 2.1. UI Setup Tool (UISetupTool.cs) 수정 원칙

> **이 스크립트는 프로젝트의 심장입니다.** 수정 시 다음 규칙을 엄수하십시오.

#### 계층 구조 유지 (Just One Tap)
```
SafeArea_Container
├── Panel_Intro      # 온보딩 (로고·타이핑 메시지)
├── Panel_Auth       # 구글/애플 로그인
└── Panel_Main       # 메인
    ├── Top_Bar      # 국기, Streak, Points
    ├── Center_Area  # The Button (Big Button)
    └── Bottom_Nav_Bar
        ├── Btn_Tab_Ranking
        ├── Btn_Tab_Home
        └── Btn_Tab_Profile
```

**⚠️ 위 구조를 파괴하지 마십시오.**

#### 레이아웃 그룹 사용 원칙 (해상도 대응)

> **절대 금지**: `anchoredPosition`, `localPosition`, `position` 등을 사용한 수동 위치 조정을 하지 마십시오.  
> 모든 해상도에 대응하려면 **반드시** 레이아웃 그룹과 RectTransform으로만 배치하십시오.

**모든 UI 요소 배치:**
- **수직 배치**: `VerticalLayoutGroup` 사용 (스택, 리스트, 설정 섹션)
- **수평 배치**: `HorizontalLayoutGroup` 사용 (탭바, 상단 바)
- **복합 배치**: 부모에 해당 `LayoutGroup` 추가 후 자식을 넣으면 자동 배치

**RectTransform:**
- `anchorMin` / `anchorMax`: 부모 내 상대 위치 (0~1). Stretch 시 화면 비율에 맞게 늘어남.
- `sizeDelta`: 고정 크기가 꼭 필요할 때만 사용.
- `offsetMin` / `offsetMax`: Stretch 모드에서 여백.

**예시:**
```csharp
// ❌ 나쁜 예: 수동 위치 → 해상도 바뀌면 깨짐
btnRT.anchoredPosition = new Vector2(0, 100);

// ✅ 좋은 예: 레이아웃 그룹 사용 → 어떤 해상도에도 대응
GameObject container = CreateObj("Button_Container", parent);
VerticalLayoutGroup vlg = container.AddComponent<VerticalLayoutGroup>();
vlg.spacing = 20;
vlg.padding = new RectOffset(10, 10, 10, 10);
// 자식을 container에 추가하면 자동 배치·해상도 대응됨
```

#### Global Ready (전역 준비)
하단 탭 버튼 생성 시 반드시 아이콘(Image)과 라벨(Text) 오브젝트를 분리하십시오:

```
Btn_Tab_Home (Button)
├── Icon_Img (Image)
└── Label_Txt (Text)
```

#### Auto Link (자동 연결)
새로운 UI 요소를 추가했다면, `AutoLinkScripts` 메서드에도 해당 변수를 연결하는 로직을 반드시 추가하십시오.

---

### 2.2. Script Generation (스크립트 생성 규칙)

#### 언어 및 버전
- **언어**: C# 
- **Unity 버전**: 2022.3 LTS 기준

#### 주석 규칙
- 설명이 필요한 복잡한 로직이나 변수에는 **한국어(Korean)** 주석을 다십시오.
- 예: `// [New] 게이지 초기화 (월간 일수 계산)`

#### 최적화 원칙
- `Update()` 사용을 최소화하십시오.
- 비동기 작업: `UniTask` 또는 `Coroutine` 사용
- 애니메이션: `DOTween` 사용

---

### 2.3. Data Persistence (데이터 영속성)

**데이터 저장 흐름:**
```
RoutineManager (포인트·스트릭 갱신)
  ↓
DataManager.Instance.SaveGame() / Firestore 동기화
  ↓
로컬 JSON + 클라우드
```

**⚠️ 주의사항:**
- 루틴 완료·포인트/스트릭 변경 시 반드시 `DataManager` 저장 및 동기화 흐름이 이어져야 합니다.
- 기존 `DataManager`(JSON + Firestore) 방식을 유지하고, 함부로 `PlayerPrefs`만 쓰지 마십시오.

---

## 📂 3. 핵심 파일 및 구조 참조 (Reference)

> 작업 전 반드시 아래 파일들의 현재 상태를 파악하십시오.

### 핵심 파일 목록

| 파일 | 역할 |
|:---|:---|
| `Assets/Editor/UISetupTool.cs` | UI 생성기 (해상도 대응 레이아웃 그룹 적용) |
| `Assets/_Project/Scripts/Core/RoutineManager.cs` | One Tap·Streak 로직 |
| `Assets/_Project/Scripts/UI/UI_Main.cs` | 메인 화면 (The Button, 상단 정보) |
| `Assets/_Project/Scripts/Core/DataManager.cs` | 데이터·Firestore 동기화 |
| `Assets/_Project/Scripts/Core/LocalizationManager.cs` | 다국어 |

### 디렉토리 구조

```text
Assets/_Project/
├── Art/
│   ├── Icons/               # SVG (Vector)
│   ├── UI/                  # Sliced Sprites
│   └── Fonts/               # SDF (En/Ko)
├── Resources/
│   └── Localization/        # en.json, ko.json
├── Scripts/
│   ├── Core/                # GameManager, DataManager, RoutineManager, AuthManager, LocalizationManager
│   ├── UI/                  # UI_Onboarding, UI_Main, UI_Settings
│   └── Utils/
├── Scenes/
│   ├── Intro.unity
│   └── Main.unity
└── Prefabs/
```

---

## 🗣️ 4. 사용자 소통 가이드

### 코드 수정 시 명시 사항

코드를 수정할 때는 다음을 명확히 밝히십시오:

1. **어떤 파일**을 수정했는지
2. **어느 부분**을 수정했는지 (함수명, 라인 번호 등)
3. **왜** 수정했는지 (문제점, 해결 방법)

### 코드 표시 원칙

- 전체 코드를 다시 짜는 것보다, **변경된 메서드나 추가된 변수 위주**로 보여주는 것이 효율적입니다.
- 단, 사용자가 전체 코드를 요구하면 제공하십시오.

### 예시

```csharp
// ❌ 나쁜 예: 전체 파일을 다시 보여줌
// ✅ 좋은 예: 변경된 부분만 명확히 표시

// UISetupTool.cs - CreateNavButton 함수 수정
// 변경 사항: 아이콘/텍스트 분리 구조 적용
private static void CreateNavButton(...) {
    // 변경된 코드만 표시
}
```

---

## 📋 5. 체크리스트 (작업 전 확인)

작업 시작 전 다음 사항을 확인하십시오:

- [ ] 기존 기능이 손상되지 않는지 확인
- [ ] MCV(Manager-Controller-View) 패턴 준수 여부 확인
- [ ] **해상도 대응**: 새 UI는 `VerticalLayoutGroup` / `HorizontalLayoutGroup` + `RectTransform`으로만 배치했는지 확인 (수동 좌표 사용 금지)
- [ ] `AutoLinkScripts`에 새 UI 변수 연결 로직을 추가했는지 확인
- [ ] 데이터·동기화 흐름(`DataManager` / Firestore)이 연결되어 있는지 확인
- [ ] 주석은 한국어로 작성했는지 확인

---

## 🤖 6. Cursor AI가 이 프로젝트에서 지켜야 할 것

Just One Tap 프로젝트에서 코드/UI를 수정·추가할 때 **반드시** 다음을 지키십시오.

### UI·레이아웃
- **모든 해상도 대응**: UI 배치는 **오직** `VerticalLayoutGroup`, `HorizontalLayoutGroup`과 `RectTransform`(anchor, pivot, sizeDelta, offset)으로만 하십시오. `anchoredPosition`/`position` 등 수동 좌표는 사용하지 마십시오.
- **Canvas**: Scale With Screen Size, Reference Resolution 1080×1920 등 프로젝트 설정을 유지하고, SafeArea(노치·둥근 모서리)를 고려하십시오.
- **새 패널/버튼 추가 시**: 부모에 적절한 Layout Group을 두고, 자식은 그룹이 배치하도록 하여 해상도가 바뀌어도 깨지지 않게 하십시오.

### 아키텍처
- **로직 위치**: One Tap·스트릭·오늘 완료 여부는 `RoutineManager`에만 두고, `UI_Main` 등 View에는 넣지 마십시오. View는 표시와 입력 전달만 담당합니다.
- **데이터**: 저장·동기화는 `DataManager` 경로를 따르고, 필요 시 Firestore 연동을 유지하십시오.

### 작업 습관
- **제로 리그레션**: 사용자가 “삭제”를 요청하지 않는 한, 동작하던 코드를 지우거나 주석 처리하지 마십시오. 추가(Add) 위주로 구현하십시오.
- **문서 일치**: 스크립트/씬 구조를 바꿀 경우 `md/Work_Process.md`, `md/Tree.md`, `md/Architecture.md` 등과 맞게 갱신하거나, 사용자에게 “문서도 갱신이 필요합니다”라고 안내하십시오.
- **언어**: 설명이 필요한 주석은 **한국어**로 작성하십시오.

### 금지
- 해상도별로 다른 픽셀 값을 하드코딩하여 UI 위치/크기를 고정하지 마십시오.
- UI 스크립트 안에 비즈니스 로직(예: 스트릭 계산, 오늘 완료 체크)을 두지 마십시오.
- `Update()` 안에 매 프레임 UI 위치를 수동으로 세팅하는 방식으로 “반응형”을 만들지 마십시오. 레이아웃 그룹으로 해결하십시오.

---

**마지막 업데이트**: 2026-02-09
