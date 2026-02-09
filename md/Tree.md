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
│   └── UISetupTool.cs       # UI 자동 생성 툴
│
└── Plugins/