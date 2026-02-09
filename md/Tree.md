# 🌳 Project Directory Structure

> **Project:** Just One Tap (J_O_T)
> **Asset Focus:** Vector & Localization

---

## 1. 📂 Assets Structure

```text
Assets/
├── _Project/
│   ├── Art/
│   │   ├── Icons/           # SVG Icons (Vector)
│   │   ├── UI/              # Sliced Sprites
│   │   └── Fonts/           # SDF Fonts (English/Korean Support)
│   │
│   ├── Resources/
│   │   └── Localization/    # [New] 언어별 JSON/CSV 파일
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
│   ├── PackageInstaller.cs  # 패키지 설치 및 다국어 데이터 생성 툴 (Vector Graphics, Localization 패키지 설치 요청 및 JSON 파일 생성)
│   └── UISetupTool.cs       # UI 자동 생성 툴
│
└── Plugins/